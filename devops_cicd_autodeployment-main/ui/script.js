// ============================================
// AUTODEPLOY - CI/CD AUTOMATION PLATFORM
// Frontend JavaScript Logic
// ============================================

// ============================================
// DOM ELEMENTS
// ============================================

const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');
const loginForm = document.getElementById('loginForm');
const deployForm = document.getElementById('deployForm');
const logoutBtn = document.getElementById('logoutBtn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');
const displayUsername = document.getElementById('displayUsername');
const repoUrl = document.getElementById('repoUrl');
const statusContainer = document.getElementById('statusContainer');
const deploymentStatus = document.getElementById('deploymentStatus');
const notification = document.getElementById('notification');

// ============================================
// AUTHENTICATION
// ============================================

const VALID_CREDENTIALS = {
    username: 'admin',
    password: '1234'
};

let currentUser = localStorage.getItem('currentUser');

// Check if user is already logged in
if (currentUser) {
    showDashboard();
}

loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);

function handleLogin(e) {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    // Add loading state to button
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    
    // Simulate auth delay
    setTimeout(() => {
        // Clear previous error
        loginError.classList.remove('show');
        
        if (username === VALID_CREDENTIALS.username && password === VALID_CREDENTIALS.password) {
            // Successful login
            localStorage.setItem('currentUser', username);
            currentUser = username;
            
            showNotification('Welcome back, ' + username + '! 🎉', 'success');
            
            // Small delay for visual feedback
            setTimeout(() => {
                showDashboard();
            }, 500);
        } else {
            // Failed login
            loginError.textContent = '❌ Invalid username or password';
            loginError.classList.add('show');
            passwordInput.value = '';
            passwordInput.focus();
        }
        
        submitBtn.classList.remove('loading');
    }, 500);
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    
    // Reset forms
    loginForm.reset();
    deployForm.reset();
    statusContainer.style.display = 'none';
    repoUrl.value = '';
    
    showNotification('You have been logged out', 'warning');
    showLoginPage();
}

function showLoginPage() {
    loginPage.style.display = 'flex';
    dashboardPage.style.display = 'none';
    usernameInput.focus();
}

function showDashboard() {
    loginPage.style.display = 'none';
    dashboardPage.style.display = 'flex';
    displayUsername.textContent = currentUser || 'User';
    repoUrl.focus();
}

// ============================================
// DEPLOYMENT
// ============================================

deployForm.addEventListener('submit', handleDeploy);

async function handleDeploy(e) {
    e.preventDefault();
    
    const url = repoUrl.value.trim();
    
    if (!url) {
        showNotification('❌ Please enter a repository URL', 'error');
        return;
    }
    
    // Validate URL format
    if (!isValidGitHubUrl(url)) {
        showNotification('❌ Invalid GitHub URL format', 'error');
        return;
    }
    
    // Show loading status
    showStatusContainer();
    setStatusLoading('Initializing deployment...');
    
    try {
        // Stage 1: Cloning
        await updateStatus(1, 'Cloning repository...', 2000);
        
        // Stage 2: Installing dependencies
        await updateStatus(2, 'Installing dependencies...', 3000);
        
        // Stage 3: Building
        await updateStatus(3, 'Building project...', 4000);
        
        // Send request to backend
        const response = await fetch('/deploy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ repo: url })
        });
        
        const data = await response.text();
        
        // Parse deployment URL from response (e.g., "🚀 Deployed at http://localhost:3001")
        const urlMatch = data.match(/(http:\/\/localhost:\d+)/);
        
        if (urlMatch) {
            const deployedUrl = urlMatch[0];
            
            // Stage 4: Deploying
            await updateStatus(4, 'Starting application...', 2000);
            
            setStatusSuccess(deployedUrl);
            showNotification('✅ Deployment successful!', 'success');
            
            // Reset form after delay
            setTimeout(() => {
                deployForm.reset();
                repoUrl.focus();
            }, 2000);
        } else {
            throw new Error('Could not parse deployment URL from response');
        }
        
    } catch (error) {
        setStatusError(error.message || 'Deployment failed');
        showNotification('❌ ' + (error.message || 'Deployment failed'), 'error');
        console.error('Deployment error:', error);
    }
}

function isValidGitHubUrl(url) {
    const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/i;
    return githubPattern.test(url);
}

function showStatusContainer() {
    statusContainer.style.display = 'block';
}

function setStatusLoading(message) {
    deploymentStatus.innerHTML = `
        <div class="status-loading">
            <div class="status-spinner"></div>
            <div class="status-message">${message}</div>
        </div>
    `;
}

