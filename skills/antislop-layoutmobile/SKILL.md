---
name: antislop-layoutmobile
description: Eliminates visual bloat, viewport crowding, fake preview sandboxes, and low-contrast UI states on mobile and desktop.
---
# Anti-Slop Mobile & UI Layout Standard

## Purpose
Enforce strict mobile thumb-zone layout, anti-slop ergonomics, semantic iconography, and zero-crash payload resilience across mobile and desktop viewports.

---

## 1. Mobile Ergonomics & Top Bar Constraints (<768px)
* **App Bar Fixed Height:** Strictly capped at fixed 48px height (`h-12`) with safe-area support (`pt-[env(safe-area-inset-top)]`).
* **Header Layout (Single-Line, Zero Overflow):**
  * **Left:** Simple back navigation (`ArrowLeft`) returning directly to the journal reflections list.
  * **Center:** Truncated reflection title with inline micro-indicator (`Saved ✓` in emerald green or subtle sync pulse).
  * **Right:** Compact active tone badge + `MoreVertical` (`⋮`) icon button (minimum 44×44px touch target).
* **Eliminate Horizontal Toolbar Sprawl:** Never crowd mobile headers with secondary utility icons.
* **Native Slide-Up Bottom Sheet:** Move secondary tools (Copy text, Export/Download, Geotag, Delete) into a slide-up bottom sheet triggered by `⋮`.
* **Above-the-Fold Canvas Anchoring:** Set reflection container top padding to `pt-4` so prompt cards, starter chips, and primary writing inputs are immediately visible above the virtual fold within the first `100dvh`.
* **Scroll & Bounce Containment:** Apply `overscroll-behavior-y: contain` to prevent pull-to-refresh collisions and rubber-banding.

---

## 2. Desktop Ergonomics (>= 1024px)
* **Master-Detail 3-Column Layout:**
  * **Left Rail (280px):** `+ New Reflection` CTA, search input, tag filters, and scrollable history.
  * **Center Canvas (Flexible, max-w-3xl):** Distraction-free typography, title input, and bottom-docked action bar.
  * **Right Rail (300px):** Persistent tone selector, metadata summary, and live debrief stream.
* **Mandatory Keyboard Accelerators:**
  * `Mod + Enter` (`Cmd + Enter` / `Ctrl + Enter`): Save & Finish reflection.
  * `Mod + S`: Manual trigger save / sync.
  * `Mod + K`: Open reflection search / switcher.
  * `Escape`: Dismiss drawers, sheets, and modal dialogs.

---

## 3. Semantic Iconography & Clean Navigation
* **Reserve `Sparkles` (`✨`) strictly for generative AI triggers:** Specifically "Debrief with Frankly" and generative AI synthesis.
* **Eliminate `Sparkles` from non-generative elements:** Never use sparkles on archive hubs, past entry lists, workspace headers, or logos.
* **Use Semantic Icons:**
  * Past Entries / History / Archive: `BookOpen` or `Library` (Lucide React).
* **Explicit Semantic Naming:** Replace generic "Workspace" or "Check-in Hub" with **"My Reflections"** or **"Journal Entries"**.

---

## 4. Anti-Slop Dialogs & Direct Controls
* **Eliminate Fake Preview Sandboxes:** Remove simulated chat previews, mock conversation bubbles, and fake AI response delays from configuration dialogs.
* **Direct Segmented 3-Card Radio Selector:**
  1. **Warm Confidant:** "Offers supportive validation while gently helping you unpack heavy emotions."
  2. **Objective Challenger:** "Pokes at the edges of your assumptions and cuts through rationalizations."
  3. **Socratic Inquirer:** "Guides you through targeted questions to let you arrive at your own clarity."
* **Instant Application:** Tapping a card immediately commits the selection to `usePreferences` and closes the modal/sheet.
* **Active State Styling:** `ring-2 ring-primary bg-primary/5 dark:bg-primary/10` with a `CheckCircle2` badge.

---

## 5. High-Contrast Semantic Error Tokens & Tactile Recovery
* **Error Container:** `bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-lg p-3 flex items-center justify-between`.
* **Error Text:** `text-red-700 dark:text-red-300 text-sm font-medium`.
* **Error Icon:** Solid red `AlertCircle` (`text-red-600 dark:text-red-400`).
* **Tactile Retry Button:** `bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm active:scale-95`.
* **Pending Indicator:** Show spinning `Loader2` during retry attempts.
* **Copy Distinction:** Clearly state if data is cached: *"Cloud sync failed. Reflection saved locally on this device."*

---

## 6. Zero-Crash Payload Hygiene & Resilience
* **Strict Undefined-Stripping:** Apply `JSON.parse(JSON.stringify(payload))` prior to all database writes (Firestore `setDoc`/`updateDoc`).
* **Literal String Union Validation:** Enforce `'warm-confidant' | 'objective-challenger' | 'socratic-inquirer'` on all tone inputs.
* **Streaming Resilience:** 15s timeout with `AbortController`; flush partial buffers gracefully to local client state on drop.
* **Mask Error Codes:** Present deterministic user-facing messages and offline fallbacks.
