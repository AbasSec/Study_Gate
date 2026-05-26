---
name: Horizons Design System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#00201d'
  on-tertiary-container: '#0c9488'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  status-pill:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  gutter-desktop: 24px
  margin-desktop: 64px
  gutter-mobile: 16px
  margin-mobile: 20px
  section-gap: 120px
---

## Brand & Style
The design system is engineered for a premium international educational agency, balancing the authority of a global institution with the approachability of a personalized mentorship service. The aesthetic is **Corporate Modern** with a refined **Glassmorphism** layer for overlays and interactive states.

The visual narrative focuses on "clarity and progression." It utilizes generous whitespace, sophisticated geometric typography, and a technical-yet-warm color palette to evoke feelings of trust, ambition, and institutional reliability. High-contrast elements ensure the system feels high-end and modern, moving away from "stuffy" academic tropes toward a forward-thinking, tech-enabled educational future.

## Colors
The palette is rooted in **Deep Navy (#0F172A)** to establish a foundation of stability and professional excellence. **Emerald Green (#10B981)** and **Teal (#0D9488)** serve as accents, representing growth, vitality, and the "green light" for students' international journeys.

### Application
- **Primary:** Used for headers, primary actions, and brand-heavy backgrounds.
- **Secondary/Tertiary:** Used for success states, CTA highlights, and progress indicators.
- **Neutral:** A range of Slate grays (from #F8FAFC to #0F172A) provides the structural scaffolding for the UI.
- **Dark Mode:** Employs a high-contrast strategy. Surface colors use Deep Charcoal, while text remains crisp white or high-saturation teal to maintain legibility.

## Typography
**Plus Jakarta Sans** is the sole typeface, chosen for its modern, geometric structure and friendly apertures. 

### Global Rules
- **Tracking:** Headlines use tight tracking (-0.01em to -0.02em) for a premium, editorial look. Body text and labels use generous tracking (+0.01em to +0.05em) to enhance readability and professional air.
- **Language Support:** This design system is RTL-ready. For Arabic localization, the typeface remains consistent where possible, ensuring that line heights are increased by 15-20% to accommodate the script's ascenders and descenders without crowding.
- **Hierarchy:** Use font weight rather than size alone to distinguish levels. Labels should remain uppercase for secondary navigational elements.

## Layout & Spacing
The system utilizes a **12-column fluid grid** for desktop and a **4-column grid** for mobile. 

### Principles
- **Rhythmic Verticality:** All spacing is a multiple of 8px. Use 120px gaps between major landing page sections to reinforce the premium, high-end feel.
- **RTL Mirroring:** The layout must mirror horizontally for Arabic. Gutters and margins remain consistent, but the "reading gravity" shifts from right to left.
- **Containment:** Content containers should have a maximum width of 1440px to ensure line lengths remain readable on ultra-wide displays.

## Elevation & Depth
This design system uses a combination of **Tonal Layers** and **Glassmorphism** to establish hierarchy.

1.  **Level 0 (Base):** Solid surface color (White or Deep Navy).
2.  **Level 1 (Cards):** 1px thin border (#E2E8F0 in light mode / #1E293B in dark mode) with an extremely soft, diffused shadow (Blur: 32px, Opacity: 4%, Y: 8).
3.  **Level 2 (Overlays/Modals):** Glassmorphic surfaces with a `backdrop-filter: blur(12px)` and a semi-transparent white (or navy) fill at 70% opacity.
4.  **Interactive Depth:** On hover, cards should subtly lift using a slightly more pronounced shadow (Opacity: 8%) and a subtle scale increase (101%).

## Shapes
The shape language is defined by **significant rounding** to counter the corporate navy and create a welcoming, "approachable expert" vibe.

- **Standard Components:** 16px (1rem) corner radius.
- **Large Cards/Containers:** 24px (1.5rem) corner radius.
- **Status Pills:** Fully rounded (pill-shaped) to distinguish them from actionable buttons.
- **Input Fields:** 12px corner radius to maintain a slightly more structured look than buttons.

## Components

### Buttons
- **Primary:** Deep Navy background, white text, 16px radius.
- **Secondary:** Emerald Green background, navy text (high contrast), or ghost style with 1px Teal border.
- **State:** Subtle transform on hover (translate Y -2px).

### Status Pills
Refined indicators for the educational journey:
- **Applied:** Soft Blue background, Navy text.
- **Enrolled:** Emerald background (10% opacity), Emerald text.
- **Visa Stage:** Amber/Teal background (10% opacity), matched text.
- **Typography:** Use `status-pill` token (Semi-bold, 13px).

### Input Fields
- Thin 1px borders.
- Labels sit above the field in `label-md` style.
- Focus state: Border color shifts to Emerald Green with a 3px soft outer glow.

### Cards
- White background (Light) or Slate background (Dark).
- 16px padding minimum.
- Use of glassmorphism for header sections within cards for a premium feel.

### Icons
- 24px grid.
- 1.5pt stroke weight.
- Linear/Outline style exclusively. No filled icons except for active navigation states.