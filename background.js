// Background service worker for Dual Blockchain TX Notifier
// Monitors both Ethereum and Bitcoin wallet addresses and sends notifications for new transactions

// Configuration
const CHECK_INTERVAL_MINUTES = 1;
const ALARM_NAME = 'checkTransactions';
const RATE_LIMIT_DELAY = 60000; // 1 minute delay when rate limited
const MAX_RETRIES = 3;

// Helper function to safely get i18n messages with fallbacks
function getMessage(key, substitutions = []) {
  try {
    const message = chrome.i18n.getMessage(key, substitutions);
    return message || getDefaultMessage(key, substitutions);
  } catch (error) {
    console.warn(`Failed to get i18n message for key: ${key}`, error);
    return getDefaultMessage(key, substitutions);
  }
}

// Default messages in English as fallback
function getDefaultMessage(key, substitutions = []) {
  const defaultMessages = {
    newEthTransactionTitle: 'New Ethereum Transaction',
    newBtcTransactionTitle: 'New Bitcoin Transaction',
    ethTransactionDetailsMessage: `Hash: ${substitutions[0] || ''}\nAmount: ${substitutions[1] || ''}\nType: ${substitutions[2] || ''}`,
    btcTransactionDetailsMessage: `Hash: ${substitutions[0] || ''}\nAmount: ${substitutions[1] || ''}\nType: ${substitutions[2] || ''}`,
    rateLimitTitle: 'Rate Limited',
    rateLimitMessage: 'Rate limit reached. Monitoring paused for 1 minute.',
    invalidApiKeyTitle: 'Invalid API Key',
    invalidApiKeyMessage: 'Your Etherscan API key appears to be invalid. Please check and update it.',
    tooManyErrorsTitle: 'Too Many Errors',
    tooManyErrorsMessage: 'Too many consecutive errors. Monitoring paused temporarily.'
  };
  return defaultMessages[key] || key;
}

// Rate limiting state
let isRateLimited = false;
let rateLimitUntil = 0;
let consecutiveErrors = 0;

// Initialize alarm when extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Dual Blockchain TX Notifier installed/updated');
  
  // Create alarm for periodic transaction checking
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });
  
  // Request notification permission
  chrome.notifications.getPermissionLevel((permission) => {
    if (permission === 'default') {
      console.log('Notification permission requested');
    }
  });
});

// Handle alarm events - check for new transactions
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await checkForNewTransactions();
  }
});

// Open popup.html in a new window with custom size when extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: chrome.runtime.getURL("popup.html"),
    type: "popup",
    width: 420,
    height: 650
  });
});

// Main function to check for new transactions
async function checkForNewTransactions() {
  try {
    // Check if we're currently rate limited
    if (isRateLimited && Date.now() < rateLimitUntil) {
      console.log('Still rate limited, skipping check');
      return;
    }

    // Reset rate limiting if time has passed
    if (isRateLimited && Date.now() >= rateLimitUntil) {
      isRateLimited = false;
      consecutiveErrors = 0;
      console.log('Rate limit period ended, resuming checks');
    }

    // Get saved configuration
    const data = await chrome.storage.local.get([
      'ethAddress', 'btcAddress', 'apiKey', 
      'ethTransactions', 'btcTransactions', 'lastCheckTime',
      'ethEnabled', 'btcEnabled'
    ]);
    
    // Check if any monitoring is enabled
    if (!data.ethEnabled && !data.btcEnabled) {
      console.log('No monitoring enabled');
      return;
    }

    // Check if we should skip this check (rate limiting)
    const now = Date.now();
    const lastCheck = data.lastCheckTime || 0;
    const minInterval = isRateLimited ? RATE_LIMIT_DELAY : 60000;
    
    if (now - lastCheck < minInterval) {
      console.log('Skipping check due to rate limiting');
      return;
    }

    // Update last check time
    await chrome.storage.local.set({ lastCheckTime: now });

    // Check Ethereum transactions if enabled
    if (data.ethEnabled && data.ethAddress && data.apiKey) {
      await checkEthereumTransactions(data.ethAddress, data.apiKey, data.ethTransactions || []);
    }

    // Check Bitcoin transactions if enabled
    if (data.btcEnabled && data.btcAddress) {
      await checkBitcoinTransactions(data.btcAddress, data.btcTransactions || []);
    }

  } catch (error) {
    console.error('Error checking transactions:', error);
    consecutiveErrors++;
    
    // Handle network errors
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.log('Network error, will retry later');
    } else {
      // Handle other errors
      handleApiError(error.message, '0');
    }
  }
}

