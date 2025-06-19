<script>
    import "bulma/css/bulma.min.css";
    import { onMount, setContext } from "svelte";
    import { handleWalletError, handleWalletInfo } from "./lib/js/main";
    import { updateCurrentCounter } from "./lib/js/node";
    // @ts-ignore
    import XianWalletUtils from "./lib/js/xian-dapp-utils";
    import { config } from "./lib/js/config";
    import Nav from "./lib/svelte-components/Nav.svelte";
    import Section from "./lib/svelte-components/Section.svelte";
    import CreateStream from "./lib/svelte-components/CreateStream.svelte";
    import FAQ from "./lib/svelte-components/FAQ.svelte";
    import Footer from "./lib/svelte-components/Footer.svelte";

    let xdu;
    let currentPage = 'streams';

    const setPage = (page) => {
        currentPage = page;
    };

    onMount(async ()=>{
        XianWalletUtils.init(config.nodeUrl);

        const info = await XianWalletUtils.requestWalletInfo().catch(handleWalletError);
        handleWalletInfo(info);

        await updateCurrentCounter()
        // store XianWalletUtils instance
        xdu = XianWalletUtils
    });  

    setContext('app_functions', {
        xdu: () => {
          return xdu
        }
    })
</script>

<main>
  <Nav {currentPage} {setPage}/>
  
  {#if currentPage === 'streams'}
    <Section/>
  {:else if currentPage === 'create'}
    <CreateStream/>
  {:else if currentPage === 'faq'}
    <FAQ/>
  {/if}
  
  <Footer/>
</main>
