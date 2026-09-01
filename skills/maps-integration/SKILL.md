---
name: maps-integration
description: Directives for zero-trust Google Maps reverse-geocoding proxy and location metadata
---
# Directives & Constraints
1. Zero Client Key Exposure: Never expose `GOOGLE_MAPS_API_KEY` on the client. All coordinate lookups must go through `/api/location/geocode`.
2. Auth Gate: The geocode proxy MUST verify the Firebase ID token in the `Authorization: Bearer <token>` header before dispatching requests upstream.
3. Data Minimization: Only store high-level locality strings (e.g., "Tangerang, Banten" or "Central Jakarta") rather than raw precision coordinates in long-term Firestore logs.
4. Graceful Fallback: If location permission is denied by the browser, degrade gracefully without interrupting the journaling flow.
