# 🚀 Frontend Deployment Guide

## Step-by-Step Instructions to Deploy Frontend to Vercel

### Prerequisites
- GitHub account
- Vercel account (free at vercel.com)
- Your backend API deployed and running

### Step 1: Prepare Your Code

1. **Check that your code is ready**
   ```bash
   # Test that the build works locally
   npm run build
   
   # Make sure there are no TypeScript errors
   npm run type-check
   ```

### Step 2: Push to GitHub

1. **Initialize Git (if not already done)**
   ```bash
   cd your-project-directory
   git init
   ```

2. **Add all files**
   ```bash
   git add .
   ```

3. **Commit your changes**
   ```bash
   git commit -m "Initial commit: AI Interview Assistant Frontend"
   ```

4. **Create a new repository on GitHub**
   - Go to [github.com](https://github.com)
   - Click "New repository"
   - Name it: `ai-interview-assistant-frontend`
   - Set it to Public or Private
   - DO NOT initialize with README (since you already have one)
   - Click "Create repository"

5. **Link and push to GitHub**
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ai-interview-assistant-frontend.git
   git push -u origin main
   ```

### Step 3: Deploy to Vercel

1. **Go to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Import Project**
   - Click "New Project"
   - Select "Import Git Repository"
   - Choose your `ai-interview-assistant-frontend` repository
   - Click "Import"

3. **Configure Project**
   - **Project Name**: `ai-interview-assistant` (or whatever you prefer)
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (keep default)
   - **Build Command**: `npm run build` (keep default)
   - **Output Directory**: `.next` (keep default)
   - **Install Command**: `npm install` (keep default)

4. **Set Environment Variables**
   - In the "Environment Variables" section, add:
     - **Name**: `NEXT_PUBLIC_API_URL`
     - **Value**: `https://your-backend-url.com` (replace with your actual backend URL)
   - Click "Add" then "Deploy"

### Step 4: Wait for Deployment
- Vercel will build and deploy your app
- This usually takes 1-3 minutes
- You'll get a URL like: `https://ai-interview-assistant-xyz123.vercel.app`

### Step 5: Test Your Deployment
1. Visit your Vercel URL
2. Try to:
   - Register a new account
   - Login
   - Upload a document
   - Use the AI features

### Step 6: Custom Domain (Optional)
If you have a custom domain:
1. Go to your project settings in Vercel
2. Click "Domains"
3. Add your custom domain
4. Follow the DNS setup instructions

### Step 7: Update Backend CORS
Don't forget to update your backend's CORS settings to include your new Vercel URL:

```env
# In your backend .env file
ALLOWED_HOSTS=["https://your-vercel-app.vercel.app", "https://your-custom-domain.com"]
```

## Troubleshooting

### Build Fails
- Check the build logs in Vercel dashboard
- Make sure `npm run build` works locally
- Check for TypeScript errors

### App Loads but API Calls Fail
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check that your backend is running and accessible
- Verify CORS settings in backend

### Environment Variables Not Working
- Make sure variable names start with `NEXT_PUBLIC_`
- Redeploy after adding new environment variables
- Check Vercel dashboard > Settings > Environment Variables

## Updating Your App

When you make changes:
1. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your update message"
   git push
   ```
2. Vercel will automatically redeploy

## Commands Summary

```bash
# Initialize and push to GitHub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ai-interview-assistant-frontend.git
git push -u origin main

# For future updates
git add .
git commit -m "Update message"
git push
```

That's it! Your AI Interview Assistant frontend is now live on Vercel! 🎉