<script>
    import { getContext } from 'svelte';
    import { handleTransaction, handleTransactionError } from "../js/main";
    
    const { xdu } = getContext('app_functions');
    
    let receiver = '';
    let rate = '';
    let startDate = '';
    let startTime = '';
    let endDate = '';
    let endTime = '';
    let selectedContract = '';
    let loading = false;
    let error = '';
    let success = '';
    
    // Get current date/time for defaults
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    
    // Set defaults
    startDate = currentDate;
    startTime = currentTime;
    
    // Set end date to tomorrow by default
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    endDate = tomorrow.toISOString().split('T')[0];
    endTime = currentTime;
    
    const savedContracts = JSON.parse(localStorage.getItem('savedStreamContracts') || '[]');
    if (savedContracts.length > 0) {
        selectedContract = savedContracts[0];
    }
    
    const formatDateTime = (date, time) => {
        return `${date} ${time}:00`;
    };
    
    const validateForm = () => {
        if (!receiver.trim()) {
            error = 'Receiver address is required';
            return false;
        }
        
        if (!rate || parseFloat(rate) <= 0) {
            error = 'Rate must be greater than 0';
            return false;
        }
        
        if (!selectedContract) {
            error = 'Please select a contract';
            return false;
        }
        
        if (!startDate || !startTime || !endDate || !endTime) {
            error = 'Start and end date/time are required';
            return false;
        }
        
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);
        
        if (startDateTime >= endDateTime) {
            error = 'End time must be after start time';
            return false;
        }
        
        return true;
    };
    
    const createStream = async () => {
        error = '';
        success = '';
        
        if (!validateForm()) {
            return;
        }
        
        loading = true;
        
        try {
            const startDateTime = formatDateTime(startDate, startTime);
            const endDateTime = formatDateTime(endDate, endTime);
            
            const response = await xdu().sendTransaction(
                selectedContract,
                "create_stream",
                {
                    receiver: receiver.trim(),
                    rate: parseFloat(rate),
                    begins: startDateTime,
                    closes: endDateTime
                }
            ).catch(handleTransactionError);
            
            handleTransaction(response);
            success = 'Stream created successfully!';
            
            // Reset form
            receiver = '';
            rate = '';
            // Keep dates as they are for convenience
            
        } catch (err) {
            console.error('Error creating stream:', err);
            error = `Error creating stream: ${err.message}`;
        } finally {
            loading = false;
        }
    };
    
    const calculateDuration = () => {
        if (!startDate || !startTime || !endDate || !endTime) return '';
        
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);
        
        if (startDateTime >= endDateTime) return '';
        
        const diffMs = endDateTime - startDateTime;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays > 0) {
            const remainingHours = diffHours % 24;
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
        } else {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
        }
    };
    
    const calculateTotalAmount = () => {
        if (!rate || !startDate || !startTime || !endDate || !endTime) return '';
        
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);
        
        if (startDateTime >= endDateTime) return '';
        
        const diffSeconds = (endDateTime - startDateTime) / 1000;
        const totalAmount = parseFloat(rate) * diffSeconds;
        
        return totalAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        });
    };
</script>

