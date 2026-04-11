# 🚀 QUICK START GUIDE

## Pre-Flight Checklist

Before starting, make sure you have:

```
✅ Node.js v18+        → https://nodejs.org/
✅ Docker Desktop      → https://www.docker.com/
✅ Git                 → https://git-scm.com/
```

**Verify installations:**
```powershell
node --version
docker --version
git --version
```

---

## ONE-COMMAND START (Recommended)

### Option 1: Batch File (Double-click)
```
Windows Explorer → d:\devops → START.bat (double-click)
```

### Option 2: PowerShell
```powershell
cd d:\devops
.\START.ps1
```

### Option 3: Command Prompt
```cmd
cd d:\devops
START.bat
```

### Option 4: Manual
```powershell
cd d:\devops
npm install
npm start
```

---

## Step-by-Step Manual Start

### Step 1: Open Terminal
```powershell
# Windows PowerShell or Command Prompt
cd d:\devops
```

### Step 2: Install Dependencies
```powershell
npm install
```

**Expected output:**
```
added 58 packages, and audited 59 packages in 2s
```

### Step 3: Start Server
```powershell
npm start
```

**Expected output:**
```
╔════════════════════════════════════════╗
║   🚀 Deployment Platform Started       ║
╠════════════════════════════════════════╣
║ Backend running on port 5000            ║
║ Frontend: http://localhost:5000        ║
║                                        ║
║ Ready to deploy applications!          ║
╚════════════════════════════════════════╝
```

### Step 4: Open Browser
```
http://localhost:5000
```

---

## First Deployment (Test Drive)

### Test with a Simple Repository

1. **In the UI, paste:**
   ```
   https://github.com/expressjs/express
   ```

2. **Click Deploy 🚀**

3. **Check the logs** for:
   - ✅ Repository cloned successfully!
   - ✅ Dockerfile found!
   - ✅ Docker image built successfully!
   - ✅ Container running successfully!

4. **Click the URL** to access the app

---

## Project File Structure

```
d:\devops/
│
├── server.js                 ← Backend API (Express)
├── package.json             ← Dependencies
├── README.md                ← Full documentation
├── QUICK_START.md           ← This file
├── START.bat                ← Windows batch starter
├── START.ps1                ← PowerShell starter
├── Dockerfile               ← For platform itself (optional)
│
└── public/                  ← Frontend files
    ├── index.html          ← UI layout
    ├── styles.css          ← Styling
    └── script.js           ← Frontend logic
```

---

## Available Commands

### Terminal Commands

```powershell
# Start platform
npm start

# Install dependencies
npm install

# View running containers
docker ps

# View all containers
docker ps -a

# Stop a container
docker stop <container-name>

# View Docker logs
docker logs <container-name>

# Remove a container
docker rm <container-name>

# Remove an image
docker rmi <image-name>
```

### API Endpoints

```
GET  http://localhost:5000/              → Frontend UI
GET  http://localhost:5000/api/health    → Health check
GET  http://localhost:5000/api/status    → Current status
POST http://localhost:5000/api/deploy    → Start deployment
POST http://localhost:5000/api/stop      → Stop deployment
```

---

## Deployment Flow (What Happens)

```
User Input: GitHub URL
         ⬇️
Validation Check
         ⬇️
git clone <repo>
         ⬇️
Find Dockerfile
         ⬇️
docker build -t <image>
         ⬇️
docker run -p 3000:3000 <image>
         ⬇️
Display URL & Logs
         ⬇️
User can access app!
```

**Typical timeline:**
- Clone: 5-30 seconds
- Build: 30-300 seconds (first time, faster on rebuild)
- Run: 2-10 seconds
- **Total: 1-5 minutes**

---

## Example GitHub Repositories to Try

### Simple Node Apps (Good for Testing)

```
https://github.com/expressjs/express
https://github.com/vercel/next.js
https://github.com/fastify/fastify
https://github.com/koajs/koa
```

### How to Create Your Own Test App

```bash
# Create folder
mkdir my-test-app
cd my-test-app

# Create app.js
cat > app.js << 'EOF'
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('<h1>✅ Deployed Successfully!</h1>');
});

app.listen(3000, () => console.log('✅ Server on port 3000'));
EOF

# Create package.json
cat > package.json << 'EOF'
{
  "name": "test-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2"
  }
}
EOF

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "app.js"]
EOF

# Initialize and push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USERNAME/my-test-app.git
git branch -M main
git push -u origin main
```

Then deploy from your platform!

---

## Troubleshooting

