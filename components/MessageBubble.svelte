<script>
  import { walletStore, settingsStore } from '../lib/stores.js';
  import { formatTimestamp } from '../lib/utils.js';
  import { Trash2, Clock } from 'lucide-svelte';

  let { message } = $props();

  const isOwnMessage = $derived(message.from === $walletStore.publicKey?.toString());
  const isExpired = $derived(message.expiresAt && Date.now() > message.expiresAt);

  $effect(() => {
    if (isExpired) {
      console.log('Message has expired:', message.id);
    }
  });

  function deleteMessage() {
    // In a real implementation, this would remove from storage
    console.log('Delete message:', message.id);
  }
</script>

<div class="flex {isOwnMessage ? 'justify-end' : 'justify-start'}">
  <div class="max-w-xs lg:max-w-md">
    {#if isExpired}
      <div class="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
        <div class="flex items-center gap-2 text-red-400">
          <Clock class="w-4 h-4" />
          <span class="text-sm">This message has expired</span>
        </div>
      </div>
    {:else}
      <div class="bg-{isOwnMessage ? 'purple-600' : 'gray-700'} rounded-lg p-3 text-white">
        <p class="break-words">{message.content}</p>
        <div class="flex items-center justify-between mt-2 text-xs opacity-70">
          <span>{formatTimestamp(message.timestamp)}</span>
          <div class="flex items-center gap-2">
            {#if message.expiresAt}
              <div class="flex items-center gap-1 text-yellow-300">
                <Clock class="w-3 h-3" />
                <span>Expires</span>
              </div>
            {/if}
            {#if isOwnMessage}
              <button
                onclick={deleteMessage}
                class="hover:text-red-300 transition-colors"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
