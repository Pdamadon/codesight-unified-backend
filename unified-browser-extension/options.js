// Options page script for CodeSight Tracker

// Default settings
const defaultSettings = {
  backendUrl: 'wss://gentle-vision-production.up.railway.app/ws',
  autoStart: false,
  sessionTimeout: 30,
  privacyMode: true,
  allowedDomains: [],
  screenshotEnabled: true,
  screenshotQuality: 0.8,
  burstMode: true,
  maxEvents: 1000,
  compressionQuality: 0.8,
  maxScreenshotSize: 2,
  burstModeDelay: 300,
  maxQueueSize: 100
};

// Load settings when page loads
document.addEventListener('DOMContentLoaded', loadSettings);

// Save settings
document.getElementById('saveBtn').addEventListener('click', saveSettings);

// Reset to defaults
document.getElementById('resetBtn').addEventListener('click', resetSettings);

// Export data
document.getElementById('exportBtn').addEventListener('click', exportData);

// Toggle advanced settings
function toggleAdvanced() {
  const advanced = document.getElementById('advancedSettings');
  const toggle = document.querySelector('.advanced-toggle');
  
  if (advanced.style.display === 'none' || !advanced.style.display) {
    advanced.style.display = 'block';
    toggle.textContent = '▼ Advanced Settings';
  } else {
    advanced.style.display = 'none';
    toggle.textContent = '▶ Advanced Settings';
  }
}

// Load settings from storage
async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get(defaultSettings);
    
    // Populate form fields
    document.getElementById('backendUrl').value = settings.backendUrl;
    document.getElementById('autoStart').checked = settings.autoStart;
    document.getElementById('sessionTimeout').value = settings.sessionTimeout;
    document.getElementById('privacyMode').checked = settings.privacyMode;
    document.getElementById('allowedDomains').value = settings.allowedDomains.join('\n');
    document.getElementById('screenshotEnabled').checked = settings.screenshotEnabled;
    document.getElementById('screenshotQuality').value = settings.screenshotQuality;
    document.getElementById('burstMode').checked = settings.burstMode;
    document.getElementById('maxEvents').value = settings.maxEvents;
    document.getElementById('compressionQuality').value = settings.compressionQuality;
    document.getElementById('maxScreenshotSize').value = settings.maxScreenshotSize;
    document.getElementById('burstModeDelay').value = settings.burstModeDelay;
    document.getElementById('maxQueueSize').value = settings.maxQueueSize;
    
  } catch (error) {
    showStatus('Failed to load settings: ' + error.message, 'error');
  }
}

// Save settings to storage
async function saveSettings() {
  try {
    // Get form values
    const settings = {
      backendUrl: document.getElementById('backendUrl').value.trim(),
      autoStart: document.getElementById('autoStart').checked,
      sessionTimeout: parseInt(document.getElementById('sessionTimeout').value),
      privacyMode: document.getElementById('privacyMode').checked,
      allowedDomains: document.getElementById('allowedDomains').value
        .split('\n')
        .map(d => d.trim())
        .filter(d => d.length > 0),
      screenshotEnabled: document.getElementById('screenshotEnabled').checked,
      screenshotQuality: parseFloat(document.getElementById('screenshotQuality').value),
      burstMode: document.getElementById('burstMode').checked,
      maxEvents: parseInt(document.getElementById('maxEvents').value),
      compressionQuality: parseFloat(document.getElementById('compressionQuality').value),
      maxScreenshotSize: parseFloat(document.getElementById('maxScreenshotSize').value),
      burstModeDelay: parseInt(document.getElementById('burstModeDelay').value),
      maxQueueSize: parseInt(document.getElementById('maxQueueSize').value)
    };
    
    // Validate settings
    if (!settings.backendUrl) {
      throw new Error('Backend URL is required');
    }
    
    if (!settings.backendUrl.startsWith('ws://') && !settings.backendUrl.startsWith('wss://')) {
      throw new Error('Backend URL must start with ws:// or wss://');
    }
    
    // Save to storage
    await chrome.storage.sync.set(settings);
    
    // Notify background script of changes
    chrome.runtime.sendMessage({
      action: 'SETTINGS_UPDATED',
      settings
    });
    
    showStatus('Settings saved successfully!', 'success');
    
  } catch (error) {
    showStatus('Failed to save settings: ' + error.message, 'error');
  }
}

// Reset settings to defaults
async function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    try {
      await chrome.storage.sync.set(defaultSettings);
      await loadSettings();
      showStatus('Settings reset to defaults', 'success');
    } catch (error) {
      showStatus('Failed to reset settings: ' + error.message, 'error');
    }
  }
}

// Export collected data
async function exportData() {
  try {
    // Get all stored data
    const data = await chrome.storage.local.get();
    
    // Filter for session data
    const sessions = [];
    const screenshots = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('session_')) {
        sessions.push(value);
      } else if (key.startsWith('screenshot_')) {
        screenshots.push(value);
      }
    }
    
    const exportData = {
      exportDate: new Date().toISOString(),
      extensionVersion: chrome.runtime.getManifest().version,
      sessions: sessions.length,
      screenshots: screenshots.length,
      data: {
        sessions,
        screenshots
      }
    };
    
    // Create download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codesight-export-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    showStatus(`Exported ${sessions.length} sessions and ${screenshots.length} screenshots`, 'success');
    
  } catch (error) {
    showStatus('Failed to export data: ' + error.message, 'error');
  }
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = 'status ' + type;
  statusEl.style.display = 'block';
  
  // Hide after 5 seconds
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 5000);
}

// Add input validation
document.getElementById('backendUrl').addEventListener('input', (e) => {
  const value = e.target.value.trim();
  if (value && !value.startsWith('ws://') && !value.startsWith('wss://')) {
    e.target.setCustomValidity('URL must start with ws:// or wss://');
  } else {
    e.target.setCustomValidity('');
  }
});

// Validate number inputs
document.querySelectorAll('input[type="number"]').forEach(input => {
  input.addEventListener('input', (e) => {
    const min = parseFloat(e.target.min);
    const max = parseFloat(e.target.max);
    const value = parseFloat(e.target.value);
    
    if (value < min || value > max) {
      e.target.setCustomValidity(`Value must be between ${min} and ${max}`);
    } else {
      e.target.setCustomValidity('');
    }
  });
});