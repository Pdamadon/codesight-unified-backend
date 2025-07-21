// Popup script for CodeSight Tracker extension

document.addEventListener('DOMContentLoaded', async () => {
  const loadingDiv = document.getElementById('loading');
  const contentDiv = document.getElementById('content');
  const errorDiv = document.getElementById('error');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadControls = document.getElementById('downloadControls');
  const settingsLink = document.getElementById('settingsLink');
  
  // Status elements
  const trackingStatusEl = document.getElementById('trackingStatus');
  const sessionIdEl = document.getElementById('sessionId');
  const eventCountEl = document.getElementById('eventCount');
  const screenshotCountEl = document.getElementById('screenshotCount');
  const durationEl = document.getElementById('duration');
  const qualityScoreEl = document.getElementById('qualityScore');
  
  let updateInterval = null;
  
  // Initialize popup
  try {
    await updateStatus();
    loadingDiv.style.display = 'none';
    contentDiv.style.display = 'block';
    
    // Start periodic updates
    updateInterval = setInterval(updateStatus, 1000);
  } catch (error) {
    showError('Failed to initialize: ' + error.message);
  }
  
  // Update status from current tab
  async function updateStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_STATUS' });
      
      if (response) {
        updateUI(response);
      }
    } catch (error) {
      // Content script might not be injected yet
      updateUI({
        isTracking: false,
        sessionId: null,
        eventCount: 0,
        screenshotCount: 0,
        duration: 0,
        quality: 0
      });
    }
  }
  
  // Update UI with status data
  function updateUI(status) {
    if (status.isTracking) {
      trackingStatusEl.textContent = 'Active';
      trackingStatusEl.className = 'status-value status-active';
      sessionIdEl.textContent = status.sessionId || '-';
      eventCountEl.textContent = status.eventCount || 0;
      screenshotCountEl.textContent = status.screenshotCount || 0;
      durationEl.textContent = formatDuration(status.duration || 0);
      qualityScoreEl.textContent = (status.quality || 0) + '%';
      
      startBtn.disabled = true;
      stopBtn.disabled = false;
      downloadControls.style.display = 'block';
    } else {
      trackingStatusEl.textContent = 'Inactive';
      trackingStatusEl.className = 'status-value status-inactive';
      sessionIdEl.textContent = '-';
      eventCountEl.textContent = '0';
      screenshotCountEl.textContent = '0';
      durationEl.textContent = '0s';
      qualityScoreEl.textContent = '0%';
      
      startBtn.disabled = false;
      stopBtn.disabled = true;
      downloadControls.style.display = 'none';
    }
  }
  
  // Format duration in seconds
  function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
  
  // Start tracking
  startBtn.addEventListener('click', async () => {
    try {
      errorDiv.style.display = 'none';
      startBtn.disabled = true;
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Generate session ID
      const sessionId = generateSessionId();
      
      // Send start message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'START_TRACKING',
        sessionId,
        config: {
          screenshotEnabled: true,
          compressionEnabled: true,
          privacyMode: true
        }
      });
      
      if (response && response.success) {
        await updateStatus();
      } else {
        throw new Error('Failed to start tracking');
      }
    } catch (error) {
      showError('Failed to start tracking: ' + error.message);
      startBtn.disabled = false;
    }
  });
  
  // Stop tracking
  stopBtn.addEventListener('click', async () => {
    try {
      errorDiv.style.display = 'none';
      stopBtn.disabled = true;
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send stop message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'STOP_TRACKING'
      });
      
      if (response && response.success) {
        await updateStatus();
        
        // Show summary if available
        if (response.data) {
          showSummary(response.data);
        }
      } else {
        throw new Error('Failed to stop tracking');
      }
    } catch (error) {
      showError('Failed to stop tracking: ' + error.message);
      stopBtn.disabled = false;
    }
  });

  // Download session data
  downloadBtn.addEventListener('click', async () => {
    try {
      errorDiv.style.display = 'none';
      downloadBtn.disabled = true;
      downloadBtn.textContent = 'Downloading...';
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Get session data from content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'GET_SESSION_DATA'
      });
      
      if (response && response.success && response.data) {
        downloadSessionAsJSON(response.data);
        downloadBtn.textContent = 'Downloaded!';
        setTimeout(() => {
          downloadBtn.textContent = 'Download Session Data';
        }, 2000);
      } else {
        throw new Error('No session data available');
      }
    } catch (error) {
      showError('Failed to download session data: ' + error.message);
    } finally {
      downloadBtn.disabled = false;
    }
  });
  
  // Settings link
  settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  
  // Generate session ID
  function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Show error message
  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    loadingDiv.style.display = 'none';
    contentDiv.style.display = 'block';
  }
  
  // Download session data as JSON
  function downloadSessionAsJSON(sessionData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `codesight-session-${sessionData.sessionId || 'unknown'}-${timestamp}.json`;
    
    const dataStr = JSON.stringify(sessionData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('Session data downloaded:', filename);
  }

  // Show session summary
  function showSummary(data) {
    // Could show a modal or notification with session summary
    console.log('Session completed:', data);
  }
  
  // Cleanup on popup close
  window.addEventListener('unload', () => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  });
});