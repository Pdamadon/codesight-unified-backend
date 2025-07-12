// CodeSight Extension Popup Controller
class PopupController {
  constructor() {
    this.isConnected = false;
    this.isTracking = false;
    this.sessionId = null;
    this.eventCounts = {
      click: 0,
      scroll: 0,
      input: 0,
      total: 0
    };
    
    this.initializePopup();
  }

  async initializePopup() {
    this.bindEvents();
    await this.updateStatus();
    this.startStatusPolling();
  }

  bindEvents() {
    // Connection button
    document.getElementById('connectBtn').addEventListener('click', () => {
      this.handleConnect();
    });

    // Session control buttons
    document.getElementById('startBtn').addEventListener('click', () => {
      this.handleStartTracking();
    });

    document.getElementById('stopBtn').addEventListener('click', () => {
      this.handleStopTracking();
    });

    // Auto-generate session ID when field is clicked
    document.getElementById('sessionId').addEventListener('focus', (e) => {
      if (!e.target.value) {
        e.target.value = this.generateSessionId();
      }
    });
  }

  async handleConnect() {
    const connectBtn = document.getElementById('connectBtn');
    const websocketUrl = document.getElementById('websocketUrl').value;

    if (!websocketUrl) {
      alert('Please enter a WebSocket URL');
      return;
    }

    connectBtn.textContent = 'Connecting...';
    connectBtn.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'CONNECT_WEBSOCKET',
        url: websocketUrl
      });

      if (response.success) {
        this.isConnected = true;
        this.updateConnectionUI();
      } else {
        alert('Failed to connect to CodeSight app. Make sure the app is running.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Failed to connect. Error: ' + error.message);
    }

    connectBtn.disabled = false;
    await this.updateStatus();
  }

  async handleStartTracking() {
    const sessionIdInput = document.getElementById('sessionId');
    const sessionId = sessionIdInput.value.trim();

    if (!sessionId) {
      alert('Please enter a session ID');
      return;
    }

    if (!this.isConnected) {
      alert('Please connect to CodeSight app first');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'START_SESSION',
        sessionId: sessionId
      });

      if (response.success) {
        this.isTracking = true;
        this.sessionId = sessionId;
        this.resetEventCounts();
        this.updateTrackingUI();
        
        // Show notification
        this.showNotification('🎯 Tracking started! Browse shopping websites normally.');
      } else {
        alert('Failed to start tracking session');
      }
    } catch (error) {
      console.error('Start tracking error:', error);
      alert('Failed to start tracking: ' + error.message);
    }
  }

  async handleStopTracking() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'STOP_SESSION'
      });

      if (response.success) {
        this.isTracking = false;
        this.sessionId = null;
        this.updateTrackingUI();
        
        // Show completion notification
        this.showNotification('✅ Tracking stopped! Data has been sent to CodeSight app.');
      } else {
        alert('Failed to stop tracking session');
      }
    } catch (error) {
      console.error('Stop tracking error:', error);
      alert('Failed to stop tracking: ' + error.message);
    }
  }

  async updateStatus() {
    try {
      const status = await chrome.runtime.sendMessage({
        action: 'GET_STATUS'
      });

      this.isConnected = status.isConnected;
      this.sessionId = status.sessionId;
      this.isTracking = !!status.sessionId;

      this.updateConnectionUI();
      this.updateTrackingUI();
      
      // Update event count if tracking
      if (this.isTracking) {
        await this.updateEventCounts();
      }
    } catch (error) {
      console.error('Status update error:', error);
    }
  }

  async updateEventCounts() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab) {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'GET_STATUS'
        });

        if (response && response.eventCount) {
          this.eventCounts.total = response.eventCount;
          
          // Update UI
          document.getElementById('totalCount').textContent = this.eventCounts.total;
          document.getElementById('eventCount').textContent = this.eventCounts.total;
        }
      }
    } catch (error) {
      // Tab might not have content script
    }
  }

  updateConnectionUI() {
    const connectionStatus = document.getElementById('connectionStatus');
    const connectBtn = document.getElementById('connectBtn');
    const sessionControls = document.getElementById('sessionControls');

    if (this.isConnected) {
      connectionStatus.textContent = 'Connected';
      connectionStatus.className = 'status-value status-connected';
      connectBtn.textContent = 'Reconnect';
      connectBtn.className = 'btn btn-secondary';
      sessionControls.classList.remove('hidden');
    } else {
      connectionStatus.textContent = 'Disconnected';
      connectionStatus.className = 'status-value status-disconnected';
      connectBtn.textContent = 'Connect to CodeSight';
      connectBtn.className = 'btn btn-secondary';
      sessionControls.classList.add('hidden');
    }
  }

  updateTrackingUI() {
    const sessionStatus = document.getElementById('sessionStatus');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const eventsSummary = document.getElementById('eventsSummary');

    if (this.isTracking) {
      sessionStatus.textContent = this.sessionId || 'Active';
      sessionStatus.className = 'status-value status-tracking';
      startBtn.classList.add('hidden');
      stopBtn.classList.remove('hidden');
      eventsSummary.classList.remove('hidden');
    } else {
      sessionStatus.textContent = 'None';
      sessionStatus.className = 'status-value';
      startBtn.classList.remove('hidden');
      stopBtn.classList.add('hidden');
      eventsSummary.classList.add('hidden');
    }
  }

  resetEventCounts() {
    this.eventCounts = {
      click: 0,
      scroll: 0,
      input: 0,
      total: 0
    };

    document.getElementById('clickCount').textContent = '0';
    document.getElementById('scrollCount').textContent = '0';
    document.getElementById('inputCount').textContent = '0';
    document.getElementById('totalCount').textContent = '0';
    document.getElementById('eventCount').textContent = '0';
  }

  generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `cs_${timestamp}_${random}`;
  }

  showNotification(message) {
    // Use console.log instead of notifications for now
    console.log('CodeSight:', message);
    
    // Try to show notification if API is available
    if (chrome.notifications && chrome.notifications.create) {
      try {
        chrome.notifications.create({
          type: 'basic',
          title: 'CodeSight Tracker',
          message: message
        });
      } catch (error) {
        console.log('Notification failed:', error);
      }
    }
  }

  startStatusPolling() {
    // Update status every 2 seconds while popup is open
    setInterval(() => {
      if (this.isTracking) {
        this.updateEventCounts();
      }
    }, 2000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});