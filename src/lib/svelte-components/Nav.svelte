<script>
    import { walletAddressElementValue } from "../store";
    export let currentPage = 'streams';
    export let setPage = () => {};
</script>

<nav class="navbar is-dark" aria-label="main navigation">
    <div class="container">
        <div class="navbar-brand">
            <a class="navbar-item" href="#" on:click={() => setPage('streams')}>
                <strong>Xian Stream Manager</strong>
            </a>
        </div>

        <div id="navbarBasicExample" class="navbar-menu">
            <div class="navbar-start">
                <a 
                    class="navbar-item {currentPage === 'streams' ? 'is-active' : ''}" 
                    href="#" 
                    on:click={() => setPage('streams')}
                >
                    <span class="icon mr-1">
                        <i class="fas fa-list"></i>
                    </span>
                    <span>My Streams</span>
                </a>
                <a 
                    class="navbar-item {currentPage === 'create' ? 'is-active' : ''}" 
                    href="#" 
                    on:click={() => setPage('create')}
                >
                    <span class="icon mr-1">
                        <i class="fas fa-plus-circle"></i>
                    </span>
                    <span>Create Stream</span>
                </a>
                <a 
                    class="navbar-item {currentPage === 'faq' ? 'is-active' : ''}" 
                    href="#" 
                    on:click={() => setPage('faq')}
                >
                    <span class="icon mr-1">
                        <i class="fas fa-question-circle"></i>
                    </span>
                    <span>FAQ</span>
                </a>
            </div>
            <div class="navbar-end">
                <div class="navbar-item">
                    <div class="wallet-address">
                        <span class="icon is-small mr-2">
                            <i class="fas fa-wallet"></i>
                        </span>
                        <span class="wallet-text">{$walletAddressElementValue}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</nav>

<style>
    .navbar {
        background-color: #0f0f0f;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .navbar-brand strong {
        background: linear-gradient(45deg, #6c8bef, #b06cef);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        font-weight: 700;
    }
    
    .navbar-item.is-active {
        background-color: rgba(108, 139, 239, 0.2);
        color: #6c8bef;
    }
    
    .navbar-item:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
    
    .wallet-address {
        background-color: rgba(108, 139, 239, 0.15);
        border-radius: 20px;
        padding: 0.5rem 1rem;
        color: #e0e0e0;
        display: flex;
        align-items: center;
        font-family: monospace;
        transition: all 0.2s ease;
    }
    
    .wallet-address:hover {
        background-color: rgba(108, 139, 239, 0.25);
    }
    
    .wallet-text {
        font-size: 0.9rem;
    }
</style>