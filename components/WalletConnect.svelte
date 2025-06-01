<script>
  import { onMount } from 'svelte';
  import { walletStore } from '../lib/stores.js';
  import { connectWallet, disconnectWallet } from '../lib/wallet.js';
  import { Wallet, LogOut } from 'lucide-svelte';

  let isConnecting = $state(false);

  async function handleConnect() {
    isConnecting = true;
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      isConnecting = false;
    }
  }

  async function handleDisconnect() {
    await disconnectWallet();
  }
</script>

{#if $walletStore.connected}
  <button
    onclick={handleDisconnect}
    class="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
  >
    <LogOut class="w-4 h-4" />
    Disconnect
  </button>
{:else}
  <button
    onclick={handleConnect}
    disabled={isConnecting}
    class="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
  >
    <Wallet class="w-4 h-4" />
    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
  </button>
{/if}