### Error: "npm: command not found"
**Solution:** Node.js not installed
```powershell
# Install from: https://nodejs.org/
# Then restart PowerShell
```

### Error: "docker: command not found"
**Solution:** Docker not installed or not running
```powershell
# 1. Install Docker Desktop: https://www.docker.com/
# 2. Start Docker Desktop application
# 3. Wait for Docker to fully start
# 4. Try again
```

### Error: "A deployment is already in progress"
**Solution:** Previous deployment still running
```powershell
# Option 1: Wait for it to complete (1-5 minutes)
# Option 2: Click "Stop" button in UI
# Option 3: Use terminal:
docker ps                          # List containers
docker stop <container-name>       # Stop it
```

### Error: "Port 5000 is already in use"
**Solution:** Another app using the port
```powershell
# Find process using port 5000
Get-Process | Where-Object { $_.Name -like "*node*" }

# Kill the process
Stop-Process -Name node -Force

# Or change port in server.js line 5
```

### Error: "Git clone hangs"
**Solution:** Network or invalid URL
```powershell
# Test the URL manually:
git clone https://github.com/user/repo test-repo

# If that fails, URL is invalid
```

### Error: "Failed to build Docker image"
**Solution:** Missing dependencies or Dockerfile syntax error
```powershell
# Check:
# 1. Dockerfile exists in repo
# 2. app.js or entry point exists
# 3. package.json is valid JSON
# 4. Dockerfile has correct Node.js version
```

---

## Performance Tips

### Speed Up Builds
- Use smaller base images (e.g., `node:18-alpine`)
- Cache npm packages
- Use `.dockerignore` to exclude unnecessary files

### Free Up Space
```powershell
# Remove unused images
docker image prune

# Remove unused containers
docker container prune

# Remove all unused data
docker system prune
```

### Monitor Resources
```powershell
# View container stats
docker stats

# View logs in real-time
docker logs -f <container-name>
```

---

## Next Steps (After Getting It Working)

1. **Deploy Your Own App**
   - Create a GitHub repo with Dockerfile
   - Test deployment through UI

2. **Customize Settings**
   - Change port in `server.js`
   - Add environment variables
   - Modify timeouts

3. **Extend Features**
   - Add database integration
   - Implement GitHub webhooks
   - Add deployment history
   - Setup monitoring

4. **Deploy to Cloud**
   - AWS Elastic Container Service
   - DigitalOcean App Platform
   - Google Cloud Run
   - Azure Container Instances

---

## Key Concepts to Understand

**Git Clone** - Downloads repo to temporary folder
```powershell
git clone <URL> <destination>
```

**Docker Build** - Converts code + Dockerfile into image
```powershell
docker build -t image-name .
```

**Docker Run** - Starts a container from image
```powershell
docker run -p 3000:3000 image-name
```

**Port Mapping** - Connects host port to container port
```
-p 3000:3000
  ↑     ↑
  host  container
```

---

## Common Questions

**Q: Why do I need Docker?**
A: Docker ensures the app runs the same way in your platform as it does on users' machines. Eliminates "works on my machine" problems.

**Q: Why git clone?**
A: We need the actual code to build it. Git clone is the standard way to get code from GitHub.

**Q: Can I deploy private repos?**
A: Not in this version. Would need repo authentication (GitHub PAT or SSH keys).

**Q: Can I deploy non-Node.js apps?**
A: Yes, if they have a Dockerfile. The Dockerfile defines how to build any app.

**Q: Why port 3000?**
A: Convention for Node.js apps. Change in the Dockerfile if your app uses different port.

**Q: What if I deploy the same repo twice?**
A: Platform prevents concurrent deployments. Stop the first one, then deploy again.

---

## Stopping the Platform

**In Terminal:**
```
Press Ctrl+C
```

**Check if Still Running:**
```powershell
docker ps  # See running containers
netstat -ano | findstr :5000  # Check port 5000
```

---

## Summary

| Step | Command | Time |
|------|---------|------|
| Install deps | `npm install` | 1-2 min |
| Start server | `npm start` | Instant |
| Deploy app | Click Deploy + wait | 1-5 min |
| Access app | Click URL | Instant |

**Total time to first deployment: 5-10 minutes** ✨

---

## Support Resources

- **Express.js Docs:** https://expressjs.com/
- **Docker Docs:** https://docs.docker.com/
- **Git Docs:** https://git-scm.com/doc
- **Node.js Docs:** https://nodejs.org/docs/

---

**You're ready! Happy deploying! 🚀**

Run one of these commands now:
```powershell
npm start
# OR
.\START.ps1
# OR
START.bat
```

Then open: http://localhost:5000
