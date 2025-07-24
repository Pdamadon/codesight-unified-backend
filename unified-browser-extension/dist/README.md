# CodeSight Shopping Assistant Extension

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

