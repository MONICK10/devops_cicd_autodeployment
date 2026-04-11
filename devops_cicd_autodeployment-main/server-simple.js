const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const net = require('net');
const DependencyAnalyzer = require('./lib/dependency-analyzer');

// Promisify exec
const execPromise = util.promisify(exec);

// Main API server
const apiApp = express();
const API_PORT = 5001;
const DEPLOYMENTS_DIR = path.join(__dirname, 'deployments');

// Store active deployments
const activeDeployments = new Map();

// Store latest pipeline events and metrics for frontend
let latestPipelineEvents = [];
let latestMetrics = {
    clone_time_ms: 0,
    build_time_ms: 0,
    deploy_time_ms: 0,
    total_time_ms: 0,
    result: 'pending'
};

// Ensure deployments directory exists
if (!fs.existsSync(DEPLOYMENTS_DIR)) {
    fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
    console.log('✓ Deployments directory created');
}

// ================================
// MIDDLEWARE
// ================================

apiApp.use(express.json());

// CORS Middleware
apiApp.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
    
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Find available port (start from 8001 to avoid unsafe browser ports)
 */
function findAvailablePort(startPort = 8001) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => {
                resolve(port);
            });
        });
        
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                findAvailablePort(startPort + 1).then(resolve).catch(reject);
            } else {
                reject(err);
            }
        });
    });
}

/**
 * Open URL in default browser
 */
function openInBrowser(url) {
    const os = require('os');
    const platform = os.platform();
    
    try {
        if (platform === 'win32') {
            exec(`start ${url}`);
        } else if (platform === 'darwin') {
            exec(`open ${url}`);
        } else {
            exec(`xdg-open ${url}`);
        }
        console.log(`🌐 Opening browser at ${url}`);
    } catch (error) {
        console.log(`⚠️ Could not auto-open browser. Visit ${url} manually.`);
    }
}

/**
 * Validate GitHub URL
 */
function isValidGitHubUrl(url) {
    const pattern = /^https?:\/\/github\.com\/[\w-]+\/[\w-]+\/?\.?git?$/i;
    return pattern.test(url);
}

/**
 * Generate unique deployment folder name
 */
