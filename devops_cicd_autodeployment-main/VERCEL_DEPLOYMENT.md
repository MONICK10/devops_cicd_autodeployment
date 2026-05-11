# Vercel Deployment Guide

This guide will help you deploy your DevOps CI/CD Autodeployment project to Vercel.

## Prerequisites

- Vercel account (https://vercel.com)
- GitHub account with the project repository
- Node.js 18+ (specified in package.json)

## Deployment Steps

### 1. Push to GitHub

Make sure your project is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"**
4. Find and select `MONICK10/devops_cicd_autodeployment`
5. Click **"Import"**

### 3. Configure Project Settings

When Vercel prompts you to configure settings:

#### Project Name
- `devops-cicd-autodeployment`

#### Framework
- Select **"Other"** (since this is a custom Node.js Express app)

#### Root Directory
- `.` (current directory) or leave empty

#### Build Command
- `npm run build`
- (Or use `npm run vercel-build` - both are configured)

#### Output Directory
- `public` (if it exists, Vercel will use it; otherwise it uses the default)

#### Install Command
- `npm install` (default is fine)

#### Environment Variables (Optional)
- Add any environment variables your app needs
- Node defaults to `production` on Vercel

### 4. Deploy

1. Review the settings
2. Click **"Deploy"**
3. Wait for the build to complete (typically 1-2 minutes)

Your app will be available at: `https://devops-cicd-autodeployment.vercel.app`

## After Deployment

### View Logs
- Go to your Vercel project dashboard
- Click **"Deployments"** to see deployment history
- Click on any deployment to view logs

### Custom Domain (Optional)
- In project settings, go to **"Domains"**
- Add your custom domain
- Follow DNS configuration instructions

### Environment Variables
- Update environment variables in Vercel project settings
- No need to redeploy; they take effect immediately

## Important Configuration Files

The following files have been configured for Vercel:

- **`vercel.json`** - Vercel-specific configuration
- **`package.json`** - Build scripts (`build` and `vercel-build`)
- **`.vercelignore`** - Files to exclude from deployment
- **`server.js`** - Updated to use `process.env.PORT`

## Project Structure

```
devops_cicd_autodeployment/
├── server.js           # Main Express server (entry point)
├── public/             # Static files (served automatically)
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── lib/                # Helper modules
├── package.json        # Dependencies and scripts
├── vercel.json         # Vercel configuration
├── .vercelignore       # Files to exclude from deployment
└── .env.example        # Example environment variables
```

## Troubleshooting

### Build Fails
- Check the Vercel deployment logs
- Ensure all dependencies are in `package.json`
- Verify Node.js version is compatible (18+)

### Port Issues
- Vercel automatically sets `PORT` environment variable
- The app is configured to use `process.env.PORT || 5000`
- No manual port configuration needed

### CORS Issues
- The app includes CORS middleware configured for localhost
- Update CORS origins in `server.js` if needed for your domain:
  ```javascript
  const allowedOrigins = ['http://localhost:3000', 'https://your-domain.vercel.app'];
  ```

### Static Files Not Serving
- Ensure files are in the `public/` directory
- Verify `express.static` middleware is configured
- Check `.vercelignore` doesn't exclude needed files

## Support

For more information:
- [Vercel Documentation](https://vercel.com/docs)
- [Express.js Documentation](https://expressjs.com)
- Check GitHub Issues for project-specific questions