async function updateStatus(stage, message, duration) {
    setStatusLoading(message);
    return new Promise(resolve => setTimeout(resolve, duration));
}

function setStatusSuccess(url) {
    deploymentStatus.innerHTML = `
        <div class="status-success">
            <h3>🎉 Deployment Successful!</h3>
            <p>Your application is now live and ready to use.</p>
            <p>Repository: <code>${document.getElementById('repoUrl').value}</code></p>
            <p>Status: <strong style="color: #10b981;">Online</strong></p>
            <a href="${url}" target="_blank" class="deployed-url">
                🌐 Open Application → ${url}
            </a>
        </div>
    `;
}

function setStatusError(message) {
    deploymentStatus.innerHTML = `
        <div class="status-error">
            <h3>⚠️ Deployment Failed</h3>
            <p>${message}</p>
            <p>Please check the repository URL and try again.</p>
        </div>
    `;
}

// ============================================
// NOTIFICATIONS
// ============================================

function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = 'notification show ' + type;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// ============================================
// SMOOTH SCROLL FOR SECTIONS
// ============================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ============================================
// INTERACTIVE FEATURES
// ============================================

// Add click animation to tech badges
document.querySelectorAll('.tech-badge').forEach(badge => {
    badge.addEventListener('click', function() {
        const techName = this.textContent.trim();
        showNotification(`✨ ${techName} is supported!`, 'success');
    });
});

// Add animations on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeIn 0.6s ease-out forwards';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all info cards
document.querySelectorAll('.info-card').forEach(card => {
    observer.observe(card);
});

// ============================================
// REAL API INTEGRATION (OPTIONAL)
// ============================================

// Uncomment this to connect to your actual backend
/*
async function handleDeploy(e) {
    e.preventDefault();
    
    const url = repoUrl.value.trim();
    
    if (!url) {
        showNotification('❌ Please enter a repository URL', 'error');
        return;
    }
    
    if (!isValidGitHubUrl(url)) {
        showNotification('❌ Invalid GitHub URL format', 'error');
        return;
    }
    
    showStatusContainer();
    setStatusLoading('Initializing deployment...');
    
    try {
        const response = await fetch('http://localhost:5000/deploy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ repo: url })
        });
        
        if (!response.ok) {
            throw new Error('Deployment request failed');
        }
        
        const data = await response.text();
        
        // Parse the response (assuming it returns: 🚀 Deployed at http://localhost:3001)
        const urlMatch = data.match(/(http:\/\/localhost:\d+)/);
        
        if (urlMatch) {
            setStatusSuccess(urlMatch[0]);
            showNotification('✅ Deployment successful!', 'success');
        } else {
            setStatusError('Could not parse deployment URL');
            showNotification('⚠️ ' + data, 'warning');
        }
        
        setTimeout(() => {
            deployForm.reset();
            repoUrl.focus();
        }, 2000);
        
    } catch (error) {
        setStatusError(error.message);
        showNotification('❌ ' + error.message, 'error');
        console.error('Deployment error:', error);
    }
}
*/

// ============================================
// PAGE LOAD ANIMATIONS
// ============================================

window.addEventListener('load', function() {
    // Add staggered animation to info cards
    const cards = document.querySelectorAll('.info-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.animationDelay = (index * 0.15) + 's';
        card.style.animation = 'fadeIn 0.8s ease-out forwards';
    });
    
    // Animate tech badges
    const badges = document.querySelectorAll('.tech-badge');
    badges.forEach((badge, index) => {
        badge.style.opacity = '0';
        badge.style.animationDelay = (index * 0.05) + 's';
        badge.style.animation = 'slideInUp 0.6s ease-out forwards';
    });
});

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', function(e) {
    // Alt + D: Focus on repo URL input (on dashboard)
    if (e.altKey && e.key === 'd' && dashboardPage.style.display !== 'none') {
        repoUrl.focus();
    }
    
    // Alt + L: Logout
    if (e.altKey && e.key === 'l' && dashboardPage.style.display !== 'none') {
        handleLogout();
    }
    
    // Escape: Clear status
    if (e.key === 'Escape') {
        statusContainer.style.display = 'none';
    }
});

// ============================================
// LOG MESSAGE
// ============================================

console.log('%c🚀 AutoDeploy Platform', 'font-size: 24px; color: #00d4ff; font-weight: bold; text-shadow: 0 0 10px #00d4ff;');
console.log('%cCI/CD Automation Made Simple', 'font-size: 14px; color: #00d4ff;');
console.log('%c\n✨ Keyboard Shortcuts:\nAlt + D: Focus repo URL\nAlt + L: Logout\nEsc: Clear status', 'color: #6366f1;');
