/**
 * Metrics Collector - Tracks pipeline execution timing and performance
 */
class MetricsCollector {
  constructor() {
    this.timers = {};
    this.startTime = Date.now();
    this.errors = [];
  }

  /**
   * Start timing a stage
   */
  startTimer(stageName) {
    this.timers[stageName] = {
      startTime: Date.now(),
      endTime: null,
      duration: null,
    };
  }

  /**
   * End timing a stage
   */
  endTimer(stageName) {
    if (this.timers[stageName]) {
      this.timers[stageName].endTime = Date.now();
      this.timers[stageName].duration = this.timers[stageName].endTime - this.timers[stageName].startTime;
    }
  }

  /**
   * Record an error
   */
  recordError(stage, error) {
    this.errors.push({
      stage,
      error: error.message || String(error),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get metrics for a specific stage
   */
  getStageMetrics(stageName) {
    return this.timers[stageName] || null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    return {
      clone_time_ms: this.timers.clone?.duration || 0,
      install_time_ms: this.timers.install?.duration || 0,
      build_time_ms: this.timers.build?.duration || 0,
      deploy_time_ms: this.timers.deploy?.duration || 0,
      total_time_ms: Date.now() - this.startTime,
    };
  }

  /**
   * Generate pipeline metrics report
   */
  generateReport(repoUrl, success = true) {
    const metrics = this.getAllMetrics();

    return {
      stage: 'pipeline_metrics',
      status: success ? 'success' : 'failed',
      data: {
        repo_url: repoUrl,
        clone_time_ms: metrics.clone_time_ms,
        install_time_ms: metrics.install_time_ms,
        build_time_ms: metrics.build_time_ms,
        deploy_time_ms: metrics.deploy_time_ms,
        total_time_ms: metrics.total_time_ms,
        result: success ? 'success' : 'failure',
        timestamp: new Date().toISOString(),
      },
      errors: this.errors,
    };
  }

  /**
   * Get detailed breakdown
   */
  getDetailedBreakdown() {
    const metrics = this.getAllMetrics();
    const total = metrics.total_time_ms;

    return {
      clone: {
        ms: metrics.clone_time_ms,
        percentage: total > 0 ? ((metrics.clone_time_ms / total) * 100).toFixed(2) : 0,
      },
      install: {
        ms: metrics.install_time_ms,
        percentage: total > 0 ? ((metrics.install_time_ms / total) * 100).toFixed(2) : 0,
      },
      build: {
        ms: metrics.build_time_ms,
        percentage: total > 0 ? ((metrics.build_time_ms / total) * 100).toFixed(2) : 0,
      },
      deploy: {
        ms: metrics.deploy_time_ms,
        percentage: total > 0 ? ((metrics.deploy_time_ms / total) * 100).toFixed(2) : 0,
      },
      total: metrics.total_time_ms,
    };
  }
}

module.exports = MetricsCollector;
