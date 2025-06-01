<script>
  import { onMount } from 'svelte';
  import { burnerWalletStore } from '../lib/stores.js';
  import { createBurnerWallet, sendBurnerMessage } from '../lib/burner.js';
  import { Flame, Send, Trash2, Clock } from 'lucide-svelte';

  let messageText = $state('');
  let recipientAddress = $state('');
  let expirationTime = $state(3600); // 1 hour default
  let isLoading = $state(false);

  onMount(() => {
    if (!burnerWalletStore.keypair) {
      createBurnerWallet();
    }
  });

  async function sendMessage() {
    if (!messageText.trim() || !recipientAddress.trim() || isLoading) return;

    isLoading = true;
    try {
      await sendBurnerMessage(recipientAddress, messageText, expirationTime);
      messageText = '';
      recipientAddress = '';
    } catch (error) {
      console.error('Failed to send burner message:', error);
    } finally {
      isLoading = false;
    }
  }

  function destroyBurnerWallet() {
    burnerWalletStore.set({
      keypair: null,
      messages: []
    });
    createBurnerWallet();
  }

  const expirationOptions = [
    { value: 300, label: '5 minutes' },
    { value: 1800, label: '30 minutes' },
    { value: 3600, label: '1 hour' },
    { value: 86400, label: '24 hours' }
  ];
</script>

<div class="h-full p-6">
  <div class="max-w-4xl mx-auto">
    <div class="bg-black/20 backdrop-blur-md rounded-xl p-6 border border-orange-500/30">
      <div class="flex items-center gap-3 mb-6">
        <Flame class="w-6 h-6 text-orange-500" />
        <h2 class="text-2xl font-bold text-white">Burner Mode</h2>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <!-- Burner Wallet Info -->
        <div class="space-y-4">
          <div class="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-orange-300 mb-2">Temporary Wallet</h3>
            {#if burnerWalletStore.keypair}
              <p class="text-sm text-gray-300 break-all">
                {burnerWalletStore.keypair.publicKey.toString()}
              </p>
              <button
                onclick={destroyBurnerWallet}
                class="mt-3 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Trash2 class="w-4 h-4" />
                Destroy Wallet
              </button>
            {:else}
              <p class="text-gray-400">Generating burner wallet...</p>
            {/if}
          </div>

          <div class="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <h4 class="font-semibold text-yellow-300 mb-2">⚠️ Warning</h4>
            <ul class="text-sm text-gray-300 space-y-1">
              <li>• Messages self-destruct after expiration</li>
              <li>• Wallet is temporary and will be lost</li>
              <li>• No message recovery possible</li>
              <li>• Use for sensitive communications only</li>
            </ul>
          </div>
        </div>

        <!-- Send Burner Message -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-white">Send Self-Destructing Message</h3>
          
          <div>
            <label for="recipientAddress" class="block text-sm font-medium text-gray-300 mb-2">
              Recipient Address
            </label>
            <input
              id="recipientAddress"
              bind:value={recipientAddress}
              placeholder="Enter Solana address..."
              class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label for="messageText" class="block text-sm font-medium text-gray-300 mb-2">
              Message
            </label>
            <textarea
              id="messageText"
              bind:value={messageText}
              placeholder="Type your message..."
              rows="4"
              class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 resize-none"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              <Clock class="w-4 h-4 inline mr-1" />
              Expiration Time
            </label>
            <select
              bind:value={expirationTime}
              class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-orange-500"
            >
              {#each expirationOptions as option}
                <option value={option.value} class="bg-gray-800">
                  {option.label}
                </option>
              {/each}
            </select>
          </div>

          <button
            onclick={sendMessage}
            disabled={!messageText.trim() || !recipientAddress.trim() || isLoading}
            class="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
          >
            <Send class="w-4 h-4" />
            {isLoading ? 'Sending...' : 'Send Burner Message'}
          </button>
        </div>
      </div>

      <!-- Burner Messages -->
      {#if burnerWalletStore.messages.length > 0}
        <div class="mt-8">
          <h3 class="text-lg font-semibold text-white mb-4">Burner Messages</h3>
          <div class="space-y-3">
            {#each burnerWalletStore.messages as message}
              <div class="bg-white/5 border border-white/10 rounded-lg p-4">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <p class="text-white">{message.content}</p>
                    <p class="text-sm text-gray-400 mt-1">
                      To: {message.to.slice(0, 8)}...
                    </p>
                  </div>
                  <div class="text-right text-sm text-orange-300">
                    <div class="flex items-center gap-1">
                      <Clock class="w-3 h-3" />
                      <span>Expires in {Math.max(0, Math.floor((message.expiresAt - Date.now()) / 1000 / 60))}m</span>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
