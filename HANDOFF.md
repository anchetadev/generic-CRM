# Agent Handoffs

## Active Handoffs
<!-- Agents: check this section on every wake. If any row has your name in the "To" column and Status = pending, process it first. -->

| ID | From | To | Task | Status | Context | Blocked reason | Created | Updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 22 | midori | brigid | Implement lead source taxonomy (Cristian's feature request) | done | Replace Channel field with Lead Source (Referral/Inbound/Outbound). Merge Signal Source + Source into Lead Source Detail dropdown (WARN Trigger, LinkedIn ICP Match, Referral Introduction, Word of Mouth, Silent Referral, Event, Website/Content, Other). Auto-populate where possible. Retroactively tag existing leads. Cristian proposed, Angel approved 2026-07-17. PR #6 opened. | | 2026-07-17T16:52:00Z | 2026-07-17T17:05:00Z |
| 21 | athena | phoebe | Execute test plan for PR #6 | blocked | Athena reviewed PR #6 (Coaching-Season-CRM follow-up task sync). Verdict: approve with one blocking concern. Trigger does NOT update assigned_to when lead owner changes without next_follow_up_at changing. 3 non-blocking issues (title discriminator fragility, dead code startOfYesterday, userOverdueCount capped at 20). Test plan has 10 flows + regression checks. Needs migration applied before testing. | Repo mismatch: local repo is generic-CRM, not Coaching-Season-CRM. No PR #6 exists in git history. No follow-up task sync trigger feature found in codebase. Cannot locate code to test. | 2026-07-15T19:47:00Z | 2026-07-16T01:35:00Z |

## Completed Handoffs
<!-- Move entries here after processing. Keep indefinitely. -->

| ID | From | To | Task | Status | Context | Blocked reason | Created | Updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20 | midori | brigid | Port cadence dashboard fix to Coaching-Season-CRM | done | Brigid ported the fix to Coaching-Season-CRM as PR #6. Athena reviewed: approve with one blocking concern (trigger doesn't update assigned_to on owner change without follow-up date change). 3 non-blocking issues noted. Review posted as PR comment. Test plan generated for Phoebe (10 flows + regression). | | 2026-07-15T19:39:00Z | 2026-07-15T19:47:00Z |
| 17 | midori | brigid | Investigate CRM cadence dashboard bug — due/overdue showing 0 | done | Root cause: Lead and Contact are disconnected data silos. | | 2026-07-15T15:51:00Z | 2026-07-15T16:38:00Z |
| 18 | midori | brigid | Fix CRM cadence dashboard: bridge leads + stats + deploy | done | Was merged to WRONG repo (generic-CRM). Needs porting to Coaching-Season-CRM. | | 2026-07-15T16:40:00Z | 2026-07-15T18:57:00Z |
| 19 | midori | brigid | Fix 3 non-blocking issues from Athena's PR #5 review | done | Merged to wrong repo. | | 2026-07-15T19:00:00Z | 2026-07-15T19:26:00Z |
