// Popup script for CodeSight Tracker extension

document.addEventListener('DOMContentLoaded', async () => {
  const loadingDiv = document.getElementById('loading');
  const contentDiv = document.getElementById('content');
  const consentDialog = document.getElementById('consentDialog');
  const errorDiv = document.getElementById('error');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadControls = document.getElementById('downloadControls');
  const settingsLink = document.getElementById('settingsLink');
  const acceptBtn = document.getElementById('acceptBtn');
  const declineBtn = document.getElementById('declineBtn');
  
  // Status elements
  const trackingStatusEl = document.getElementById('trackingStatus');
  const sessionIdEl = document.getElementById('sessionId');
  const eventCountEl = document.getElementById('eventCount');
  const screenshotCountEl = document.getElementById('screenshotCount');
  const durationEl = document.getElementById('duration');
  const qualityScoreEl = document.getElementById('qualityScore');
  
  let updateInterval = null;
  let generatedTask = null;
  
  // Check for existing consent
  chrome.storage.local.get(['userConsent'], async (result) => {
    if (result.userConsent === true) {
      // User has already consented, initialize normally
      await initializeExtension();
    } else {
      // Show consent dialog
      loadingDiv.style.display = 'none';
      consentDialog.style.display = 'block';
    }
  });
  
  // Consent handlers
  acceptBtn.addEventListener('click', async () => {
    chrome.storage.local.set({ userConsent: true }, async () => {
      consentDialog.style.display = 'none';
      await initializeExtension();
    });
  });
  
  declineBtn.addEventListener('click', () => {
    chrome.storage.local.set({ userConsent: false }, () => {
      consentDialog.style.display = 'none';
      showError('Data collection consent is required to use this shopping assistant.');
    });
  });
  
  // Initialize extension after consent
  async function initializeExtension() {
    try {
      await updateStatus();
      await generateTaskForCurrentSite();
      loadingDiv.style.display = 'none';
      contentDiv.style.display = 'block';
      
      // Start periodic updates
      updateInterval = setInterval(updateStatus, 1000);
    } catch (error) {
      showError('Failed to initialize: ' + error.message);
    }
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
        generatedTask,
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
  
  // Generate task for current site
  async function generateTaskForCurrentSite() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tab.url;
      
      // Skip task generation for non-http(s) URLs
      if (!currentUrl || (!currentUrl.startsWith('http://') && !currentUrl.startsWith('https://'))) {
        console.log('Skipping task generation for non-web URL:', currentUrl);
        return;
      }
      
      console.log('Generating task for site:', currentUrl);
      
      // Show task display section immediately
      const taskDisplayEl = document.getElementById('taskDisplay');
      if (taskDisplayEl) {
        taskDisplayEl.style.display = 'block';
        document.getElementById('taskTitle').textContent = 'Generating task...';
        document.getElementById('taskDescription').textContent = 'Please wait while we create a personalized shopping task for this website.';
      }
      
      // Get API config from backend
      const apiBaseUrl = 'https://gentle-vision-production.up.railway.app';
      const configResponse = await fetch(`${apiBaseUrl}/config`);
      if (!configResponse.ok) {
        throw new Error('Failed to get extension config');
      }
      const configData = await configResponse.json();
      const apiKey = configData.config.apiKey;
      
      const response = await fetch(`${apiBaseUrl}/api/tasks/generate?website=${encodeURIComponent(currentUrl)}&userLevel=beginner`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.task) {
          generatedTask = data.task;
          console.log('Generated task:', generatedTask.title);
          updateTaskDisplay();
        } else {
          console.error('Task generation failed:', data.error || 'Unknown error');
          console.log('Task generation response:', data);
        }
      } else {
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error('Failed to call task generation API:', response.status, response.statusText);
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error generating task:', error);
      // Don't show error to user - just proceed without generated task
    }
  }

  // Generate session ID
  function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Update task display in popup
  function updateTaskDisplay() {
    const taskDisplayEl = document.getElementById('taskDisplay');
    const taskTitleEl = document.getElementById('taskTitle');
    const taskDescriptionEl = document.getElementById('taskDescription');
    const regenerateBtn = document.getElementById('regenerateBtn');
    
    if (generatedTask && taskDisplayEl) {
      taskTitleEl.textContent = generatedTask.title;
      taskDescriptionEl.textContent = generatedTask.description;
      taskDisplayEl.style.display = 'block';
      
      // Update regenerate button if it exists
      if (regenerateBtn) {
        regenerateBtn.onclick = async () => {
          regenerateBtn.textContent = 'Generating...';
          regenerateBtn.disabled = true;
          await generateTaskForCurrentSite();
          regenerateBtn.textContent = 'Generate New Task';
          regenerateBtn.disabled = false;
        };
      }
    }
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