function generateDeploymentFolder() {
    return `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Normalize git URL
 */
function normalizeGitUrl(url) {
    if (!url.endsWith('.git')) {
        url = url + '.git';
    }
    return url;
}

/**
 * Analyze project type
 */
async function analyzeProjectType(folderPath) {
    console.log(`[Analyzer] Analyzing project at: ${folderPath}`);
    
    const packageJsonPath = path.join(folderPath, 'package.json');
    const indexHtmlPath = path.join(folderPath, 'index.html');
    
    // Pure static HTML
    if (fs.existsSync(indexHtmlPath) && !fs.existsSync(packageJsonPath)) {
        console.log('[Analyzer] ✓ Static HTML project');
        return {
            type: 'static',
            servePath: folderPath
        };
    }
    
    // Node.js project with package.json
    if (fs.existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            // Detect React/Vite
            const isReactOrVite = 
                packageJson.dependencies?.react ||
                packageJson.devDependencies?.react ||
                packageJson.devDependencies?.vite ||
                (packageJson.scripts?.build && !fs.existsSync(path.join(folderPath, 'server.js')));
            
            const hasServerFile = fs.existsSync(path.join(folderPath, 'server.js')) || 
                                 fs.existsSync(path.join(folderPath, 'index.js'));
            
            if (isReactOrVite) {
                console.log('[Analyzer] ⚛️ React/Vite framework detected');
                return {
                    type: 'react-vite',
                    servePath: null // Will determine after build
                };
            } else if (hasServerFile) {
                console.log('[Analyzer] 🟢 Node.js backend app detected');
                return {
                    type: 'nodejs',
                    servePath: folderPath
                };
            } else {
                console.log('[Analyzer] 📦 Static project with dependencies');
                return {
                    type: 'static-npm',
                    servePath: folderPath
                };
            }
        } catch (e) {
            console.error('[Analyzer] Error:', e.message);
        }
    }
    
    console.log('[Analyzer] ❓ Unknown type - treating as static');
    return {
        type: 'unknown',
        servePath: folderPath
    };
}

/**
 * Build project if needed
 */
async function buildProject(folderPath, projectType) {
    console.log(`[Builder] Starting build for ${projectType}...`);
    
    if (projectType === 'static' || projectType === 'static-npm' || projectType === 'unknown') {
        console.log('[Builder] ✓ No build needed');
        return folderPath;
    }
    
    try {
        // Install dependencies
        console.log('[Builder] 📦 Installing dependencies...');
        await execPromise('npm install --legacy-peer-deps', {
            cwd: folderPath,
            timeout: 600000
        });
        console.log('[Builder] ✓ Dependencies installed');
        
        // Build React/Vite
        if (projectType === 'react-vite') {
            console.log('[Builder] 🏗️ Building project...');
            await execPromise('npm run build', {
                cwd: folderPath,
                timeout: 300000
            });
            console.log('[Builder] ✓ Build completed');
            
            // Find build output
            const distPath = path.join(folderPath, 'dist');
            const buildPath = path.join(folderPath, 'build');
            
            if (fs.existsSync(distPath)) {
                console.log('[Builder] ✓ Using dist/ folder');
                return distPath;
            } else if (fs.existsSync(buildPath)) {
                console.log('[Builder] ✓ Using build/ folder');
                return buildPath;
            } else {
                throw new Error('Build output folder not found');
            }
        }
        
        return folderPath;
    } catch (error) {
        console.error('[Builder] ❌ Error:', error.message);
        throw new Error(`Build failed: ${error.message}`);
    }
}

/**
 * Create deployment server for a specific project
 */
async function createDeploymentServer(deploymentFolder, servePath, port) {
    const deployApp = express();
    
    // SPA fallback middleware - serve index.html for non-file requests
    deployApp.use((req, res, next) => {
        const filePath = path.join(servePath, req.path);
        
        // If it's a file request and file exists, let express.static handle it
        if (req.path.includes('.') || fs.existsSync(filePath)) {
            return next();
        }
        
        // Otherwise check for index.html (SPA routing)
        const indexPath = path.join(servePath, 'index.html');
        if (fs.existsSync(indexPath)) {
            return res.sendFile(indexPath);
        }
        
        next();
    });
    
    // Serve static files
    deployApp.use(express.static(servePath));
    
    // Root path - serve index.html
    deployApp.get('/', (req, res) => {
        const indexPath = path.join(servePath, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).json({ error: 'index.html not found' });
        }
    });
    
    // Start the deployment server
    return new Promise((resolve, reject) => {
        const server = deployApp.listen(port, () => {
            console.log(`[Deployment] Server listening on port ${port}`);
            resolve(server);
        }).on('error', reject);
    });
}

// ================================
// API ENDPOINTS
// ================================

/**
 * Health check
 */
apiApp.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'API is running',
        activeDeployments: activeDeployments.size,
        timestamp: new Date()
    });
});

/**
 * Get pipeline events
 */
apiApp.get('/api/pipeline/events', (req, res) => {
    res.json({
        success: true,
        events: latestPipelineEvents
    });
});

/**
 * Get pipeline metrics
 */
apiApp.get('/api/pipeline/metrics', (req, res) => {
    res.json({
        success: true,
        ...latestMetrics
    });
});

/**
 * Deploy endpoint
 */
apiApp.post('/api/deploy', async (req, res) => {
    const { repo, repoUrl } = req.body;
    const repositoryUrl = repo || repoUrl; // Accept both repo and repoUrl
    
    console.log('\n' + '='.repeat(70));
    console.log('🚀 DEPLOYMENT PIPELINE STARTED');
    console.log('='.repeat(70));
    
    if (!repositoryUrl) {
        return res.status(400).json({
            success: false,
            error: 'Repository URL required'
        });
    }
    
    if (!isValidGitHubUrl(repositoryUrl)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid GitHub URL format'
        });
    }
    
    const deploymentFolder = generateDeploymentFolder();
    const deploymentPath = path.join(DEPLOYMENTS_DIR, deploymentFolder);
    const gitUrl = normalizeGitUrl(repositoryUrl);
    const logs = [];
    
    try {
        // Track timing
        const pipelineStartTime = Date.now();
        let cloneStartTime, buildStartTime, deployStartTime;
        
        // Initialize pipeline events
        latestPipelineEvents = [];
        
        // Step 1: Clone
        console.log('\n[Step 1/5] 📥 Cloning repository...');
        cloneStartTime = Date.now();
        latestPipelineEvents.push({ stage: 'cloning', status: 'running', timestamp: new Date().toISOString() });
        
        await execPromise(`git clone --depth 1 ${gitUrl} "${deploymentPath}"`, {
            timeout: 300000
        });
        
        const cloneTime = Date.now() - cloneStartTime;
        logs.push({ type: 'success', message: '✓ Repository cloned' });
        console.log('[Step 1/5] ✓ Clone completed\n');
        latestPipelineEvents.push({ stage: 'cloning_complete', status: 'success', clone_time_ms: cloneTime, timestamp: new Date().toISOString() });
        
        // Step 2: Analyze
        console.log('[Step 2/5] 🔍 Analyzing project type...');
        latestPipelineEvents.push({ stage: 'analyzing', status: 'running', timestamp: new Date().toISOString() });
        const projectInfo = await analyzeProjectType(deploymentPath);
        logs.push({ type: 'info', message: `🔍 Type: ${projectInfo.type}` });
        console.log('[Step 2/5] ✓ Analysis complete\n');
        latestPipelineEvents.push({ stage: 'analyzing_complete', status: 'success', project_type: projectInfo.type, timestamp: new Date().toISOString() });
        
        // Step 2.5: Dependency Analysis
        console.log('[Step 2.5/5] 📦 Analyzing dependencies...');
        latestPipelineEvents.push({ stage: 'dependency_analysis', status: 'running', timestamp: new Date().toISOString() });
        try {
            const analyzer = new DependencyAnalyzer(deploymentPath);
            const analysisResult = await analyzer.analyze();
            latestPipelineEvents.push({
                ...analysisResult,
                timestamp: new Date().toISOString()
            });
            
            if (analysisResult.status === 'success') {
                logs.push({ type: 'success', message: `✅ Dependencies: ${analysisResult.data.total_dependencies} found` });
                if (analysisResult.data.vulnerabilities.length > 0) {
                    logs.push({ type: 'warning', message: `⚠️ ${analysisResult.data.vulnerabilities.length} vulnerabilities detected` });
                }
            } else {
                logs.push({ type: 'warning', message: `⚠️ Dependency analysis: ${analysisResult.error}` });
            }
        } catch (analyzerError) {
            console.error('Dependency analysis error:', analyzerError.message);
            latestPipelineEvents.push({
                stage: 'dependency_analysis',
                status: 'failed',
                error: analyzerError.message,
                timestamp: new Date().toISOString()
            });
            logs.push({ type: 'warning', message: `⚠️ Dependency analysis skipped: ${analyzerError.message}` });
        }
        console.log('[Step 2.5/5] ✓ Dependency check complete\n');
        
        // Step 3: Build
        console.log('[Step 3/6] 🏗️ Building project...');
        buildStartTime = Date.now();
        latestPipelineEvents.push({ stage: 'building', status: 'running', timestamp: new Date().toISOString() });
        const servePath = await buildProject(deploymentPath, projectInfo.type);
        const buildTime = Date.now() - buildStartTime;
        logs.push({ type: 'success', message: '✓ Build/setup complete' });
        console.log('[Step 3/6] ✓ Build complete\n');
        latestPipelineEvents.push({ stage: 'building_complete', status: 'success', build_time_ms: buildTime, timestamp: new Date().toISOString() });
        
        // Step 4: Find port
        console.log('[Step 4/6] 🔍 Finding available port...');
        latestPipelineEvents.push({ stage: 'port_allocation', status: 'running', timestamp: new Date().toISOString() });
        const deploymentPort = await findAvailablePort();
        console.log(`[Step 4/6] ✓ Port ${deploymentPort} available\n`);
        latestPipelineEvents.push({ stage: 'port_allocation_complete', status: 'success', port: deploymentPort, timestamp: new Date().toISOString() });
        
        // Step 5: Start server
        console.log('[Step 5/6] 🚀 Starting deployment server...');
        deployStartTime = Date.now();
        latestPipelineEvents.push({ stage: 'deploying', status: 'running', timestamp: new Date().toISOString() });
        const server = await createDeploymentServer(deploymentFolder, servePath, deploymentPort);
        const deployTime = Date.now() - deployStartTime;
        
        // Store deployment info
        activeDeployments.set(deploymentFolder, {
            path: deploymentPath,
            port: deploymentPort,
            server: server,
            type: projectInfo.type,
            createdAt: new Date()
        });
        
        const deploymentUrl = `http://localhost:${deploymentPort}`;
        const totalTime = Date.now() - pipelineStartTime;
        console.log('[Step 5/6] ✓ Server started');
        console.log('='.repeat(70));
        console.log(`✨ DEPLOYMENT SUCCESSFUL`);
        console.log(`✨ URL: ${deploymentUrl}`);
        console.log('='.repeat(70) + '\n');
        
        console.log('[Step 6/6] ✓ Deployment complete');
        
        logs.push({ 
            type: 'success', 
            message: `🚀 Live at: ${deploymentUrl}` 
        });
        
        // Store metrics
        latestMetrics = {
            clone_time_ms: cloneTime,
            build_time_ms: buildTime,
            deploy_time_ms: deployTime,
            total_time_ms: totalTime,
            result: 'success',
            deployment_url: deploymentUrl,
            project_type: projectInfo.type,
            timestamp: new Date().toISOString()
        };
        
        latestPipelineEvents.push({ 
            stage: 'deployment_complete', 
            status: 'success', 
            total_time_ms: totalTime,
            deployment_url: deploymentUrl,
            timestamp: new Date().toISOString() 
        });
        
        res.json({
            success: true,
            deployment: {
                folder: deploymentFolder,
                url: deploymentUrl,
                port: deploymentPort,
                type: projectInfo.type,
                timestamp: new Date().toISOString()
            },
            logs: logs,
            pipeline_events: latestPipelineEvents,
            metrics: latestMetrics
        });
        
    } catch (error) {
        console.error('='.repeat(70));
        console.error('❌ DEPLOYMENT FAILED');
        console.error(`Error: ${error.message}`);
        console.error('='.repeat(70) + '\n');
        
        // Cleanup
        try {
            if (fs.existsSync(deploymentPath)) {
                fs.rmSync(deploymentPath, { recursive: true, force: true });
            }
        } catch (e) {
            console.error('[Cleanup] Error:', e.message);
        }
        
        logs.push({ type: 'error', message: `❌ ${error.message}` });
        
        res.status(500).json({
            success: false,
            error: error.message,
            logs: logs,
            pipeline_events: latestPipelineEvents,
            metrics: latestMetrics
        });
    }
});

