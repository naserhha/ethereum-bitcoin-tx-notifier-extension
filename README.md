# 🔗 Ethereum & Bitcoin Crypto Transaction Notifier

A Chrome Extension (Manifest V3) that monitors both **Ethereum** and **Bitcoin** wallet addresses and sends browser notifications when new transactions are detected.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![Ethereum](https://img.shields.io/badge/Ethereum-ETH-orange?logo=ethereum)](https://ethereum.org/)
[![Bitcoin](https://img.shields.io/badge/Bitcoin-BTC-yellow?logo=bitcoin)](https://bitcoin.org/)
[![Open Source](https://img.shields.io/badge/Open-Source-green?logo=github)](https://github.com/nasserhaji/ethereum-bitcoin-crypto-transaction-notifier)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Tags:** `chrome-extension` `ethereum` `bitcoin` `crypto` `blockchain` `transaction` `notifier` `wallet` `notifications` `open-source`

## ✨ Features

- **🔗 Dual Blockchain Support**: Monitor Ethereum (ETH) and Bitcoin (BTC) addresses simultaneously
- **🔔 Real-time Notifications**: Get browser notifications for new transactions
- **🔑 Secure API Key Management**: Use your own Etherscan API key for ETH monitoring
- **🆓 No API Key Required for BTC**: Bitcoin monitoring uses free Blockstream API
- **🛡️ Privacy First**: All data stored locally, no external servers
- **⚙️ Individual Controls**: Enable/disable monitoring for each blockchain separately
- **📊 Status Monitoring**: Real-time status indicators and error reporting
- **🌍 Multilingual**: Support for multiple languages
- **🚀 Production Ready**: Comprehensive error handling and rate limiting

## 📋 Requirements

- **Chrome Browser** (or Chromium-based browsers)
- **Etherscan API Key** (free) for Ethereum monitoring
- **No API key required** for Bitcoin monitoring

## 🚀 Installation

### 1. Download Extension Files
```bash
git clone https://github.com/nasserhaji/ethereum-bitcoin-crypto-transaction-notifier
cd ethereum-bitcoin-crypto-transaction-notifier
```

### 2. Generate Icons
1. Open `create_icons.html` in your browser
2. Click "Generate All Icons"
3. Download the generated icons (icon16.png, icon48.png, icon128.png)
4. Place them in the `icons/` folder

### 3. Load Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the extension folder
5. The extension should now appear in your extensions list

### 4. Configure the Extension
1. Click the extension icon in your browser toolbar
2. Enter your Ethereum and/or Bitcoin addresses
3. Enter your Etherscan API key (required for ETH monitoring)
4. Enable monitoring for ETH and/or BTC using the toggles
5. Click "Save Configuration"

## 🔑 API Key Setup

### Etherscan API Key (Required for ETH)
1. Visit [Etherscan API Key](https://etherscan.io/myapikey)
2. Create a free account if you don't have one
3. Generate a new API key
4. Copy the API key and paste it in the extension
5. **Free tier limits**: 5 calls/second, 100,000 calls/day

### Bitcoin Monitoring (No API Key Required)
- Uses Blockstream.info API
- No registration required
- Generous rate limits

## 🧪 Test Addresses

### Ethereum (High Activity)
```
0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
```
*Vitalik Buterin's address - good for testing notifications*

### Bitcoin (Example)
```
bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
```
*Example Bitcoin address for testing*

## 📁 File Structure

```
blockchain-tx-notifier/
├── manifest.json              # Extension configuration
├── background.js              # Service worker for monitoring
├── popup.html                 # User interface
├── popup.js                   # Popup functionality
├── popup.css                  # Styling
├── _locales/                  # Internationalization
│   └── en/
│       └── messages.json      # English translations
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── create_icons.html          # Icon generator
├── test-extension.html        # Test page
└── README.md                  # This file
```

## 🔧 Technical Details

### Permissions
- `storage`: Save configuration locally
- `notifications`: Show transaction alerts
- `alarms`: Schedule periodic checks
- `host_permissions`: Access Etherscan and Blockstream APIs

### APIs Used
- **Etherscan API**: For Ethereum transaction monitoring
- **Blockstream API**: For Bitcoin transaction monitoring

### Monitoring Frequency
- Checks every 60 seconds when monitoring is enabled
- Automatic rate limiting and error handling
- Pauses monitoring when API limits are reached

## 🛡️ Security & Privacy

### Security Features
- ✅ **Local Storage**: All data stored in your browser's local storage
- ✅ **No External Servers**: Extension works entirely client-side
- ✅ **API Key Protection**: Your API key never leaves your device
- ✅ **HTTPS Only**: All API calls use secure HTTPS connections
- ✅ **Rate Limiting**: Built-in protection against API abuse
- ✅ **Error Handling**: Comprehensive error handling and user feedback

### Privacy Guarantees
- Your wallet addresses stay on your device
- Your API key is never transmitted to external servers
- No tracking or analytics
- No data collection

## 🔧 Troubleshooting

### Common Issues

**No notifications appearing:**
- Check browser notification permissions
- Verify addresses are in correct format
- Ensure monitoring is enabled for the blockchain

**API errors:**
- Verify your Etherscan API key is valid
- Check if you've exceeded API rate limits
- Try refreshing the extension

**Rate limiting:**
- Wait for the automatic pause to end (usually 1 minute)
- Consider upgrading your Etherscan API plan if needed

**Extension not loading:**
- Check Chrome developer console for errors
- Verify all files are in the correct location
- Try reloading the extension

### Debug Mode
1. Open Chrome DevTools (F12)
2. Go to the Console tab
3. Look for extension-related messages
4. Check for any error messages

## 🌍 Internationalization

The extension supports multiple languages through the `_locales/` directory. Currently includes:
- English (en)

To add more languages:
1. Create a new folder in `_locales/` (e.g., `es/` for Spanish)
2. Add a `messages.json` file with translated strings
3. Update the manifest.json to include the new locale

## 🚀 Development

### Building from Source
1. Clone the repository
2. Generate icons using `create_icons.html`
3. Load as unpacked extension in Chrome
4. Make changes and reload the extension

### Testing
1. Use the provided test addresses
2. Monitor the browser console for errors
3. Test with both ETH and BTC addresses
4. Verify notifications work correctly

## 📊 API Usage

### Etherscan API (Ethereum)
- **Free Tier**: 5 calls/second, 100,000 calls/day
- **Endpoint**: `https://api.etherscan.io/api`
- **Authentication**: API key required

### Blockstream API (Bitcoin)
- **Rate Limits**: Generous, no authentication required
- **Endpoint**: `https://blockstream.info/api`
- **Authentication**: None required

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **Etherscan** for providing the Ethereum API
- **Blockstream** for providing the Bitcoin API
- **Chrome Extensions** team for the excellent documentation

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Verify your API keys and addresses are correct
4. Test with the provided test addresses

---

**🔗 Ethereum & Bitcoin Crypto Transaction Notifier** - Secure • Local Storage • No External Servers

Built with ❤️ for the blockchain community

---

## 👨‍💻 Author

**Mohammad Nasser Haji Hashemabad**

- **LinkedIn**: [@nasserhaji](https://ir.linkedin.com/in/nasserhaji)
- **GitHub**: [@nasserhaji](https://github.com/nasserhaji)
- **Website**: [mohammadnasser.com](https://mohammadnasser.com/)
- **Extension Homepage**: [crypto-transaction.mohammadnasser.com](https://crypto-transaction.mohammadnasser.com/)
- **Repository**: [ethereum-bitcoin-crypto-transaction-notifier](https://github.com/nasserhaji/ethereum-bitcoin-crypto-transaction-notifier) 