# Extension-Only Data Collection Plan

## Overview
Remove video recording from the frontend and rely solely on the browser extension for visual data capture through screenshots. This reduces storage costs while maintaining high-quality training data.

## Changes Required

### 1. Frontend Modifications

#### Remove Video Recording (`frontend/src/pages/Recording.tsx`)
- [ ] Remove all `MediaRecorder` code for screen recording
- [ ] Keep audio recording functionality
- [ ] Update UI to show only:
  - Audio recording status
  - Extension tracking status
  - Remove video preview/controls

#### Update Instructions
- [ ] Change instructions to emphasize extension usage
- [ ] Add clear steps:
  1. Start audio recording
  2. Ensure extension is tracking (green indicator)
  3. Perform shopping tasks
  4. Stop recording when complete
- [ ] Add extension troubleshooting tips

#### Modify Session Review (`frontend/src/pages/SessionReview.tsx`)
- [ ] Remove video preview section
- [ ] Add extension data preview:
  - Number of clicks captured
  - Number of screenshots taken
  - Pages visited
- [ ] Show sample screenshots from extension data

### 2. Data Bundling Strategy

#### Option A: ZIP Bundle (Recommended)
Bundle all data into a single ZIP file before S3 upload:
```
session_[id]_[timestamp].zip
├── audio.webm
├── session_data.json (click events, metadata)
├── screenshots/
│   ├── screenshot_001_click_1234567.png
│   ├── screenshot_002_navigation_1234568.png
│   └── ...
```

**Pros:**
- Single S3 upload
- Easy to download complete sessions
- Maintains file relationships

#### Option B: Folder Structure
Upload files individually to S3 folder:
```
s3://bucket/sessions/[session_id]/
├── audio.webm
├── session_data.json
├── screenshots/
│   ├── screenshot_001.png
│   └── ...
```

**Pros:**
- Can access individual files
- Parallel uploads possible

### 3. Backend Changes

#### Update Upload Endpoints (`backend/src/routes/upload.ts`)
- [ ] Add endpoint for ZIP file upload
- [ ] OR add batch upload endpoint for multiple files
- [ ] Update file type validation to accept PNG images

#### Update Session Schema (`backend/prisma/schema.prisma`)
```prisma
model Session {
  // Remove videoUrl field
  audioUrl      String?
  extensionDataUrl String?  // URL to session ZIP or folder
  screenshotCount Int?
  clickCount    Int?
  // ... rest of fields
}
```

#### Add Extension Data Processing
- [ ] Endpoint to receive extension data from frontend
- [ ] Process and validate screenshot data
- [ ] Generate training-ready format

### 4. Extension Integration

#### Modify Background Script (`browser-extension/background.js`)
- [ ] Add method to package all session data
- [ ] Include screenshots as base64 or blob data
- [ ] Create single payload for frontend

#### Update Content Script
- [ ] Ensure screenshot capture is reliable
- [ ] Add progress indicators for screenshot count
- [ ] Improve error handling and retry logic

### 5. Data Flow

```
1. User starts session on frontend
   - Begin audio recording
   - Extension automatically starts tracking

2. User performs tasks
   - Extension captures screenshots
   - Extension tracks all clicks/interactions
   - Audio records narration

3. User completes session
   - Frontend requests extension data
   - Package: audio + extension JSON + screenshots
   - Create ZIP bundle (recommended)

4. Upload to S3
   - Single ZIP file upload
   - Get S3 URL

5. Save to PostgreSQL
   - Session metadata
   - S3 URL for bundle
   - Statistics (clicks, screenshots, duration)
```

### 6. Implementation Order

1. **Phase 1: Frontend Changes**
   - Remove video recording code
   - Update UI and instructions
   - Test audio-only recording

2. **Phase 2: Extension Data Export**
   - Add data export method to extension
   - Test data packaging
   - Ensure screenshots are included

3. **Phase 3: Bundling & Upload**
   - Implement ZIP creation in frontend
   - Update upload logic
   - Test S3 uploads

4. **Phase 4: Backend Updates**
   - Update database schema
   - Modify API endpoints
   - Add data processing logic

### 7. Benefits

- **Reduced Storage**: ~95% less S3 storage (5MB vs 100MB per session)
- **Better Training Data**: Screenshots are precisely timed with actions
- **Simpler Pipeline**: No video frame extraction needed
- **Faster Uploads**: Much smaller file sizes
- **Cost Effective**: Significantly lower S3 costs

### 8. Considerations

- Ensure extension is reliable across different websites
- Add fallback if extension fails to capture screenshots
- Consider screenshot quality settings (PNG compression)
- Plan for sessions with many screenshots (100+)

### 9. Testing Plan

1. Test extension screenshot capture reliability
2. Verify ZIP bundle creation
3. Test S3 upload with various file sizes
4. Ensure data integrity through full pipeline
5. Validate training data format