/**
 * List deployments
 */
apiApp.get('/api/deployments', (req, res) => {
    const deployments = Array.from(activeDeployments.entries()).map(([folder, info]) => ({
        folder,
        url: `http://localhost:${info.port}`,
        type: info.type,
        port: info.port,
        createdAt: info.createdAt
    }));
    
    res.json({
        success: true,
        count: deployments.length,
        deployments
    });
});

/**
 * Stop deployment
 */
apiApp.delete('/api/deployments/:folder', (req, res) => {
    const { folder } = req.params;
    const deployment = activeDeployments.get(folder);
    
    if (!deployment) {
        return res.status(404).json({
            success: false,
            error: 'Deployment not found'
        });
    }
    
    try {
        // Stop server
        deployment.server.close();
        
        // Remove from map
        activeDeployments.delete(folder);
        
        // Cleanup folder
        if (fs.existsSync(deployment.path)) {
            fs.rmSync(deployment.path, { recursive: true, force: true });
        }
        
        console.log(`[Cleanup] Removed deployment: ${folder}`);
        
        res.json({
            success: true,
            message: 'Deployment stopped and cleaned up'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ================================
// ERROR HANDLING
// ================================

apiApp.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// ================================
// START API SERVER
// ================================

apiApp.listen(API_PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🚀 CI/CD Deployment API Ready        ║
╠════════════════════════════════════════╣
║ API Port:        ${API_PORT}              ║
║ Deploy Endpoint: POST /api/deploy      ║
║ Deployments:     GET /api/deployments  ║
║                                        ║
║ Each deployment gets own server port   ║
║ Waiting for deployment requests...    ║
╚════════════════════════════════════════╝
    `);
});

module.exports = apiApp;
