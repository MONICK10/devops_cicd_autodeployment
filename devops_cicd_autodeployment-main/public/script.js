// ================================
// CI/CD DEPLOYMENT PLATFORM - MAIN SCRIPT
// ================================

const BACKEND_URL = 'http://localhost:5001';
let deploymentData = null;

// ================================
// DEPENDENCY DATA LOADING
// ================================

async function loadDependencyData() {
    try {
        console.log('📦 Fetching dependency data from:', `${BACKEND_URL}/api/pipeline/events`);
        const response = await fetch(`${BACKEND_URL}/api/pipeline/events`);
        const data = await response.json();
        console.log('📦 Dependency data received:', data);
        
        const depEvent = data.events.find(e => e.stage === 'dependency_analysis');
        console.log('📦 Found dependency event:', depEvent);
        
        if (depEvent && depEvent.data) {
            const depData = depEvent.data;
            
            // Update summary cards
            document.getElementById('totalDeps').textContent = depData.total_dependencies || 0;
            document.getElementById('vulnCount').textContent = depData.vulnerabilities?.length || 0;
            document.getElementById('outdatedCount').textContent = depData.outdated_dependencies?.length || 0;
            document.getElementById('unusedCount').textContent = depData.unused_dependencies?.length || 0;
            document.getElementById('packageManager').textContent = depData.package_manager || 'Unknown';
            
            // Vulnerabilities
            const vulnList = document.getElementById('vulnerabilitiesList');
            if (depData.vulnerabilities && depData.vulnerabilities.length > 0) {
                vulnList.innerHTML = depData.vulnerabilities.map(v => `
                    <div class="list-item severity-${v.severity}">
                        <div class="item-header">
                            <span class="package-name">${v.package}</span>
                            <span class="severity-badge ${v.severity}">${v.severity.toUpperCase()}</span>
                        </div>
                        <div class="item-body">
                            <p>${v.title || v.description || 'No description'}</p>
                        </div>
                    </div>
                `).join('');
            } else {
                vulnList.innerHTML = '<p class="empty-msg">✅ No vulnerabilities found</p>';
            }
            
            // Outdated
            const outdatedEl = document.getElementById('outdatedList');
            if (depData.outdated_dependencies && depData.outdated_dependencies.length > 0) {
                outdatedEl.innerHTML = depData.outdated_dependencies.map(o => `
                    <div class="list-item">
                        <div class="item-header">
                            <span class="package-name">${o.package}</span>
                            <span class="version-info">${o.current} → ${o.latest}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                outdatedEl.innerHTML = '<p class="empty-msg">✅ All packages are up to date</p>';
            }
            
            // Unused
            const unusedEl = document.getElementById('unusedList');
            if (depData.unused_dependencies && depData.unused_dependencies.length > 0) {
                unusedEl.innerHTML = depData.unused_dependencies.map(u => `
                    <div class="list-item">
                        <div class="item-header">
                            <span class="package-name">${u}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                unusedEl.innerHTML = '<p class="empty-msg">✅ No unused dependencies found</p>';
            }
        } else {
            document.getElementById('vulnerabilitiesList').innerHTML = '<p class="empty-msg">No dependency analysis data available</p>';
        }
    } catch (error) {
        console.error('Error loading dependency data:', error);
    }
}

// ================================
// METRICS DATA LOADING
// ================================

async function loadMetricsData() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/pipeline/metrics`);
        const data = await response.json();
        
        if (data.clone_time_ms !== undefined) {
            // Update metric cards
            document.getElementById('cloneTime').textContent = formatTime(data.clone_time_ms);
            document.getElementById('buildTime').textContent = formatTime(data.build_time_ms);
            document.getElementById('deployTime').textContent = formatTime(data.deploy_time_ms);
            document.getElementById('totalTime').textContent = formatTime(data.total_time_ms);
            
            // Update progress bars
            const total = data.total_time_ms || 1;
            const clonePercent = ((data.clone_time_ms || 0) / total) * 100;
            const buildPercent = ((data.build_time_ms || 0) / total) * 100;
            const deployPercent = ((data.deploy_time_ms || 0) / total) * 100;
            
            document.getElementById('cloneFill').style.width = clonePercent + '%';
            document.getElementById('buildFill').style.width = buildPercent + '%';
            document.getElementById('deployFill').style.width = deployPercent + '%';
            document.getElementById('totalFill').style.width = '100%';
            
            // Breakdown details - calculate from timings
            document.getElementById('breakdownDetails').innerHTML = `
                <table class="breakdown-table">
                    <tr>
                        <th>Stage</th>
                        <th>Time</th>
                        <th>Percentage</th>
                    </tr>
                    <tr>
                        <td>Clone</td>
                        <td>${formatTime(data.clone_time_ms)}</td>
                        <td>${Math.round(clonePercent)}%</td>
                    </tr>
                    <tr>
                        <td>Build</td>
                        <td>${formatTime(data.build_time_ms)}</td>
                        <td>${Math.round(buildPercent)}%</td>
                    </tr>
                    <tr>
                        <td>Deploy</td>
                        <td>${formatTime(data.deploy_time_ms)}</td>
                        <td>${Math.round(deployPercent)}%</td>
                    </tr>
                    <tr class="total-row">
                        <td>Total</td>
                        <td>${formatTime(data.total_time_ms)}</td>
                        <td>100%</td>
                    </tr>
                </table>
            `;
            
            // Pipeline status
            if (data.result) {
                const statusClass = data.result === 'success' ? 'success' : 'failed';
                const statusEmoji = data.result === 'success' ? '✅' : '❌';
                document.getElementById('pipelineStatus').innerHTML = `
                    <div class="status-${statusClass}">
                        <p>${statusEmoji} Pipeline ${data.result === 'success' ? 'Successful' : 'Failed'}</p>
                        <p class="timestamp">Completed: ${new Date(data.timestamp).toLocaleString()}</p>
                    </div>
                `;
            }
        } else {
            document.getElementById('breakdownDetails').innerHTML = '<p class="empty-msg">No metrics data available</p>';
        }
    } catch (error) {
        console.error('Error loading metrics data:', error);
    }
}

// ================================
// LOGS DATA LOADING
// ================================

async function loadLogsData() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/pipeline/events`);
        const data = await response.json();
        
        const logsContainer = document.getElementById('logsContainer');
        
        if (data.events && data.events.length > 0) {
            logsContainer.innerHTML = data.events.map((event, index) => {
                const time = new Date(event.timestamp).toLocaleTimeString();
                const icon = getEventIcon(event.stage);
                return `
                    <div class="log-line">
                        <span class="log-time">${time}</span>
                        <span class="log-icon">${icon}</span>
                        <span class="log-text">[${event.stage}] ${event.status}</span>
                    </div>
                `;
            }).join('');
        } else {
            logsContainer.innerHTML = '<p class="empty-msg">No logs available</p>';
        }
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

