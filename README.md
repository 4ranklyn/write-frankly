# WriteFrankly — Private Journaling Companion

WriteFrankly is a private, unvarnished journaling companion for thinking out loud without performance, filtering, or fear of consequence. Built on Next.js 15, Cloud Firestore, and Gemini 3.8 Flash API with optimized low-latency thinking levels, it provides a grounded, secure space where users can write journal entries, cut through rationalizations, and gain unvarnished clarity.

---

## 🛡️ Architecture & Security Model

WriteFrankly is built around a **3-Tier Privacy & Security Architecture**:

1. **Backend Transit & Ephemeral Processing (Data Masking)**:
   - The Cloud Run service acts strictly as a stateless transit and sanitization layer.
   - Text is sanitized in RAM (redacting emails, phone numbers, SSNs, credit cards, and bearer tokens) before reaching Google's AI servers.
   - Strictly metadata-only console logging (`[INFO] Processing journal AI analysis | Mode: ... | MessagesCount: ...`) — never logging user journal payloads or text.
2. **Secret Manager Lockdown**:
   - `GEMINI_API_KEY` is never stored in `.env` files or plaintext variables; mounted directly from Google Cloud Secret Manager at container runtime.
3. **Client-Side Web Crypto Encryption at Rest**:
   - Journal text can be encrypted directly in the browser via standard Web Crypto API (`crypto.subtle` AES-GCM 256-bit with PBKDF2 key derivation) before persisting to Firestore.
   - Owner-bound Firestore security rules (`request.auth.uid == userId`) guarantee multi-tenant document isolation.

---

## 1. Backend Code: Data Masking & Ephemeral Processing

The backend routes (`/app/api/gemini/reflect/route.ts`) implement in-RAM PII masking and ephemeral memory handling:

```typescript
import { scrubPII } from '@/lib/sanitizer';

// 1. Mask sensitive data in RAM before AI processing
const safeText = scrubPII(journalEntry);

// 2. Log metadata ONLY. Never the payload
console.log(`[INFO] Processing journal request | User: ${userId} | Mode: ${mode}`);

// 3. Generate response with resilient model fallback
// Plaintext & masked buffers are discarded from RAM once the response is sent
```

---

## ⚡ Resolving "Precondition check failed" & GCP Prerequisites

If your deployment fails with **`Precondition check failed`** (HTTP 400 / gRPC code 9 `FAILED_PRECONDITION`), one or more of Google Cloud's deployment prerequisites have not been satisfied in your Google Cloud Project:

### 1. Enable Mandatory Google Cloud APIs
Cloud Run builds and deployments require Cloud Build, Artifact Registry, and Cloud Run APIs:
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com
```

### 2. Verify Active Billing Account
Cloud Run and Cloud Build require a linked, active billing account. In Google Cloud Console:
1. Navigate to **Billing** -> **Account Management**.
2. Ensure your active project is linked to a valid billing account.

### 3. Regional Quota Considerations
If building in `asia-southeast1` fails due to regional compute quota restrictions (`due to quota restrictions, cannot run builds in this region`), specify an alternate region such as `us-central1` or `europe-west1`:
```bash
gcloud config set run/region us-central1
```

### 4. Service Account IAM Permissions
Grant the Cloud Build service account and the Compute Engine default service account the necessary roles:
```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')

# Grant Cloud Run Admin & Service Account User to Cloud Build
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud iam service-accounts add-iam-policy-binding \
  ${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

---

## 2. Lock Down the API Key (Google Cloud Secret Manager)

Do not put `GEMINI_API_KEY` in your `.env` file or plaintext Cloud Run variables.

### Secret Manager Bindings:
```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Deploy the Revision with the Secret:
```bash
gcloud run deploy write-frankly \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --memory 512Mi \
  --port 3000
```

### 🏷️ Campaign Verification Labeling:
```bash
gcloud run services update <SERVICE_NAME> \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=<REGION>
```

---

## 3. Client-Side Implementation: Web Crypto Encryption at Rest

To ensure end-to-end zero knowledge at rest:
1. **User writes journal**: Plaintext exists in the local React component state.
2. **Send to AI**: Dispatches an HTTPS POST to the Cloud Run endpoint (TLS encrypts in transit, backend masks in RAM).
3. **Save to DB**: Before writing to Firestore, use the Web Crypto API (`lib/crypto.ts`) to encrypt the journal text with AES-GCM 256-bit.
4. **Push to Firestore**: Store the ciphertext blob in the user's isolated partition.

### Client-Side Encryption Utilities (`lib/crypto.ts`):
```typescript
import { deriveKeyFromPassphrase, encryptText, decryptText } from '@/lib/crypto';

// Derive AES-GCM 256-bit key from passphrase / session key
const key = await deriveKeyFromPassphrase(userPassphrase, salt);

// Encrypt payload before Firestore write
const encrypted = await encryptText(plainTextEntry, key);
// Result: { ciphertext: "...", iv: "...", version: "v1-aes-gcm" }

// Decrypt upon loading from Firestore
const decrypted = await decryptText(encrypted.ciphertext, encrypted.iv, key);
```

---

## 🔥 Firestore Security Rules Configuration

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Deploy using Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 🧪 Functional Walkthrough & Test Suite

Run the automated test suites:
```bash
npm test
```

| Test Case | Flow / Interaction | Expected Outcome |
| :--- | :--- | :--- |
| **TC-01** | Landing Page Unauthenticated State | Displays hero screen with Google Sign-In button; private dashboard is protected. |
| **TC-02** | Google Sign-In Authentication | Clicking "Continue with Google" triggers Firebase popup and transitions to Dashboard. |
| **TC-03** | Create New Entry | Clicking "+ New Entry" adds a fresh document in Firestore under `/users/{uid}/entries/{id}`. |
| **TC-04** | Title & Mood Editing | Changing title or mood dropdown immediately syncs to Firestore with undefined-sanitized payload. |
| **TC-05** | Multi-Turn Journal Dialogue | Sending a prompt sends the thread context to Gemini API route and persists dialogue to Firestore. |
| **TC-06** | Quick AI Actions (Challenge Assumption, Cut to the Point, etc.) | Clicking quick action chips triggers specialized system directives. |
| **TC-07** | Search & Filter History | Typing query or selecting mood filter in the sidebar filters user entries in real-time. |
| **TC-08** | Export Journal | Clicking "Export" downloads a clean formatted Markdown file of the session dialogue. |
| **TC-09** | Client-Side Web Crypto AES-GCM | Encrypts and decrypts payloads in-browser with zero plaintext database exposure. |
| **TC-10** | Sign Out | Clicking Sign Out terminates session and securely returns to Landing Page. |

