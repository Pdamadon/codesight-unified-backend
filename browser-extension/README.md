# CodeSight Shopping Tracker - Browser Extension

A Chrome extension that captures detailed shopping behavior data including clicks, scrolls, form inputs, and navigation patterns with precise CSS selectors.

## 🚀 Features

- **Real-time Click Tracking** - Captures every click with CSS selectors and coordinates
- **Form Input Monitoring** - Records form interactions with privacy protection
- **Scroll & Navigation Tracking** - Monitors browsing patterns across shopping sites
- **WebSocket Integration** - Real-time data streaming to CodeSight backend
- **Privacy Protection** - Automatically sanitizes sensitive data (passwords, payment info)
- **Visual Feedback** - Shows tracking status and click indicators
- **Session Management** - Start/stop tracking with session IDs

## 📦 Installation

### Method 1: Developer Mode (Recommended)

1. **Download Extension Files**
   ```bash
   # Clone or download the browser-extension folder
   cd codesight-crowdsource-collector/browser-extension
   ```

2. **Open Chrome Extensions**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)

3. **Load Extension**
   - Click "Load unpacked"
   - Select the `browser-extension` folder
   - Extension should appear with CodeSight icon

4. **Pin Extension**
   - Click Extensions icon in Chrome toolbar
   - Pin "CodeSight Shopping Tracker" for easy access

### Method 2: Package Installation

1. **Create Extension Package**
   ```bash
   # Zip the browser-extension folder
   zip -r codesight-extension.zip browser-extension/
   ```

2. **Install Package**
   - Drag `codesight-extension.zip` to `chrome://extensions/`
   - Or use "Load unpacked" with extracted folder

## 🎯 Usage

### 1. Connect to CodeSight Backend

1. **Click Extension Icon** in Chrome toolbar
2. **Enter Backend URL**: 
   - Local: `ws://localhost:8080`
   - Production: `wss://your-railway-app.railway.app`
3. **Click "Connect to CodeSight"**
   - Status should show "Connected" ✅

### 2. Start Tracking Session

1. **Enter Session ID** (auto-generated when clicked)
2. **Click "Start Tracking"**
3. **Green indicator** appears on all websites: "🎯 CodeSight Tracking"
4. **Browse shopping websites** normally
5. **Red dots** show where clicks are captured

### 3. Stop Tracking

1. **Click Extension Icon**
2. **Click "Stop Tracking"**
3. **Data automatically sent** to CodeSight backend

## 📊 Data Captured

### Click Events
- **CSS Selector**: Precise element selector
- **Coordinates**: Click position (x, y)
- **Element Info**: Tag, text, attributes
- **Timestamp**: Exact timing
- **URL**: Current page

### Form Inputs
- **Field Type**: Text, email, select, etc.
- **Sanitized Value**: Privacy-protected content
- **Label Detection**: Associated field labels
- **CSS Selector**: Form element selector

### Navigation & Scrolling
- **Page Changes**: URL transitions
- **Scroll Position**: Vertical/horizontal scrolling
- **Document Metrics**: Page height, viewport size

### Privacy Protection
- Passwords → `[PASSWORD]`
- Emails → `[EMAIL_PROVIDED]`
- Credit Cards → `[PAYMENT_INFO]`
- Long text → Truncated at 100 chars

## 🔧 Configuration

### Backend URL Configuration
- **Local Development**: `ws://localhost:8080`
- **Railway Production**: `wss://your-app.up.railway.app`
- **Custom Domain**: `wss://api.yourdomain.com`

### Session ID Format
- Auto-generated: `cs_[timestamp]_[random]`
- Example: `cs_1km2n3o_abc12`
- Can be manually entered if needed

## 🛠️ Development

### File Structure
```
browser-extension/
├── manifest.json         # Extension configuration
├── background.js         # Service worker & WebSocket
├── content-script.js     # Injection script for websites
├── popup.html           # Extension popup UI
├── popup.js             # Popup controller
├── icons/               # Extension icons
└── README.md           # This file
```

