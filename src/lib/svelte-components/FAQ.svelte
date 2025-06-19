<script>
    let openItems = new Set();
    
    const toggleItem = (index) => {
        if (openItems.has(index)) {
            openItems.delete(index);
        } else {
            openItems.add(index);
        }
        openItems = new Set(openItems); // Trigger reactivity
    };
    
    const faqItems = [
        {
            question: "What are token streams?",
            answer: "Token streams are continuous, real-time payments that flow from a sender to a receiver over a specified period. Instead of sending tokens all at once, streams allow you to send tokens gradually over time at a fixed rate (e.g., 100 tokens per hour)."
        },
        {
            question: "How do I create a stream?",
            answer: "To create a stream, you need to specify: the receiver's wallet address, the rate (tokens per second), start time, and end time. The stream will automatically transfer tokens from your balance to the receiver's balance over the specified duration."
        },
        {
            question: "What's the difference between incoming and outgoing streams?",
            answer: "Incoming streams are payments you're receiving from others - you're the receiver. Outgoing streams are payments you're sending to others - you're the sender. Each type has different actions available based on your role in the stream."
        },
        {
            question: "What does 'Balance' do?",
            answer: "The Balance action claims any tokens that have accumulated in the stream up to the current time. Both senders and receivers can balance a stream to move the earned tokens to the receiver's wallet."
        },
        {
            question: "When should I use 'Forfeit' vs 'Close Now'?",
            answer: "Forfeit is used by receivers to return an incoming stream back to the sender (giving up future payments). Close Now is used by senders to immediately stop an outgoing stream (stopping future payments to the receiver)."
        },
        {
            question: "What does 'Finalize' mean?",
            answer: "Finalizing a stream marks it as permanently completed. This can only be done when the stream has ended and all balances have been claimed. Once finalized, the stream cannot be reopened or modified."
        },
        {
            question: "Can I modify a stream after creating it?",
            answer: "As a sender, you can change the close time of your outgoing streams (including closing them immediately). However, you cannot change the rate, receiver, or start time once a stream is created."
        },
        {
            question: "What happens if I don't have enough tokens for a stream?",
            answer: "When balancing a stream, if the sender doesn't have enough tokens to cover the full amount due, only the available balance will be transferred. The stream continues, but the receiver gets whatever tokens are available."
        },
        {
            question: "How do I view streams for another wallet?",
            answer: "Enter any wallet address in the 'Wallet Address (optional)' field and refresh. You'll see their streams in view-only mode - you won't be able to take actions on streams you don't own."
        },
        {
            question: "What are the different stream statuses?",
            answer: "Active: Stream is currently running. Completed: Stream has ended but may need balancing/finalizing. Closed: Stream was closed early. Finalized: Stream is permanently completed. Forfeit: Stream was returned to sender by receiver."
        },
        {
            question: "Is there a minimum or maximum stream duration?",
            answer: "There's no enforced minimum or maximum duration, but the stream must have a start time before the end time. Very short streams (seconds) or very long streams (years) are both technically possible."
        },
        {
            question: "Can I cancel a stream I created by mistake?",
            answer: "As a sender, you can use 'Close Now' to immediately stop the stream, then 'Close & Finalize' to complete it. As a receiver, you can 'Forfeit' the stream back to the sender."
        }
    ];
</script>

<section class="section dark-theme">
    <div class="container">
        <h1 class="title has-text-white mb-5">
            <span class="icon mr-2">
                <i class="fas fa-question-circle"></i>
            </span>
            Frequently Asked Questions
        </h1>
        
        <div class="faq-container">
            {#each faqItems as item, index}
                <div class="faq-item">
                    <button 
                        class="faq-question" 
                        on:click={() => toggleItem(index)}
                        class:is-open={openItems.has(index)}
                    >
                        <span class="question-text">{item.question}</span>
                        <span class="icon">
                            <i class="fas fa-chevron-{openItems.has(index) ? 'up' : 'down'}"></i>
                        </span>
                    </button>
                    
                    {#if openItems.has(index)}
                        <div class="faq-answer">
                            <p>{item.answer}</p>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
        
        <div class="card mt-6">
            <div class="card-content has-text-centered">
                <h3 class="subtitle has-text-white mb-3">Still have questions?</h3>
                <p class="has-text-grey mb-4">Join our community for support and discussions</p>
                <div class="buttons is-centered">
                    <a href="https://t.me/xian_network" target="_blank" class="button is-info is-rounded">
                        <span class="icon">
                            <i class="fab fa-telegram"></i>
                        </span>
                        <span>Join Telegram</span>
                    </a>
                    <a href="https://xian.org" target="_blank" class="button is-primary is-rounded">
                        <span class="icon">
                            <i class="fas fa-globe"></i>
                        </span>
                        <span>Visit Xian.org</span>
                    </a>
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
    
    .faq-container {
        max-width: 800px;
        margin: 0 auto;
    }
    
    .faq-item {
        background-color: #1e1e1e;
        border-radius: 8px;
        margin-bottom: 1rem;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .faq-question {
        width: 100%;
        background: transparent;
        border: none;
        padding: 1.5rem;
        color: #e0e0e0;
        font-size: 1.1rem;
        font-weight: 600;
        text-align: left;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.2s ease;
    }
    
    .faq-question:hover {
        background-color: #252525;
    }
    
    .faq-question.is-open {
        background-color: #2d2d2d;
        border-bottom: 1px solid #444;
    }
    
    .question-text {
        flex: 1;
        margin-right: 1rem;
    }
    
    .faq-answer {
        padding: 1.5rem;
        background-color: #252525;
        color: #bbb;
        line-height: 1.6;
        animation: slideDown 0.2s ease-out;
    }
    
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .card {
        background-color: #1e1e1e;
        color: #e0e0e0;
    }
</style> 