const express = require('express');
const path = require('path');
const fs = require('fs');
const { execFile, exec } = require('child_process');
const os = require('os');
const DependencyAnalyzer = require('./lib/dependency-analyzer');
const MetricsCollector = require('./lib/metrics-collector');

const app = express();
const frontendApp = express();
const BACKEND_PORT = 5000;
const FRONTEND_PORT = 3000;

// Middleware
app.use(express.json());

// CORS Middleware - Allow requests from frontend
app.use((req, res, next) => {
    const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

frontendApp.use(express.static(path.join(__dirname, 'public')));

// State tracking
let currentDeployment = null;
let deploymentLogs = [];
let pipelineEvents = [];
let currentMetrics = null;

/**
 * Emit pipeline event (JSON only)
 */
function emitPipelineEvent(event) {
  pipelineEvents.push({
    ...event,
    timestamp: new Date().toISOString(),
  });
  console.log('[Pipeline Event]', JSON.stringify(event));
  return event;
}

/**
 * Execute shell commands and stream output
 * Handles git commands specially to work around Windows shell issues
 * @param {string} command - Command to execute
 * @param {string} cwd - Working directory
 * @returns {Promise<{success: boolean, output: string}>}
 */
function executeCommand(command, cwd = null) {
  return new Promise((resolve, reject) => {
    // Check if this is a git command - if so, use execFile
    if (command.trim().startsWith('git ')) {
      const parts = command.trim().split(/\s+/);
      const gitCmd = parts[0]; // 'git'
      const gitArgs = parts.slice(1); // rest of arguments
      
      console.log('[executeCommand]', `Running git command: ${gitCmd} ${gitArgs.join(' ')}`);
      
      execFile(gitCmd, gitArgs, {
        cwd: cwd || process.cwd(),
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000,
      }, (error, stdout, stderr) => {
        // Log output regardless of success/failure
        if (stdout) {
          deploymentLogs.push({ type: 'log', message: stdout });
          console.log('[stdout]', stdout);
        }
        if (stderr) {
          deploymentLogs.push({ type: 'error', message: stderr });
          console.log('[stderr]', stderr);
        }
        
        if (error && error.code && error.code !== 0) {
          reject(new Error(`Git command failed: ${error.message}`));
        } else {
          resolve({ success: true, output: stdout });
        }
      });
    } else {
      // For non-git commands, use exec with shell
      console.log('[executeCommand]', `Running command: ${command}`);
      
      exec(command, {
        cwd: cwd || process.cwd(),
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000,
        shell: true,
      }, (error, stdout, stderr) => {
        if (stdout) {
          deploymentLogs.push({ type: 'log', message: stdout });
          console.log('[stdout]', stdout);
        }
        if (stderr) {
          deploymentLogs.push({ type: 'error', message: stderr });
          console.log('[stderr]', stderr);
        }
        
        if (error) {
          reject(new Error(`Command failed: ${error.message}`));
        } else {
          resolve({ success: true, output: stdout });
        }
      });
    }
  });
}

/**
 * Validate GitHub repository URL
 */
function isValidGitHubUrl(url) {
  const gitHubUrlPattern = /^https?:\/\/github\.com\/[\w-]+\/[\w-]+\.git?$/i;
  return gitHubUrlPattern.test(url);
}

/**
 * Generate unique container name
 */
function generateContainerName() {
  return `deployment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Find available port starting from 3000
 */
function findAvailablePort(startPort = 3000) {
  return startPort; // Simplified: assumes port is available. In production, use net.createServer to check
}

/**
 * Main Deployment Pipeline
 */
async function deployApplication(repoUrl) {
  try {
    deploymentLogs = [];
    pipelineEvents = [];
    const metrics = new MetricsCollector();
    currentMetrics = metrics;

    const timestamp = Date.now();
    const deployDir = path.join(os.tmpdir(), `deployment-${timestamp}`);
    const containerName = generateContainerName();
    const port = findAvailablePort();

    emitPipelineEvent({
      stage: 'pipeline_started',
      status: 'info',
      repo_url: repoUrl,
    });

    // Step 1: Clone Repository
    deploymentLogs.push({
      type: 'info',
      message: `📦 Cloning repository from ${repoUrl}...`,
    });
    console.log('Step 1: Cloning repository...');

    emitPipelineEvent({
      stage: 'cloning',
      status: 'running',
    });

    // Create deployment directory
    try {
      fs.mkdirSync(deployDir, { recursive: true });
      console.log('Created deployment directory:', deployDir);
    } catch (dirErr) {
      console.error('Failed to create directory:', dirErr);
      throw new Error(`Failed to create deployment directory: ${dirErr.message}`);
    }

    metrics.startTimer('clone');
    await executeCommand(`git clone ${repoUrl} .`, deployDir);
    metrics.endTimer('clone');

    deploymentLogs.push({
      type: 'success',
      message: '✅ Repository cloned successfully!',
    });

    emitPipelineEvent({
      stage: 'cloning_complete',
      status: 'success',
      clone_time_ms: metrics.getStageMetrics('clone').duration,
    });

    // Step 2: Dependency Analysis
    deploymentLogs.push({
      type: 'info',
      message: '🔍 Analyzing dependencies for vulnerabilities...',
    });
    console.log('Step 2: Analyzing dependencies...');

    emitPipelineEvent({
      stage: 'dependency_analysis',
      status: 'running',
    });

    try {
      const analyzer = new DependencyAnalyzer(deployDir);
      const analysisResult = await analyzer.analyze();
      emitPipelineEvent(analysisResult);

      if (analysisResult.status === 'success') {
        deploymentLogs.push({
          type: 'success',
          message: `✅ Dependency analysis complete: ${analysisResult.data.total_dependencies} dependencies found`,
        });

        if (analysisResult.data.vulnerabilities.length > 0) {
          deploymentLogs.push({
            type: 'warning',
            message: `⚠️ Found ${analysisResult.data.vulnerabilities.length} vulnerabilities`,
          });
        }
      }
    } catch (analyzerError) {
      console.error('Dependency analysis error:', analyzerError);
      emitPipelineEvent({
        stage: 'dependency_analysis',
        status: 'failed',
        error: analyzerError.message,
      });
      deploymentLogs.push({
        type: 'warning',
        message: `⚠️ Dependency analysis skipped: ${analyzerError.message}`,
      });
    }

    // Step 3: Verify Dockerfile exists
    const dockerfilePath = path.join(deployDir, 'Dockerfile');
    if (!fs.existsSync(dockerfilePath)) {
      throw new Error('Dockerfile not found in repository. Only Node.js apps with Dockerfile are supported.');
    }
    deploymentLogs.push({
      type: 'success',
      message: '✅ Dockerfile found!',
    });

    // Step 4: Build Docker Image
    deploymentLogs.push({
      type: 'info',
      message: `🏗️ Building Docker image...`,
    });
    console.log('Step 3: Building Docker image...');

    emitPipelineEvent({
      stage: 'building',
      status: 'running',
    });

    metrics.startTimer('build');
    const imageName = `deployment-${timestamp}`;
    await executeCommand(`docker build -t ${imageName} .`, deployDir);
    metrics.endTimer('build');

    deploymentLogs.push({
      type: 'success',
      message: '✅ Docker image built successfully!',
    });

    emitPipelineEvent({
      stage: 'building_complete',
      status: 'success',
      build_time_ms: metrics.getStageMetrics('build').duration,
    });

    // Step 5: Stop any existing container with this name
    deploymentLogs.push({
      type: 'info',
      message: `🧹 Cleaning up existing containers...`,
    });
    try {
      await executeCommand(`docker stop ${containerName}`);
    } catch (e) {
      // Container might not exist, that's OK
    }

    // Step 6: Run Container
    deploymentLogs.push({
      type: 'info',
      message: `🚀 Starting container on port ${port}...`,
    });
    console.log('Step 4: Running Docker container...');

    emitPipelineEvent({
      stage: 'deploying',
      status: 'running',
    });

    metrics.startTimer('deploy');
    // Run detached, map port 3000 from container to 'port' on host
    await executeCommand(
      `docker run -d --name ${containerName} -p ${port}:3000 ${imageName}`,
      deployDir
    );
    metrics.endTimer('deploy');

    deploymentLogs.push({
      type: 'success',
      message: `✅ Container running successfully!`,
    });
    deploymentLogs.push({
      type: 'info',
      message: `🌐 Access your app at: http://localhost:${port}`,
    });
    deploymentLogs.push({
      type: 'info',
      message: `📝 Container name: ${containerName}`,
    });

    emitPipelineEvent({
      stage: 'deploying_complete',
      status: 'success',
      deploy_time_ms: metrics.getStageMetrics('deploy').duration,
    });

    currentDeployment = {
      status: 'running',
      containerName,
      imageName,
      port,
      url: `http://localhost:${port}`,
      deployDir,
      startTime: new Date(),
    };

    // Step 7: Emit Pipeline Metrics
    const metricsReport = metrics.generateReport(repoUrl, true);
    emitPipelineEvent(metricsReport);

    const detailedBreakdown = metrics.getDetailedBreakdown();
    deploymentLogs.push({
      type: 'info',
      message: `📊 Pipeline completed in ${detailedBreakdown.total}ms`,
    });

    return {
      success: true,
      deployment: currentDeployment,
      logs: deploymentLogs,
      pipeline_events: pipelineEvents,
      metrics: metricsReport.data,
    };
  } catch (error) {
    deploymentLogs.push({
      type: 'error',
      message: `❌ Deployment failed: ${error.message || error}`,
    });

    if (currentMetrics) {
      currentMetrics.recordError('pipeline', error);
      const metricsReport = currentMetrics.generateReport('', false);
      emitPipelineEvent(metricsReport);
    } else {
      emitPipelineEvent({
        stage: 'pipeline_failed',
        status: 'failed',
        error: error.message,
      });
    }

    currentDeployment = {
      status: 'failed',
      error: error.message || error,
      startTime: new Date(),
    };

    return {
      success: false,
      error: error.message || error,
      logs: deploymentLogs,
      pipeline_events: pipelineEvents,
    };
  }
}

