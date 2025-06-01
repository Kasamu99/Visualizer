<script>
  import { settingsStore } from '../lib/stores.js';
  import { Save, Download, Upload } from 'lucide-svelte';

  let tempSettings = $state({ ...$settingsStore });

  function saveSettings() {
    settingsStore.set(tempSettings);
    // Save to localStorage
    localStorage.setItem('decentrachat-settings', JSON.stringify(tempSettings));
  }

  function exportData() {
    const data = {
      settings: $settingsStore,
      timestamp: Date.now()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decentrachat-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.settings) {
          settingsStore.set(data.settings);
          tempSettings = { ...data.settings };
        }
      } catch (error) {
        console.error('Failed to import data:', error);
      }
    };
    reader.readAsText(file);
  }
</script>

<div class="h-full p-6">
  <div class="max-w-2xl mx-auto">
    <h2 class="text-2xl font-bold text-white mb-6">Settings</h2>

    <div class="space-y-6">
      <!-- Storage Settings -->
      <div class="bg-black/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
        <h3 class="text-lg font-semibold text-white mb-4">Storage Preferences</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2" for="primaryStorage">
              Primary Storage
            </label>
            <select
              id="primaryStorage"
              bind:value={tempSettings.primaryStorage}
              class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="arweave" class="bg-gray-800">Arweave</option>
              <option value="ipfs" class="bg-gray-800">IPFS</option>
            </select>
          </div>

          <div class="flex items-center gap-3">
            <input
              type="checkbox"
              id="enableBackup"
              bind:checked={tempSettings.enableBackupStorage}
              class="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
            />
            <label for="enableBackup" class="text-sm text-gray-300">
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
              type="checkbox"
              id="enableE2EE"
              bind:checked={tempSettings.enableE2EE}
              class="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
            />
            <label for="enableE2EE" class="text-sm text-gray-300">
              Enable end-to-end encryption (x25519)
            </label>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2" for="defaultExpiration">
              Default Message Expiration
            </label>
            <select
              id="defaultExpiration"
              bind:value={tempSettings.defaultExpiration}
              class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value={0} class="bg-gray-800">Never</option>
              <option value={3600} class="bg-gray-800">1 hour</option>
              <option value={86400} class="bg-gray-800">24 hours</option>
              <option value={604800} class="bg-gray-800">7 days</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Network Settings -->
      <div class="bg-black/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
        <h3 class="text-lg font-semibold text-white mb-4">Network</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2" for="rpcEndpoint">
              Solana RPC Endpoint
            </label>
            <input
              id="rpcEndpoint"
              bind:value={tempSettings.rpcEndpoint}
              placeholder="https://api.mainnet-beta.solana.com"
              class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2" for="ipfsGateway">
              IPFS Gateway
            </label>
            <input
              id="ipfsGateway"
              bind:value={tempSettings.ipfsGateway}
              placeholder="https://ipfs.io/ipfs/"
              class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      <!-- Data Management -->
      <div class="bg-black/20 backdrop-blur-md rounded-xl p-6 border border-white/10">
        <h3 class="text-lg font-semibold text-white mb-4">Data Management</h3>
        
        <div class="flex gap-4">
          <button
            onclick={exportData}
            class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Download class="w-4 h-4" />
            Export Data
          </button>
          
          <label class="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer">
            <Upload class="w-4 h-4" />
            Import Data
            <input
              type="file"
              accept=".json"
              onchange={importData}
              class="hidden"
            />
          </label>
        </div>
      </div>

      <!-- Save Button -->
      <button
        onclick={saveSettings}
        class="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
      >
        <Save class="w-4 h-4" />
        Save Settings
      </button>
    </div>
  </div>
</div>
