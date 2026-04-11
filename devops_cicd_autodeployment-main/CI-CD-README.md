# CI/CD Auto Deployment Platform

A simple full-stack web application for automatically deploying GitHub repositories.

## Features

✅ **Simple Login System**
- Username: `admin`
- Password: `1234`
- Session-based authentication

✅ **One-Click Deployment**
- Paste GitHub repository URL
- Automatic git clone
- Project type detection (static HTML / Node.js)
- Live deployment URL

✅ **Modern UI**
- Glassmorphism design with animations
- Responsive layout (mobile, tablet, desktop)
- Dark blue DevOps theme
- Toast notifications
- Loading animations

✅ **Educational Content**
- Explains CI/CD concepts
- Deployment automation benefits
- Step-by-step deployment process

✅ **Developer-Friendly Endpoints**
- `POST /api/deploy` - Deploy a repository
- `GET /api/deployments` - List all deployments
- `DELETE /api/deployments/:folder` - Remove a deployment
- `GET /api/health` - Health check

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- Git installed
- npm (Node Package Manager)

### Installation

```bash
# Install dependencies
npm install
```

### Running the Application

#### Option 1: Windows (Batch file)
```bash
START-SIMPLE.bat
```

#### Option 2: Windows (PowerShell)
```powershell
.\START-SIMPLE.ps1
```

#### Option 3: Manual (any OS)

**Terminal 1 - Backend:**
```bash
npm run start-simple
# or
node server-simple.js
```

**Terminal 2 - Frontend:**
```bash
# Using npm's http-server
npx http-server public -p 3000

# or using Python
cd public
python -m http.server 3000
```

### Access the Application

Once both services are running:

- **Frontend (UI)**: http://localhost:3000
- **Backend (API)**: http://localhost:5000

## How It Works

### Deployment Flow

```
1. User logs in (admin / 1234)
   ↓
2. Enters GitHub repository URL
   ↓
3. Clicks "Deploy Now" button
   ↓
4. Frontend sends POST request to backend:
   POST http://localhost:5000/api/deploy
   { "repo": "https://github.com/username/repo" }
   ↓
5. Backend processes:
   - Validates GitHub URL
   - Clones repository to deployments folder
   - Detects project type (static/nodejs)
   - Creates unique deployment folder
   ↓
6. Backend returns deployment URL:
   http://localhost:5000/deployments/deploy-TIMESTAMP-RANDOM
   ↓
7. Frontend displays live deployment URL
   User can access deployed project immediately
```

### Folder Structure

```
d:\devops\
├── server-simple.js           # Backend API server
├── package.json               # Node dependencies
├── START-SIMPLE.bat          # Windows batch startup
├── START-SIMPLE.ps1          # PowerShell startup script
├── deployments/              # Auto-created deployment folder
│   ├── deploy-TIMESTAMP1/   # Deployed repo 1
│   ├── deploy-TIMESTAMP2/   # Deployed repo 2
│   └── ...
└── public/                   # Frontend files
    ├── index.html            # UI with login & dashboard
    ├── styles.css            # Modern styling
    ├── script.js             # Frontend logic
    └── ...
```

## API Reference

### 1. Deploy Repository

```http
POST /api/deploy
Content-Type: application/json

{
  "repo": "https://github.com/username/repo"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Deployment successful",
  "deployment": {
    "folder": "deploy-1712950123456-abc123def",
    "url": "http://localhost:5000/deployments/deploy-1712950123456-abc123def",
    "projectType": "static",
    "hasIndexHtml": true,
    "timestamp": "2024-04-11T12:34:56.789Z"
  },
  "logs": [
    { "type": "info", "message": "📥 Cloning from: https://github.com/..." },
    { "type": "success", "message": "✓ Repository cloned successfully" }
  ]
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "Invalid GitHub URL. Use: https://github.com/username/repo",
  "logs": [
    { "type": "error", "message": "❌ Invalid GitHub URL" }
  ]
}
```

### 2. List All Deployments

```http
GET /api/deployments
```

**Response (200):**
```json
{
  "success": true,
  "count": 3,
  "deployments": [
    {
      "folder": "deploy-1712950123456-abc123def",
      "url": "http://localhost:5000/deployments/deploy-1712950123456-abc123def"
    },
    ...
  ]
}
```

### 3. Delete a Deployment

```http
DELETE /api/deployments/deploy-1712950123456-abc123def
```

**Response (200):**
```json
{
  "success": true,
  "message": "Deployment deleted"
}
```

### 4. Health Check

```http
GET /api/health
```

**Response (200):**
```json
{
  "status": "ok",
  "message": "Backend is running",
  "timestamp": "2024-04-11T12:34:56.789Z"
}
```

## Supported GitHub URLs

All of these formats are accepted:

- ✅ `https://github.com/username/repo`
- ✅ `https://github.com/username/repo/`
- ✅ `https://github.com/username/repo.git`
- ✅ `http://github.com/username/repo`

## Project Type Detection

The system automatically detects project types:

| Project Type | Detection | Served As |
|---|---|---|
| **Static HTML** | `index.html` exists | Direct file serving |
| **Node.js/Vite** | `package.json` exists | Node.js project |
| **Unknown** | No markers found | Raw files |

## Troubleshooting

### Issue: CORS Error
**Solution:** Backend must have CORS middleware enabled (already included in server-simple.js)

### Issue: Git Clone Fails
**Solution:** 
- Ensure Git is installed: `git --version`
- Verify repository is public
- Check internet connection

### Issue: Port Already in Use
**Solution:** Change the port in the startup scripts or kill the existing process

```bash
# Windows - Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Issue: HTTP-server Not Found
**Solution:** Install it globally
```bash
npm install -g http-server
```

## Security Notes

⚠️ **This is a demo application. For production:**

1. Implement proper user authentication (JWT, OAuth)
2. Use environment variables for secrets
3. Validate and sanitize all inputs
4. Implement rate limiting
5. Use temporary deployment folders with auto-cleanup
6. Add deployment size limits
7. Isolate deployed apps (containers, VMs)
8. Implement logging and monitoring

## Technologies Used

- **Backend**: Node.js + Express
- **Frontend**: HTML + CSS + JavaScript (Vanilla)
- **Version Control**: Git
- **DevOps**: GitHub

## Directory Structure Details

```
deployments/
└── deploy-1712950123456-abc123def/    # Auto-generated from timestamp + random ID
    ├── .git/                           # Git repository metadata
    ├── index.html                      # Main HTML file (if static project)
    ├── package.json                    # Node.js config (if Node project)
    ├── README.md                       # Repository readme
    └── ... (other repository files)
```

## Example Deployments

Try deploying these repositories:

1. **Static HTML Demo**:
   ```
   https://github.com/github/hello-world
   ```

2. **React App**:
   ```
   https://github.com/facebook/create-react-app
   ```

3. **Vue Project**:
   ```
   https://github.com/vuejs/vue-next
   ```

## Performance Tips

- Keep deployment folder clean (delete old deployments with API)
- Monitor disk space (cloned repos can be large)
- Limit concurrent deployments
- Use SSD for faster git clone operations

## Contributing

Feel free to extend this project with:
- Docker support
- Webhooks for auto-deployment
- Deployment history/rollback
- Environment variable management
- Build pipeline integration

## License

MIT

## Support

For issues, questions, or suggestions, please check the logs in the terminal where the backend is running.

---

**Made with ❤️ for DevOps learners**
