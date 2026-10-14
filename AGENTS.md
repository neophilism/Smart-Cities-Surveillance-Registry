## Smart Cities Render service removal (2026-10-13)

The owner intentionally deleted **only** the `smart-cities-surveillance-registry` Render service and corresponding preview site to free a Render service slot. The source repository, original development plan and related upstream Civic Registry & Transparency Engine remain. The absence of the deployment is **intentional**, not an infrastructure incident requiring automatic recovery.

- **Keep developing.** Existing approved plans, dependency-first PR work, automated reviews, tests, CircleCI, and other existing repository workflows may continue normally; CI resources are explicitly authorized. Do not mark source milestones incomplete merely because their public preview is offline.
- **Do not automatically recreate the deleted Render service or its preview** or incur substitute hosting spend. Preserve `render.yaml`, Dockerfiles, migration instructions and other deployment settings for an owner-authorized rebuild at a later date.
- **Do not change or disable CI and existing scheduled source-refresh workflows solely because Render hosting is absent.** Treat source-refresh job status independently of whether a web preview exists; retain its established enablement, credentials and source-review gates.
- Treat the old Render URL as inactive; deployment readiness and live uptime are **not verified**. Do not turn the intentionally absent preview into repeated deployment-repair tasks or misleading Engine Room outage claims. When hosting is authorized again, verify the new instance and monitoring URL before treating it as live.
- The owner describes redeploying Smart Cities as lower priority; **this applies to hosting and use of Render slots, not a blanket freeze on development**. Preserve the canonical PR plan and existing work in `registry/`.

## Owner security-review policy — 2026-10-13

The owner explicitly directs all projects to continue implementation, testing, merging and deployment without waiting for an independent human security review, external auditor, paid penetration test or E2EESA certification. This supersedes older repository planning text that makes absence of such review an operational prerequisite.

- Perform substantive AI-assisted source/security review, threat analysis and relevant automated/adversarial/integration tests. Fix concrete findings and retain source-bound evidence.
- Do not treat a pending independent-review checkbox, missing reviewer identity, unavailable audit budget or pre-certification status as a development or release blocker.
- External expert review is deferred follow-up work. Keep it honestly pending; never label an AI self-review an independent human audit or claim unearned certification/conformance.
- Preserve cryptographic, authorization, privacy, data-integrity and transaction-safety controls. Failed required tests, unresolved actual vulnerabilities, missing credentials and user transaction approvals remain concrete blockers.
- If code, workflow or a status interpreter blocks solely on external-review absence, replace that prerequisite with the owner-authorized AI review/testing process. Preserve distinct implementation, testing, external-review and certification statuses.
- Continue dependency-ready work and chain PRs. Do not ask the owner again to waive the human-review prerequisite.

# Repository agent instructions
