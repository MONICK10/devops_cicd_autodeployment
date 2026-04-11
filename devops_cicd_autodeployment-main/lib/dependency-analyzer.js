const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Dependency Analyzer - Analyzes project dependencies for vulnerabilities and issues
 */
class DependencyAnalyzer {
  constructor(repoPath) {
    this.repoPath = repoPath;
    this.packageJsonPath = path.join(repoPath, 'package.json');
    this.packageLockPath = path.join(repoPath, 'package-lock.json');
    this.nodeModulesPath = path.join(repoPath, 'node_modules');
  }

  /**
   * Detect package manager
   */
  detectPackageManager() {
    if (fs.existsSync(path.join(this.repoPath, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (fs.existsSync(path.join(this.repoPath, 'yarn.lock'))) {
      return 'yarn';
    }
    if (fs.existsSync(this.packageLockPath)) {
      return 'npm';
    }
    return 'npm'; // Default
  }

  /**
   * Read and parse package.json
   */
  readPackageJson() {
    try {
      if (!fs.existsSync(this.packageJsonPath)) {
        throw new Error('package.json not found');
      }
      const content = fs.readFileSync(this.packageJsonPath, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      throw new Error(`Failed to read package.json: ${err.message}`);
    }
  }

  /**
   * Run npm audit and parse results
   */
  runAudit() {
    try {
      const packageManager = this.detectPackageManager();
      let auditCommand = '';

      if (packageManager === 'npm') {
        auditCommand = 'npm audit --json';
      } else if (packageManager === 'yarn') {
        auditCommand = 'yarn audit --json';
      } else if (packageManager === 'pnpm') {
        auditCommand = 'pnpm audit --json';
      }

      try {
        const output = execSync(auditCommand, {
          cwd: this.repoPath,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'], // Ignore stderr as audit often exits with non-zero
        });
        return JSON.parse(output);
      } catch (err) {
        // Try to parse output even if command failed
        if (err.stdout) {
          try {
            return JSON.parse(err.stdout);
          } catch (_) {
            return { vulnerabilities: {} };
          }
        }
        return { vulnerabilities: {} };
      }
    } catch (err) {
      console.error('Audit error:', err.message);
      return { vulnerabilities: {} };
    }
  }

  /**
   * Parse audit results and extract vulnerabilities
   */
  parseVulnerabilities(auditResult) {
    const vulnerabilities = [];

    if (!auditResult.vulnerabilities) {
      return vulnerabilities;
    }

    for (const [packageName, vulnData] of Object.entries(auditResult.vulnerabilities)) {
      if (vulnData.severity && vulnData.via && Array.isArray(vulnData.via)) {
        vulnData.via.forEach((advisory) => {
          vulnerabilities.push({
            package: packageName,
            severity: vulnData.severity,
            title: advisory.title || 'Unknown vulnerability',
            description: advisory.description || 'No description available',
            cve: advisory.cves || [],
          });
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Get outdated packages
   */
  getOutdatedPackages() {
    try {
      const packageManager = this.detectPackageManager();
      let outdatedCommand = '';

      if (packageManager === 'npm') {
        outdatedCommand = 'npm outdated --json';
      } else if (packageManager === 'yarn') {
        outdatedCommand = 'yarn upgrade-interactive --latest --json';
      } else if (packageManager === 'pnpm') {
        outdatedCommand = 'pnpm outdated --json';
      }

      try {
        const output = execSync(outdatedCommand, {
          cwd: this.repoPath,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        return JSON.parse(output);
      } catch (err) {
        if (err.stdout) {
          try {
            return JSON.parse(err.stdout);
          } catch (_) {
            return {};
          }
        }
        return {};
      }
    } catch (err) {
      console.error('Outdated check error:', err.message);
      return {};
    }
  }

  /**
   * Heuristically detect unused dependencies
   * (Basic implementation: checks if require/import statements exist in main files)
   */
  detectUnusedDependencies() {
    try {
      const packageJson = this.readPackageJson();
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const sourceFiles = this.findSourceFiles();
      const sourceContent = sourceFiles
        .slice(0, 50) // Limit to first 50 files for performance
        .map((file) => {
          try {
            return fs.readFileSync(file, 'utf8');
          } catch (_) {
            return '';
          }
        })
        .join('\n');

      const unused = [];

      for (const depName of Object.keys(allDeps)) {
        // Simple heuristic: check for require/import statements
        const escapedName = depName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const requirePattern = new RegExp(`require\\(['"\\s]*${escapedName}`, 'g');
        const importPattern = new RegExp(`import\\s+[\\w\\s,{}*]+\\s+from\\s+['"\\s]*${escapedName}`, 'g');

        const hasRequire = requirePattern.test(sourceContent);
        const hasImport = importPattern.test(sourceContent);

        // Skip common patterns that may not show up directly
        const isBuiltIn = ['express', 'react', 'react-dom', 'next', 'webpack', '@', 'concurrently'].some(
          (pattern) => depName.includes(pattern)
        );

        if (!hasRequire && !hasImport && !isBuiltIn) {
          unused.push(depName);
        }
      }

      return unused;
    } catch (err) {
      console.error('Unused deps detection error:', err.message);
      return [];
    }
  }

  /**
   * Find source files in the repository
   */
  findSourceFiles() {
    const sourceExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
    const sourceFiles = [];
    const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];

    const traverseDir = (dir) => {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            if (!excludeDirs.includes(file)) {
              traverseDir(filePath);
            }
          } else if (sourceExtensions.includes(path.extname(file))) {
            sourceFiles.push(filePath);
          }
        }
      } catch (_) {
        // Skip directories we can't read
      }
    };

    traverseDir(this.repoPath);
    return sourceFiles;
  }

  /**
   * Main analysis function
   */
  async analyze() {
    try {
      const packageManager = this.detectPackageManager();
      const packageJson = this.readPackageJson();

      // Run audit
      const auditResult = this.runAudit();
      const vulnerabilities = this.parseVulnerabilities(auditResult);

      // Get outdated packages
      const outdatedResult = this.getOutdatedPackages();
      let outdatedPackages = [];
      if (typeof outdatedResult === 'object') {
        outdatedPackages = Object.entries(outdatedResult)
          .map(([name, data]) => ({
            package: name,
            current: data.current || data.version,
            wanted: data.wanted || data.latestVersion,
            latest: data.latest || data.latestVersion,
          }))
          .filter((p) => p.current && p.wanted);
      }

      // Detect unused dependencies
      const unusedDependencies = this.detectUnusedDependencies();

      // Count dependencies
      const totalDependencies =
        (Object.keys(packageJson.dependencies || {}).length || 0) +
        (Object.keys(packageJson.devDependencies || {}).length || 0);

      return {
        stage: 'dependency_analysis',
        status: 'success',
        data: {
          package_manager: packageManager,
          total_dependencies: totalDependencies,
          vulnerabilities,
          outdated_dependencies: outdatedPackages,
          unused_dependencies: unusedDependencies,
          dependency_count: {
            production: Object.keys(packageJson.dependencies || {}).length,
            development: Object.keys(packageJson.devDependencies || {}).length,
          },
        },
      };
    } catch (error) {
      return {
        stage: 'dependency_analysis',
        status: 'failed',
        error: error.message,
        data: {
          package_manager: 'unknown',
          total_dependencies: 0,
          vulnerabilities: [],
          outdated_dependencies: [],
          unused_dependencies: [],
        },
      };
    }
  }
}

module.exports = DependencyAnalyzer;
