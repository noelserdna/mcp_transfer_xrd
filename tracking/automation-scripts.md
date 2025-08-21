# MCP Roots - Scripts de Automatización para Seguimiento

## Scripts de Recolección de Métricas

### 1. Git Metrics Collector (`scripts/collect-git-metrics.sh`)

```bash
#!/bin/bash
# MCP Roots - Git Metrics Collection
# Usage: ./collect-git-metrics.sh [days_back]

DAYS_BACK=${1:-1}
OUTPUT_FILE="tracking/daily-reports/git-metrics-$(date +%Y-%m-%d).json"

echo "=== Collecting Git Metrics for last $DAYS_BACK days ==="

# Commits analysis
COMMITS_COUNT=$(git log --since="$DAYS_BACK days ago" --oneline | wc -l)
COMMITS_BY_AUTHOR=$(git log --since="$DAYS_BACK days ago" --format="%an" | sort | uniq -c | sort -nr)

# File changes analysis
FILES_MODIFIED=$(git log --since="$DAYS_BACK days ago" --name-only --pretty=format: | sort | uniq | wc -l)
LINES_STATS=$(git log --since="$DAYS_BACK days ago" --stat --pretty=format: | grep "files changed" | tail -1)

# PR analysis (if using GitHub CLI)
if command -v gh &> /dev/null; then
    PRS_MERGED=$(gh pr list --state merged --limit 100 --json mergedAt | jq "[.[] | select(.mergedAt | fromdateiso8601 > (now - ($DAYS_BACK * 86400)))] | length")
    PRS_OPENED=$(gh pr list --state open --json createdAt | jq "[.[] | select(.createdAt | fromdateiso8601 > (now - ($DAYS_BACK * 86400)))] | length")
else
    PRS_MERGED=0
    PRS_OPENED=0
fi

# Task tracking from commits
TASK_COMMITS=$(git log --since="$DAYS_BACK days ago" --grep="#T[0-9]" --oneline | wc -l)
COMPLETED_TASKS=$(git log --since="$DAYS_BACK days ago" --grep="#T[0-9].*DONE" --oneline | wc -l)
BLOCKED_TASKS=$(git log --since="$DAYS_BACK days ago" --grep="#T[0-9].*BLOCKED" --oneline | wc -l)

# Generate JSON output
cat > "$OUTPUT_FILE" << EOF
{
  "date": "$(date -I)",
  "period_days": $DAYS_BACK,
  "commits": {
    "total": $COMMITS_COUNT,
    "by_author": "$COMMITS_BY_AUTHOR",
    "task_related": $TASK_COMMITS
  },
  "files": {
    "modified": $FILES_MODIFIED,
    "stats": "$LINES_STATS"
  },
  "pull_requests": {
    "merged": $PRS_MERGED,
    "opened": $PRS_OPENED
  },
  "tasks": {
    "commits_with_tasks": $TASK_COMMITS,
    "completed": $COMPLETED_TASKS,
    "blocked": $BLOCKED_TASKS
  }
}
EOF

echo "Git metrics saved to: $OUTPUT_FILE"
```

### 2. Performance Metrics Collector (`scripts/collect-performance-metrics.sh`)