// Check Ethereum transactions using Etherscan API
async function checkEthereumTransactions(address, apiKey, existingTransactions) {
  try {
    console.log('ETH: existingTransactions before:', existingTransactions.length, existingTransactions);
    const response = await fetch(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.status === "1" && result.result && result.result.length > 0) {
      const latestTransaction = result.result[0];
      const latestTxHash = latestTransaction.hash;

      // Check if this is a new transaction
      const isNewTransaction = !existingTransactions.some(tx => tx.hash === latestTxHash);
      
      if (isNewTransaction) {
        // Create transaction object
        const newTransaction = {
          hash: latestTxHash,
          amount: latestTransaction.value ? (parseInt(latestTransaction.value) / 1e18).toFixed(6) + ' ETH' : 'N/A',
          type: latestTransaction.from === address ? 'outgoing' : 'incoming',
          timestamp: parseInt(latestTransaction.timeStamp) * 1000,
          from: latestTransaction.from,
          to: latestTransaction.to,
          gasPrice: latestTransaction.gasPrice,
          gasUsed: latestTransaction.gasUsed,
          isNew: true // اضافه کردن فیلد isNew
        };

        // Add new transaction to the beginning of the array
        const updatedTransactions = [newTransaction, ...existingTransactions].slice(0, 10);
        console.log('ETH: updatedTransactions after:', updatedTransactions.length, updatedTransactions);
        
        // Save the updated transactions array
        await chrome.storage.local.set({ ethTransactions: updatedTransactions });

        // ارسال پیام به popup برای نمایش نوتیفیکیشن داخلی
        chrome.runtime.sendMessage({
          action: 'newTransaction',
          network: 'eth',
          tx: newTransaction
        }, () => {
          if (chrome.runtime.lastError) {
            // Ignore 'Could not establish connection' and 'message port closed' errors
            const msg = chrome.runtime.lastError.message;
            if (msg && (msg.includes('Could not establish connection') || msg.includes('message port closed'))) {
              // Silently ignore
            } else {
              console.warn('SendMessage error:', msg);
            }
          }
        });

        // Create notification with transaction details
        const notificationOptions = {
          type: "basic",
          iconUrl: "icons/icon128.png",
          title: getMessage('newEthTransactionTitle'),
          message: getMessage('ethTransactionDetailsMessage', [
            latestTxHash.substring(0, 10) + '...' + latestTxHash.substring(latestTxHash.length - 8),
            newTransaction.amount,
            newTransaction.type === 'incoming' ? 'Incoming' : 'Outgoing'
          ]),
          priority: 2
        };

        // Debug: log notification content
        console.log('Notification title:', notificationOptions.title);
        console.log('Notification message:', notificationOptions.message);

        // Show notification
        chrome.notifications.create(`eth_tx_${Date.now()}`, notificationOptions, (notificationId) => {
          if (chrome.runtime.lastError) {
            console.error('Notification error:', chrome.runtime.lastError ? chrome.runtime.lastError.message : chrome.runtime.lastError);
            console.log('Notification options:', notificationOptions);
          } else {
            console.log('ETH notification created:', notificationId);
          }
        });

        console.log('New ETH transaction detected:', latestTxHash);
        consecutiveErrors = 0;
      } else {
        console.log('No new ETH transactions found');
        consecutiveErrors = 0;
      }
    } else {
      // Handle API errors
      handleApiError(result.message, result.status);
    }

  } catch (error) {
    console.error('Error checking ETH transactions:', error);
    consecutiveErrors++;
  }
}

