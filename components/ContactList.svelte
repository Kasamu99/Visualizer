<script>
  import { contactStore, messageStore } from '../lib/stores.js';
  import { formatTimestamp } from '../lib/utils.js';

  let { selectedContact = $bindable() } = $props();

  function selectContact(contact) {
    selectedContact = contact;
  }

  function getLastMessage(contact) {
    const messages = $messageStore.filter(m => 
      m.from === contact.address || m.to === contact.address
    );
    return messages.length > 0 ? messages[messages.length - 1] : null;
  }
</script>

<div class="flex-1 overflow-y-auto">
  {#each $contactStore as contact (contact.address)}
    {@const lastMessage = getLastMessage(contact)}
    <button
      onclick={() => selectContact(contact)}
      class="w-full p-4 text-left hover:bg-white/5 border-b border-white/5 transition-colors {selectedContact?.address === contact.address ? 'bg-white/10' : ''}"
    >
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
          {contact.name.slice(0, 2).toUpperCase()}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <h4 class="font-medium text-white truncate">{contact.name}</h4>
            {#if lastMessage}
              <span class="text-xs text-gray-400">
                {formatTimestamp(lastMessage.timestamp)}
              </span>
            {/if}
          </div>
          <p class="text-sm text-gray-400 truncate">
            {lastMessage ? lastMessage.content.slice(0, 50) + '...' : 'No messages yet'}
          </p>
        </div>
      </div>
    </button>
  {/each}
  
  {#if $contactStore.length === 0}
    <div class="p-8 text-center">
      <p class="text-gray-400">No contacts yet</p>
      <p class="text-sm text-gray-500 mt-1">Add a contact to start messaging</p>
    </div>
  {/if}
</div>
