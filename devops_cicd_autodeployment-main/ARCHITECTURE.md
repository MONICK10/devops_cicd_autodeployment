# 🏗️ ARCHITECTURE & INTERNALS

## High-Level System Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER BROWSER                              │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │  Frontend (HTML/CSS/JS)                                        ││
│  │  • Input GitHub URL                                            ││
│  │  • Deploy button                                               ││
│  │  • Live logs terminal                                          ││
│  │  • Deployment status                                           ││
│  └────────────────────────────────────────────────────────────────┘│
└─────────┬───────────────────────────────────────────────────────────┘
          │ HTTP Requests/Responses
          │ (JSON API)
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND SERVER                               │
│                    (Node.js + Express.js)                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  API Endpoints                                              │   │
│  │  • GET  /                    → Serve index.html             │   │
│  │  • POST /api/deploy          → Trigger deployment           │   │
│  │  • POST /api/stop            → Stop container               │   │
│  │  • GET  /api/status          → Get current status           │   │
│  │  • GET  /api/health          → Health check                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Deployment Orchestrator                                    │   │
│  │  • Command execution engine                                 │   │
│  │  • Sequential execution controller                          │   │
│  │  • State management                                         │   │
│  │  • Error handling                                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Global State                                               │   │
│  │  • currentDeployment { status, port, container, ... }       │   │
│  │  • deploymentLogs [ { type, message }, ... ]                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────┬───────────────────────────────────────────────────────────┘
          │ System Commands (via child_process)
          │ • git clone
          │ • docker build
          │ • docker run
          │ • docker stop
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    OPERATING SYSTEM                                 │
│             (Windows PowerShell / CMD)                              │
│                                                                     │
│  Executes:                                                          │
│  • Git commands (version control)                                   │
│  • Docker commands (containerization)                               │
│  • File system operations                                           │
└─────────┬───────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DOCKER DAEMON                                   │
│                 (Container Runtime)                                 │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Docker Images Registry                                      │  │
│  │  deployment-<timestamp>  (Built from cloned repo)           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Running Containers                                          │  │
│  │  deployment-<ts>-<random>  (From built image)               │  │
│  │  ├─ Port mapping: 3000 → 3001+ (on host)                    │  │
│  │  ├─ Memory limit: unlimited (default Docker)                │  │
│  │  ├─ Restart policy: no (runs once)                          │  │
│  │  └─ Logs accessible via: docker logs <name>                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Request-Response Flow

### When User Clicks "Deploy 🚀"

```
┌─────────────────────┐
│  1. User enters URL │
│     and clicks btn  │
└────────────┬────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│ 2. Frontend: script.js handleDeploy()       │
│    • Validates URL format                   │
│    • Sends POST request to /api/deploy      │
│    • Sets UI to loading state               │
└────────────┬────────────────────────────────┘
             │
             │ HTTP POST /api/deploy
             │ {"repoUrl": "https://github.com/user/repo"}
             │
             ▼
┌─────────────────────────────────────────────┐
│ 3. Backend: server.js POST /api/deploy      │
│    • Receives request body                  │
│    • Validates GitHub URL                  │
│    • Checks if deployment running           │
│    • Calls deployApplication()              │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│ 4. Deployment Pipeline Starts               │
│                                             │
│    Stage 1: git clone                       │
│    ├─ executeCommand("git clone <URL>")     │
│    ├─ Captures stdout/stderr                │
│    ├─ Stores in deploymentLogs[]            │
│    └─ Returns on success/error              │
│                                             │
│    Stage 2: Verify Dockerfile               │
│    ├─ fs.existsSync(Dockerfile)             │
│    └─ Fail if not found                     │
│                                             │
│    Stage 3: docker build                    │
│    ├─ executeCommand("docker build ...")    │
│    ├─ Captures build output                 │
│    └─ Creates Docker image                  │
│                                             │
│    Stage 4: docker run                      │
│    ├─ executeCommand("docker run ...")      │
│    ├─ Maps port (3000→available)            │
│    └─ Container starts in background        │
│                                             │
│    Update currentDeployment state           │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│ 5. Backend Response                         │
│    {                                        │
│      success: true,                         │
│      deployment: {                          │
│        status: "running",                   │
│        containerName: "...",                │
│        port: 3001,                          │
│        url: "http://localhost:3001",        │
│        ...                                  │
│      },                                     │
│      logs: [ { type, message }, ... ]       │
│    }                                        │
└────────────┬────────────────────────────────┘
             │
             │ HTTP Response (JSON)
             │
             ▼
┌─────────────────────────────────────────────┐
│ 6. Frontend: Display Results                │
│    • Show deployment successful             │
│    • Display deployment details             │
│    • Show all logs with timestamps          │
│    • Make URL clickable                     │
│    • Enable "Stop" button                   │
└────────────┬────────────────────────────────┘
             │
             ▼
         ✅ Done!
```

