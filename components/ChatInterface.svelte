<script>
  import { onMount } from 'svelte';
  import { walletStore, messageStore, contactStore } from '../lib/stores.js';
  import { sendMessage, loadMessages } from '../lib/messaging.js';
  import MessageBubble from './MessageBubble.svelte';
  import ContactList from './ContactList.svelte';
  import { Send, Plus } from 'lucide-svelte';
  import { derived } from 'svelte/store';

  let messageText = $state('');
  let selectedContact = $state(null);
  let isLoading = $state(false);
  let showAddContact = $state(false);
  let newContactAddress = $state('');

  const walletStoreValue = walletStore;
  const messageStoreValue = messageStore;
  const contactStoreValue = contactStore;

  onMount(async () => {
    if (walletStoreValue.connected) {
      await loadMessages();
    }
  });

  async function handleSendMessage() {
    if (!messageText.trim() || !selectedContact || isLoading) return;

    isLoading = true;
    try {
      await sendMessage(selectedContact.address, messageText.trim());
      messageText = '';
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      isLoading = false;
    }
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  async function addContact() {
    if (!newContactAddress.trim()) return;
    
    const contact = {
      address: newContactAddress.trim(),
      name: newContactAddress.slice(0, 8) + '...',
      lastMessage: null,
      timestamp: Date.now()
    };
    
    contactStoreValue.update(contacts => [...contacts, contact]);
    newContactAddress = '';
    showAddContact = false;
  }

  const messages = derived([messageStoreValue, contactStoreValue], ([$messageStoreValue, $contactStoreValue]) => {
    return selectedContact 
      ? $messageStoreValue.filter(m => 
          m.from === selectedContact.address || m.to === selectedContact.address
        ).sort((a, b) => a.timestamp - b.timestamp)
      : [];
  });
</script>

<div class="flex h-full">
  <!-- Contact List -->
  <div class="w-80 bg-black/10 backdrop-blur-md border-r border-white/10 flex flex-col">
    <div class="p-4 border-b border-white/10">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">Contacts</h3>
        <button
          onclick={() => showAddContact = !showAddContact}
          class="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>
      
      {#if showAddContact}
        <div class="space-y-2">
          <input
            bind:value={newContactAddress}
            placeholder="Enter Solana address..."
            class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
          <div class="flex gap-2">
            <button
              onclick={addContact}
              class="flex-1 bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-sm transition-colors"
            >
              Add
            </button>
            <button
              onclick={() => showAddContact = false}
              class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-1 px-3 rounded text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      {/if}
    </div>
    
    <ContactList bind:selectedContact />
  </div>

  <!-- Chat Area -->
  <div class="flex-1 flex flex-col">
    {#if selectedContact}
      <!-- Chat Header -->
      <div class="p-4 border-b border-white/10 bg-black/10 backdrop-blur-md">
        <h3 class="text-lg font-semibold text-white">{selectedContact.name}</h3>
        <p class="text-sm text-gray-400">{selectedContact.address}</p>
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        {#each messageStoreValue as message (message.id)}
          {#if message.from === selectedContact.address || message.to === selectedContact.address}
            <MessageBubble {message} />
          {/if}
        {/each}
      </div>

      <!-- Message Input -->
      <div class="p-4 border-t border-white/10 bg-black/10 backdrop-blur-md">
        <div class="flex gap-2">
          <textarea
            bind:value={messageText}
            onkeypress={handleKeyPress}
            placeholder="Type your message..."
            class="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
            rows="1"
          ></textarea>
          <button
            onclick={handleSendMessage}
            disabled={!messageText.trim() || isLoading}
            class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <Send class="w-4 h-4" />
          </button>
        </div>
      </div>
    {:else}
      <div class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <h3 class="text-xl font-semibold text-white mb-2">Select a contact</h3>
          <p class="text-gray-400">Choose a contact to start messaging</p>
        </div>
      </div>
    {/if}
  </div>
</div>