```bash
#!/bin/bash
# MCP Roots - Performance Metrics Collection

OUTPUT_FILE="tracking/daily-reports/performance-metrics-$(date +%Y-%m-%d).json"

echo "=== Collecting Performance Metrics ==="

# QR Generation Performance Test
if [ -f "tests/performance/qr-generation-benchmark.js" ]; then
    echo "Running QR generation benchmarks..."
    node tests/performance/qr-generation-benchmark.js > qr-perf.tmp
    QR_PERF_AVG=$(grep "Average time:" qr-perf.tmp | cut -d':' -f2 | tr -d ' ms')
    QR_PERF_P95=$(grep "95th percentile:" qr-perf.tmp | cut -d':' -f2 | tr -d ' ms')
    rm qr-perf.tmp
else
    QR_PERF_AVG="null"
    QR_PERF_P95="null"
fi

# Build Performance
if [ -f "package.json" ]; then
    echo "Testing build performance..."
    BUILD_START=$(date +%s%N)
    npm run build > /dev/null 2>&1
    BUILD_END=$(date +%s%N)
    BUILD_TIME=$(( ($BUILD_END - $BUILD_START) / 1000000 )) # Convert to milliseconds
else
    BUILD_TIME="null"
fi

# Test Suite Performance
if [ -f "package.json" ]; then
    echo "Running test suite performance check..."
    TEST_START=$(date +%s%N)
    npm test > test-output.tmp 2>&1
    TEST_END=$(date +%s%N)
    TEST_TIME=$(( ($TEST_END - $TEST_START) / 1000000 ))
    
    # Extract test results
    TEST_PASSED=$(grep -o "[0-9]* passed" test-output.tmp | cut -d' ' -f1)
    TEST_FAILED=$(grep -o "[0-9]* failed" test-output.tmp | cut -d' ' -f1)
    TEST_COVERAGE=$(grep -o "All files.*[0-9]*\.[0-9]*%" test-output.tmp | grep -o "[0-9]*\.[0-9]*%" | head -1)
    
    rm test-output.tmp
else
    TEST_TIME="null"
    TEST_PASSED="null"
    TEST_FAILED="null"
    TEST_COVERAGE="null"
fi

# Memory Usage (if running MCP server)
MCP_PID=$(pgrep -f "node.*index.js" | head -1)
if [ ! -z "$MCP_PID" ]; then
    MEMORY_USAGE=$(ps -p $MCP_PID -o rss= | tr -d ' ')
    CPU_USAGE=$(ps -p $MCP_PID -o pcpu= | tr -d ' ')
else
    MEMORY_USAGE="null"
    CPU_USAGE="null"
fi

# Generate JSON output
cat > "$OUTPUT_FILE" << EOF
{
  "date": "$(date -I)",
  "timestamp": "$(date -Iseconds)",
  "qr_generation": {
    "average_ms": $QR_PERF_AVG,
    "p95_ms": $QR_PERF_P95
  },
  "build": {
    "time_ms": $BUILD_TIME
  },
  "tests": {
    "execution_time_ms": $TEST_TIME,
    "passed": $TEST_PASSED,
    "failed": $TEST_FAILED,
    "coverage_percent": "$TEST_COVERAGE"
  },
  "runtime": {
    "memory_kb": $MEMORY_USAGE,
    "cpu_percent": $CPU_USAGE
  }
}
EOF

echo "Performance metrics saved to: $OUTPUT_FILE"
```

### 3. Daily Report Generator (`scripts/generate-daily-report.sh`)

