# CI/CD Auto Deployment Platform - PowerShell Startup Script

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  CI/CD Auto Deployment Platform        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "✗ Node.js not found. Please install Node.js" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Yellow
Write-Host ""

# Start backend
Write-Host "🚀 Starting Backend on port 5000..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList "server-simple.js" -WindowStyle Normal

# Wait for backend to start
Start-Sleep -Seconds 3

# Start frontend
Write-Host "🌐 Starting Frontend on port 3000..." -ForegroundColor Green

# Try using http-server if available, otherwise use python
try {
    Start-Process -FilePath "npx" -ArgumentList "http-server", "public", "-p", "3000" -WindowStyle Normal
}
catch {
    Write-Host "Attempting alternative method for frontend..." -ForegroundColor Yellow
    cd public
    Start-Process -FilePath "python" -ArgumentList "-m", "http.server", "3000" -WindowStyle Normal
    cd ..
}

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     ✓ Services Started Successfully     ║" -ForegroundColor Green
Write-Host "╠════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║ Frontend:  http://localhost:3000        ║" -ForegroundColor Green
Write-Host "║ Backend:   http://localhost:5000        ║" -ForegroundColor Green
Write-Host "║                                        ║" -ForegroundColor Green
Write-Host "║ Login Credentials:                     ║" -ForegroundColor Green
Write-Host "║   Username: admin                      ║" -ForegroundColor Green
Write-Host "║   Password: 1234                       ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
