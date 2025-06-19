<script>
    import { getContext, onMount } from 'svelte';
    import { writable } from 'svelte/store';
    
    import { counterValue } from "../store";
    import { handleTransaction, handleTransactionError } from "../js/main";
    import { config } from "../js/config";

    const { xdu } = getContext('app_functions');
    
    // Store for saved contracts and streams
    const savedContracts = writable([]);
    const currentStreams = writable([]);
    const currentContract = writable('');
    
    let contractInput = '';
    let walletAddressInput = '';
    let loading = false;
    let error = '';
    let isViewingOwnWallet = true;
    let debounceTimer;
    let showConfirmDialog = false;
    let confirmAction = null;
    let confirmMessage = '';
    let confirmStream = null;
    let showCloseTimeDialog = false;
    let closeTimeStream = null;
    let newCloseDate = '';
    let newCloseTime = '';
    let closeTimeError = '';

    onMount(async () => {
        // Load saved contracts from localStorage
        const saved = localStorage.getItem('savedStreamContracts');
        if (saved) {
            const contracts = JSON.parse(saved);
            savedContracts.set(contracts);
            
            // Wait for wallet to be initialized before loading streams
            // This ensures xdu() is available and initialized
            try {
                // Give time for the App component to initialize the wallet
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // If there are saved contracts, load streams for the first one
                if (contracts.length > 0 && xdu()) {
                    const firstContract = contracts[0];
                    currentContract.set(firstContract);
                    loadStreams(firstContract);
                }
            } catch (err) {
                console.error('Error initializing wallet:', err);
                error = 'Wallet initialization error. Please reload the page.';
            }
        }
    });

    // Debounce wallet address input changes
    $: {
        if (walletAddressInput !== undefined && $currentContract) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if ($currentContract) {
                    loadStreams($currentContract, walletAddressInput);
                }
            }, 1000); // 1 second debounce
        }
    }

    // Save contracts to localStorage
    $: {
        if ($savedContracts.length > 0) {
            localStorage.setItem('savedStreamContracts', JSON.stringify($savedContracts));
        }
    }

    const addContract = () => {
        if (!contractInput) return;
        
        if (!$savedContracts.includes(contractInput)) {
            savedContracts.update(contracts => [...contracts, contractInput]);
        }
        
        loadStreams(contractInput, walletAddressInput);
        currentContract.set(contractInput);
        contractInput = '';
    };

    const refreshStreams = () => {
        if ($currentContract) {
            loadStreams($currentContract, walletAddressInput);
        }
    };

    const removeContract = (contract) => {
        savedContracts.update(contracts => 
            contracts.filter(c => c !== contract)
        );
    };

    const loadStreams = async (contract, targetWalletAddress = '') => {
        if (!contract) return;
        
        loading = true;
        error = '';
        
        try {
            const info = await xdu().requestWalletInfo();
            const currentUserAddress = info.address;
            
            // Determine which address to query for
            const queryAddress = targetWalletAddress || currentUserAddress;
            isViewingOwnWallet = queryAddress === currentUserAddress;
            
            // The correct GraphQL query to find stream IDs where user is sender or receiver
            const findStreamsQuery = `
                query FindStreams {
                  # Find streams where user is the receiver
                  receiverStreams: allStates(
                    filter: {
                      key: {startsWith: "${contract}.streams:", endsWith: ":receiver"},
                      value: {equalTo: "${queryAddress}"}
                    }
                  ) {
                    edges {
                      node {
                        key
                        value
                      }
                    }
                  }
                  
                  # Find streams where user is the sender
                  senderStreams: allStates(
                    filter: {
                      key: {startsWith: "${contract}.streams:", endsWith: ":sender"},
                      value: {equalTo: "${queryAddress}"}
                    }
                  ) {
                    edges {
                      node {
                        key
                        value
                      }
                    }
                  }
                }
            `;
            
            // Execute query to find all streams the user is involved in
            const streamsResponse = await fetch(`${config.nodeUrl}/graphql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: findStreamsQuery })
            });
            
            const streamsData = await streamsResponse.json();
            
            if (streamsData.errors) {
                console.error('GraphQL errors:', streamsData.errors);
                error = `GraphQL query error: ${streamsData.errors[0].message}`;
                loading = false;
                return;
            }
            
            // Extract stream IDs from receiver and sender results
            const receiverStreamNodes = streamsData?.data?.receiverStreams?.edges || [];
            const senderStreamNodes = streamsData?.data?.senderStreams?.edges || [];
            
            const streamIds = new Set();
            
            // Extract stream IDs from the receiver list
            receiverStreamNodes.forEach(edge => {
                const key = edge.node.key;
                // key format: "contract.streams:streamId:receiver"
                const parts = key.split(':');
                if (parts.length >= 2) {
                    streamIds.add(parts[1]);
                }
            });
            
            // Extract stream IDs from the sender list
            senderStreamNodes.forEach(edge => {
                const key = edge.node.key;
                // key format: "contract.streams:streamId:sender"
                const parts = key.split(':');
                if (parts.length >= 2) {
                    streamIds.add(parts[1]);
                }
            });
            
            // Array to store stream details
            const streams = [];
            
            // For each stream ID, fetch all stream properties
            for (const streamId of streamIds) {
                const streamDetailsQuery = `
                    query StreamDetails {
                      streamDetails: allStates(
                        filter: {
                          key: {startsWith: "${contract}.streams:${streamId}:"}
                        }
                      ) {
                        edges {
                          node {
                            key
                            value
                            valueNumeric
                          }
                        }
                      }
                    }
                `;
                
                const detailsResponse = await fetch(`${config.nodeUrl}/graphql`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ query: streamDetailsQuery })
                });
                
                const detailsData = await detailsResponse.json();
                
                if (detailsData.errors) {
                    console.error(`Error fetching details for stream ${streamId}:`, detailsData.errors);
                    continue;
                }
                
                const streamDetailsNodes = detailsData?.data?.streamDetails?.edges || [];
                
                // Build a stream object from the details
                const streamData = {
                    id: streamId,
                    contract: contract
                };
                
                // Process each property of the stream
                streamDetailsNodes.forEach(edge => {
                    const key = edge.node.key;
                    const value = edge.node.value;
                    const valueNumeric = edge.node.valueNumeric;
                    
                    // Extract field name from key (format: "contract.streams:streamId:fieldName")
                    const parts = key.split(':');
                    if (parts.length >= 3) {
                        const fieldName = parts[2];
                        
                        // Map field names to our stream object
                        switch (fieldName) {
                            case 'begins':
                                streamData.start_time = new Date(value).getTime() / 1000;
                                break;
                            case 'closes':
                                streamData.end_time = new Date(value).getTime() / 1000;
                                break;
                            case 'claimed':
                                streamData.claimed = valueNumeric || value;
                                break;
                            case 'rate':
                                streamData.rate = valueNumeric || value;
                                break;
                            case 'sender':
                                streamData.sender = value;
                                break;
                            case 'receiver':
                                streamData.receiver = value;
                                break;
                            case 'status':
                                streamData.status = value;
                                break;
                            default:
                                streamData[fieldName] = valueNumeric || value;
                        }
                    }
                });
                
                // Determine if this stream is incoming or outgoing for the queried address
                if (streamData.sender === queryAddress) {
                    streamData.direction = 'outgoing';
                } else if (streamData.receiver === queryAddress) {
                    streamData.direction = 'incoming';
                }
                
                streams.push(streamData);
            }
            
            currentStreams.set(streams);
        } catch (err) {
            console.error('Error loading streams:', err);
            error = `Error loading streams: ${err.message}`;
        } finally {
            loading = false;
        }
    };

    const balanceStream = async (stream) => {
        try {
            const response = await xdu().sendTransaction(
                stream.contract, 
                "balance_stream", 
                { stream_id: stream.id }
            ).catch(handleTransactionError);
            
            handleTransaction(response);
            await loadStreams($currentContract, walletAddressInput);
        } catch (err) {
            console.error('Error balancing stream:', err);
            error = `Error balancing stream: ${err.message}`;
        }
    };

    const changeCloseTime = async (stream) => {
        try {
            const response = await xdu().sendTransaction(
                stream.contract, 
                "change_close_time", 
                { 
                    stream_id: stream.id,
                    new_close_time: new Date().toISOString().slice(0, 19).replace('T', ' ')
                }
            ).catch(handleTransactionError);
            
            handleTransaction(response);
            await loadStreams($currentContract, walletAddressInput);
        } catch (err) {
            console.error('Error changing close time:', err);
            error = `Error changing close time: ${err.message}`;
        }
    };

    const changeCloseTimeCustom = async (stream, customTime) => {
        try {
            const response = await xdu().sendTransaction(
                stream.contract, 
                "change_close_time", 
                { 
                    stream_id: stream.id,
                    new_close_time: customTime
                }
            ).catch(handleTransactionError);
            
            handleTransaction(response);
            await loadStreams($currentContract, walletAddressInput);
        } catch (err) {
            console.error('Error changing close time:', err);
            error = `Error changing close time: ${err.message}`;
        }
    };

    const showChangeCloseTimeDialog = (stream) => {
        closeTimeStream = stream;
        
        // Set default to current time
        const now = new Date();
        newCloseDate = now.toISOString().split('T')[0];
        newCloseTime = now.toTimeString().slice(0, 5);
        
        closeTimeError = '';
        showCloseTimeDialog = true;
    };

    const validateCloseTime = () => {
        if (!newCloseDate || !newCloseTime) {
            closeTimeError = 'Please select both date and time';
            return false;
        }

        const selectedDateTime = new Date(`${newCloseDate}T${newCloseTime}`);
        const now = new Date();

        if (selectedDateTime < now) {
            closeTimeError = 'Close time must be now or in the future';
            return false;
        }

        closeTimeError = '';
        return true;
    };

    const confirmCloseTimeChange = () => {
        if (!validateCloseTime()) {
            return;
        }

        const formattedDateTime = `${newCloseDate} ${newCloseTime}:00`;
        
        showCloseTimeDialog = false;
        showConfirmation(
            (s) => changeCloseTimeCustom(s, formattedDateTime), 
            closeTimeStream, 
            `This will change the stream's close time to ${formattedDateTime}. If this is before the start time, the stream will be effectively invalidated.`
        );
    };

    const cancelCloseTimeDialog = () => {
        showCloseTimeDialog = false;
        closeTimeStream = null;
        newCloseDate = '';
        newCloseTime = '';
        closeTimeError = '';
    };

    const finalizeStream = async (stream) => {
        try {
            const response = await xdu().sendTransaction(
                stream.contract, 
                "finalize_stream", 
                { stream_id: stream.id }
            ).catch(handleTransactionError);
            
            handleTransaction(response);
            await loadStreams($currentContract, walletAddressInput);
        } catch (err) {
            console.error('Error finalizing stream:', err);
            error = `Error finalizing stream: ${err.message}`;
        }
    };

    const balanceFinalize = async (stream) => {
        try {
            const response = await xdu().sendTransaction(
                stream.contract, 
                "balance_finalize", 
                { stream_id: stream.id }
            ).catch(handleTransactionError);
            
            handleTransaction(response);
            await loadStreams($currentContract, walletAddressInput);
        } catch (err) {
            console.error('Error balance finalizing stream:', err);
            error = `Error balance finalizing stream: ${err.message}`;
        }
    };

    const closeBalanceFinalize = async (stream) => {
        try {
            const response = await xdu().sendTransaction(
                stream.contract, 
                "close_balance_finalize", 
                { stream_id: stream.id }
            ).catch(handleTransactionError);
            
            handleTransaction(response);
            await loadStreams($currentContract, walletAddressInput);
        } catch (err) {
            console.error('Error closing, balancing, and finalizing stream:', err);
            error = `Error closing, balancing, and finalizing stream: ${err.message}`;
        }
    };

    const forfeitStream = async (stream) => {
        try {
            const response = await xdu().sendTransaction(
                stream.contract, 
                "forfeit_stream", 
                { stream_id: stream.id }
            ).catch(handleTransactionError);
            
            handleTransaction(response);
            await loadStreams($currentContract, walletAddressInput);
        } catch (err) {
            console.error('Error forfeiting stream:', err);
            error = `Error forfeiting stream: ${err.message}`;
        }
    };

    const showConfirmation = (action, stream, message) => {
        confirmAction = action;
        confirmStream = stream;
        confirmMessage = message;
        showConfirmDialog = true;
    };

    const executeConfirmedAction = async () => {
        if (confirmAction && confirmStream) {
            await confirmAction(confirmStream);
        }
        showConfirmDialog = false;
        confirmAction = null;
        confirmStream = null;
        confirmMessage = '';
    };

    const cancelConfirmation = () => {
        showConfirmDialog = false;
        confirmAction = null;
        confirmStream = null;
        confirmMessage = '';
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp * 1000);
        return date.toLocaleString();
    };

    const formatAmount = (amount) => {
        if (!amount) return '0';
        return parseFloat(amount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        });
    };
