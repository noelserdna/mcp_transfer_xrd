# Daily Status Report - MCP Roots
**Date**: {{DATE}}  
**Reporter**: {{REPORTER_NAME}}  
**Sprint**: {{SPRINT_NAME}}

## Executive Summary
{{EXECUTIVE_SUMMARY_PARAGRAPH}}

## Progress Today

### Tasks Completed ✅
{{#COMPLETED_TASKS}}
- **{{TASK_ID}}**: {{TASK_DESCRIPTION}} ({{STORY_POINTS}} pts) - {{ASSIGNEE}}
  - Duration: {{ACTUAL_TIME}} (Est: {{ESTIMATED_TIME}})
  - Quality: {{QUALITY_STATUS}}
{{/COMPLETED_TASKS}}

### Tasks In Progress 🔄
{{#IN_PROGRESS_TASKS}}
- **{{TASK_ID}}**: {{TASK_DESCRIPTION}} ({{STORY_POINTS}} pts) - {{ASSIGNEE}}
  - Progress: {{PROGRESS_PERCENTAGE}}%
  - Expected completion: {{EXPECTED_COMPLETION}}
  - Blockers: {{BLOCKERS_LIST}}
{{/IN_PROGRESS_TASKS}}

### Tasks Started Today 🚀
{{#STARTED_TASKS}}
- **{{TASK_ID}}**: {{TASK_DESCRIPTION}} ({{STORY_POINTS}} pts) - {{ASSIGNEE}}
  - Start time: {{START_TIME}}
  - Expected duration: {{ESTIMATED_DURATION}}
{{/STARTED_TASKS}}

## Metrics Dashboard

### Progress Metrics
| Metric | Today | Target | Variance | Trend |
|--------|-------|--------|----------|-------|
| Story Points Completed | {{SP_COMPLETED_TODAY}} | {{SP_TARGET_DAILY}} | {{SP_VARIANCE}} | {{SP_TREND}} |
| Tasks Completed | {{TASKS_COMPLETED_TODAY}} | {{TASKS_TARGET_DAILY}} | {{TASKS_VARIANCE}} | {{TASKS_TREND}} |
| Sprint Progress | {{SPRINT_PROGRESS}}% | {{SPRINT_TARGET}}% | {{SPRINT_VARIANCE}} | {{SPRINT_TREND}} |
| Burn-down Rate | {{BURNDOWN_RATE}} | {{BURNDOWN_TARGET}} | {{BURNDOWN_VARIANCE}} | {{BURNDOWN_TREND}} |

### Quality Metrics  
| Metric | Today | Target | Status |
|--------|-------|--------|---------|
| Test Coverage | {{TEST_COVERAGE}}% | 90% | {{COVERAGE_STATUS}} |
| QR Generation Performance | {{QR_PERF_MS}}ms | <300ms | {{PERF_STATUS}} |
| Security Tests Passed | {{SECURITY_PASSED}}/{{SECURITY_TOTAL}} | 100% | {{SECURITY_STATUS}} |
| Code Review Coverage | {{REVIEW_COVERAGE}}% | 100% | {{REVIEW_STATUS}} |

## Critical Issues & Blockers 🚨

### Active Blockers
{{#ACTIVE_BLOCKERS}}
- **{{BLOCKER_ID}}**: {{BLOCKER_DESCRIPTION}}
  - Affected Tasks: {{AFFECTED_TASKS}}
  - Owner: {{BLOCKER_OWNER}}
  - ETA Resolution: {{RESOLUTION_ETA}}
  - Impact Level: {{IMPACT_LEVEL}}
{{/ACTIVE_BLOCKERS}}

### Risks Materialized Today
{{#MATERIALIZED_RISKS}}
- **{{RISK_ID}}**: {{RISK_DESCRIPTION}}
  - Impact: {{ACTUAL_IMPACT}}
  - Mitigation Status: {{MITIGATION_STATUS}}
  - Buffer Consumed: {{BUFFER_CONSUMED}} days
{{/MATERIALIZED_RISKS}}

### New Risks Identified
{{#NEW_RISKS}}
- **{{RISK_ID}}**: {{RISK_DESCRIPTION}}
  - Probability: {{RISK_PROBABILITY}}
  - Impact: {{RISK_IMPACT}}
  - Proposed Mitigation: {{MITIGATION_PLAN}}
{{/NEW_RISKS}}

## Team Performance

### Individual Contributions
{{#TEAM_MEMBERS}}
- **{{MEMBER_NAME}}** ({{ROLE}})
  - Tasks completed: {{TASKS_COMPLETED}}
  - Story points: {{STORY_POINTS}}
  - Utilization: {{UTILIZATION}}%
  - Focus area: {{FOCUS_AREA}}
{{/TEAM_MEMBERS}}

### Team Velocity
- **Today**: {{VELOCITY_TODAY}} pts
- **This Week**: {{VELOCITY_WEEK}} pts  
- **Target**: {{VELOCITY_TARGET}} pts
- **Trend**: {{VELOCITY_TREND}}

## Milestone Status

### Current Milestone: {{CURRENT_MILESTONE}}
- **Target Date**: {{MILESTONE_DATE}}
- **Progress**: {{MILESTONE_PROGRESS}}%
- **On Track**: {{MILESTONE_STATUS}}
- **Buffer Remaining**: {{BUFFER_REMAINING}} days

### Next Milestone: {{NEXT_MILESTONE}}
- **Target Date**: {{NEXT_MILESTONE_DATE}}
- **Readiness**: {{NEXT_MILESTONE_READINESS}}%
- **Risk Level**: {{NEXT_MILESTONE_RISK}}

## Tomorrow's Plan

### Scheduled Tasks
{{#TOMORROW_TASKS}}
- **{{TASK_ID}}**: {{TASK_DESCRIPTION}} - {{ASSIGNEE}}
  - Priority: {{PRIORITY}}
  - Dependencies: {{DEPENDENCIES}}
  - Estimated completion: {{ESTIMATED_COMPLETION}}
{{/TOMORROW_TASKS}}

### Focus Areas
1. **{{FOCUS_AREA_1}}** - {{FOCUS_DESCRIPTION_1}}
2. **{{FOCUS_AREA_2}}** - {{FOCUS_DESCRIPTION_2}}  
3. **{{FOCUS_AREA_3}}** - {{FOCUS_DESCRIPTION_3}}

### Dependencies to Track
{{#DEPENDENCIES}}
- **{{DEPENDENCY_ID}}**: {{DEPENDENCY_DESCRIPTION}}
  - Owner: {{DEPENDENCY_OWNER}}
  - Expected delivery: {{DEPENDENCY_ETA}}
  - Impact if delayed: {{DEPENDENCY_IMPACT}}
{{/DEPENDENCIES}}

## Code & Technical Metrics

### Git Activity
- **Commits**: {{COMMITS_TODAY}} ({{COMMITS_TREND}})
- **PRs**: {{PRS_OPENED}}/{{PRS_MERGED}}/{{PRS_PENDING}}
- **Lines Changed**: +{{LINES_ADDED}}/-{{LINES_DELETED}}
- **Files Modified**: {{FILES_MODIFIED}}

### Build & Testing
- **Build Status**: {{BUILD_STATUS}}
- **Test Runs**: {{TEST_RUNS}} ({{TEST_SUCCESS_RATE}}% success)
- **Performance Tests**: {{PERF_TESTS_RUN}} ({{PERF_IMPROVEMENT}})
- **Security Scans**: {{SECURITY_SCANS}} ({{SECURITY_ISSUES}} issues)

## Alerts Triggered Today
{{#ALERTS_TODAY}}
- **{{ALERT_TIME}}**: {{ALERT_TYPE}} - {{ALERT_DESCRIPTION}}
  - Severity: {{ALERT_SEVERITY}}
  - Response Time: {{RESPONSE_TIME}}
  - Resolution Status: {{RESOLUTION_STATUS}}
{{/ALERTS_TODAY}}

## Notes & Observations

### What Went Well ✅
{{#WENT_WELL}}
- {{POSITIVE_ITEM}}
{{/WENT_WELL}}

### Challenges Faced ⚠️
{{#CHALLENGES}}
- {{CHALLENGE_ITEM}}
{{/CHALLENGES}}

### Lessons Learned 📚
{{#LESSONS}}
- {{LESSON_ITEM}}
{{/LESSONS}}

### Process Improvements 🔧
{{#IMPROVEMENTS}}
- {{IMPROVEMENT_ITEM}}
{{/IMPROVEMENTS}}

---

**Report Generated**: {{GENERATION_TIME}}  
**Next Report**: {{NEXT_REPORT_TIME}}  
**Escalations Required**: {{ESCALATIONS_COUNT}}  
**Overall Health**: {{OVERALL_HEALTH_STATUS}}

**Action Items for Tomorrow**:
{{#ACTION_ITEMS}}
- [ ] {{ACTION_ITEM}} - {{ACTION_OWNER}} - {{ACTION_DEADLINE}}
{{/ACTION_ITEMS}}

---
*Automated report generated by MCP Roots tracking system*  
*Manual updates: {{MANUAL_UPDATES_SECTION}}*