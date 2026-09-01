---
name: apple-hig
description: Apple Human Interface Guidelines (HIG) principles and design system directives
---
# Apple Human Interface Guidelines (HIG) Directives

This skill enforces Apple Human Interface Guidelines (HIG) principles across visual design, typography, layout, interaction design, motion, and accessibility.

## Core Design Principles

### 1. Clarity
- **Text Legibility**: Use clean typography scales with high contrast and proper leading. Ensure hierarchy with title, headline, body, callout, and caption text.
- **Iconography**: Employ simple, recognizable SF-style glyphs and Lucide icons that convey clear semantic meaning.
- **Uncluttered Views**: Prioritize primary user tasks, utilize whitespace deliberately, and avoid dense visual distractions.

### 2. Deference
- **Content-First Focus**: The interface fluidly supports and recedes behind the user's personal reflections and thoughts.
- **Subtle Chrome**: Use minimalist navigation bars, subtle translucent materials (`backdrop-blur-md`), and understated borders.
- **Color with Purpose**: Use tint and accent colors sparingly to indicate interactivity, selection, or emotional resonance without overwhelming content.

### 3. Depth & Spatial Hierarchy
- **Layering & Elevation**: Establish visual hierarchy using soft ambient shadows, distinct background elevation layers, and subtle borders (`border-border/40`).
- **Translucency & Materials**: Use blurred acrylic/glassmorphic backgrounds for overlays, sidebars, and modals to maintain contextual spatial awareness.

## UI & Component Standards

- **Corner Radii**: Apply Apple continuous curvature aesthetics (e.g. `rounded-2xl` for cards, `rounded-full` for badges and pills, `rounded-xl` for interactive elements).
- **Touch & Click Targets**: Ensure interactive targets meet the minimum 44x44 pt touch target guideline.
- **Dark Mode Fidelity**: Provide true adaptive dark mode with OLED-friendly deep surfaces and accessible contrast ratios.
- **Fluid Motion**: Use physics-based spring animations with natural easing curves (`motion/react`) for page transitions, drawer expansions, and button feedback.
