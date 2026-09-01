---
name: notification-dispatch
description: Directives for dispatching synthesized journal summaries to Telegram or Discord webhooks
---
# Directives & Constraints
1. Secret Isolation: Webhook URLs and Bot tokens must reside exclusively in server environment variables / Secret Manager. Never expose dispatch endpoints to unauthenticated clients.
2. Auth Boundary: All dispatch endpoints MUST verify the Firebase ID token in the `Authorization: Bearer <token>` header before triggering outbound requests.
3. Data Minimization & Privacy: Only dispatch high-level synthesized takeaways and mood metrics—never transmit raw, unscrubbed journal entries.
4. Non-Blocking Execution: External network failures from webhook providers must not fail the primary journal saving or reflection pipeline.