<section class="section dark-theme">
    <div class="container">
        <h1 class="title has-text-white mb-5">
            <span class="icon mr-2">
                <i class="fas fa-plus-circle"></i>
            </span>
            Create New Stream
        </h1>
        
        <div class="columns">
            <div class="column is-8">
                <div class="card">
                    <div class="card-content">
                        <form on:submit|preventDefault={createStream}>
                            <div class="field">
                                <label class="label has-text-white">Contract</label>
                                <div class="control">
                                    <div class="select is-fullwidth">
                                        <select bind:value={selectedContract} class="dark-select">
                                            <option value="">Select a contract</option>
                                            {#each savedContracts as contract}
                                                <option value={contract}>{contract}</option>
                                            {/each}
                                        </select>
                                    </div>
                                </div>
                                {#if savedContracts.length === 0}
                                    <p class="help has-text-warning">
                                        No saved contracts found. Add a contract first in the main interface.
                                    </p>
                                {/if}
                            </div>
                            
                            <div class="field">
                                <label class="label has-text-white">Receiver Address</label>
                                <div class="control">
                                    <input 
                                        class="input dark-input" 
                                        type="text" 
                                        bind:value={receiver}
                                        placeholder="Enter receiver's wallet address"
                                        required
                                    >
                                </div>
                            </div>
                            
                            <div class="field">
                                <label class="label has-text-white">Rate (tokens per second)</label>
                                <div class="control">
                                    <input 
                                        class="input dark-input" 
                                        type="number" 
                                        step="any"
                                        bind:value={rate}
                                        placeholder="e.g., 0.001157"
                                        required
                                    >
                                </div>
                                <p class="help has-text-grey">
                                    Example: 0.001157 tokens/sec = ~100 tokens/day
                                </p>
                            </div>
                            
                            <div class="columns">
                                <div class="column">
                                    <div class="field">
                                        <label class="label has-text-white">Start Date</label>
                                        <div class="control">
                                            <input 
                                                class="input dark-input" 
                                                type="date" 
                                                bind:value={startDate}
                                                required
                                            >
                                        </div>
                                    </div>
                                </div>
                                <div class="column">
                                    <div class="field">
                                        <label class="label has-text-white">Start Time</label>
                                        <div class="control">
                                            <input 
                                                class="input dark-input" 
                                                type="time" 
                                                bind:value={startTime}
                                                required
                                            >
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="columns">
                                <div class="column">
                                    <div class="field">
                                        <label class="label has-text-white">End Date</label>
                                        <div class="control">
                                            <input 
                                                class="input dark-input" 
                                                type="date" 
                                                bind:value={endDate}
                                                required
                                            >
                                        </div>
                                    </div>
                                </div>
                                <div class="column">
                                    <div class="field">
                                        <label class="label has-text-white">End Time</label>
                                        <div class="control">
                                            <input 
                                                class="input dark-input" 
                                                type="time" 
                                                bind:value={endTime}
                                                required
                                            >
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {#if error}
                                <div class="notification is-danger is-light">
                                    <button class="delete" on:click={() => error = ''}></button>
                                    {error}
                                </div>
                            {/if}
                            
                            {#if success}
                                <div class="notification is-success is-light">
                                    <button class="delete" on:click={() => success = ''}></button>
                                    {success}
                                </div>
                            {/if}
                            
                            <div class="field">
                                <div class="control">
                                    <button 
                                        class="button is-primary is-fullwidth is-rounded"
                                        type="submit"
                                        class:is-loading={loading}
                                        disabled={loading}
                                    >
                                        <span class="icon">
                                            <i class="fas fa-paper-plane"></i>
                                        </span>
                                        <span>Create Stream</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <div class="column is-4">
                <div class="card">
                    <div class="card-header">
                        <p class="card-header-title has-text-white">Stream Preview</p>
                    </div>
                    <div class="card-content">
                        <div class="content">
                            <div class="preview-item">
                                <strong class="has-text-white">Duration:</strong>
                                <span class="has-text-grey">
                                    {calculateDuration() || 'Enter dates to calculate'}
                                </span>
                            </div>
                            
                            <div class="preview-item">
                                <strong class="has-text-white">Total Amount:</strong>
                                <span class="has-text-grey">
                                    {calculateTotalAmount() || 'Enter rate and dates'} tokens
                                </span>
                            </div>
                            
                            <div class="preview-item">
                                <strong class="has-text-white">Rate:</strong>
                                <span class="has-text-grey">
                                    {rate || '0'} tokens/second
                                </span>
                            </div>
                            
                            {#if rate}
                                <div class="preview-item">
                                    <strong class="has-text-white">Per Hour:</strong>
                                    <span class="has-text-grey">
                                        {(parseFloat(rate) * 3600).toLocaleString()} tokens
                                    </span>
                                </div>
                                
                                <div class="preview-item">
                                    <strong class="has-text-white">Per Day:</strong>
                                    <span class="has-text-grey">
                                        {(parseFloat(rate) * 86400).toLocaleString()} tokens
                                    </span>
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
                
                <div class="card mt-4">
                    <div class="card-content">
                        <h4 class="subtitle has-text-white is-6">💡 Tips</h4>
                        <ul class="has-text-grey">
                            <li>Make sure you have enough tokens in your balance</li>
                            <li>The stream will start automatically at the specified time</li>
                            <li>You can close the stream early if needed</li>
                            <li>The receiver can balance the stream at any time</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<style>
    .dark-theme {
        background-color: #121212;
        min-height: calc(100vh - 3.25rem);
        flex: 1;
    }
    
    .card {
        background-color: #1e1e1e;
        color: #e0e0e0;
    }
    
    .card-header {
        background-color: #252525;
        border-bottom: 1px solid #333;
    }
    
    .card-header-title {
        color: #e0e0e0;
    }
    
    .dark-input, .dark-select {
        background-color: #2d2d2d;
        border: 1px solid #444;
        color: #e0e0e0;
    }
    
    .dark-input::placeholder {
        color: #888;
    }
    
    .dark-input:focus, .dark-select:focus {
        border-color: #6c8bef;
        box-shadow: 0 0 0 0.125em rgba(108, 139, 239, 0.25);
    }
    
    .select select {
        background-color: #2d2d2d;
        border: 1px solid #444;
        color: #e0e0e0;
    }
    
    .preview-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.75rem;
        padding: 0.5rem 0;
        border-bottom: 1px solid #333;
    }
    
    .preview-item:last-child {
        border-bottom: none;
        margin-bottom: 0;
    }
</style> 