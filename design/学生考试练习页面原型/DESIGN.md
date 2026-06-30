---
name: Serene Study
colors:
  surface: '#f9f9ff'
  surface-dim: '#d8d9e5'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3fe'
  surface-container: '#ecedf9'
  surface-container-high: '#e6e8f3'
  surface-container-highest: '#e0e2ed'
  on-surface: '#181c23'
  on-surface-variant: '#414755'
  inverse-surface: '#2d3039'
  inverse-on-surface: '#eef0fc'
  outline: '#717786'
  outline-variant: '#c1c6d7'
  surface-tint: '#005bc1'
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0070eb'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#575f66'
  on-secondary: '#ffffff'
  secondary-container: '#dbe3eb'
  on-secondary-container: '#5d656c'
  tertiary: '#9e3d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c64f00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#dbe3eb'
  secondary-fixed-dim: '#bfc7cf'
  on-secondary-fixed: '#151d22'
  on-secondary-fixed-variant: '#40484e'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb595'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7c2e00'
  background: '#f9f9ff'
  on-background: '#181c23'
  surface-variant: '#e0e2ed'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  button-text:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 20px
  stack-gap: 16px
  section-margin: 32px
  max-width-desktop: 430px
---

## Brand & Style
The design system is centered on "Cognitive Ease"—a philosophy that prioritizes mental clarity and reduces exam-induced anxiety. The target audience consists of students preparing for high-stakes examinations who require a distraction-free environment that feels both academic and technologically advanced.

The visual style is a **Refined Glassmorphic** approach, heavily inspired by modern iOS aesthetics. It utilizes frosted glass effects to create a sense of depth without clutter. The interface should feel light, airy, and rhythmic, using generous whitespace to separate complex educational concepts. Every interaction is designed to be intentional and calming, fostering a "flow state" for the user.

## Colors
The palette is intentionally restrained to prevent cognitive overload. 

- **Primary Blue (#007AFF):** Reserved exclusively for primary actions, progress indicators, and active states. It provides a familiar, authoritative "iOS" signal.
- **Background (#F0F4F8):** A soft, cool-toned gray-blue that reduces eye strain during long study sessions.
- **Surfaces:** Pure white is used for high-level containers, while semi-transparent white (glass) is used for secondary content layers.
- **Subtle Glows:** Use ultra-soft radial gradients of the `accent_glow_hex` behind cards to create a sense of breathing space and gentle focus.

## Typography
This design system utilizes **Inter** to mimic the system-ui feel while providing better control over tabular numbers (essential for exam timers and scores). 

- **Scale:** High contrast between headlines and body text helps students quickly scan questions.
- **Letter Spacing:** Headlines use slight negative tracking to feel "tighter" and more modern, while labels use expanded tracking for legibility at small sizes.
- **Readability:** All body text maintains a minimum 1.4x line height to ensure long passages of text remain approachable.

## Layout & Spacing
The layout follows a **Mobile-First Fixed Grid**. On desktop environments, the interface is centered with a maximum width of 430px to maintain the intimacy and thumb-reachability of an iPhone.

- **Margins:** A consistent 20px side margin is applied to the main viewport.
- **Safe Areas:** Adhere strictly to iOS safe area insets for home indicators and notches.
- **Rhythm:** Use an 8px grid system. Most components should have 16px or 24px of internal padding to maintain the "airy" feel.

## Elevation & Depth
Depth is communicated through **Translucency and Soft Shadows** rather than stark borders.

- **Glassmorphism:** Navigation bars and floating action buttons use a `backdrop-filter: blur(20px)` with a 70% opaque white background.
- **Shadows:** Use "Ambient Shadows"—large blur radii (30px+) with very low opacity (5-8%) using a blue-tinted shadow color to match the background.
- **Stacking:** Cards appear to float 4px above the background. Active states for cards can "lift" to 8px with a slightly more pronounced shadow.

## Shapes
The shape language is ultra-rounded to feel friendly and non-threatening. 

- **Cards:** Use a minimum radius of 24px.
- **Buttons:** Large buttons use a pill-shape (fully rounded sides) to signify "Action."
- **Inputs:** Use a 16px radius to differentiate from the larger card containers.
- **Selection States:** Use a "Squircle" effect where possible to align with the iOS design language.

## Components
- **Action Buttons:** Minimum height of 56px for touch accessibility. Primary buttons use a solid blue background with white text. Secondary buttons use a glass background with blue text.
- **Exam Cards:** White backgrounds with a subtle 1px inner stroke of white at 50% opacity to define edges on the light gray background.
- **Selection Chips:** Used for multiple-choice answers. When selected, the border should animate to the primary blue with a 10% blue fill.
- **Progress Bars:** Thin (4px) or thick (12px) with rounded caps. Use a soft gray track and the primary blue for the fill.
- **Input Fields:** Large, clean fields with 16px horizontal padding. Focus states are indicated by a subtle outer glow rather than a heavy border.
- **Feedback Toasts:** Floating glass pills that appear at the top of the screen, utilizing blur to keep the background context visible.