// ================================
// TAB SWITCHING
// ================================

function switchTab(tabName, event) {
    // Prevent default link behavior if event is provided
    if (event) {
        event.preventDefault();
    }
    
    console.log(`✅ Switching to tab: ${tabName}`);
    
    // Hide all tab panes
    const tabPanes = document.querySelectorAll('.tab-pane');
    console.log(`Found ${tabPanes.length} tab panes`);
    tabPanes.forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    console.log(`Found ${tabButtons.length} tab buttons`);
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab pane
    const selectedTab = document.getElementById(`${tabName}-tab`);
    console.log(`Looking for element: ${tabName}-tab`, selectedTab);
    if (selectedTab) {
        selectedTab.classList.add('active');
        console.log(`✅ Tab ${tabName} activated`);
    } else {
        console.log(`❌ Tab ${tabName} not found!`);
    }
    
    // Add active class to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
        console.log(`✅ Button highlighted`);
    }
    
    // Load data for specific tabs
    if (tabName === 'dependencies') {
        console.log('Loading dependency data...');
        loadDependencyData();
    } else if (tabName === 'metrics') {
        console.log('Loading metrics data...');
        loadMetricsData();
    } else if (tabName === 'logs') {
        console.log('Loading logs data...');
        loadLogsData();
    }
}