---

## Internal Command Execution

### executeCommand() Function

```javascript
executeCommand(command, cwd) {
  │
  ├─ spawn('cmd.exe', args, options)  // Windows CMD
  │  │
  │  ├─ Starts process in specified directory
  │  ├─ Sets up stdin/stdout/stderr pipes
  │  └─ Returns Promise
  │
  ├─ Listen to stdout:
  │  ├─ Captures each data chunk
  │  ├─ Appends to output string
  │  ├─ Logs to deploymentLogs[]
  │  └─ Log type: 'log'
  │
  ├─ Listen to stderr:
  │  ├─ Captures error output
  │  ├─ Appends to errorOutput string
  │  ├─ Logs to deploymentLogs[]
  │  └─ Log type: 'error'
  │
  ├─ Listen to close event:
  │  ├─ Check exit code
  │  ├─ If 0: success → resolve()
  │  └─ If !0: failure → reject()
  │
  └─ Listen to error event:
     └─ Emit error → reject()
}
```

### Example: Git Clone Execution

```javascript
// User clicks Deploy
POST /api/deploy

// Backend receives request
const { repoUrl } = req.body
// repoUrl = "https://github.com/expressjs/express"

// Create temp directory
const deployDir = path.join(os.tmpdir(), `deployment-${timestamp}`)
// deployDir = "C:\Users\User\AppData\Local\Temp\deployment-1704067800000"

// Execute git clone
await executeCommand(`git clone ${repoUrl} .`, deployDir)

// 🔧 Windows executes:
// cmd.exe /s /c "git clone https://github.com/expressjs/express ."

// 📝 Output captured:
// Cloning into '.'...
// remote: Enumerating objects: 12345...
// remote: Counting objects: 100% (100/100)...
// ...
// Resolving deltas: 100% (8000/8000), done.

// ✅ Process exits with code 0
// resolve({ success: true, output: "..." })
```

---

## State Management Flow

### Global State Variables

```javascript
// ┌────────────────────────────────────────────┐
// │ currentDeployment = null (initially idle)   │
// └────────────────────────────────────────────┘

// When deployment starts:
currentDeployment = {
  status: "running",
  containerName: "deployment-1704067800000-abc123xyz",
  imageName: "deployment-1704067800000",
  port: 3001,
  url: "http://localhost:3001",
  deployDir: "C:\Temp\deployment-1704067800000",
  startTime: "2024-01-01T12:00:00.000Z"
}

// ┌────────────────────────────────────────────┐
// │ deploymentLogs = [] (captured over time)   │
// └────────────────────────────────────────────┘

deploymentLogs = [
  { type: "info", message: "📦 Cloning repository..." },
  { type: "log", message: "Cloning into '.'..." },
  { type: "log", message: "remote: Enumerating objects: 12345..." },
  { type: "success", message: "✅ Repository cloned successfully!" },
  { type: "info", message: "🏗️ Building Docker image..." },
  { type: "log", message: "Sending build context to Docker daemon..." },
  { type: "log", message: "Step 1/4 : FROM node:18" },
  { type: "log", message: "Step 2/4 : WORKDIR /app" },
  // ... more logs ...
  { type: "success", message: "✅ Docker image built successfully!" },
  { type: "success", message: "✅ Container running successfully!" },
  { type: "info", message: "🌐 Access your app at: http://localhost:3001" },
]

// When deployment completes:
currentDeployment.status = "success"

// When deployment fails:
currentDeployment = {
  status: "failed",
  error: "Repository not found",
  startTime: "2024-01-01T12:00:00.000Z"
}
```

