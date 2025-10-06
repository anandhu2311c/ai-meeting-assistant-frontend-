# Frontend Setup Guide

This document explains how to set up and run the frontend application with the new authentication system.

## Overview

The frontend has been updated to work with the new FastAPI backend and includes:

- **Login/Registration Page** (`/login`): User authentication
- **Meeting Page** (`/meeting`): Main interface after login (replaces the old interview page)
- **Authentication System**: JWT-based authentication with automatic redirects
- **Document Management**: Upload files to AWS S3 through authenticated backend API

## Key Changes Made

### 1. New Pages Created

- **`app/login/page.tsx`**: Login and registration form
- **`app/meeting/page.tsx`**: Protected meeting interface (requires authentication)
- **`app/page.tsx`**: Redirects to login or meeting based on auth status

### 2. Updated Components

- **`components/PDFManager.tsx`**: Now works with backend API and S3 storage
- **`lib/auth.ts`**: Authentication utilities for API calls

### 3. Authentication Flow

1. User visits any page → redirected to `/login` if not authenticated
2. User logs in → token stored in localStorage → redirected to `/meeting`
3. User accesses protected resources → automatic token validation
4. Token expires → automatic redirect to login

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Start the Development Server

```bash
npm run dev
# or
pnpm dev
```

The application will be available at `http://localhost:3000`

## Usage Flow

### 1. First Time Setup

1. Start the backend server (see backend/AWS_DEPLOYMENT.md)
2. Start the frontend server
3. Visit `http://localhost:3000`
4. You'll be redirected to the login page

### 2. User Registration

1. Click "Don't have an account? Sign up"
2. Enter username, email, and password
3. Click "Create Account"
4. You'll be switched back to login form

### 3. User Login

1. Enter your username and password
2. Click "Sign In"
3. You'll be redirected to the meeting interface

### 4. Meeting Interface

- **Document Upload**: Upload PDF, DOC, DOCX, or TXT files
- **AI Assistant**: Chat with AI about uploaded documents
- **Transcription**: Real-time speech-to-text (if configured)
- **Session Management**: All data is saved to your user account

## API Integration

The frontend now communicates with the FastAPI backend for:

- **Authentication**: Login, registration, user profile
- **Meetings**: Create and manage meeting sessions
- **Documents**: Upload files to S3, manage document metadata
- **Transcriptions**: Save and retrieve conversation history

## File Structure

```
app/
├── login/
│   └── page.tsx           # Login/registration page
├── meeting/
│   └── page.tsx           # Protected meeting interface
├── page.tsx               # Root page (redirects based on auth)
└── layout.tsx             # App layout

components/
├── PDFManager.tsx         # Updated with backend integration
├── copilot.tsx           # AI chat interface
└── ui/                   # UI components

lib/
└── auth.ts               # Authentication utilities
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Protected Routes**: Automatic redirect for unauthenticated users
- **Token Expiration**: Automatic logout when tokens expire
- **CORS Protection**: Backend configured for specific origins

## Troubleshooting

### Common Issues

1. **Login fails**: Check backend is running on port 8000
2. **File upload fails**: Ensure AWS S3 is configured in backend
3. **Page redirects**: Clear localStorage if stuck in redirect loop
4. **API errors**: Check browser network tab for error details

### Debug Steps

1. **Check Backend Connection**:
   ```bash
   curl http://localhost:8000/health
   ```

2. **Clear Local Storage**:
   ```javascript
   localStorage.clear()
   ```

3. **Check Browser Console**: Look for authentication or API errors

## Production Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variable: `NEXT_PUBLIC_API_URL=https://your-backend-domain.com`
3. Deploy

### Backend Integration

Ensure your backend is deployed and accessible at the URL specified in `NEXT_PUBLIC_API_URL`.

## Next Steps

1. **Customize UI**: Update colors, branding, and layouts
2. **Add Features**: Implement additional meeting features
3. **Error Handling**: Add more robust error handling and user feedback
4. **Testing**: Add unit and integration tests
5. **Performance**: Optimize bundle size and loading times

## Development Notes

- The old landing page and interview page have been replaced
- All document uploads now go through the backend to S3
- User sessions persist across browser refreshes
- The application automatically handles authentication state