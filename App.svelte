<script>
  import { onMount } from 'svelte';
  import WalletConnect from './components/WalletConnect.svelte';
  import ChatInterface from './components/ChatInterface.svelte';
  import BurnerWallet from './components/BurnerWallet.svelte';
  import Settings from './components/Settings.svelte';
  import { Home, MessageCircle, Flame, Settings as SettingsIcon } from 'lucide-svelte';
  
  // Initialize stores directly in App.svelte for preview functionality
  // Wallet store
  let walletStore = $state({
    connected: false,
    publicKey: null,
    adapter: null,
  });
  
  // Message store with sample data for preview
  let messageStore = [
    {
      id: 'msg1',
      from: 'DemoWallet123456789',
      to: 'RecipientWallet987654321',
      content: 'Hello, this is a test message!',
      timestamp: Date.now() - 3600000,
      expiresAt: null,
      encrypted: false,
    },
    {
      id: 'msg2',
      from: 'RecipientWallet987654321',
      to: 'DemoWallet123456789',
      content: 'Hi there! Got your message.',
      timestamp: Date.now() - 1800000,
      expiresAt: null,
      encrypted: false,
    }
  ];
  
  // Contact store with sample data for preview
  let contactStore = [
    {
      address: 'RecipientWallet987654321',
      name: 'Demo Contact',
      lastMessage: 'Hi there! Got your message.',
      timestamp: Date.now() - 1800000
    }
  ];
  
  // Settings store
  let settingsStore = {
    primaryStorage: "arweave",
    enableBackupStorage: true,
    enableE2EE: true,
    defaultExpiration: 0,
    rpcEndpoint: "https://api.mainnet-beta.solana.com",
    ipfsGateway: "https://ipfs.io/ipfs/",
  };
  
  // Burner wallet store
  let burnerWalletStore = {
    keypair: {
      publicKey: {
        toString: () => 'BurnerWallet123456789'
      }
    },
    messages: [
      {
        id: 'burner1',
        from: 'BurnerWallet123456789',
        to: 'RecipientWallet987654321',
        content: 'This is a self-destructing message!',
        timestamp: Date.now() - 900000,
        expiresAt: Date.now() + 3600000,
        burner: true,
      }
    ]
  };

  let currentView = $state('home');
  let isInitialized = true; // Set to true for immediate preview

  // Mock functions for preview functionality
  function connectWallet() {
    walletStore = {
      ...walletStore,
      connected: true,
      publicKey: {
        toString: () => 'DemoWallet123456789'
      }
    };
  }
  
  function disconnectWallet() {
    walletStore = {
      ...walletStore,
      connected: false,
      publicKey: null
    };
  }

  function setView(view) {
    currentView = view;
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
  {#if !isInitialized}
    <div class="flex items-center justify-center min-h-screen">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
    </div>
  {:else}
    <div class="flex flex-col h-screen">
      <!-- Header -->
      <header class="bg-black/20 backdrop-blur-md border-b border-white/10 p-4">
        <div class="flex items-center justify-between max-w-6xl mx-auto">
          <h1 class="text-2xl font-bold text-white">DecentraChat</h1>
          <div class="flex items-center gap-4">
            {#if walletStore.connected}
              <span class="text-sm text-gray-300">
                {walletStore.publicKey?.toString().slice(0, 8)}...
              </span>
            {/if}
            <!-- Simplified WalletConnect for preview -->
            {#if walletStore.connected}
              <button
                onclick={disconnectWallet}
                class="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Disconnect
              </button>
            {:else}
              <button
                onclick={connectWallet}
                class="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Connect Wallet
              </button>
            {/if}
          </div>
        </div>
      </header>

      <div class="flex flex-1 overflow-hidden">
        <!-- Sidebar -->
        <nav class="w-64 bg-black/20 backdrop-blur-md border-r border-white/10 p-4">
          <div class="space-y-2">
            <button
              onclick={() => setView('home')}
              class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors {currentView === 'home' ? 'bg-white/20' : ''}"
            >
              <Home class="w-5 h-5" />
              Home
            </button>
            <button
              onclick={() => setView('chat')}
              class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors {currentView === 'chat' ? 'bg-white/20' : ''}"
            >
              <MessageCircle class="w-5 h-5" />
              Messages
            </button>
            <button
              onclick={() => setView('burner')}
              class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors {currentView === 'burner' ? 'bg-white/20' : ''}"
            >
              <Flame class="w-5 h-5" />
              Burner Mode
            </button>
            <button
              onclick={() => setView('settings')}
              class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-colors {currentView === 'settings' ? 'bg-white/20' : ''}"
            >
              <SettingsIcon class="w-5 h-5" />
              Settings
            </button>
          </div>
        </nav>

        <!-- Main Content -->
        <main class="flex-1 overflow-hidden">
          {#if currentView === 'home'}
            <div class="flex items-center justify-center h-full p-8">
              <div class="text-center max-w-2xl">
                <h2 class="text-4xl font-bold text-white mb-6">Welcome to DecentraChat</h2>
                <p class="text-xl text-gray-300 mb-8">
                  A fully decentralized messaging platform with end-to-end encryption,
                  Solana wallet authentication, and Arweave/IPFS storage.
                </p>
                {#if !walletStore.connected}
                  <p class="text-lg text-yellow-300">
                    Connect your Solana wallet to start messaging securely.
                  </p>
                {:else}
                  <button
                    onclick={() => setView('chat')}
                    class="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Start Messaging
                  </button>
                {/if}
              </div>
            </div>
          {:else if currentView === 'chat'}
            <!-- Simplified Chat Interface for preview -->
            <div class="flex h-full">
              <!-- Contact List -->
              <div class="w-80 bg-black/10 backdrop-blur-md border-r border-white/10 flex flex-col">
                <div class="p-4 border-b border-white/10">
                  <h3 class="text-lg font-semibold text-white">Contacts</h3>
                </div>
                
                <div class="flex-1 overflow-y-auto">
                  {#each contactStore as contact}
                    <button
                      class="w-full p-4 text-left hover:bg-white/5 border-b border-white/5 transition-colors bg-white/10"
                    >
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {contact.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center justify-between">
                            <h4 class="font-medium text-white truncate">{contact.name}</h4>
                            <span class="text-xs text-gray-400">
                              {new Date(contact.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p class="text-sm text-gray-400 truncate">
                            {contact.lastMessage}
                          </p>
                        </div>
                      </div>
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Chat Area -->
              <div class="flex-1 flex flex-col">
                <!-- Chat Header -->
                <div class="p-4 border-b border-white/10 bg-black/10 backdrop-blur-md">
                  <h3 class="text-lg font-semibold text-white">Demo Contact</h3>
                  <p class="text-sm text-gray-400">RecipientWallet987654321</p>
                </div>

                <!-- Messages -->
                <div class="flex-1 overflow-y-auto p-4 space-y-4">
                  {#each messageStore as message}
                    <div class="flex {message.from === 'DemoWallet123456789' ? 'justify-end' : 'justify-start'}">
                      <div class="max-w-xs lg:max-w-md">
                        <div class="bg-{message.from === 'DemoWallet123456789' ? 'purple-600' : 'gray-700'} rounded-lg p-3 text-white">
                          <p class="break-words">{message.content}</p>
                          <div class="flex items-center justify-between mt-2 text-xs opacity-70">
                            <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>

                <!-- Message Input -->
                <div class="p-4 border-t border-white/10 bg-black/10 backdrop-blur-md">
                  <div class="flex gap-2">
                    <textarea
                      placeholder="Type your message..."
                      class="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
                      rows="1"
                    ></textarea>
                    <button
                      onclick={() => {}}
                      class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          {:else if currentView === 'burner'}
            <!-- Simplified Burner Wallet for preview -->
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
                        <p class="text-sm text-gray-300 break-all">
                          {burnerWalletStore.keypair.publicKey.toString()}
                        </p>
                        <button
                          onclick={() => {}}
                          class="mt-3 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          Destroy Wallet
                        </button>
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
                          type="text"
                          placeholder="Enter Solana address..."
                          class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label for="burnerMessage" class="block text-sm font-medium text-gray-300 mb-2">
                          Message
                        </label>
                        <textarea
                          id="burnerMessage"
                          placeholder="Type your message..."
                          rows="4"
                          class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 resize-none"
                        ></textarea>
                      </div>

                      <div>
                        <label for="expirationTime" class="block text-sm font-medium text-gray-300 mb-2">
                          Expiration Time
                        </label>
                        <select
                          id="expirationTime"
                          class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="300" class="bg-gray-800">5 minutes</option>
                          <option value="1800" class="bg-gray-800">30 minutes</option>
                          <option value="3600" class="bg-gray-800">1 hour</option>
                          <option value="86400" class="bg-gray-800">24 hours</option>
                        </select>
                      </div>

                      <button
                        onclick={() => {}}
                        class="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                      >
                        Send Burner Message
                      </button>
                    </div>
                  </div>

                  <!-- Burner Messages -->
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
                                <span>Expires in 60m</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {:else if currentView === 'settings'}
            <!-- Simplified Settings for preview -->
            <div class="h-full p-6">
              <div class="max-w-2xl mx-auto">
                <h2 class="text-2xl font-bold text-white mb-6">Settings</h2>

                <div class="space-y-6">
                  <!-- Storage Settings -->
                  <div class="bg-black/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <h3 class="text-lg font-semibold text-white mb-4">Storage Preferences</h3>
                    
                    <div class="space-y-4">
                      <div>
                        <label for="primaryStorage" class="block text-sm font-medium text-gray-300 mb-2">
                          Primary Storage
                        </label>
                        <select
                          id="primaryStorage"
                          class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="arweave" class="bg-gray-800">Arweave</option>
                          <option value="ipfs" class="bg-gray-800">IPFS</option>
                        </select>
                      </div>

                      <div class="flex items-center gap-3">
                        <input
                          id="enableBackupStorage"
                          type="checkbox"
                          checked
                          class="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                        />
                        <label for="enableBackupStorage" class="text-sm text-gray-300">
                          Enable backup storage (dual storage for redundancy)
                        </label>
                      </div>
                    </div>
                  </div>

                  <!-- Encryption Settings -->
                  <div class="bg-black/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <h3 class="text-lg font-semibold text-white mb-4">Encryption</h3>
                    
                    <div class="space-y-4">
                      <div class="flex items-center gap-3">
                        <input
                          id="enableE2EE"
                          type="checkbox"
                          checked
                          class="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                        />
                        <label for="enableE2EE" class="text-sm text-gray-300">
                          Enable end-to-end encryption (x25519)
                        </label>
                      </div>

                      <div>
                        <label for="defaultExpiration" class="block text-sm font-medium text-gray-300 mb-2">
                          Default Message Expiration
                        </label>
                        <select
                          id="defaultExpiration"
                          class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="0" class="bg-gray-800">Never</option>
                          <option value="3600" class="bg-gray-800">1 hour</option>
                          <option value="86400" class="bg-gray-800">24 hours</option>
                          <option value="604800" class="bg-gray-800">7 days</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <!-- Save Button -->
                  <button
                    onclick={() => {}}
                    class="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          {/if}
        </main>
      </div>
    </div>
  {/if}
</div>