</script>

<section class="section dark-theme">
    <div class="container">
        <h1 class="title has-text-white">Token Stream Manager</h1>
        
        <div class="card">
            <div class="card-content">
                <h2 class="subtitle has-text-white mb-4">Enter Stream Contract</h2>
                <div class="field has-addons">
                    <div class="control is-expanded">
                        <input 
                            class="input is-rounded dark-input"
                            type="text" 
                            bind:value={contractInput} 
                            placeholder="Enter contract name"
                        >
                    </div>
                    <div class="control">
                        <button class="button is-primary is-rounded" on:click={addContract}>
                            <span class="icon">
                                <i class="fas fa-plus"></i>
                            </span>
                            <span>Add</span>
                        </button>
                    </div>
                </div>
                
                <div class="field mt-4">
                    <label class="label has-text-white">Wallet Address (optional)</label>
                    <div class="field has-addons">
                        <div class="control is-expanded">
                            <input 
                                class="input is-rounded dark-input"
                                type="text" 
                                bind:value={walletAddressInput} 
                                placeholder="Enter wallet address to view their streams (leave empty for your own)"
                            >
                        </div>
                        <div class="control">
                            <button 
                                class="button is-info is-rounded" 
                                on:click={refreshStreams}
                                disabled={!$currentContract || loading}
                                title="Refresh streams">
                                <span class="icon">
                                    <i class="fas fa-sync-alt {loading ? 'fa-spin' : ''}"></i>
                                </span>
                                <span>Refresh</span>
                            </button>
                        </div>
                    </div>
                    <p class="help has-text-grey">
                        Leave empty to view your own streams, or enter another wallet address to view their streams.
                        {#if walletAddressInput}
                            <br><strong>Auto-refreshing in 1 second after typing...</strong>
                        {/if}
                    </p>
                </div>
                
                {#if error}
                    <div class="notification is-danger is-light mt-3">
                        <button class="delete" on:click={() => error = ''}></button>
                        {error}
                    </div>
                {/if}
                
                {#if $savedContracts.length > 0}
                    <div class="mt-4">
                        <h3 class="is-size-5 mb-3 has-text-white">Saved Contracts</h3>
                        <div class="contract-tags">
                            {#each $savedContracts as contract}
                                <div class="contract-tag {$currentContract === contract ? 'is-active' : ''}">
                                    <button class="contract-button" on:click={() => loadStreams(contract, walletAddressInput)}>
                                        {contract}
                                    </button>
                                    <button class="delete-button" on:click={() => removeContract(contract)}>
                                        <span class="icon is-small">
                                            <i class="fas fa-times"></i>
                                        </span>
                                    </button>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
        
        {#if loading}
            <div class="loader-container">
                <div class="loader"></div>
                <p class="has-text-white mt-3">Loading streams...</p>
            </div>
        {:else if $currentContract && $currentStreams.length > 0}
            <div class="card mt-5">
                <div class="card-header">
                    <p class="card-header-title has-text-white">
                        Streams for {$currentContract}
                        {#if isViewingOwnWallet}
                            <span class="tag is-success ml-2">
                                <span class="icon is-small">
                                    <i class="fas fa-user"></i>
                                </span>
                                <span>Your Wallet</span>
                            </span>
                        {:else}
                            <span class="tag is-info ml-2">
                                <span class="icon is-small">
                                    <i class="fas fa-eye"></i>
                                </span>
                                <span>View Only</span>
                            </span>
                        {/if}
                    </p>
                    {#if !isViewingOwnWallet && walletAddressInput}
                        <p class="card-header-subtitle has-text-grey-light">
                            <span class="icon is-small mr-1">
                                <i class="fas fa-wallet"></i>
                            </span>
                            {walletAddressInput.substring(0, 8)}...{walletAddressInput.substring(walletAddressInput.length - 6)}
                        </p>
                    {/if}
                </div>
                <div class="card-content">
                    {#each ['incoming', 'outgoing'] as streamType}
                        {@const filteredStreams = $currentStreams.filter(stream => stream.direction === streamType)}
                        {#if filteredStreams.length > 0}
                            <div class="stream-section mb-5">
                                <h3 class="subtitle has-text-white mb-3">
                                    <span class="icon mr-2">
                                        <i class="fas {streamType === 'incoming' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                                    </span>
                                    {streamType === 'incoming' ? 'Incoming Streams' : 'Outgoing Streams'}
                                    <span class="tag is-dark ml-2">{filteredStreams.length}</span>
                                </h3>
                                <div class="table-container">
                                    <table class="table is-fullwidth is-hoverable">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Rate</th>
                                                <th>Claimed</th>
                                                <th>Start Time</th>
                                                <th>End Time</th>
                                                <th>Status</th>
                                                {#if isViewingOwnWallet}
                                                    <th>Actions</th>
                                                {/if}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {#each filteredStreams as stream}
                                                <tr>
                                                    <td title={stream.id}>{stream.id.substring(0, 8)}...</td>
                                                    <td>{formatAmount(stream.rate)}/sec</td>
                                                    <td>{formatAmount(stream.claimed || 0)}</td>
                                                    <td>{formatTimestamp(stream.start_time)}</td>
                                                    <td>{formatTimestamp(stream.end_time)}</td>
                                                    <td>
                                                        <span class="status-badge {stream.status}">
                                                            {stream.status || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    {#if isViewingOwnWallet}
                                                        <td>
                                                            <div class="buttons are-small action-buttons">
                                                                <!-- Common actions for both incoming and outgoing -->
                                                                <button 
                                                                    class="button is-info is-outlined is-rounded" 
                                                                    on:click={() => balanceStream(stream)}
                                                                    disabled={stream.status !== 'active'}
                                                                    title="Balance stream">
                                                                    <span class="icon is-small">
                                                                        <i class="fas fa-balance-scale"></i>
                                                                    </span>
                                                                    <span>Balance</span>
                                                                </button>

                                                                {#if streamType === 'incoming'}
                                                                    <!-- Receiver-specific actions -->
                                                                    <button 
                                                                        class="button is-warning is-outlined is-rounded" 
                                                                        on:click={() => showConfirmation(balanceFinalize, stream, 'This will balance and finalize the stream. This action cannot be undone.')}
                                                                        disabled={stream.status !== 'active'}
                                                                        title="Balance and finalize stream">
                                                                        <span class="icon is-small">
                                                                            <i class="fas fa-check-double"></i>
                                                                        </span>
                                                                        <span>Balance & Finalize</span>
                                                                    </button>
                                                                    <button 
                                                                        class="button is-danger is-outlined is-rounded" 
                                                                        on:click={() => showConfirmation(forfeitStream, stream, 'This will forfeit the stream back to the sender. This action cannot be undone.')}
                                                                        disabled={stream.status !== 'active'}
                                                                        title="Forfeit stream to sender">
                                                                        <span class="icon is-small">
                                                                            <i class="fas fa-times-circle"></i>
                                                                        </span>
                                                                        <span>Forfeit</span>
                                                                    </button>
                                                                {:else}
                                                                    <!-- Sender-specific actions -->
                                                                    <button 
                                                                        class="button is-warning is-outlined is-rounded" 
                                                                        on:click={() => showChangeCloseTimeDialog(stream)}
                                                                        disabled={stream.status !== 'active'}
                                                                        title="Change close time">
                                                                        <span class="icon is-small">
                                                                            <i class="fas fa-clock"></i>
                                                                        </span>
                                                                        <span>Change Close Time</span>
                                                                    </button>
                                                                    <button 
                                                                        class="button is-warning is-outlined is-rounded" 
                                                                        on:click={() => showConfirmation(changeCloseTime, stream, 'This will close the stream immediately. The receiver can still claim any outstanding balance.')}
                                                                        disabled={stream.status !== 'active'}
                                                                        title="Close stream now">
                                                                        <span class="icon is-small">
                                                                            <i class="fas fa-stop"></i>
                                                                        </span>
                                                                        <span>Close Now</span>
                                                                    </button>
                                                                    <button 
                                                                        class="button is-danger is-outlined is-rounded" 
                                                                        on:click={() => showConfirmation(closeBalanceFinalize, stream, 'This will close, balance, and finalize the stream immediately. This action cannot be undone.')}
                                                                        disabled={stream.status !== 'active'}
                                                                        title="Close, balance and finalize stream">
                                                                        <span class="icon is-small">
                                                                            <i class="fas fa-stop-circle"></i>
                                                                        </span>
                                                                        <span>Close & Finalize</span>
                                                                    </button>
                                                                {/if}

                                                                <!-- Finalize action (available to both when stream is closed) -->
                                                                <button 
                                                                    class="button is-success is-outlined is-rounded" 
                                                                    on:click={() => showConfirmation(finalizeStream, stream, 'This will finalize the stream. Make sure all balances have been claimed first.')}
                                                                    disabled={stream.status !== 'active' || (stream.end_time > Date.now() / 1000 && stream.start_time < Date.now() / 1000)}
                                                                    title="Finalize stream (only when closed and balanced)">
                                                                    <span class="icon is-small">
                                                                        <i class="fas fa-check"></i>
                                                                    </span>
                                                                    <span>Finalize</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    {/if}
                                                </tr>
                                            {/each}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
        {:else if $currentContract}
            <div class="notification is-info is-light mt-4">
                <span class="icon mr-2">
                    <i class="fas fa-info-circle"></i>
                </span>
                No streams found for contract {$currentContract}.
            </div>
        {/if}
    </div>
</section>

<!-- Confirmation Dialog Modal -->
{#if showConfirmDialog}
    <div class="modal is-active">
        <div class="modal-background" on:click={cancelConfirmation}></div>
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title has-text-white">Confirm Action</p>
                <button class="delete" aria-label="close" on:click={cancelConfirmation}></button>
            </header>
            <section class="modal-card-body">
                <div class="content">
                    <p class="has-text-white">{confirmMessage}</p>
                    {#if confirmStream}
                        <div class="notification is-info is-light mt-3">
                            <strong>Stream ID:</strong> {confirmStream.id}<br>
                            <strong>Rate:</strong> {formatAmount(confirmStream.rate)}/sec<br>
                            <strong>Status:</strong> {confirmStream.status}
                        </div>
                    {/if}
                </div>
            </section>
            <footer class="modal-card-foot">
                <button class="button is-danger" on:click={executeConfirmedAction}>
                    <span class="icon">
                        <i class="fas fa-check"></i>
                    </span>
                    <span>Confirm</span>
                </button>
                <button class="button" on:click={cancelConfirmation}>Cancel</button>
            </footer>
        </div>
    </div>
{/if}

<!-- Close Time Dialog Modal -->
{#if showCloseTimeDialog}
    <div class="modal is-active">
        <div class="modal-background" on:click={cancelCloseTimeDialog}></div>
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title has-text-white">Change Close Time</p>
                <button class="delete" aria-label="close" on:click={cancelCloseTimeDialog}></button>
            </header>
            <section class="modal-card-body">
                <div class="content">
                    <p class="has-text-white mb-4">
                        Set a new close time for this stream. You can only set the close time to now or some time in the future.
                    </p>
                    
                    {#if closeTimeStream}
                        <div class="notification is-info is-light mb-4">
                            <strong>Stream ID:</strong> {closeTimeStream.id}<br>
                            <strong>Current End Time:</strong> {formatTimestamp(closeTimeStream.end_time)}<br>
                            <strong>Start Time:</strong> {formatTimestamp(closeTimeStream.start_time)}
                        </div>
                    {/if}
                    
                    <div class="field">
                        <label class="label has-text-white">New Close Date</label>
                        <div class="control">
                            <input 
                                class="input dark-input" 
                                type="date" 
                                bind:value={newCloseDate}
                                min={new Date().toISOString().split('T')[0]}
                                required
                            >
                        </div>
                    </div>
                    
                    <div class="field">
                        <label class="label has-text-white">New Close Time</label>
                        <div class="control">
                            <input 
                                class="input dark-input" 
                                type="time" 
                                bind:value={newCloseTime}
                                required
                            >
                        </div>
                    </div>
                    
                    {#if closeTimeError}
                        <div class="notification is-danger is-light">
                            {closeTimeError}
                        </div>
                    {/if}
                    
                    <div class="notification is-warning is-light">
                        <strong>⚠️ Important:</strong> If you set the close time before the stream's start time, 
                        the stream will be effectively invalidated and no tokens can be transferred.
                    </div>
                </div>
            </section>
            <footer class="modal-card-foot">
                <button class="button is-primary" on:click={confirmCloseTimeChange}>
                    <span class="icon">
                        <i class="fas fa-clock"></i>
                    </span>
                    <span>Update Close Time</span>
                </button>
                <button class="button" on:click={cancelCloseTimeDialog}>Cancel</button>
            </footer>
        </div>
    </div>
{/if}

<style>
    :global(body) {
        background-color: #121212;
        color: #e0e0e0;
    }
    
    .dark-theme {
        background-color: #121212;
        min-height: calc(100vh - 3.25rem);
        flex: 1;
    }
    
    .title, .subtitle {
        color: #ffffff;
    }
    
    .card {
        background-color: #1e1e1e;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        color: #e0e0e0;
        overflow: hidden;
    }
    
    .card-header {
        background-color: #252525;
        border-bottom: 1px solid #333;
    }
    
    .card-header-title {
        color: #e0e0e0;
    }
    
    .card-header-subtitle {
        color: #888;
        font-size: 0.9rem;
        font-family: monospace;
        margin: 0;
        padding: 0.5rem 1rem 0 1rem;
        display: flex;
        align-items: center;
    }
    
    .dark-input {
        background-color: #2d2d2d;
        border: 1px solid #444;
        color: #e0e0e0;
    }
    
    .dark-input::placeholder {
        color: #888;
    }
    
    .dark-input:focus {
        border-color: #6c8bef;
        box-shadow: 0 0 0 0.125em rgba(108, 139, 239, 0.25);
    }
    
    .table {
        background-color: transparent;
        color: #e0e0e0;
    }
    
    .table th {
        color: #bbb;
        border-bottom: 1px solid #333;
    }
    
    .table td {
        border-bottom: 1px solid #333;
        vertical-align: middle;
    }
    
    .table tr:hover {
        background-color: #252525;
    }
    
    .contract-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }
    
    .contract-tag {
        display: flex;
        align-items: center;
        background-color: #2d2d2d;
        border-radius: 20px;
        overflow: hidden;
        transition: all 0.2s ease;
    }
    
    .contract-tag.is-active {
        background-color: #4c61af;
    }
    
    .contract-button {
        background: transparent;
        border: none;
        color: #e0e0e0;
        cursor: pointer;
        font-size: 0.9rem;
        padding: 0.4rem 0.8rem;
        transition: all 0.2s ease;
    }
    
    .delete-button {
        background: transparent;
        border: none;
        color: #888;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.4rem 0.6rem;
        transition: all 0.2s ease;
    }
    
    .delete-button:hover {
        color: #ff6b6b;
    }
    
    .stream-direction {
        display: inline-block;
        padding: 0.25em 0.75em;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    
    .stream-direction.incoming {
        background-color: rgba(72, 199, 142, 0.2);
        color: #48c78e;
    }
    
    .stream-direction.outgoing {
        background-color: rgba(72, 95, 199, 0.2);
        color: #485fc7;
    }
    
    .status-badge {
        display: inline-block;
        padding: 0.25em 0.75em;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: capitalize;
    }
    
    .status-badge.active {
        background-color: rgba(72, 199, 142, 0.2);
        color: #48c78e;
    }
    
    .status-badge.completed {
        background-color: rgba(255, 221, 87, 0.2);
        color: #ffdd57;
    }
    
    .status-badge.closed {
        background-color: rgba(241, 70, 104, 0.2);
        color: #f14668;
    }
    
    .action-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        justify-content: flex-end;
    }
    
    .action-buttons .button {
        margin-bottom: 5px;
    }
    
    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .loader-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 4rem 0;
    }
    
    .loader {
        border: 4px solid #333;
        border-radius: 50%;
        border-top: 4px solid #6c8bef;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .modal-card {
        background-color: #1e1e1e;
        color: #e0e0e0;
    }
    
    .modal-card-head {
        background-color: #252525;
        border-bottom: 1px solid #333;
    }
    
    .modal-card-body {
        background-color: #1e1e1e;
    }
    
    .modal-card-foot {
        background-color: #252525;
        border-top: 1px solid #333;
    }
    
    .stream-section {
        border-left: 4px solid #6c8bef;
        padding-left: 1rem;
        margin-bottom: 2rem;
    }
    
    .stream-section:last-child {
        margin-bottom: 0;
    }
</style>
