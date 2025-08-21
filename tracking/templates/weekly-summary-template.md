# Weekly Executive Summary - MCP Roots
**Week of**: {{WEEK_START}} - {{WEEK_END}}  
**Sprint**: {{SPRINT_NAME}}  
**Report Date**: {{REPORT_DATE}}

## Executive Overview

### Project Status: {{PROJECT_STATUS_ICON}} {{PROJECT_STATUS}}

{{EXECUTIVE_SUMMARY_PARAGRAPH}}

**Key Achievements This Week**:
{{#KEY_ACHIEVEMENTS}}
- {{ACHIEVEMENT}}
{{/KEY_ACHIEVEMENTS}}

**Critical Issues**:
{{#CRITICAL_ISSUES}}
- {{ISSUE}} ({{SEVERITY}})
{{/CRITICAL_ISSUES}}

## Weekly Metrics Summary

### Progress Performance
| Metric | This Week | Target | Last Week | Trend | Status |
|--------|-----------|--------|-----------|-------|--------|
| Story Points Delivered | {{SP_DELIVERED}} | {{SP_TARGET}} | {{SP_LAST_WEEK}} | {{SP_TREND}} | {{SP_STATUS}} |
| Tasks Completed | {{TASKS_COMPLETED}} | {{TASKS_TARGET}} | {{TASKS_LAST_WEEK}} | {{TASKS_TREND}} | {{TASKS_STATUS}} |
| Sprint Velocity | {{VELOCITY_CURRENT}} | {{VELOCITY_TARGET}} | {{VELOCITY_LAST}} | {{VELOCITY_TREND}} | {{VELOCITY_STATUS}} |
| Milestone Progress | {{MILESTONE_PROGRESS}}% | {{MILESTONE_TARGET}}% | {{MILESTONE_LAST_WEEK}}% | {{MILESTONE_TREND}} | {{MILESTONE_STATUS}} |

### Quality Metrics  
| Metric | Current | Target | Last Week | Trend | Status |
|--------|---------|--------|-----------|-------|--------|
| Test Coverage | {{TEST_COVERAGE}}% | 90% | {{TEST_COVERAGE_LAST}}% | {{COVERAGE_TREND}} | {{COVERAGE_STATUS}} |
| Defect Rate | {{DEFECT_RATE}} | <5% | {{DEFECT_RATE_LAST}} | {{DEFECT_TREND}} | {{DEFECT_STATUS}} |
| Performance (QR Gen) | {{QR_PERF_AVG}}ms | <300ms | {{QR_PERF_LAST}}ms | {{PERF_TREND}} | {{PERF_STATUS}} |
| Code Review Coverage | {{REVIEW_COVERAGE}}% | 100% | {{REVIEW_COVERAGE_LAST}}% | {{REVIEW_TREND}} | {{REVIEW_STATUS}} |

### Risk Assessment
| Risk ID | Description | Current Level | Change | Mitigation Status |
|---------|-------------|---------------|---------|-------------------|
| {{#RISKS}}
| {{RISK_ID}} | {{RISK_DESC}} | {{RISK_LEVEL}} | {{RISK_CHANGE}} | {{MITIGATION_STATUS}} |
{{/RISKS}}

## Milestone Progress

### Current Milestone: {{CURRENT_MILESTONE_NAME}}
- **Target Date**: {{MILESTONE_TARGET_DATE}}
- **Progress**: {{MILESTONE_PROGRESS}}%
- **Status**: {{MILESTONE_STATUS}}
- **Days Remaining**: {{DAYS_REMAINING}}
- **Buffer Status**: {{BUFFER_STATUS}}

**Critical Path Items**:
{{#CRITICAL_PATH_ITEMS}}
- {{ITEM_NAME}} - {{ITEM_STATUS}} - {{ITEM_OWNER}}
{{/CRITICAL_PATH_ITEMS}}

**Completion Forecast**: {{COMPLETION_FORECAST}}

### Upcoming Milestone: {{NEXT_MILESTONE_NAME}}
- **Target Date**: {{NEXT_MILESTONE_DATE}}
- **Readiness**: {{NEXT_MILESTONE_READINESS}}%
- **Preparation Status**: {{NEXT_MILESTONE_PREP_STATUS}}

## Team Performance Analysis

### Velocity Trends
- **4-Week Average**: {{VELOCITY_4WEEK_AVG}} pts/week
- **Current Week**: {{VELOCITY_CURRENT}} pts/week
- **Variance**: {{VELOCITY_VARIANCE}}%
- **Predictability**: {{VELOCITY_PREDICTABILITY}}

### Team Utilization
{{#TEAM_UTILIZATION}}
- **{{MEMBER_NAME}}** ({{ROLE}}): {{UTILIZATION}}% - {{FOCUS_AREA}}
{{/TEAM_UTILIZATION}}

### Productivity Indicators
- **Cycle Time**: {{CYCLE_TIME_AVG}} días (Target: 2 días)
- **Lead Time**: {{LEAD_TIME_AVG}} días (Target: 3 días)  
- **Rework Rate**: {{REWORK_RATE}}% (Target: <10%)
- **Blocked Time**: {{BLOCKED_TIME_PCT}}% (Target: <5%)

## Technical Progress

### Development Metrics
- **Code Commits**: {{COMMITS_WEEK}} ({{COMMITS_TREND}})
- **Pull Requests**: {{PRS_MERGED}} merged, {{PRS_PENDING}} pending
- **Lines of Code**: +{{LOC_ADDED}}/-{{LOC_DELETED}} net: {{LOC_NET}}
- **Files Modified**: {{FILES_MODIFIED}} across {{MODULES_TOUCHED}} modules

### Quality Indicators
- **Build Success Rate**: {{BUILD_SUCCESS_RATE}}%
- **Test Automation**: {{TEST_AUTOMATION_PCT}}% coverage
- **Security Scans**: {{SECURITY_SCANS_RUN}} ({{SECURITY_ISSUES_FOUND}} issues)
- **Performance Benchmarks**: {{BENCHMARK_RUNS}} runs, {{PERFORMANCE_REGRESSIONS}} regressions

### Integration Status
- **MCP Protocol Compatibility**: {{MCP_COMPATIBILITY_STATUS}}
- **Claude Desktop Integration**: {{CLAUDE_DESKTOP_STATUS}}
- **LocalQRManager Integration**: {{LOCAL_QR_STATUS}}
- **Security Validation**: {{SECURITY_VALIDATION_STATUS}}

## Risk Management

### Risks Materialized This Week
{{#MATERIALIZED_RISKS_WEEK}}
- **{{RISK_ID}}**: {{RISK_NAME}}
  - **Impact**: {{ACTUAL_IMPACT}}
  - **Response**: {{RESPONSE_ACTIONS}}
  - **Status**: {{RESOLUTION_STATUS}}
  - **Buffer Consumed**: {{BUFFER_CONSUMED}} días
{{/MATERIALIZED_RISKS_WEEK}}

### New Risks Identified
{{#NEW_RISKS_WEEK}}
- **{{RISK_ID}}**: {{RISK_NAME}}
  - **Probability**: {{RISK_PROBABILITY}}
  - **Impact**: {{RISK_IMPACT}}
  - **Mitigation Plan**: {{MITIGATION_PLAN}}
  - **Owner**: {{RISK_OWNER}}
{{/NEW_RISKS_WEEK}}

### Risk Trend Analysis
- **Total Active Risks**: {{ACTIVE_RISKS_COUNT}}
- **High Priority Risks**: {{HIGH_PRIORITY_RISKS}}
- **Risk Velocity**: {{RISK_VELOCITY}} (new risks/week)
- **Mitigation Effectiveness**: {{MITIGATION_EFFECTIVENESS}}%

## Budget & Resource Status

### Sprint Budget
- **Planned Effort**: {{PLANNED_EFFORT}} person-hours
- **Actual Effort**: {{ACTUAL_EFFORT}} person-hours
- **Variance**: {{EFFORT_VARIANCE}}%
- **Burn Rate**: {{BURN_RATE}} hours/day

### Resource Allocation
{{#RESOURCE_ALLOCATION}}
- **{{ROLE}}**: {{ALLOCATED_HOURS}}h planned, {{ACTUAL_HOURS}}h actual ({{UTILIZATION}}%)
{{/RESOURCE_ALLOCATION}}

## Stakeholder Communications

### Stakeholder Feedback
{{#STAKEHOLDER_FEEDBACK}}
- **{{STAKEHOLDER_NAME}}**: {{FEEDBACK_SUMMARY}} ({{SATISFACTION_LEVEL}})
{{/STAKEHOLDER_FEEDBACK}}

### Communication Highlights
{{#COMMUNICATION_HIGHLIGHTS}}
- {{HIGHLIGHT_ITEM}}
{{/COMMUNICATION_HIGHLIGHTS}}

## Next Week's Focus

### Priorities
1. **{{PRIORITY_1}}** - {{PRIORITY_1_DESC}}
2. **{{PRIORITY_2}}** - {{PRIORITY_2_DESC}}  
3. **{{PRIORITY_3}}** - {{PRIORITY_3_DESC}}

### Planned Deliverables
{{#PLANNED_DELIVERABLES}}
- **{{DELIVERABLE_NAME}}**: {{DELIVERABLE_DESC}} ({{DELIVERABLE_OWNER}})
  - Target: {{DELIVERABLE_TARGET}}
  - Dependencies: {{DELIVERABLE_DEPENDENCIES}}
{{/PLANNED_DELIVERABLES}}

### Critical Dependencies
{{#CRITICAL_DEPENDENCIES}}
- **{{DEPENDENCY_NAME}}**: {{DEPENDENCY_DESC}}
  - Expected: {{DEPENDENCY_ETA}}
  - Risk Level: {{DEPENDENCY_RISK}}
{{/CRITICAL_DEPENDENCIES}}

## Recommendations & Actions

### Immediate Actions Required
{{#IMMEDIATE_ACTIONS}}
- [ ] **{{ACTION_ITEM}}** - {{ACTION_OWNER}} - Due: {{ACTION_DUE_DATE}}
{{/IMMEDIATE_ACTIONS}}

### Process Improvements
{{#PROCESS_IMPROVEMENTS}}
- {{IMPROVEMENT_ITEM}} - {{IMPROVEMENT_IMPACT}}
{{/PROCESS_IMPROVEMENTS}}

### Resource Needs
{{#RESOURCE_NEEDS}}
- {{RESOURCE_NEED}} - {{NEED_JUSTIFICATION}} - {{NEED_TIMELINE}}
{{/RESOURCE_NEEDS}}

## Forecast & Timeline

### Milestone Forecast
- **{{CURRENT_MILESTONE}}**: {{CURRENT_MILESTONE_FORECAST}} ({{CONFIDENCE_LEVEL}}% confidence)
- **{{NEXT_MILESTONE}}**: {{NEXT_MILESTONE_FORECAST}} ({{NEXT_CONFIDENCE_LEVEL}}% confidence)
- **Project Completion**: {{PROJECT_COMPLETION_FORECAST}}

### Risk to Timeline
- **High Risk**: {{HIGH_RISK_ITEMS_COUNT}} items
- **Medium Risk**: {{MEDIUM_RISK_ITEMS_COUNT}} items
- **Buffer Remaining**: {{TOTAL_BUFFER_REMAINING}} días

### Scenario Planning
- **Best Case**: {{BEST_CASE_COMPLETION}}
- **Most Likely**: {{MOST_LIKELY_COMPLETION}}
- **Worst Case**: {{WORST_CASE_COMPLETION}}

---

## Summary & Decision Points

### Key Decisions Needed
{{#DECISIONS_NEEDED}}
- **{{DECISION_ITEM}}** - {{DECISION_TIMELINE}} - {{DECISION_OWNER}}
{{/DECISIONS_NEEDED}}

### Executive Actions Required
{{#EXECUTIVE_ACTIONS}}
- {{EXECUTIVE_ACTION}} - {{ACTION_URGENCY}}
{{/EXECUTIVE_ACTIONS}}

### Success Metrics Achievement
- **Overall Progress**: {{OVERALL_PROGRESS_SCORE}}/10
- **Quality Score**: {{QUALITY_SCORE}}/10  
- **Risk Management**: {{RISK_MGMT_SCORE}}/10
- **Team Performance**: {{TEAM_PERF_SCORE}}/10

---

**Report Prepared By**: {{REPORT_AUTHOR}}  
**Review Date**: {{REVIEW_DATE}}  
**Next Review**: {{NEXT_REVIEW_DATE}}  
**Escalation Status**: {{ESCALATION_STATUS}}

**Appendix**: Detailed metrics available in `tracking/daily-reports/` and dashboard

---
*Executive Summary - Confidential*