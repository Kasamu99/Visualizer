
# SolChat ✨

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/solchat-dev/solchat/ci.yml?branch=main)](https://github.com/solchat-dev/solchat/actions)
[![Last Commit](https://img.shields.io/github/last-commit/solchat-dev/solchat.svg)](https://github.com/solchat-dev/solchat/commits/main)
[![Repo Size](https://img.shields.io/github/repo-size/solchat-dev/solchat)](https://github.com/solchat-dev/solchat)
[![Stars](https://img.shields.io/github/stars/solchat-dev/solchat?style=social)](https://github.com/solchat-dev/solchat/stargazers)

**SolChat** is a secure, decentralized peer-to-peer messaging application built on the Solana blockchain. It features end-to-end encryption, decentralized file sharing, and a modern UI, providing a private and robust communication experience.

---

## 🚀 Features

### 🔐 Secure Messaging
- End-to-end encrypted messages using TweetNaCl.
- Messages stored locally with optional IPFS integration.
- Seamless wallet-based authentication (Phantom, Solflare, Backpack).

### 👥 User Management
- Custom usernames and editable profiles.
- Recent peers list with real-time status indicators.
- Nickname support for easier peer identification.

### 📁 File Sharing
- Share images, PDFs, and other documents securely.
- Built-in image preview modal.
- IPFS-backed decentralized file storage.

### 💻 UI & UX
- Responsive design for mobile and desktop.
- Real-time message status updates.
- Intuitive peer selection and chat interface.

---

## 🛠️ Prerequisites

- **Node.js** v18+
- **npm** or **Yarn**
- **Git** (recommended)
- A **Solana Wallet** (e.g., Phantom browser extension)

---

## 📦 Installation

```bash
git clone https://github.com/solchat-dev/solchat.git
cd solchat
npm install
# or
yarn install
```

### Configuration

- Modify the RPC endpoint and cluster config in `src/index.ts` (or equivalent).
- Ensure the correct on-chain chat program address is set in `src/idls/solchat.json`:
  ```json
  "metadata": {
    "address": "<your-program-address>",
    "origin": "anchor"
  }
  ```

### Generate TypeScript Types

```bash
npm install -g typescript ts-node
ts-node generate.ts
```

---

## 🚀 Usage

Start the development server:

```bash
npm start
# or
yarn dev
```

1. Connect your Solana wallet via the "Select Wallet" button.
2. Set your username when prompted.
3. Start messaging by entering a Solana address or selecting a recent peer.
4. Attach files via the paperclip icon. Image previews are supported.
5. Manage contacts and nicknames from the peers panel.

---

## ⚙️ Tech Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- Vite

### Blockchain
- `@solana/web3.js`
- `@solana/wallet-adapter`

### Storage & Encryption
- IPFS / Helia
- TweetNaCl
- LocalStorage

---

## 🤝 Contributing

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature/your-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add new feature"
   ```
4. Push to your fork:
   ```bash
   git push origin feature/your-feature
   ```
5. Open a Pull Request.

---

## 📜 License

Licensed under the [MIT License](LICENSE).

---

Made with ❤️ by the SolChat team.
