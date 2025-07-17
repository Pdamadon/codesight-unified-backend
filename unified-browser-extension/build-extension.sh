#!/bin/bash

# Build script for CodeSight Unified Browser Extension

echo "🏗️  Building CodeSight Unified Browser Extension..."

# Create build directory
BUILD_DIR="dist"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy essential files
echo "📋 Copying files..."
cp manifest.json "$BUILD_DIR/"
cp background.js "$BUILD_DIR/"
cp content-script.js "$BUILD_DIR/"
cp injected-script.js "$BUILD_DIR/"
cp popup.html "$BUILD_DIR/"
cp popup.js "$BUILD_DIR/"
cp options.html "$BUILD_DIR/"
cp options.js "$BUILD_DIR/"
cp test.html "$BUILD_DIR/"

# Copy icons directory
cp -r icons "$BUILD_DIR/"

# Create package info
echo "📝 Creating package info..."
cat > "$BUILD_DIR/README.md" << 'EOF'
# CodeSight Unified Browser Extension

This is the production build of the CodeSight Unified Browser Extension for shopping behavior data collection.

## Installation

1. Open Chrome browser
2. Go to chrome://extensions/
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select this directory

## Features

- Real-time WebSocket connection to backend
- Advanced screenshot capture with compression
- Comprehensive interaction tracking
- Privacy protection for sensitive data
- Quality validation and scoring
- Burst mode screenshot capture
- Modal and overlay detection

## Configuration

- Backend URL: wss://gentle-vision-production.up.railway.app/ws
- API Key: test-key-dev (development)
- Version: 2.0.0

## Usage

1. Install the extension
2. Navigate to any e-commerce website
3. Click the extension icon to start/stop recording
4. Data is automatically sent to the backend in real-time

## Privacy

The extension respects privacy by:
- Not capturing sensitive input data (passwords, credit cards)
- Using stable selectors for element identification
- Providing clear recording indicators
- Allowing users to control data collection

EOF

# Create version info
echo "📦 Creating version info..."
cat > "$BUILD_DIR/version.json" << EOF
{
  "version": "2.0.0",
  "build": "$(date -u +%Y%m%d%H%M%S)",
  "buildDate": "$(date -u)",
  "backend": "wss://gentle-vision-production.up.railway.app/ws",
  "features": [
    "real-time-websocket",
    "screenshot-compression",
    "interaction-tracking",
    "privacy-protection",
    "quality-validation",
    "burst-mode"
  ]
}
EOF

# Create installation instructions
echo "📋 Creating installation instructions..."
cat > "$BUILD_DIR/INSTALLATION.md" << 'EOF'
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
EOF

# Create zip package
echo "📦 Creating zip package..."
cd "$BUILD_DIR"
zip -r "../codesight-extension-v2.0.0.zip" ./*
cd ..

# Set permissions
chmod +x "$BUILD_DIR/test.html"

echo "✅ Extension built successfully!"
echo "📁 Build directory: $BUILD_DIR"
echo "📦 Zip package: codesight-extension-v2.0.0.zip"
echo ""
echo "🚀 Ready to install in Chrome:"
echo "   1. Open chrome://extensions/"
echo "   2. Enable Developer mode"
echo "   3. Click 'Load unpacked'"
echo "   4. Select the '$BUILD_DIR' folder"
echo ""
echo "📋 Files included:"
ls -la "$BUILD_DIR"