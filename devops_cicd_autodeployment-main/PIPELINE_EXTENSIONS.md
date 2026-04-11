# Pipeline Extensions: Dependency Analysis & Metrics Tracking

## Overview

The CI/CD deployment pipeline has been extended with two new internal DevOps stages:

1. **Dependency Analyzer Stage** - Analyzes dependencies for security and quality issues
2. **Pipeline Metrics Stage** - Tracks full pipeline execution timing and performance

## Architecture Changes

### New Files

- `lib/dependency-analyzer.js` - Dependency security analysis module
- `lib/metrics-collector.js` - Pipeline metrics and timing tracking
- `server.js` - Updated with new stages and event emission

## Module Details

### 1. Dependency Analyzer (`lib/dependency-analyzer.js`)

**Purpose:** Analyze project dependencies after repository cloning

**Capabilities:**
- Detects package manager (npm, yarn, pnpm)
- Reads and parses `package.json`
- Runs security audit (`npm audit --json`)
- Identifies outdated dependencies
- Detects unused dependencies (heuristic-based)
- Categorizes dependencies by production vs. development

**Output Format (JSON):**
```json
{
  "stage": "dependency_analysis",
  "status": "success|failed",
  "data": {
    "package_manager": "npm|yarn|pnpm",
    "total_dependencies": 42,
    "dependency_count": {
      "production": 15,
      "development": 27
    },
    "vulnerabilities": [
      {
        "package": "package-name",
        "severity": "low|moderate|high|critical",
        "title": "Vulnerability title",
        "description": "Detailed description",
        "cve": ["CVE-2024-xxxxx"]
      }
    ],
    "outdated_dependencies": [
      {
        "package": "express",
        "current": "4.18.2",
        "wanted": "4.19.0",
        "latest": "4.19.2"
      }
    ],
    "unused_dependencies": ["unused-pkg"]
  }
}
```

### 2. Metrics Collector (`lib/metrics-collector.js`)

**Purpose:** Track pipeline execution metrics and timing

**Capabilities:**
- Measures execution time for each pipeline stage
- Tracks clone, install, build, and deploy durations
- Records error information
- Generates detailed timing breakdown with percentages

**Output Format (JSON):**
```json
{
  "stage": "pipeline_metrics",
  "status": "success|failed",
  "data": {
    "repo_url": "https://github.com/user/repo",
    "clone_time_ms": 15320,
    "install_time_ms": 45680,
    "build_time_ms": 120450,
    "deploy_time_ms": 8230,
    "total_time_ms": 189680,
    "result": "success|failure",
    "timestamp": "2024-04-11T10:30:45.123Z"
  },
  "errors": []
}
```

## Pipeline Flow

The updated pipeline follows this sequence:

```
1. START_PIPELINE
   ↓
2. CLONE_REPO (metric: clone_time_ms)
   ↓ [Emit: cloning_complete]
3. DEPENDENCY_ANALYSIS (NEW)
   ↓ [Emit: dependency_analysis with vulnerabilities]
4. BUILD_IMAGE (metric: build_time_ms)
   ↓ [Emit: building_complete]
5. DEPLOY_CONTAINER (metric: deploy_time_ms)
   ↓ [Emit: deploying_complete]
6. PIPELINE_METRICS (NEW)
   ↓ [Emit: pipeline_metrics with all timings]
7. END_PIPELINE
```

## API Endpoints

### GET `/api/pipeline/events`

Returns all pipeline events emitted during the last deployment

**Response:**
```json
{
  "stage": "pipeline_events",
  "events": [
    {
      "stage": "pipeline_started",
      "status": "info",
      "repo_url": "https://github.com/...",
      "timestamp": "2024-04-11T10:30:00.000Z"
    },
    {
      "stage": "dependency_analysis",
      "status": "success",
      "data": { ... },
      "timestamp": "2024-04-11T10:30:15.000Z"
    },
    ...
  ],
  "timestamp": "2024-04-11T10:30:45.123Z"
}
```

### GET `/api/pipeline/metrics`

Returns pipeline execution metrics

**Response:**
```json
{
  "repo_url": "https://github.com/user/repo",
  "clone_time_ms": 15320,
  "install_time_ms": 45680,
  "build_time_ms": 120450,
  "deploy_time_ms": 8230,
  "total_time_ms": 189680,
  "result": "success",
  "timestamp": "2024-04-11T10:30:45.123Z",
  "breakdown": {
    "clone": {
      "ms": 15320,
      "percentage": "8.07"
    },
    "install": {
      "ms": 45680,
      "percentage": "24.08"
    },
    "build": {
      "ms": 120450,
      "percentage": "63.52"
    },
    "deploy": {
      "ms": 8230,
      "percentage": "4.34"
    },
    "total": 189680
  },
  "errors": []
}
```

## Usage Example

### Deploying an Application

```bash
curl -X POST http://localhost:5000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{"repoUrl":"https://github.com/user/my-app.git"}'
```

### Getting Pipeline Events

```bash
curl http://localhost:5000/api/pipeline/events
```

### Getting Pipeline Metrics

```bash
curl http://localhost:5000/api/pipeline/metrics
```

## Event Emission

All pipeline events are emitted as JSON-only data structures and can be:
- Stored in a database
- Streamed to frontend via WebSocket
- Rendered in deployment dashboard timeline UI
- Used for pipeline analysis and optimization

**Event Types:**
- `pipeline_started` - Pipeline initialization starts
- `cloning` - Repository cloning begins
- `cloning_complete` - Repository cloned successfully
- `dependency_analysis` - Dependency security analysis started
- `building` - Docker image build started
- `building_complete` - Docker image built successfully
- `deploying` - Container deployment started
- `deploying_complete` - Container deployed successfully
- `pipeline_metrics` - Final metrics report
- `pipeline_failed` - Pipeline execution failed

## Dependency Analysis Features

### Vulnerability Detection

- Runs `npm audit` (or equivalent for yarn/pnpm)
- Extracts CVE information
- Categorizes by severity (low, moderate, high, critical)
- Links to advisory details

### Outdated Package Detection

- Compares current vs. latest versions
- Shows wanted version (compatible upgrades)
- Shows latest version (all upgrades)

### Unused Dependency Detection

- Heuristic-based scanning (searches for imports/requires)
- Scans first 50 source files for performance
- Supports `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs` files
- Excludes common framework patterns that may not show as direct imports

## Performance Metrics

Pipeline metrics include:

- **Clone Time:** Repository cloning duration
- **Build Time:** Docker image build duration
- **Deploy Time:** Container startup and deployment duration
- **Total Time:** Complete pipeline execution time
- **Timing Breakdown:** Percentage breakdown of each stage

## Error Handling

Both stages include comprehensive error handling:

- Dependency analysis failures do not block deployment
- Metrics are still collected even if some stages fail
- Errors are recorded in the pipeline events
- Deployment continues with warnings for non-critical failures

## Security Considerations

- Analysis runs inside Docker sandbox (safe)
- No modification to repository code
- `npm audit` uses official vulnerability database
- All output is JSON-safe for database storage
- No sensitive data exposed in metrics

## Integration with Frontend

The frontend can subscribe to pipeline events via:

1. **REST API polling** (`/api/pipeline/events` and `/api/pipeline/metrics`)
2. **WebSocket streaming** (can be added for real-time updates)
3. **Dashboard timeline visualization** (renders events chronologically)

## Future Enhancements

Possible improvements:

- WebSocket real-time event streaming
- Historical metrics storage and trending
- Performance regression detection
- Automated remediation for common issues
- Integration with security scanning services (Snyk, Dependabot)
- Detailed performance analysis and bottleneck detection
