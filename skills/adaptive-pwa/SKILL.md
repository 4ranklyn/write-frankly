---
name: adaptive-pwa
description: Explicit architectural instructions for viewport-specific ergonomics, separating mobile thumb-driven flows from multi-pane desktop layouts.
---
# Adaptive PWA & Dual-Mode Ergonomics Skill

## Purpose
Direct AI agents and developers to build responsive, standalone-capable Progressive Web Apps that adapt fundamentally between mobile thumb ergonomics and desktop windowed productivity, avoiding scaled-down desktop interfaces on phones or stretched phone layouts on desktop monitors.

---

## 1. Dual-Mode Viewport Architecture

### A. Phone / Small Touch Screens (`< 768px`)
* **Single-Focus Canvas:** Never display sidebars and active editors simultaneously. Use full-width views with slide or push transitions.
* **Thumb-Zone Optimization:** Place primary interactive triggers (save, debrief, prompt selectors) within the bottom 40% of the screen. Top bars are strictly for navigation back and passive title/status display.
* **Overlay Ergonomics:** Use bottom sheets (`drawer`) instead of centered floating dialogs or popovers for menus, options, and tone selectors.
* **Dynamic Viewport Height:** Use `100dvh` (or `h-[100dvh]`) instead of `100vh` to prevent content, input fields, and sticky toolbars from being hidden behind the mobile browser navigation bar or virtual keyboard.

### B. Desktop / Standalone Tablet (`>= 1024px`)
* **Master-Detail Layout (2 or 3 Columns):**
  * **Left Column (260px–320px):** Persistent reflection history, search input, tag filters, and account controls.
  * **Center Canvas (Flexible, max-w-3xl):** Writing canvas and main reflection editor.
  * **Right Rail or Inspector (Optional, 280px–320px):** Tone selector, AI debrief output stream, metadata, and export actions.
* **Window Controls Overlay (WCO) Support:**
  * Support desktop PWA windowed mode. Mark draggable titlebar regions using `-webkit-app-region: drag` while buttons, inputs, and controls use `-webkit-app-region: no-drag`.
  * Avoid placing static non-interactive content underneath platform window minimize/maximize/close buttons by respecting `env(titlebar-area-x)` and `env(titlebar-area-width)`.

---

## 2. Touch, Hardware & Input Hygiene

### Mobile Web App Mechanics
* **Safe Area Padding:** Always include Apple safe area variables for notch and home indicator clearance:
  ```css
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 16px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
  ```
* **Scroll & Bounce Containment:** Apply `overscroll-behavior-y: contain` to modal drawers, message streams, and scrollable panels to prevent pull-to-refresh collision or full-page rubber-banding.
* **Touch Target Sizing:** Minimum 44×44px interactive tap area on touch screens.
* **Tap Artifact Removal:** Suppress blue flash tap overlays on mobile webkit:
  ```css
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  ```

### Desktop Pointer & Keyboard Accelerators
* **Hover State Isolation:** Enforce hover styling only on pointer-capable devices:
  ```css
  @media (hover: hover) and (pointer: fine) {
    /* Hover-specific state styling */
  }
  ```
* **Mandatory Keyboard Shortcuts:**
  * `Mod + Enter` (`Cmd + Enter` / `Ctrl + Enter`): Finish reflection / save entry.
  * `Mod + S`: Manual trigger save/sync.
  * `Mod + K`: Open reflection search / switcher.
  * `Escape`: Close open drawers, modals, or overflow sheets.

---

## 3. PWA Lifecycle & Installation UX

### Platform-Aware Install Prompts:
* **Desktop:** Subtle install button inside the top app header or URL bar companion.
* **Mobile:** Non-blocking banner or inline setting item. Do NOT pop full-screen modal prompts on first page load.

### Connectivity & Offline Awareness:
* Provide a passive status indicator (Offline Mode / Synced) in the app bar when disconnected.
* Never block UI interactions or form typing due to offline state. Store inputs optimistically in local IndexedDB or cache first.

---

## 4. Verification Checklist
- [ ] Mobile view uses bottom sheets for secondary actions; desktop view uses popovers, sidebars, or toolbars.
- [ ] No layout elements are hidden behind virtual keyboards or iOS home indicator bars.
- [ ] Primary mobile actions are accessible using one-handed thumb interaction.
- [ ] Desktop viewport automatically expands into an organized multi-pane structure without excessive white gutters.
- [ ] Keyboard shortcuts work on desktop (Mod + Enter, Escape).