/**
 * API Endpoints
 */

// GET current deployment status
app.get('/api/status', (req, res) => {
  res.json({
    current: currentDeployment,
    logs: deploymentLogs,
  });
});

// GET pipeline events (JSON only)
app.get('/api/pipeline/events', (req, res) => {
  res.json({
    stage: 'pipeline_events',
    events: pipelineEvents,
    timestamp: new Date().toISOString(),
  });
});

// GET pipeline metrics (JSON only)
app.get('/api/pipeline/metrics', (req, res) => {
  if (!currentMetrics) {
    return res.json({
      stage: 'pipeline_metrics',
      status: 'no_data',
      data: null,
    });
  }

  const report = currentMetrics.generateReport('', true);
  const breakdown = currentMetrics.getDetailedBreakdown();

  res.json({
    ...report.data,
    breakdown: breakdown,
  });
});

// POST deploy endpoint
app.post('/api/deploy', async (req, res) => {
  const { repoUrl } = req.body;

  // Validation
  if (!repoUrl) {
    return res.status(400).json({
      success: false,
      error: 'Repository URL is required',
    });
  }

  if (!isValidGitHubUrl(repoUrl)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid GitHub URL format. Use: https://github.com/user/repo or https://github.com/user/repo.git',
    });
  }

  // Check if deployment is already running
  if (currentDeployment?.status === 'running') {
    return res.status(409).json({
      success: false,
      error: 'A deployment is already in progress. Please wait for it to complete.',
    });
  }

  try {
    const result = await deployApplication(repoUrl);
    res.json(result);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

// POST stop current deployment
app.post('/api/stop', async (req, res) => {
  if (!currentDeployment || currentDeployment.status !== 'running') {
    return res.status(400).json({
      success: false,
      error: 'No active deployment to stop',
    });
  }

  try {
    await executeCommand(`docker stop ${currentDeployment.containerName}`);
    deploymentLogs.push({
      type: 'info',
      message: '🛑 Container stopped.',
    });

    currentDeployment.status = 'stopped';
    res.json({
      success: true,
      message: 'Container stopped successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Serve frontend
frontendApp.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start backend server
app.listen(BACKEND_PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 Deployment Platform Started       ║
╠════════════════════════════════════════╣
║ Backend API running on port ${BACKEND_PORT}        ║
║ Frontend running on port ${FRONTEND_PORT}         ║
║                                        ║
║ 🌐 Frontend: http://localhost:${FRONTEND_PORT}      ║
║ 🔌 Backend: http://localhost:${BACKEND_PORT}       ║
║                                        ║
║ Ready to deploy applications!          ║
╚════════════════════════════════════════╝
  `);
});

// Start frontend server
frontendApp.listen(FRONTEND_PORT, () => {
  console.log(`✓ Frontend server listening on port ${FRONTEND_PORT}`);
});