```bash
#!/bin/bash
# MCP Roots - Daily Report Generation

REPORT_DATE=$(date +%Y-%m-%d)
REPORT_FILE="tracking/daily-reports/${REPORT_DATE}-daily.md"
TEMPLATE_FILE="tracking/templates/daily-report-template.md"
CONFIG_FILE="tracking/metrics-config.json"

echo "=== Generating Daily Report for $REPORT_DATE ==="

# Collect latest metrics
./scripts/collect-git-metrics.sh 1
./scripts/collect-performance-metrics.sh

# Load configuration
TOTAL_STORY_POINTS=$(jq -r '.project.total_story_points' $CONFIG_FILE)
TOTAL_TASKS=$(jq -r '.project.total_tasks' $CONFIG_FILE)
VELOCITY_TARGET=$(jq -r '.metrics.progress.story_points_completed.weekly_velocity_target' $CONFIG_FILE)

# Calculate progress metrics
GIT_METRICS_FILE="tracking/daily-reports/git-metrics-${REPORT_DATE}.json"
PERF_METRICS_FILE="tracking/daily-reports/performance-metrics-${REPORT_DATE}.json"

if [ -f "$GIT_METRICS_FILE" ]; then
    COMMITS_TODAY=$(jq -r '.commits.total' $GIT_METRICS_FILE)
    TASK_COMMITS=$(jq -r '.commits.task_related' $GIT_METRICS_FILE)
    COMPLETED_TASKS=$(jq -r '.tasks.completed' $GIT_METRICS_FILE)
else
    COMMITS_TODAY=0
    TASK_COMMITS=0
    COMPLETED_TASKS=0
fi

if [ -f "$PERF_METRICS_FILE" ]; then
    QR_PERF=$(jq -r '.qr_generation.average_ms' $PERF_METRICS_FILE)
    TEST_COVERAGE=$(jq -r '.tests.coverage_percent' $PERF_METRICS_FILE | tr -d '%')
    BUILD_TIME=$(jq -r '.build.time_ms' $PERF_METRICS_FILE)
else
    QR_PERF="N/A"
    TEST_COVERAGE="N/A"
    BUILD_TIME="N/A"
fi

# Calculate cumulative progress
CUMULATIVE_SP=$(find tracking/daily-reports -name "*-daily.md" -exec grep "Story Points Completed" {} \; | tail -5 | awk '{sum+=$4} END {print sum}')
CUMULATIVE_TASKS=$(find tracking/daily-reports -name "*-daily.md" -exec grep "Tasks Completed" {} \; | tail -5 | awk '{sum+=$3} END {print sum}')

# Generate report from template
cp "$TEMPLATE_FILE" "$REPORT_FILE"

# Replace template variables
sed -i "s/{{DATE}}/$REPORT_DATE/g" "$REPORT_FILE"
sed -i "s/{{REPORTER_NAME}}/automated-tracking/g" "$REPORT_FILE"
sed -i "s/{{SPRINT_NAME}}/Foundation Sprint (Week 1)/g" "$REPORT_FILE"
sed -i "s/{{SP_COMPLETED_TODAY}}/$COMPLETED_TASKS/g" "$REPORT_FILE"
sed -i "s/{{SP_TARGET_DAILY}}/2.35/g" "$REPORT_FILE"
sed -i "s/{{TASKS_COMPLETED_TODAY}}/$COMPLETED_TASKS/g" "$REPORT_FILE"
sed -i "s/{{COMMITS_TODAY}}/$COMMITS_TODAY/g" "$REPORT_FILE"
sed -i "s/{{QR_PERF_MS}}/$QR_PERF/g" "$REPORT_FILE"
sed -i "s/{{TEST_COVERAGE}}/$TEST_COVERAGE/g" "$REPORT_FILE"

# Add auto-generated sections
echo "" >> "$REPORT_FILE"
echo "## Auto-Generated Metrics" >> "$REPORT_FILE"
echo "- **Data Collection Time**: $(date -Iseconds)" >> "$REPORT_FILE"
echo "- **Git Metrics**: $GIT_METRICS_FILE" >> "$REPORT_FILE"
echo "- **Performance Metrics**: $PERF_METRICS_FILE" >> "$REPORT_FILE"

echo "Daily report generated: $REPORT_FILE"
```

### 4. Alert Monitor (`scripts/monitor-alerts.sh`)