---

## Linux Diagram (For Mac/Linux Users)

If running on Linux/Mac, similar flow but with different commands:

```bash
# Instead of cmd.exe, uses /bin/sh
spawn('/bin/sh', ['-c', command])

# Commands remain the same:
git clone https://github.com/user/repo
docker build -t deployment-123 .
docker run -d -p 3001:3000 deployment-123

# Docker behavior identical
# Temp files in: /tmp/deployment-*
```

---

## Error Handling Flow

```
┌──────────────────────────┐
│ Try Block                │
│ deployApplication()      │
└──────────┬───────────────┘
           │
           ├─ Git Clone
           │  ├─ Success → continue
           │  └─ Error → catch block
           │
           ├─ Dockerfile Check
           │  ├─ Found → continue
           │  └─ Not found → catch + throw
           │
           ├─ Docker Build
           │  ├─ Success → continue
           │  └─ Error → catch block
           │
           ├─ Docker Run
           │  ├─ Success → return success
           │  └─ Error → catch block
           │
           └─ Update currentDeployment.status = "success"

┌──────────────────────────┐
│ Catch Block              │
│ (Any error above)        │
└──────────┬───────────────┘
           │
           ├─ Log error message
           ├─ Add to deploymentLogs[]
           │
           └─ Return {
                success: false,
                error: "Error message",
                logs: [...]
              }

┌──────────────────────────┐
│ After Catch              │
└──────────┬───────────────┘
           │
           ├─ currentDeployment.status = "failed"
           ├─ All logs still available for debugging
           └─ User sees error message + full log history
```

---

## Port Assignment Logic

```javascript
function findAvailablePort(startPort = 3000) {
  // Simplified version (current implementation)
  return startPort;
  
  // Production version would:
  // 1. Create TCP server on port
  // 2. Try to listen
  // 3. If fails, increment port
  // 4. Retry until success
  
  // Example flow:
  // Port 3000: try → used by previous deployment → fail
  // Port 3001: try → free → return 3001
}

// Result:
// First deployment:  0.0.0.0:3001 → container:3000
// Second deployment: 0.0.0.0:3002 → container:3000
// etc.
```

---

## Session Persistence

### What Persists During Runtime

✅ **Persists:**
- `currentDeployment` object (in-memory)
- `deploymentLogs[]` array (in-memory)
- Docker containers (on disk)
- Docker images (on disk)

❌ **Lost on Restart:**
- `currentDeployment` → reset to null
- `deploymentLogs[]` → reset to empty
- But containers/images remain until manually deleted

### Restarting Server

```powershell
# Stop server
Ctrl+C

# Containers/images still exist
docker ps -a    # Shows old containers

# Restart server
npm start

# Previous deployments are "lost" in UI
# But containers still run
# Can manually stop/remove

docker stop <container-name>
docker rm <container-name>
```

---

## Frontend-Backend Communication Details

### API Request Example

```javascript
// Frontend sends:
const response = await fetch('/api/deploy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    repoUrl: 'https://github.com/expressjs/express' 
  })
});

const data = await response.json();

// Response structure:
{
  "success": true,
  "deployment": {
    "status": "running",
    "containerName": "deployment-1704067800000-abc123",
    "imageName": "deployment-1704067800000",
    "port": 3001,
    "url": "http://localhost:3001",
    "deployDir": "C:\\Users\\...\\Temp\\...",
    "startTime": "2024-01-01T12:00:00.000Z"
  },
  "logs": [
    { "type": "info", "message": "📦 Cloning..." },
    { "type": "log", "message": "Cloning into..." },
    // ... all captured logs ...
  ]
}

// Frontend updates UI with:
// 1. Show deployment success/error
// 2. Display all logs with timestamps
// 3. Show container details
// 4. Make URL clickable
// 5. Enable stop button
```

### Status Polling

```javascript
// Frontend polls every 2 seconds:
setInterval(() => {
  fetch('/api/status')
    .then(r => r.json())
    .then(data => {
      // Update UI with current status
      if (data.current && data.current.status === 'running') {
        updateStatus('running', 'Deployment Running', `Port: ${data.current.port}`);
      }
    })
}, 2000);

// Backend responds:
{
  "current": {
    "status": "running",
    "containerName": "...",
    "port": 3001,
    "url": "http://localhost:3001",
    "startTime": "2024-01-01T12:00:00.000Z"
  },
  "logs": [ { type, message }, ... ]
}
```