// Check Bitcoin transactions using Blockstream API
async function checkBitcoinTransactions(address, existingTransactions) {
  try {
    console.log('BTC: existingTransactions before:', existingTransactions.length, existingTransactions);
    const response = await fetch(
      `https://blockstream.info/api/address/${address}/txs`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const transactions = await response.json();

    if (transactions && transactions.length > 0) {
      const latestTransaction = transactions[0];
      const latestTxHash = latestTransaction.txid;

      // Check if this is a new transaction
      const isNewTransaction = !existingTransactions.some(tx => tx.hash === latestTxHash);
      
      if (isNewTransaction) {
        // Calculate transaction amount (simplified)
        let amount = 0;
        if (latestTransaction.vout) {
          for (const output of latestTransaction.vout) {
            if (output.scriptpubkey_address === address) {
              amount += output.value / 100000000; // Convert satoshis to BTC
            }
          }
        }

        // Create transaction object
        const newTransaction = {
          hash: latestTxHash,
          amount: amount.toFixed(8) + ' BTC',
          type: amount > 0 ? 'incoming' : 'outgoing',
          timestamp: latestTransaction.status.block_time * 1000,
          blockHeight: latestTransaction.status.block_height,
          fee: latestTransaction.fee ? latestTransaction.fee / 100000000 : 0,
          isNew: true // اضافه کردن فیلد isNew
        };

        // Add new transaction to the beginning of the array
        const updatedTransactions = [newTransaction, ...existingTransactions].slice(0, 10);
        console.log('BTC: updatedTransactions after:', updatedTransactions.length, updatedTransactions);
        
        // Save the updated transactions array
        await chrome.storage.local.set({ btcTransactions: updatedTransactions });

        // ارسال پیام به popup برای نمایش نوتیفیکیشن داخلی
        chrome.runtime.sendMessage({
          action: 'newTransaction',
          network: 'btc',
          tx: newTransaction
        }, () => {
          if (chrome.runtime.lastError) {
            // Ignore 'Could not establish connection' and 'message port closed' errors
            const msg = chrome.runtime.lastError.message;
            if (msg && (msg.includes('Could not establish connection') || msg.includes('message port closed'))) {
              // Silently ignore
            } else {
              console.warn('SendMessage error:', msg);
            }
          }
        });

        // Create notification with transaction details
        const notificationOptions = {
          type: "basic",
          iconUrl: "icons/icon128.png",
          title: getMessage('newBtcTransactionTitle'),
          message: getMessage('btcTransactionDetailsMessage', [
            latestTxHash.substring(0, 10) + '...' + latestTxHash.substring(latestTxHash.length - 8),
            newTransaction.amount,
            newTransaction.type === 'incoming' ? 'Incoming' : 'Outgoing'
          ]),
          priority: 2
        };

        // Debug: log notification content
        console.log('Notification title:', notificationOptions.title);
        console.log('Notification message:', notificationOptions.message);

        // Show notification
        chrome.notifications.create(`btc_tx_${Date.now()}`, notificationOptions, (notificationId) => {
          if (chrome.runtime.lastError) {
            console.error('Notification error:', chrome.runtime.lastError ? chrome.runtime.lastError.message : chrome.runtime.lastError);
            console.log('Notification options:', notificationOptions);
          } else {
            console.log('BTC notification created:', notificationId);
          }
        });

        console.log('New BTC transaction detected:', latestTxHash);
        consecutiveErrors = 0;
      } else {
        console.log('No new BTC transactions found');
        consecutiveErrors = 0;
      }
    } else {
      console.log('No BTC transactions found');
      consecutiveErrors = 0;
    }

  } catch (error) {
    console.error('Error checking BTC transactions:', error);
    consecutiveErrors++;
  }
}

// Handle API errors and rate limiting
function handleApiError(message, status) {
  console.log('API Error:', message, 'Status:', status);
  
  // Check for rate limiting
  if (message.includes('rate limit') || message.includes('Max rate limit reached') || 
      status === '0' && message.includes('NOTOK')) {
    isRateLimited = true;
    rateLimitUntil = Date.now() + RATE_LIMIT_DELAY;
    console.log('Rate limited, will resume in 1 minute');
    
    // Notify user about rate limiting
    chrome.notifications.create('rate_limit', {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: getMessage('rateLimitTitle'),
      message: getMessage('rateLimitMessage'),
      priority: 1
    });
  }
  
  // Check for invalid API key
  if (message.includes('Invalid API Key') || message.includes('Invalid API key')) {
    console.log('Invalid API key detected');
    chrome.notifications.create('invalid_api_key', {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: getMessage('invalidApiKeyTitle'),
      message: getMessage('invalidApiKeyMessage'),
      priority: 2
    });
  }
  
  // Check for too many consecutive errors
  if (consecutiveErrors >= MAX_RETRIES) {
    console.log('Too many consecutive errors, pausing checks');
    chrome.notifications.create('too_many_errors', {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: getMessage('tooManyErrorsTitle'),
      message: getMessage('tooManyErrorsMessage'),
      priority: 2
    });
  }
}

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  // Open blockchain explorer in new tab when notification is clicked
  chrome.storage.local.get(['ethAddress', 'btcAddress'], (data) => {
    if (notificationId.startsWith('eth_tx_') && data.ethAddress) {
      chrome.tabs.create({
        url: `https://etherscan.io/address/${data.ethAddress}`
      });
    } else if (notificationId.startsWith('btc_tx_') && data.btcAddress) {
      chrome.tabs.create({
        url: `https://blockstream.info/address/${data.btcAddress}`
      });
    }
  });
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
  // Ensure alarm is created on startup
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    // Return current status to popup
    chrome.storage.local.get([
      'ethAddress', 'btcAddress', 'apiKey', 
      'ethTransactions', 'btcTransactions', 'lastCheckTime',
      'ethEnabled', 'btcEnabled'
    ], (data) => {
      sendResponse({
        hasEthAddress: !!data.ethAddress,
        hasBtcAddress: !!data.btcAddress,
        hasApiKey: !!data.apiKey,
        ethEnabled: !!data.ethEnabled,
        btcEnabled: !!data.btcEnabled,
        isConfigured: !!(data.ethAddress || data.btcAddress),
        isRateLimited: isRateLimited,
        rateLimitUntil: rateLimitUntil,
        consecutiveErrors: consecutiveErrors,
        lastCheckTime: data.lastCheckTime
      });
    });
    return true; // Keep message channel open for async response
  }
}); 