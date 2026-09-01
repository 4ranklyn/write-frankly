# WriteFrankly — Private Journaling Companion

WriteFrankly is a private, unvarnished journaling companion for thinking out loud without performance, filtering, or fear of consequence. Built on Next.js 15, Cloud Firestore, and Gemini 3.7 Flash API, it provides a grounded, secure space where users can write journal entries, cut through rationalizations, and gain unvarnished clarity.

---

## 🛡️ Architecture & Security Model

- **Authentication**: Firebase Authentication with Federated Google Sign-In (no passwords stored in application state).
- **Database Isolation**: Cloud Firestore with strict owner-bound security rules (`request.auth.uid == userId`), preventing cross-user data leakage.
- **AI Processing Engine**: Gemini 3.7 Flash via secure server-side Next.js API routes with automated fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`).
- **Zero-Crash Undefined Stripping**: Strict sanitization of all database payloads prior to Firestore ingestion.

---

## 📋 Prerequisites & Local Configuration

1. **Node.js**: 20+ installed.
2. **Google Cloud SDK (`gcloud` CLI)**: Installed and authenticated (`gcloud auth login`).
3. **Firebase Tools CLI**: `npm install -g firebase-tools`.

### Environment Variables

Configure your `.env.local` or environment variables:

```bash
# Gemini API Key (accessed server-side only)
GEMINI_API_KEY="AIzaSy..."

# Host URL
APP_URL="https://your-app-service.run.app"
```

---

## 🔒 Secret Management Setup (Google Cloud Secret Manager)

To manage credentials securely without hardcoding:

```bash
# Set your Google Cloud project
gcloud config set project YOUR_PROJECT_ID

# Create the Secret Manager secret for GEMINI_API_KEY
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Populate the secret value
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the Cloud Run runtime service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🔥 Firestore Security Rules Configuration

Deploy the owner-bound security rules to ensure zero cross-user access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
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

## 🚀 Google Cloud Run Deployment

Deploy the containerized service directly to Cloud Run:

```bash
# Deploy application container
gcloud run deploy reflect-ai \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --port 3000
```

### 🏷️ Campaign Verification Labeling

Apply the mandatory verification label to register the service:

```bash
gcloud run services update reflect-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-southeast1
```

---

## 🧪 Functional Walkthrough & Test Suite

| Test Case | Flow / Interaction | Expected Outcome |
| :--- | :--- | :--- |
| **TC-01** | Landing Page Unauthenticated State | User sees hero screen with Google Sign-In button; private dashboard is protected. |
| **TC-02** | Google Sign-In Authentication | Clicking "Continue with Google" triggers Firebase popup, establishes session, and transitions to Dashboard. |
| **TC-03** | Create New Reflection | Clicking "+ New Reflection" adds a fresh document in Firestore under `/users/{uid}/entries/{id}` with default metadata. |
| **TC-04** | Title & Mood Editing | Changing title or mood dropdown immediately syncs to Firestore with undefined-sanitized payload. |
| **TC-05** | Multi-Turn Reflection Dialogue | Sending a prompt sends the thread context to Gemini API route and persists both user input and AI response to Firestore. |
| **TC-06** | Quick AI Actions (Summary, Next Steps, Reframe) | Clicking quick action chips triggers specialized system directives and appends structured response. |
| **TC-07** | Search & Filter History | Typing query or selecting mood filter in the sidebar filters user entries in real-time. |
| **TC-08** | Export Reflection | Clicking "Export" downloads a clean formatted Markdown file of the session dialogue. |
| **TC-09** | Delete Entry | Clicking delete and confirming removes the document from Firestore and clears the active workspace. |
| **TC-10** | Sign Out | Clicking Sign Out terminates session and securely returns to Landing Page. |
