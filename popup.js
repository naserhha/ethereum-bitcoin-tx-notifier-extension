// Popup script for Dual Blockchain TX Notifier
// Handles user interface interactions, configuration management, and status monitoring

// Validation regex patterns
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const BTC_ADDRESS_REGEX = /^(bc1|[13])[a-zA-Z0-9]{25,62}$/;

let justSavedConfig = false;
let suppressGuidance = false;

document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const ethAddressInput = document.getElementById('ethAddress');
    const btcAddressInput = document.getElementById('btcAddress');
    const apiKeyInput = document.getElementById('apiKey');
    const ethEnabledToggle = document.getElementById('ethEnabled');
    const btcEnabledToggle = document.getElementById('btcEnabled');
    const toggleApiKeyBtn = document.getElementById('toggleApiKey');
    const saveConfigBtn = document.getElementById('saveConfig');
    const clearConfigBtn = document.getElementById('clearConfig');
    const statusMessage = document.getElementById('statusMessage');
    const currentConfig = document.getElementById('currentConfig');
    const ethAddressValidation = document.getElementById('ethAddressValidation');
    const btcAddressValidation = document.getElementById('btcAddressValidation');
    // Language switcher elements
    const languageBtn = document.getElementById('languageBtn');
    const languageDropdown = document.getElementById('languageDropdown');
    // Status elements
    const ethStatus = document.getElementById('ethStatus');
    const btcStatus = document.getElementById('btcStatus');
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    const ethMonitoringStatus = document.getElementById('ethMonitoringStatus');
    const btcMonitoringStatus = document.getElementById('btcMonitoringStatus');
    const lastCheckStatus = document.getElementById('lastCheckStatus');
    const rateLimitStatus = document.getElementById('rateLimitStatus');
    const consecutiveErrorsStatus = document.getElementById('consecutiveErrorsStatus');
    const errorSection = document.getElementById('errorSection');

    // DEBUG: Check for missing elements
    const requiredElements = [
        ['ethAddressInput', ethAddressInput],
        ['btcAddressInput', btcAddressInput],
        ['apiKeyInput', apiKeyInput],
        ['ethEnabledToggle', ethEnabledToggle],
        ['btcEnabledToggle', btcEnabledToggle],
        ['toggleApiKeyBtn', toggleApiKeyBtn],
        ['saveConfigBtn', saveConfigBtn],
        ['clearConfigBtn', clearConfigBtn],
        ['statusMessage', statusMessage],
        ['currentConfig', currentConfig],
        ['ethAddressValidation', ethAddressValidation],
        ['btcAddressValidation', btcAddressValidation],
        ['languageBtn', languageBtn],
        ['languageDropdown', languageDropdown],
        ['ethStatus', ethStatus],
        ['btcStatus', btcStatus],
        ['apiKeyStatus', apiKeyStatus],
        ['ethMonitoringStatus', ethMonitoringStatus],
        ['btcMonitoringStatus', btcMonitoringStatus],
        ['lastCheckStatus', lastCheckStatus],
        ['rateLimitStatus', rateLimitStatus],
        ['consecutiveErrorsStatus', consecutiveErrorsStatus],
        ['errorSection', errorSection],
    ];
    const missing = requiredElements.filter(([name, el]) => !el).map(([name]) => name);
    if (missing.length > 0) {
        console.error('popup.js: Missing required DOM elements:', missing);
        return;
    }

    // --- All functions that use DOM elements are now defined inside this block ---

    function showStatus(message, type = 'info') {
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = `status-message ${type}`;
            if (type === 'success') {
                setTimeout(() => {
                    statusMessage.style.display = 'none';
                }, 3000);
            }
        }
    }

    function showCurrentConfig() {
        chrome.storage.local.get(['ethAddress', 'btcAddress', 'apiKey', 'ethEnabled', 'btcEnabled'], (data) => {
            const items = [];
            if (data.ethAddress && data.ethEnabled) {
                items.push(`
                  <div class="config-item config-eth">
                    <img src="icons/eth.svg" class="config-icon" alt="ETH">
                    <span class="config-label">ETH:</span>
                    <span class="config-value">${data.ethAddress}</span>
                  </div>
                `);
            }
            if (data.btcAddress && data.btcEnabled) {
                items.push(`
                  <div class="config-item config-btc">
                    <img src="icons/btc.svg" class="config-icon" alt="BTC">
                    <span class="config-label">BTC:</span>
                    <span class="config-value">${data.btcAddress}</span>
                  </div>
                `);
            }
            if (data.apiKey) {
                const maskedApiKey = data.apiKey.substring(0, 4) + '...' + data.apiKey.substring(data.apiKey.length - 4);
                items.push(`
                  <div class="config-item config-api">
                    <span class="config-icon" style="font-size:1.2em;">🔑</span>
                    <span class="config-label">API:</span>
                    <span class="config-value">${maskedApiKey}</span>
                  </div>
                `);
            }
            if (items.length > 0) {
                if (currentConfig) {
                    currentConfig.innerHTML = items.join('');
                    currentConfig.style.display = '';
                }
            } else {
                if (currentConfig) {
                    currentConfig.innerHTML = '';
                    currentConfig.style.display = 'none';
                }
            }
        });
    }

    function hideCurrentConfig() {
        if (currentConfig) {
            currentConfig.classList.remove('show');
        }
    }

    function setButtonLoading(loading) {
        const btn = saveConfigBtn;
        if (btn) {
            if (loading) {
                btn.classList.add('loading');
                btn.disabled = true;
            } else {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        }
    }

    async function testApiConnection(address, apiKey) {
        try {
            console.log('API connection test completed for address:', address);
            showStatus(chrome.i18n.getMessage('apiTestSuccess'), 'success');
        } catch (error) {
            console.error('API connection test failed:', error);
            showStatus(chrome.i18n.getMessage('apiTestError'), 'warning');
        }
    }

    function updateStatusDisplay() {
        chrome.runtime.sendMessage({action: 'getStatus'}, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error getting status:', chrome.runtime.lastError);
                return;
            }
            if (response) {
                if (ethStatus) {
                    ethStatus.textContent = response.hasEthAddress ? '✅ Set' : '❌ Not Set';
                    ethStatus.className = response.hasEthAddress ? 'status-value success' : 'status-value error';
                }
                if (btcStatus) {
                    btcStatus.textContent = response.hasBtcAddress ? '✅ Set' : '❌ Not Set';
                    btcStatus.className = response.hasBtcAddress ? 'status-value success' : 'status-value error';
                }
                if (apiKeyStatus) {
                    apiKeyStatus.textContent = response.hasApiKey ? '✅ Set' : '❌ Not Set';
                    apiKeyStatus.className = response.hasApiKey ? 'status-value success' : 'status-value error';
                }
                if (ethMonitoringStatus) {
                    if (response.ethEnabled) {
                        ethMonitoringStatus.textContent = response.isRateLimited ? '⏸️ Rate Limited' : '✅ Active';
                        ethMonitoringStatus.className = response.isRateLimited ? 'status-value warning' : 'status-value success';
                    } else {
                        ethMonitoringStatus.textContent = '⏸️ Disabled';
                        ethMonitoringStatus.className = 'status-value error';
                    }
                }
                if (btcMonitoringStatus) {
                    if (response.btcEnabled) {
                        btcMonitoringStatus.textContent = response.isRateLimited ? '⏸️ Rate Limited' : '✅ Active';
                        btcMonitoringStatus.className = response.isRateLimited ? 'status-value warning' : 'status-value success';
                    } else {
                        btcMonitoringStatus.textContent = '⏸️ Disabled';
                        btcMonitoringStatus.className = 'status-value error';
                    }
                }
                if (lastCheckStatus) {
                    if (response.lastCheckTime) {
                        const lastCheck = new Date(response.lastCheckTime);
                        const now = new Date();
                        const diffMinutes = Math.floor((now - lastCheck) / 60000);
                        if (diffMinutes < 1) {
                            lastCheckStatus.textContent = 'Just now';
                        } else if (diffMinutes < 60) {
                            lastCheckStatus.textContent = `${diffMinutes}m ago`;
                        } else {
                            const diffHours = Math.floor(diffMinutes / 60);
                            lastCheckStatus.textContent = `${diffHours}h ago`;
                        }
                        lastCheckStatus.className = 'status-value info';
                    } else {
                        lastCheckStatus.textContent = 'Never';
                        lastCheckStatus.className = 'status-value error';
                    }
                }
                if (errorSection && rateLimitStatus && consecutiveErrorsStatus) {
                    if (response.isRateLimited || response.consecutiveErrors > 0) {
                        errorSection.style.display = 'block';
                        rateLimitStatus.textContent = response.isRateLimited ? 'Yes' : 'No';
                        rateLimitStatus.className = 'error-value';
                        consecutiveErrorsStatus.textContent = response.consecutiveErrors.toString();
                        consecutiveErrorsStatus.className = 'error-value';
                    } else {
                        errorSection.style.display = 'none';
                    }
                }
            }
        });
    }

    function setupEventListeners() {
        if (saveConfigBtn) saveConfigBtn.addEventListener('click', handleSaveConfig);
        if (clearConfigBtn) clearConfigBtn.addEventListener('click', handleClearConfig);
        if (toggleApiKeyBtn) toggleApiKeyBtn.addEventListener('click', toggleApiKeyVisibility);
        if (languageBtn) languageBtn.addEventListener('click', toggleLanguageDropdown);
        document.addEventListener('click', handleLanguageDropdownClick);
        if (ethAddressInput) ethAddressInput.addEventListener('input', (e) => {
            suppressGuidance = false;
            const address = e.target.value.trim();
            validateEthAddress(address);
        });
        if (btcAddressInput) btcAddressInput.addEventListener('input', (e) => {
            const address = e.target.value.trim();
            validateBtcAddress(address);
        });
        if (apiKeyInput) apiKeyInput.addEventListener('input', (e) => {
            suppressGuidance = false;
            const apiKey = e.target.value.trim();
            validateApiKey(apiKey);
        });
        if (ethEnabledToggle) ethEnabledToggle.addEventListener('change', () => {
            suppressGuidance = false;
            updateStatusDisplay();
        });
        if (btcEnabledToggle) btcEnabledToggle.addEventListener('change', handleToggleChange);
        if (ethAddressInput) ethAddressInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSaveConfig();
        });
        if (btcAddressInput) btcAddressInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSaveConfig();
        });
        if (apiKeyInput) apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSaveConfig();
        });
        const openInNewTabBtn = document.getElementById('openInNewTabBtn');
        if (openInNewTabBtn) {
            openInNewTabBtn.addEventListener('click', function() {
                chrome.tabs.create({ url: chrome.runtime.getURL('page.html') });
            });
        }
    }

    // Initialize localization
    function initializeLocalization() {
        // Load saved language or default to English
        chrome.storage.local.get(['selectedLanguage'], function(result) {
            const savedLanguage = result.selectedLanguage || 'en';
            window.currentLanguage = savedLanguage;
            updateUILanguage(savedLanguage);
        });
    }

    // Load saved configuration from storage
    function loadSavedConfig() {
        chrome.storage.local.get([
            'ethAddress', 'btcAddress', 'apiKey', 
            'ethEnabled', 'btcEnabled'
        ], (result) => {
            if (result.ethAddress) {
                ethAddressInput.value = result.ethAddress;
                validateEthAddress(result.ethAddress, true);
            }
            if (result.btcAddress) {
                btcAddressInput.value = result.btcAddress;
                validateBtcAddress(result.btcAddress);
            }
            if (result.apiKey) {
                apiKeyInput.value = result.apiKey;
                validateApiKey(result.apiKey);
            }
            if (result.ethEnabled !== undefined) {
                ethEnabledToggle.checked = result.ethEnabled;
            }
            if (result.btcEnabled !== undefined) {
                btcEnabledToggle.checked = result.btcEnabled;
            }
            showCurrentConfig();
            loadTransactions();
        });
    }

    // Load and display transactions
    function loadTransactions() {
        chrome.storage.local.get([
            'ethTransactions', 'btcTransactions'
        ], (result) => {
            displayEthTransactions(result.ethTransactions || []);
            displayBtcTransactions(result.btcTransactions || []);
        });
    }

    // Create transaction HTML element (Metamask-style)
    function createTransactionCard(tx, network) {
        const date = new Date(tx.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        const shortHash = tx.hash.substring(0, 6) + '...' + tx.hash.substring(tx.hash.length - 6);
        const explorerUrl = network === 'eth'
            ? `https://etherscan.io/tx/${tx.hash}`
            : `https://blockstream.info/tx/${tx.hash}`;
        const iconPath = network === 'eth' ? 'icons/eth.svg' : 'icons/btc.svg';
        const amount = tx.amount;
        const type = tx.type;
        return `
            <div class="transaction-card${tx.isNew ? ' new' : ''}">
                <div class="tx-header">
                    <img src="${iconPath}" class="tx-icon" alt="${network.toUpperCase()}">
                    <span class="tx-type ${type}">${getTranslation(type)}</span>
                    <span class="tx-time">${formattedDate}</span>
                </div>
                <div class="tx-body">
                    <div class="tx-hash">
                        <span>${shortHash}</span>
                        <button class="copy-btn" data-hash="${tx.hash}" title="${getTranslation('copyHash')}">${getTranslation('copy')}</button>
                    </div>
                    <div class="tx-amount">${amount}</div>
                    <a href="${explorerUrl}" target="_blank" class="explorer-link">${getTranslation('viewOnExplorer')}</a>
                </div>
            </div>
        `;
    }

    // نمایش تراکنش‌های ETH به سبک متامسک
    function displayEthTransactions(transactions) {
        const container = document.getElementById('ethTransactionsList');
        if (!container) return;
        if (transactions.length === 0) {
            container.innerHTML = '<div class="no-transactions" data-i18n="noTransactions">No transactions found</div>';
            return;
        }
        container.innerHTML = transactions.map(tx => createTransactionCard(tx, 'eth')).join('');
    }
    // نمایش تراکنش‌های BTC به سبک متامسک
    function displayBtcTransactions(transactions) {
        const container = document.getElementById('btcTransactionsList');
        if (!container) return;
        if (transactions.length === 0) {
            container.innerHTML = '<div class="no-transactions" data-i18n="noTransactions">No transactions found</div>';
            return;
        }
        container.innerHTML = transactions.map(tx => createTransactionCard(tx, 'btc')).join('');
    }

    // نمایش نوتیفیکیشن داخلی
    function showInternalNotification(message) {
        const notif = document.getElementById('internalNotification');
        if (!notif) return;
        notif.textContent = message;
        notif.style.display = 'block';
        notif.classList.add('show');
        setTimeout(() => {
            notif.style.display = 'none';
            notif.classList.remove('show');
        }, 3500);
    }

    // Utility to get translation for current language
    function getTranslation(key) {
        const lang = window.currentLanguage || 'en';
        return (window.translations && window.translations[lang] && window.translations[lang][key]) || key;
    }

    // Event delegation for copy hash button
    document.addEventListener('click', function(e) {
        const target = e.target.closest('.copy-btn');
        if (target) {
            const hash = target.getAttribute('data-hash');
            if (hash) {
                navigator.clipboard.writeText(hash).then(() => {
                    showStatus(getTranslation('copied'), 'success');
                }, () => {
                    showStatus('Copy failed', 'error');
                });
            }
        }
    });

    // Handle save configuration button click
    async function handleSaveConfig() {
        const ethAddress = ethAddressInput.value.trim();
        const btcAddress = btcAddressInput.value.trim();
        const apiKey = apiKeyInput.value.trim();
        const ethEnabled = ethEnabledToggle.checked;
        const btcEnabled = btcEnabledToggle.checked;
        
        // Validate that at least one blockchain is configured and enabled
        if (!ethEnabled && !btcEnabled) {
            showStatus(chrome.i18n.getMessage('noMonitoringEnabledError'), 'error');
            return;
        }
        
        // Validate Ethereum configuration
        if (ethEnabled) {
            if (!ethAddress) {
                showStatus(chrome.i18n.getMessage('enterEthAddressError'), 'error');
                return;
            }
            if (!isValidEthAddress(ethAddress)) {
                showStatus(chrome.i18n.getMessage('invalidEthAddressError'), 'error');
                return;
            }
            if (!apiKey) {
                showStatus(chrome.i18n.getMessage('enterApiKeyError'), 'error');
                return;
            }
            if (!isValidApiKey(apiKey)) {
                showStatus(chrome.i18n.getMessage('invalidApiKeyError'), 'error');
                return;
            }
        }
        
        // Validate Bitcoin configuration
        if (btcEnabled) {
            if (!btcAddress) {
                showStatus(chrome.i18n.getMessage('enterBtcAddressError'), 'error');
                return;
            }
            if (!isValidBtcAddress(btcAddress)) {
                showStatus(chrome.i18n.getMessage('invalidBtcAddressError'), 'error');
                return;
            }
        }
        
        // Show loading state
        setButtonLoading(true);
        
        try {
            // Save configuration to storage
            await chrome.storage.local.set({ 
                ethAddress: ethAddress,
                btcAddress: btcAddress,
                apiKey: apiKey,
                ethEnabled: ethEnabled,
                btcEnabled: btcEnabled,
                ethLastTxHash: null, // Reset last transaction hash
                btcLastTxHash: null, // Reset last transaction hash
                lastCheckTime: null // Reset last check time
            });
            
            showStatus(chrome.i18n.getMessage('configSavedSuccess'), 'success');
            showCurrentConfig();
            updateStatusDisplay();
            justSavedConfig = true;
            suppressGuidance = true;
            setTimeout(() => {
                showStatus('', 'info');
            }, 2000);
            
            // Test API connection if ETH is enabled
            if (ethEnabled && ethAddress && apiKey) {
                await testApiConnection(ethAddress, apiKey);
            }
            
        } catch (error) {
            console.error('Error saving configuration:', error);
            showStatus(chrome.i18n.getMessage('saveError'), 'error');
        } finally {
            setButtonLoading(false);
        }
    }

    // Handle clear configuration button click
    async function handleClearConfig() {
        await chrome.storage.local.set({
            ethAddress: '',
            btcAddress: '',
            apiKey: '',
            ethEnabled: false,
            btcEnabled: false,
            ethTransactions: [], // Clear ETH transactions
            btcTransactions: []  // Clear BTC transactions
        });
        showStatus(chrome.i18n.getMessage('configClearedSuccess'), 'success');
        showCurrentConfig();
        updateStatusDisplay();
        displayEthTransactions([]); // Clear ETH transactions in UI
        displayBtcTransactions([]); // Clear BTC transactions in UI
    }

    // Handle toggle changes
    function handleToggleChange() {
        // Update status display when toggles change
        updateStatusDisplay();
    }

    // Toggle API key visibility
    function toggleApiKeyVisibility() {
        const type = apiKeyInput.type === 'password' ? 'text' : 'password';
        apiKeyInput.type = type;
        toggleApiKeyBtn.textContent = type === 'password' ? '👁️' : '🙈';
    }

    // Validate Ethereum address format
    function isValidEthAddress(address) {
        return ETH_ADDRESS_REGEX.test(address);
    }

    // Validate Bitcoin address format
    function isValidBtcAddress(address) {
        return BTC_ADDRESS_REGEX.test(address);
    }

    // Validate API key format (basic check)
    function isValidApiKey(apiKey) {
        return apiKey.length >= 10 && /^[a-zA-Z0-9]+$/.test(apiKey);
    }

    // Real-time Ethereum address validation
    function validateEthAddress(address, forceSuppress = false) {
        let skipStatus = false;
        if (justSavedConfig) {
            justSavedConfig = false;
            skipStatus = true;
        }
        if (forceSuppress || suppressGuidance) return;
        if (!address) {
            ethAddressValidation.textContent = '';
            ethAddressInput.classList.remove('valid', 'invalid');
            return;
        }
        
        if (isValidEthAddress(address)) {
            ethAddressValidation.textContent = chrome.i18n.getMessage('validEthAddressMessage');
            ethAddressValidation.className = 'address-validation valid';
            ethAddressInput.classList.remove('invalid');
            ethAddressInput.classList.add('valid');
            // Show guidance in steps
            chrome.storage.local.get(['apiKey', 'ethEnabled', 'ethAddress'], (data) => {
                if (skipStatus) return;
                // Step 1: ETH valid
                showStatus(getTranslation('ethValidGuidance'), 'info');
                // Step 2: API key
                const apiKey = apiKeyInput.value.trim();
                if (!apiKey || !isValidApiKey(apiKey)) {
                    showStatus(getTranslation('enterApiKeyGuidance'), 'info');
                    return;
                }
                // Step 3: Monitoring enabled
                if (!ethEnabledToggle.checked) {
                    showStatus(getTranslation('enableMonitoringGuidance'), 'info');
                    return;
                }
                // Step 4: Ready to save
                showStatus(getTranslation('saveConfigGuidance'), 'info');
            });
        } else {
            ethAddressValidation.textContent = chrome.i18n.getMessage('invalidEthAddressMessage');
            ethAddressValidation.className = 'address-validation invalid';
            ethAddressInput.classList.remove('valid');
            ethAddressInput.classList.add('invalid');
        }
    }

    // Real-time Bitcoin address validation
    function validateBtcAddress(address) {
        if (!address) {
            btcAddressValidation.textContent = '';
            btcAddressInput.classList.remove('valid', 'invalid');
            return;
        }
        
        if (isValidBtcAddress(address)) {
            btcAddressValidation.textContent = chrome.i18n.getMessage('validBtcAddressMessage');
            btcAddressValidation.className = 'address-validation valid';
            btcAddressInput.classList.remove('invalid');
            btcAddressInput.classList.add('valid');
            // Show user guidance if config not saved
            chrome.storage.local.get(['btcAddress', 'btcEnabled'], (data) => {
                if (address === data.btcAddress && data.btcEnabled) {
                    // Already saved and enabled, do nothing
                    return;
                }
                // Show guidance notification
                showStatus(getTranslation('btcValidGuidance'), 'info');
            });
        } else {
            btcAddressValidation.textContent = chrome.i18n.getMessage('invalidBtcAddressMessage');
            btcAddressValidation.className = 'address-validation invalid';
            btcAddressInput.classList.remove('valid');
            btcAddressInput.classList.add('invalid');
        }
    }

    // Real-time API key validation
    function validateApiKey(apiKey) {
        if (!apiKey) {
            apiKeyInput.classList.remove('valid', 'invalid');
            return;
        }
        
        if (isValidApiKey(apiKey)) {
            apiKeyInput.classList.remove('invalid');
            apiKeyInput.classList.add('valid');
        } else {
            apiKeyInput.classList.remove('valid');
            apiKeyInput.classList.add('invalid');
        }
    }

    // Start polling for status updates
    function startStatusPolling() {
        // Update status every 5 seconds
        setInterval(updateStatusDisplay, 5000);
    }

    // Handle storage changes from background script
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.ethAddress || changes.btcAddress || changes.apiKey || changes.ethEnabled || changes.btcEnabled) {
                const newEthAddress = changes.ethAddress?.newValue;
                const newBtcAddress = changes.btcAddress?.newValue;
                const newApiKey = changes.apiKey?.newValue;
                const newEthEnabled = changes.ethEnabled?.newValue;
                const newBtcEnabled = changes.btcEnabled?.newValue;
                
                if (newEthAddress !== undefined) {
                    ethAddressInput.value = newEthAddress;
                }
                if (newBtcAddress !== undefined) {
                    btcAddressInput.value = newBtcAddress;
                }
                if (newApiKey !== undefined) {
                    apiKeyInput.value = newApiKey;
                }
                if (newEthEnabled !== undefined) {
                    ethEnabledToggle.checked = newEthEnabled;
                }
                if (newBtcEnabled !== undefined) {
                    btcEnabledToggle.checked = newBtcEnabled;
                }
                
                showCurrentConfig();
                updateStatusDisplay();
            }
        }
    });

    // Language switcher functions
    function toggleLanguageDropdown() {
        languageDropdown.classList.toggle('show');
    }

    function handleLanguageDropdownClick(event) {
        // Close dropdown if clicking outside
        if (!languageBtn.contains(event.target) && !languageDropdown.contains(event.target)) {
            languageDropdown.classList.remove('show');
            return;
        }
        
        // Handle language option clicks
        if (event.target.classList.contains('language-option')) {
            const selectedLang = event.target.getAttribute('data-lang');
            changeLanguage(selectedLang);
            languageDropdown.classList.remove('show');
        }
    }

    function changeLanguage(lang) {
        // Save selected language to storage
        chrome.storage.local.set({ 'selectedLanguage': lang }, () => {
            // Update the UI language
            updateUILanguage(lang);
            
            // Update active state in dropdown
            const options = languageDropdown.querySelectorAll('.language-option');
            options.forEach(option => {
                option.classList.remove('active');
                if (option.getAttribute('data-lang') === lang) {
                    option.classList.add('active');
                }
            });
            
            showStatus(`Language changed to ${getLanguageName(lang)}`, 'success');
        });
    }

    function updateUILanguage(lang) {
        window.currentLanguage = lang;
        const translations = window.translations && window.translations[lang] ? window.translations[lang] : window.translations['en'];
        // Update all text elements with translations
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[key]) {
                element.textContent = translations[key];
            }
        });
        // Update placeholders
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (translations[key]) {
                element.placeholder = translations[key];
            }
        });
        // NEW: If BTC address is valid and guidance is shown, update the guidance message
        if (btcAddressInput && btcAddressInput.value) {
            validateBtcAddress(btcAddressInput.value);
        }
    }

    function getLanguageName(lang) {
        const languageNames = {
            'en': 'English',
            'fa': 'فارسی',
            'ar': 'العربية',
            'ru': 'Русский',
            'zh': '中文'
        };
        return languageNames[lang] || lang;
    }

    // Load saved language on startup
    function loadSavedLanguage() {
        chrome.storage.local.get(['selectedLanguage'], (result) => {
            if (result.selectedLanguage) {
                window.currentLanguage = result.selectedLanguage;
                updateUILanguage(result.selectedLanguage);
                
                // Update active state in dropdown
                const options = languageDropdown.querySelectorAll('.language-option');
                options.forEach(option => {
                    option.classList.remove('active');
                    if (option.getAttribute('data-lang') === result.selectedLanguage) {
                        option.classList.add('active');
                    }
                });
            }
        });
    } 

    // دریافت پیام newTransaction از background و نمایش نوتیفیکیشن داخلی
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'newTransaction') {
            const { network, tx } = message;
            // نمایش نوتیفیکیشن داخلی
            let notifMsg = '';
            if (network === 'eth') {
                notifMsg = `${getTranslation('newEthTransactionTitle')}: ${tx.amount} (${getTranslation(tx.type)})`;
            } else if (network === 'btc') {
                notifMsg = `${getTranslation('newBtcTransactionTitle')}: ${tx.amount} (${getTranslation(tx.type)})`;
            }
            showInternalNotification(notifMsg);
            // حذف isNew از تراکنش‌ها پس از 4 ثانیه (برای حذف هایلایت)
            setTimeout(() => {
                chrome.storage.local.get([network === 'eth' ? 'ethTransactions' : 'btcTransactions'], (result) => {
                    const key = network === 'eth' ? 'ethTransactions' : 'btcTransactions';
                    const txs = (result[key] || []).map(t => ({ ...t, isNew: false }));
                    chrome.storage.local.set({ [key]: txs });
                });
            }, 4000);
        }
    });

    // فراخوانی توابع
    loadSavedConfig();
    setupEventListeners();
    initializeLocalization();
    loadSavedLanguage();
    updateStatusDisplay();
    startStatusPolling();
}); 