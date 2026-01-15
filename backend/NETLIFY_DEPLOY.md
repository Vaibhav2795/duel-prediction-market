# Netlify Deployment Guide

This backend has been configured for deployment on Netlify using serverless functions.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build for Netlify**
   ```bash
   npm run build:netlify
   ```

## Environment Variables

Make sure to set the following environment variables in your Netlify dashboard:

- `MONGODB_URI` - Your MongoDB connection string
- Any other environment variables your app requires

## Important Notes

### Socket.io Limitations

⚠️ **Socket.io will NOT work on Netlify serverless functions** because:
- Serverless functions are stateless and short-lived
- WebSocket connections cannot be maintained across function invocations
- Each request is handled by a separate function instance

**Alternatives for real-time features:**
- Use a separate service for WebSocket connections (e.g., Pusher, Ably, or a dedicated WebSocket server)
- Use Server-Sent Events (SSE) if supported
- Use polling for real-time updates
- Deploy Socket.io server separately on a platform that supports persistent connections (e.g., Railway, Render, Heroku)

### Database Connections

The serverless function handler includes database connection management that:
- Connects to MongoDB on first invocation
- Reuses the connection for subsequent invocations
- Handles connection errors gracefully

### Deployment

1. Connect your repository to Netlify
2. Set the build command: `npm run build:netlify`
3. Set the publish directory: `dist` (if serving static files)
4. Set the functions directory: `dist/netlify/functions`
5. Configure environment variables in Netlify dashboard
6. Deploy!

## Routes

All API routes are automatically proxied to the serverless function:
- `/api/*` → `/.netlify/functions/api`
- `/matches/*` → `/.netlify/functions/api`
- `/users/*` → `/.netlify/functions/api`