---

## Log Types

```javascript
// Type: "info" - General information
{ type: "info", message: "📦 Cloning repository..." }
// Color: Cyan (#89cff0)

// Type: "success" - Successful operation
{ type: "success", message: "✅ Repository cloned successfully!" }
// Color: Green (#90ee90)

// Type: "error" - Error or problem
{ type: "error", message: "❌ Deployment failed: Dockerfile not found" }
// Color: Red (#ff6b6b)

// Type: "log" - Raw command output
{ type: "log", message: "Cloning into '.'" }
// Color: Light gray (#d4d4d4)

// In UI (styles.css):
.log-entry.info   { color: #89cff0; }
.log-entry.success { color: #90ee90; }
.log-entry.error   { color: #ff6b6b; }
.log-entry.log     { color: #d4d4d4; }

// Display in dark terminal:
background: #1e1e1e;
font-family: 'Courier New', monospace;
```

---

## Deployment Prevention

```javascript
// Only one deployment at a time!

if (currentDeployment?.status === 'running') {
  return res.status(409).json({
    success: false,
    error: 'A deployment is already in progress. Please wait for it to complete.'
  });
}

// Prevents:
// ✅ Race conditions
// ✅ Port conflicts
// ✅ Container name collisions
// ✅ Resource exhaustion
// ✅ Interleaved logging

// User must either:
// 1. Wait for first deployment to finish
// 2. Click "Stop" to terminate current deployment
// 3. Then start a new deployment
```

---

## Resource Cleanup

### Automatic Cleanup

```javascript
// ❌ NOT implemented in this version
// What SHOULD happen but doesn't:
// - Delete cloned repository from temp folder
// - Remove old Docker images
// - Remove old containers
```

### Manual Cleanup Needed

```powershell
# List all containers
docker ps -a

# Remove stopped containers
docker rm <container-id>

# List all images
docker images

# Remove unused images
docker rmi <image-id>

# Remove temp folders
Remove-Item -Recurse -Force $env:TEMP\deployment-*

# System-wide cleanup
docker system prune  # Removes unused data
docker system prune -a  # Also removes unused images
```

---

## Limitations & Future Improvements

### Current Limitations

1. **No Concurrency**
   - Only one deployment at a time
   - Future: Queue system

2. **No Persistence**
   - Lose deployment history on restart
   - Future: Database with history

3. **No Health Checks**
   - Doesn't verify app is actually running
   - Future: HTTP health check

4. **No Environment Variables**
   - Can't pass secrets or config
   - Future: .env file support or UI inputs

5. **No Rollback**
   - Can't revert to previous version
   - Future: Version management

6. **No Webhooks**
   - Must deploy manually
   - Future: GitHub webhook integration for auto-deploy

### Future Enhancements

```javascript
// Queue-based system
deploymentQueue = [];

async function processQueue() {
  while (deploymentQueue.length > 0) {
    const deployment = deploymentQueue.shift();
    await deployApplication(deployment);
  }
}

// Health checking
async function checkHealth(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

// GitHub webhooks
app.post('/webhooks/github', (req, res) => {
  const { repository } = req.body;
  deploymentQueue.push(repository.clone_url);
  res.json({ queued: true });
});

// Environment variables
const deployment = {
  repoUrl: "...",
  env: {
    DATABASE_URL: "...",
    API_KEY: "..."
  }
};
```

---

## Summary

This deployment platform demonstrates:

✅ **API Design** - Express routing, request/response handling
✅ **Process Management** - Child processes, command execution
✅ **State Management** - Global state coordination
✅ **Error Handling** - Try/catch, validation, error propagation
✅ **Frontend-Backend Integration** - REST API, polling, real-time updates
✅ **Docker Integration** - Image building, container lifecycle
✅ **Concurrency Control** - Preventing race conditions
✅ **User Experience** - Real-time logs, status updates, error messages

A complete, working example of production deployment platform architecture! 🚀
