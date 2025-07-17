# Chrome Extension Installation Guide

## Step 1: Enable Developer Mode
1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Toggle "Developer mode" ON (top right corner)

## Step 2: Load Extension
1. Click "Load unpacked" button
2. Select the `dist` folder containing this extension
3. The extension should now appear in your extensions list

## Step 3: Verify Installation
1. Look for the CodeSight icon in your browser toolbar
2. Click the icon to open the popup
3. Check that it shows "Ready" status

## Step 4: Test Connection
1. Open the test page: `test.html`
2. Click "Test Connection" button
3. Should show "Successfully connected to backend!"

## Troubleshooting

### Extension Not Loading
- Make sure you selected the correct `dist` folder
- Check that `manifest.json` exists in the selected folder
- Refresh the extensions page and try again

### Connection Issues
- Check your internet connection
- Verify the backend is running
- Check browser console for error messages

### Permission Issues
- Make sure the extension has the required permissions
- Check Chrome's extension permissions settings

## Support

For issues or questions, check the browser console (F12) for error messages.