```bash
#!/bin/bash
# MCP Roots - Alert Monitoring System

CONFIG_FILE="tracking/metrics-config.json"
ALERT_LOG="tracking/alerts.log"

echo "=== MCP Roots Alert Monitor $(date) ===" | tee -a $ALERT_LOG

# Load alert thresholds
VELOCITY_THRESHOLD=$(jq -r '.alerts.velocity_drop.threshold' $CONFIG_FILE)
PERFORMANCE_THRESHOLD=$(jq -r '.alerts.performance_degradation.threshold_ms' $CONFIG_FILE)

# Check latest metrics
LATEST_PERF=$(find tracking/daily-reports -name "performance-metrics-*.json" | tail -1)
LATEST_GIT=$(find tracking/daily-reports -name "git-metrics-*.json" | tail -1)

if [ -f "$LATEST_PERF" ] && [ -f "$LATEST_GIT" ]; then
    
    # Performance Alert Check
    QR_TIME=$(jq -r '.qr_generation.average_ms' $LATEST_PERF)
    if [ "$QR_TIME" != "null" ] && [ "$QR_TIME" != "N/A" ] && (( $(echo "$QR_TIME > $PERFORMANCE_THRESHOLD" | bc -l) )); then
        echo "🚨 ALERT: Performance degradation detected" | tee -a $ALERT_LOG
        echo "   QR Generation: ${QR_TIME}ms (Threshold: ${PERFORMANCE_THRESHOLD}ms)" | tee -a $ALERT_LOG
        
        # Send notification (customize as needed)
        echo "Performance Alert: QR generation ${QR_TIME}ms exceeds ${PERFORMANCE_THRESHOLD}ms threshold" | \
            # mail -s "MCP Roots Performance Alert" team-lead@example.com
    fi
    
    # Velocity Alert Check (weekly basis)
    WEEK_START=$(date -d "7 days ago" +%Y-%m-%d)
    WEEK_COMMITS=$(git log --since="$WEEK_START" --oneline | wc -l)
    WEEK_TASK_COMMITS=$(git log --since="$WEEK_START" --grep="#T[0-9]" --oneline | wc -l)
    
    if [ $WEEK_TASK_COMMITS -lt 10 ]; then  # Threshold: 10 task commits per week
        echo "⚠️  WARNING: Low velocity detected" | tee -a $ALERT_LOG
        echo "   Task commits this week: $WEEK_TASK_COMMITS (Expected: >10)" | tee -a $ALERT_LOG
    fi
    
    # Test Failure Alert
    TEST_FAILED=$(jq -r '.tests.failed' $LATEST_PERF)
    if [ "$TEST_FAILED" != "null" ] && [ "$TEST_FAILED" != "0" ]; then
        echo "🚨 CRITICAL: Test failures detected" | tee -a $ALERT_LOG
        echo "   Failed tests: $TEST_FAILED" | tee -a $ALERT_LOG
    fi
    
    # Coverage Alert
    COVERAGE=$(jq -r '.tests.coverage_percent' $LATEST_PERF | tr -d '%')
    if [ "$COVERAGE" != "null" ] && [ "$COVERAGE" != "N/A" ] && (( $(echo "$COVERAGE < 80" | bc -l) )); then
        echo "⚠️  WARNING: Test coverage below threshold" | tee -a $ALERT_LOG
        echo "   Coverage: ${COVERAGE}% (Threshold: 80%)" | tee -a $ALERT_LOG
    fi
    
fi

# Check for blocked tasks in git commits
BLOCKED_TODAY=$(git log --since="1 day ago" --grep="BLOCKED" --oneline | wc -l)
if [ $BLOCKED_TODAY -gt 0 ]; then
    echo "🚨 CRITICAL: Blocked tasks detected" | tee -a $ALERT_LOG
    echo "   Tasks blocked in last 24h: $BLOCKED_TODAY" | tee -a $ALERT_LOG
    git log --since="1 day ago" --grep="BLOCKED" --oneline | tee -a $ALERT_LOG
fi

echo "=== Alert Monitor Complete ===" | tee -a $ALERT_LOG
```

### 5. Weekly Summary Generator (`scripts/generate-weekly-summary.sh`)