// ================================
// AUTHENTICATION
// ================================

function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    // Clear previous error
    errorDiv.classList.remove('show');
    errorDiv.textContent = '';
    
    // Validate credentials
    if (username === 'admin' && password === '1234') {
        // Successful login
        sessionStorage.setItem('user', username);
        loginSuccess();
    } else {
        // Failed login
        errorDiv.textContent = '❌ Invalid username or password. Try admin/1234';
        errorDiv.classList.add('show');
        document.getElementById('password').value = '';
    }
}

function loginSuccess() {
    // Update user name in dashboard
    document.getElementById('userName').textContent = 
        sessionStorage.getItem('user') || 'User';
    
    // Switch pages with animation
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('dashboardPage').classList.add('active');
    
    // Reset login form
    document.getElementById('loginForm').reset();
    
    // Show welcome toast
    showToast('Welcome to DeployHub! 🚀', 'success');
}

function handleLogout() {
    sessionStorage.removeItem('user');
    document.getElementById('dashboardPage').classList.remove('active');
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('loginForm').reset();
    showToast('Logged out successfully', 'info');
}

// ================================
// DEPLOYMENT HANDLING
// ================================

async function handleDeploy(event) {
    event.preventDefault();
    
    const repoUrl = document.getElementById('repoUrl').value.trim();
    const errorDiv = document.getElementById('deployError');
    const statusDiv = document.getElementById('deploymentStatus');
    const deployBtn = document.getElementById('deployBtn');
    
    // Validate URL format
    if (!isValidGitHubUrl(repoUrl)) {
        errorDiv.textContent = '❌ Please enter a valid GitHub URL (e.g., https://github.com/username/repo)';
        errorDiv.classList.add('show');
        return;
    }
    
    // Disable submit button
    deployBtn.disabled = true;
    
    // Show deployment status
    statusDiv.classList.remove('hidden');
    document.getElementById('deploymentUrl').classList.add('hidden');
    clearDeploymentLogs();
    
    try {
        // Send deployment request
        const response = await fetch(`${BACKEND_URL}/api/deploy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ repoUrl: repoUrl }),
        });
        
        const data = await response.json();
        deploymentData = data;
        
        if (data.success) {
            // Update tabs with new data
            loadDependencyData();
            loadMetricsData();
            
            // Display logs
            if (data.pipeline_events && Array.isArray(data.pipeline_events)) {
                data.pipeline_events.forEach(event => {
                    const time = new Date(event.timestamp).toLocaleTimeString();
                    addDeploymentLog(`[${event.stage}] ${event.status}`, 'success');
                });
            }
            
            // Deployment successful
            await displaySuccessfulDeployment(data);
            showToast('Deployment completed successfully! 🎉', 'success');
        } else {
            // Deployment failed - safely extract error message
            let errorMsg = 'Deployment failed';
            if (data.error) {
                if (typeof data.error === 'string') {
                    errorMsg = data.error;
                } else if (data.error.message) {
                    errorMsg = data.error.message;
                } else {
                    errorMsg = JSON.stringify(data.error);
                }
            }
            errorDiv.textContent = `❌ ${errorMsg}`;
            errorDiv.classList.add('show');
            updateDeploymentStatus('failed', '❌', 'Deployment Failed', false);
            showToast('Deployment failed', 'error');
            addDeploymentLog(`Deploy failed: ${errorMsg}`, 'error');
        }
    } catch (error) {
        errorDiv.textContent = `❌ Error: ${error.message}`;
        errorDiv.classList.add('show');
        updateDeploymentStatus('error', '⚠️', 'Connection Error', false);
        showToast(`Error: ${error.message}`, 'error');
        addDeploymentLog(`Connection error: ${error.message}`, 'error');
    } finally {
        deployBtn.disabled = false;
    }
}

async function displaySuccessfulDeployment(data) {
    const deployment = data.deployment;
    const urlDiv = document.getElementById('deploymentUrl');
    const urlInput = document.getElementById('liveUrl');
    
    // Update deployment status
    updateDeploymentStatus('success', '✅', 'Deployment Successful!', false);
    
    // Use deployment.url directly (isolated server on unique port)
    const liveUrl = deployment.url;
    urlInput.value = liveUrl;
    urlDiv.classList.remove('hidden');
    
    // Show success message
    const successDiv = document.getElementById('deploySuccess');
    successDiv.textContent = `✅ Your application is live at: ${liveUrl}`;
    successDiv.classList.add('show');
    
    // Wait a moment for server to be ready, then load dashboard data
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Load and display all data
    loadMetricsData();
    loadLogsData();
    
    // Switch to Logs tab to show deployment progress
    switchTab('logs', null);
}


function isValidGitHubUrl(url) {
    const pattern = /^https?:\/\/github\.com\/[\w-]+\/[\w-]+\/?\.?git?$/i;
    return pattern.test(url);
}

// ================================
// DEPLOYMENT LOGGING
// ================================

function clearDeploymentLogs() {
    const logsDiv = document.getElementById('deploymentLogs');
    logsDiv.innerHTML = '';
}

function addDeploymentLog(message, type = 'log') {
    const logsDiv = document.getElementById('deploymentLogs');
    const time = new Date().toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-message">${escapeHtml(message)}</span>
    `;
    
    logsDiv.appendChild(logEntry);
    logsDiv.scrollTop = logsDiv.scrollHeight; // Auto-scroll to bottom
}

function updateDeploymentStatus(status, icon, title, isLoading) {
    document.getElementById('statusTitle').textContent = title;
    document.getElementById('statusIcon').textContent = icon;
    
    if (isLoading) {
        document.getElementById('statusIcon').classList.add('loading');
    } else {
        document.getElementById('statusIcon').classList.remove('loading');
    }
}

// ================================
// UTILITIES
// ================================

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function copyToClipboard() {
    const urlInput = document.getElementById('liveUrl');
    urlInput.select();
    document.execCommand('copy');
    showToast('URL copied to clipboard! 📋', 'success');
}

function formatTime(ms) {
    if (!ms) return '-';
    if (ms < 1000) return ms + 'ms';
    return (ms / 1000).toFixed(2) + 's';
}

function getEventIcon(stage) {
    const icons = {
        'pipeline_started': '🚀',
        'cloning': '📥',
        'cloning_complete': '✅',
        'dependency_analysis': '🔍',
        'building': '🏗️',
        'building_complete': '✅',
        'deploying': '🚀',
        'deploying_complete': '✅',
        'pipeline_metrics': '📊',
        'pipeline_failed': '❌'
    };
    return icons[stage] || '📝';
}

function clearLogs() {
    document.getElementById('logsContainer').innerHTML = '<p class="empty-msg">Logs cleared</p>';
    showToast('Logs cleared', 'info');
}

function downloadLogs() {
    if (!deploymentData) {
        showToast('No logs to download', 'warning');
        return;
    }
    
    const logs = deploymentData.pipeline_events || [];
    const text = logs.map(e => `[${e.timestamp}] ${e.stage}: ${e.status}`).join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deployment-logs.txt';
    a.click();
    
    showToast('Logs downloaded', 'success');
}

// ================================
// TOAST NOTIFICATIONS
// ================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ================================
// INITIALIZATION
// ================================

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const user = sessionStorage.getItem('user');
    if (user) {
        document.getElementById('userName').textContent = user;
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('dashboardPage').classList.add('active');
    }
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Smooth scroll for demo
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

// Add slideOutRight animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(400px);
        }
    }
`;
document.head.appendChild(style);
