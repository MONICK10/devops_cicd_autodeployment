@echo off
REM ================================================
REM  Deployment Platform - Quick Start Script
REM  Windows Batch File
REM ================================================

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  Deployment Platform - Quick Start                      ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Minimum version: 18.0.0
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed or not running
    echo.
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    echo Then make sure Docker Desktop is running
    pause
    exit /b 1
)

echo ✅ Docker found:
docker --version
echo.

REM Check if Git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git is not installed or not in PATH
    echo.
    echo Please install Git from: https://git-scm.com/
    pause
    exit /b 1
)

echo ✅ Git found:
git --version
echo.

REM Install dependencies
echo 📦 Installing Node dependencies...
call npm install

if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed
echo.

REM Start the server
echo 🚀 Starting Deployment Platform...
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start