```bash
#!/bin/bash
# MCP Roots - Weekly Summary Generation

WEEK_END=$(date +%Y-%m-%d)
WEEK_START=$(date -d "7 days ago" +%Y-%m-%d)
SUMMARY_FILE="tracking/weekly-summary-${WEEK_END}.md"
TEMPLATE_FILE="tracking/templates/weekly-summary-template.md"

echo "=== Generating Weekly Summary: $WEEK_START to $WEEK_END ==="

# Collect week's metrics
./scripts/collect-git-metrics.sh 7
./scripts/collect-performance-metrics.sh

# Aggregate weekly data
WEEK_COMMITS=$(git log --since="7 days ago" --oneline | wc -l)
WEEK_TASK_COMMITS=$(git log --since="7 days ago" --grep="#T[0-9]" --oneline | wc -l)
WEEK_COMPLETED=$(git log --since="7 days ago" --grep="DONE" --oneline | wc -l)
WEEK_BLOCKED=$(git log --since="7 days ago" --grep="BLOCKED" --oneline | wc -l)

# Calculate velocity
VELOCITY_CURRENT=$WEEK_COMPLETED
VELOCITY_TARGET=10

# PR activity
if command -v gh &> /dev/null; then
    WEEK_PRS_MERGED=$(gh pr list --state merged --limit 100 --json mergedAt | jq "[.[] | select(.mergedAt | fromdateiso8601 > (now - 604800))] | length")
    WEEK_PRS_OPENED=$(gh pr list --state all --limit 100 --json createdAt | jq "[.[] | select(.createdAt | fromdateiso8601 > (now - 604800))] | length")
else
    WEEK_PRS_MERGED=0
    WEEK_PRS_OPENED=0
fi

# Risk assessment
MATERIALIZED_RISKS=0
if [ $WEEK_BLOCKED -gt 0 ]; then
    MATERIALIZED_RISKS=$(($MATERIALIZED_RISKS + 1))
fi

# Generate summary from template
cp "$TEMPLATE_FILE" "$SUMMARY_FILE"

# Replace key variables
sed -i "s/{{WEEK_START}}/$WEEK_START/g" "$SUMMARY_FILE"
sed -i "s/{{WEEK_END}}/$WEEK_END/g" "$SUMMARY_FILE"
sed -i "s/{{SPRINT_NAME}}/Foundation Sprint/g" "$SUMMARY_FILE"
sed -i "s/{{VELOCITY_CURRENT}}/$VELOCITY_CURRENT/g" "$SUMMARY_FILE"
sed -i "s/{{VELOCITY_TARGET}}/$VELOCITY_TARGET/g" "$SUMMARY_FILE"
sed -i "s/{{COMMITS_WEEK}}/$WEEK_COMMITS/g" "$SUMMARY_FILE"
sed -i "s/{{PRS_MERGED}}/$WEEK_PRS_MERGED/g" "$SUMMARY_FILE"

# Add executive summary
EXEC_SUMMARY="Semana de inicialización completada con $WEEK_COMPLETED tareas finalizadas. Velocity de $VELOCITY_CURRENT puntos alcanzada."
if [ $WEEK_BLOCKED -gt 0 ]; then
    EXEC_SUMMARY="$EXEC_SUMMARY Atencion: $WEEK_BLOCKED tareas bloqueadas requieren resolución."
fi

sed -i "s/{{EXECUTIVE_SUMMARY_PARAGRAPH}}/$EXEC_SUMMARY/g" "$SUMMARY_FILE"

echo "Weekly summary generated: $SUMMARY_FILE"
```

## Configuración de Cron Jobs

### Crontab Configuration (`scripts/setup-cron.sh`)

```bash
#!/bin/bash
# MCP Roots - Cron Jobs Setup

echo "Setting up automated tracking jobs..."

# Add to crontab
(crontab -l 2>/dev/null; echo "# MCP Roots Tracking Automation") | crontab -

# Daily metrics collection at 9:00 AM
(crontab -l 2>/dev/null; echo "0 9 * * * cd $(pwd) && ./scripts/generate-daily-report.sh") | crontab -

# Alert monitoring every 4 hours
(crontab -l 2>/dev/null; echo "0 */4 * * * cd $(pwd) && ./scripts/monitor-alerts.sh") | crontab -

# Weekly summary on Fridays at 5:00 PM
(crontab -l 2>/dev/null; echo "0 17 * * 5 cd $(pwd) && ./scripts/generate-weekly-summary.sh") | crontab -

# Performance monitoring twice daily
(crontab -l 2>/dev/null; echo "0 9,17 * * * cd $(pwd) && ./scripts/collect-performance-metrics.sh") | crontab -

echo "Cron jobs configured successfully"
crontab -l
```