### Testing Locally

1. **Start CodeSight Backend**
   ```bash
   cd backend
   npm run dev  # Starts on port 8080
   ```

2. **Load Extension** in Chrome (developer mode)

3. **Test on Shopping Sites**
   - Amazon, eBay, Shopify stores
   - Check console for "CodeSight captured:" logs
   - Verify WebSocket connection in Network tab

### Adding New Event Types

1. **Content Script** (`content-script.js`):
   ```javascript
   // Add new event handler
   handleNewEvent(event) {
     const eventData = {
       type: 'new_event',
       // ... capture data
     };
     this.captureEvent('new_event', eventData);
   }
   ```

2. **Backend** (`websocketServer.ts`):
   ```typescript
   case 'new_event':
     await this.handleNewEvent(ws, message);
     break;
   ```

## 🔒 Security & Privacy

- **Local Processing**: All data processing happens locally
- **Encrypted Transport**: WebSocket Secure (WSS) in production
- **No External Services**: Direct connection to your CodeSight backend
- **Automatic Sanitization**: Removes passwords, payment info, emails
- **Permission Model**: Only accesses active tabs during tracking

## 🚨 Troubleshooting

### Extension Not Connecting
- ✅ Check backend is running on correct port
- ✅ Verify WebSocket URL format (`ws://` or `wss://`)
- ✅ Check browser console for errors
- ✅ Try refreshing extension page

### No Events Captured
- ✅ Ensure tracking is started (green indicator visible)
- ✅ Check if content script is injected (console logs)
- ✅ Verify website allows extension scripts
- ✅ Try reloading the shopping website

### WebSocket Connection Failed
- ✅ Backend server must be running
- ✅ Check firewall/network settings
- ✅ Verify CORS settings in backend
- ✅ Try different WebSocket URL format

### Database Errors
- ✅ Run backend migrations: `POST /api/migrate`
- ✅ Check PostgreSQL connection
- ✅ Verify database tables exist

## 🔄 Data Flow

```
Shopping Website → Content Script → Background Script → WebSocket → CodeSight Backend → PostgreSQL
```

1. **User clicks** on shopping website
2. **Content script** captures event with CSS selector
3. **Background script** receives event via Chrome messaging
4. **WebSocket** sends event to CodeSight backend
5. **Backend** stores in PostgreSQL database
6. **Real-time display** in CodeSight app (optional)

## 📈 Performance

- **Minimal Impact**: Throttled event capture (scroll: 200ms, hover: 1s)
- **Efficient Storage**: Events batched and compressed
- **Memory Management**: Automatic cleanup of stale sessions
- **Network Optimization**: WebSocket for real-time, low-latency transfer

## 🔧 Advanced Configuration

### Custom Event Throttling
Edit `content-script.js`:
```javascript
document.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 200), true);
//                                                                            ^^^ Change delay
```

### Disable Certain Event Types
Comment out unwanted handlers in `bindEvents()`:
```javascript
// document.addEventListener('mouseover', this.handleHover.bind(this), true);
```

### Custom Session ID Format
Modify `generateSessionId()` in `popup.js`:
```javascript
generateSessionId() {
  return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
}
```

## 📋 Browser Compatibility

- ✅ **Chrome** 88+ (Manifest V3)
- ✅ **Edge** 88+ (Chromium-based)
- ❌ **Firefox** (requires Manifest V2 conversion)
- ❌ **Safari** (requires Safari extension format)

## 📞 Support

If you encounter issues:

1. **Check Console**: Browser DevTools → Console tab
2. **Check Network**: Look for WebSocket connection in Network tab
3. **Backend Logs**: Check CodeSight backend server logs
4. **Database**: Verify data in `extension_sessions` and `extension_events` tables

## 🎯 Next Steps

After installation:
1. Test with various shopping websites
2. Verify data quality in backend database
3. Integrate with CodeSight frontend display
4. Configure for production deployment
5. Train workers on extension usage