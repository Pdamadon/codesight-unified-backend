# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CodeSight Crowdsource Collector is a comprehensive platform for collecting high-quality shopping behavior data to train AI agents for e-commerce automation. The system combines screen/audio recording with precise click tracking via browser extension to generate training data for AI models.

## Repository Structure

This is a multi-component system with three main parts:

- **Root**: Monorepo configuration and deployment scripts
- **Backend** (`backend/`): Node.js/TypeScript API server with WebSocket support
- **Frontend** (`frontend/`): React/TypeScript web application for worker interface
- **Browser Extension** (`browser-extension/`): Chrome Manifest V3 extension for click tracking

## Development Commands

### Root Level Commands
```bash
npm run build    # Build backend only
npm run start    # Start backend in production
npm run dev      # Start backend in development mode
```

### Backend Commands (`cd backend`)
```bash
npm run dev           # Start development server with tsx watch
npm run build         # Compile TypeScript to dist/
npm run start         # Start production server
npm run lint          # ESLint TypeScript files
npm run test          # Run Jest tests
npm run db:migrate    # Run Prisma migrations
npm run db:generate   # Generate Prisma client
npm run db:studio     # Open Prisma Studio
```

### Frontend Commands (`cd frontend`)
```bash
npm run dev      # Start Vite development server (port 5173)
npm run build    # Build for production (TypeScript + Vite)
npm run preview  # Preview production build
npm run lint     # ESLint with strict TypeScript rules
npm run deploy   # Build and deploy to Vercel
```

### Browser Extension
Load manually in Chrome developer mode from `browser-extension/` folder.

## Architecture Patterns

### Backend Architecture
- **Express.js** server with TypeScript
- **WebSocket server** for real-time extension communication at `/extension-ws`
- **Prisma ORM** with PostgreSQL database
- **AWS S3** integration for file storage
- **Structured logging** with Winston
- **Route-based organization**: `routes/` for API endpoints, `services/` for business logic

### Frontend Architecture
- **React Router** for page navigation
- **Zustand** for state management (not Redux)
- **Tailwind CSS** for styling
- **MediaRecorder API** for screen/audio recording
- **WebRTC** integration for browser recording capabilities

### Browser Extension Architecture
- **Manifest V3** Chrome extension
- **Service Worker** background script for WebSocket management
- **Content Scripts** injected on all pages for click tracking
- **Real-time event streaming** to backend via WebSocket

### Database Schema (Prisma)
Key models:
- `Session`: Main session records with demographics and status
- `Recording`: Video/audio recordings linked to sessions
- `Worker`: Participant information and statistics
- `ExtensionSession`: Browser extension tracking sessions
- `ExtensionEvent`: Individual click/interaction events

## Key Integration Points

### WebSocket Communication
The backend runs a WebSocket server at `/extension-ws` that receives real-time events from the browser extension. Events are validated and stored in the database immediately.

### File Upload Flow
1. Frontend requests S3 presigned URL via `/api/upload/url`
2. Direct upload to S3 bucket
3. Frontend confirms completion via `/api/upload/complete`

### Extension Data Flow
1. Extension connects to WebSocket server
2. Real-time events streamed as user interacts with websites
3. Session data automatically downloaded as JSON when tracking stops
4. Training data format available via `/api/extension/sessions/{id}/training-data`

## Environment Configuration

### Backend (.env)
Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: AWS credentials
- `S3_BUCKET_NAME`: S3 bucket for file storage
- `FRONTEND_URL`: Frontend URL for CORS

### Frontend (.env)
Required variables:
- `VITE_API_URL`: Backend API URL
- `VITE_WS_URL`: WebSocket URL for extension communication

## Testing and Quality

### Linting
- Backend: ESLint with TypeScript configuration
- Frontend: ESLint with React and TypeScript rules
- Run `npm run lint` in respective directories

### Database Migrations
Use Prisma for schema changes:
```bash
cd backend
npm run db:migrate    # Apply pending migrations
npm run db:generate   # Regenerate client after schema changes
```

## Deployment

### Production Stack
- **Backend**: Railway.app (auto-deploys from GitHub)
- **Frontend**: Vercel (manual deployment with `npm run deploy`)
- **Database**: Railway PostgreSQL
- **Storage**: AWS S3

### Browser Extension Installation
1. Go to `chrome://extensions/`
2. Enable Developer mode
3. Load unpacked extension from `browser-extension/` folder
4. Configure WebSocket URL to production backend

## Security Considerations

- **Input validation** on all API endpoints
- **Parameterized queries** via Prisma to prevent SQL injection
- **CORS restrictions** to allowed frontend origins
- **Data sanitization** removes sensitive information (passwords, emails, payment data)
- **WebSocket authentication** via session ID validation

## Git Commit Guidelines

- **Never include "Generated with Claude Code" or similar AI attribution lines in commit messages**
- Keep commit messages concise and focused on the actual changes made
- Use conventional commit format when possible (feat:, fix:, docs:, etc.)