## Configuración de Integración con Git Hooks

### Pre-commit Hook (`scripts/git-hooks/pre-commit`)

```bash
#!/bin/bash
# MCP Roots - Pre-commit Hook for Automatic Tracking

# Extract task IDs from commit message
COMMIT_MSG_FILE=$1
TASK_IDS=$(grep -o '#T[0-9]\+' "$COMMIT_MSG_FILE" || true)

if [ ! -z "$TASK_IDS" ]; then
    echo "Task IDs found in commit: $TASK_IDS"
    
    # Update task status in tracking system
    for TASK_ID in $TASK_IDS; do
        echo "$(date -Iseconds): Commit with $TASK_ID" >> tracking/task-activity.log
    done
fi

# Run automated tests if this is a development branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ $BRANCH == feature/* ]]; then
    echo "Running quick tests on feature branch..."
    npm test --silent || {
        echo "Tests failed. Commit aborted."
        exit 1
    }
fi
```

### Post-commit Hook (`scripts/git-hooks/post-commit`)

```bash
#!/bin/bash
# MCP Roots - Post-commit Hook for Metric Updates

# Trigger automatic metric collection
echo "$(date -Iseconds): Commit completed - updating metrics" >> tracking/activity.log

# If this is during work hours, trigger immediate metric update
HOUR=$(date +%H)
if [ $HOUR -ge 9 ] && [ $HOUR -le 17 ]; then
    ./scripts/collect-git-metrics.sh 1 > /dev/null 2>&1 &
fi
```

## Instalación y Configuración

### Setup Script (`scripts/setup-tracking.sh`)

```bash
#!/bin/bash
# MCP Roots - Complete Tracking System Setup

echo "=== Setting up MCP Roots Tracking System ==="

# Make scripts executable
chmod +x scripts/*.sh
chmod +x scripts/git-hooks/*

# Setup git hooks
cp scripts/git-hooks/pre-commit .git/hooks/
cp scripts/git-hooks/post-commit .git/hooks/
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/post-commit

# Create required directories
mkdir -p tracking/daily-reports
mkdir -p tracking/alerts
mkdir -p tests/performance

# Initialize tracking files
touch tracking/activity.log
touch tracking/task-activity.log
touch tracking/alerts.log

# Setup cron jobs (optional)
read -p "Setup automated cron jobs? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./scripts/setup-cron.sh
fi

# Test the system
echo "Testing tracking system..."
./scripts/collect-git-metrics.sh 1
./scripts/collect-performance-metrics.sh

echo "=== Tracking System Setup Complete ==="
echo "Files created:"
ls -la tracking/
echo ""
echo "Next steps:"
echo "1. Run: ./scripts/generate-daily-report.sh"
echo "2. Review: tracking/status-mcp-roots.md"
echo "3. Monitor: tracking/alerts.log"
```

---

## Uso de los Scripts

### Ejecución Manual
```bash
# Métricas diarias
./scripts/generate-daily-report.sh

# Resumen semanal
./scripts/generate-weekly-summary.sh

# Monitoreo de alertas
./scripts/monitor-alerts.sh

# Métricas de performance
./scripts/collect-performance-metrics.sh
```

### Integración con CI/CD
```yaml
# GitHub Actions example
name: MCP Roots Tracking
on:
  push:
    branches: [feature/mcp-roots]
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM

jobs:
  tracking:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Generate Metrics
        run: |
          ./scripts/collect-git-metrics.sh 1
          ./scripts/monitor-alerts.sh
```

**Scripts configurados y listos para automatización completa del sistema de seguimiento MCP Roots.**