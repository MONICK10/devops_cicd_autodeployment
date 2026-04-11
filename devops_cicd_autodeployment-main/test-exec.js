const { execFile } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const tmpDir = path.join(os.tmpdir(), `test-${Date.now()}`);

console.log("Testing execFile with git...");
console.log("Target directory:", tmpDir);
console.log("Platform:", process.platform);

// Create temp directory
try {
  fs.mkdirSync(tmpDir, { recursive: true });
  console.log("Created temp directory");
} catch (e) {
  console.error("Failed to create directory:", e.message);
}

// Use execFile to run git directly (no shell)
execFile('git', ['clone', 'https://github.com/MONICK10/lastgate_2.git', '.'], {
  cwd: tmpDir,
  timeout: 60000,
  maxBuffer: 10 * 1024 * 1024,
}, (error, stdout, stderr) => {
  if (error) {
    console.log("Error:", error.message);
    console.log("Code:", error.code);
  } else {
    console.log("Success!");
    console.log("Cloned successfully");
  }
  if (stderr) {
    console.log("Stderr:", stderr.substring(0, 200));
  }
  if (stdout) {
    console.log("Stdout:", stdout.substring(0, 200));
  }
});


