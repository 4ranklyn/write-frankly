---
name: security-constitution
description: Enterprise-grade zero-trust directives and Firestore isolation rules
---
# Directives
1. Never emit client-side Gemini or Google Maps API keys.
2. All Firestore operations must use `/users/{uid}/journals/{id}` paths.
3. Every API route must execute `adminAuth.verifyIdToken(token)` before downstream execution.

## Architectural Guidelines

### 1. Zero Client-Side Secret Emission
- **Environment Separation**: API keys for external intelligence and cloud services (`GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `FIREBASE_ADMIN_PRIVATE_KEY`) must strictly reside in server-only environment configurations.
- **No `NEXT_PUBLIC_` for Sensitive APIs**: Never prefix secret keys with `NEXT_PUBLIC_`.
- **Server Route Proxying**: All interactions requiring private credentials must flow through Next.js server route handlers (e.g., `/api/gemini/*`, `/api/maps/*`).

### 2. Strict Tenant Path Isolation
- **Path Conformance**: All Firestore read, write, update, and delete operations must follow the tenant-scoped hierarchy:
  - Document path: `/users/{uid}/journals/{id}` (and `/users/{uid}/entries/{id}`)
- **Security Rules Alignment**: Firestore security rules must match `/databases/{database}/documents/users/{userId}/...` and assert `request.auth != null && request.auth.uid == userId`.
- **Zero Cross-Tenant Leakage**: No queries may target root collections or execute cross-user collection-group queries without explicit tenancy boundary checks.

### 3. Mandatory Auth Token Verification
- **Header Inspection**: Every protected API route must inspect the `Authorization: Bearer <ID_TOKEN>` header.
- **Admin SDK Validation**: Verify the token with Firebase Admin SDK (`adminAuth.verifyIdToken(token)`) before executing any downstream business logic or database interaction.
- **Strict Error Handlers**: Return `401 Unauthorized` for missing/malformed tokens and `403 Forbidden` for tenant mismatch or expired sessions.
