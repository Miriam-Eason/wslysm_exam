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
  surface-tint: '#007AFF'
  success: '#34C759'
  on-success: '#ffffff'
  success-container: '#E8F8EE'
  warning: '#FF9500'
  warning-container: '#FFF3E0'
  danger: '#FF3B30'
  danger-container: '#FFECEB'
  primary: '#007AFF'
  on-primary: '#ffffff'
  primary-container: '#E8F4FF'
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

---

## Bottom Navigation (Tab Bar)

Three tabs: 考试（home icon）/ 错题本（bookmark icon）/ 我的（person icon）.

- **Structure:** Fixed to the bottom; height 49px + safe-area-inset-bottom.
- **Background:** `backdrop-filter: blur(20px)` + `background: rgba(255,255,255,0.85)` + 1px top border using `outline-variant`.
- **Active tab:** Icon + label in `primary` (#007AFF). Icon weight: filled/solid variant.
- **Inactive tab:** Icon + label in `on-surface-variant` (#414755). Icon weight: outline variant.
- **Label:** `label-caps` style, 10px / weight 500, no tracking expansion.

---

## Exam Page Layout

The exam-taking page (`/student/exams/:id`) is the most critical screen and has unique chrome.

### Header

`backdrop-filter: blur(20px)` frosted white header. Contains (left→right):

1. **Back/Exit button** — text "退出" in `danger` color (#FF3B30), always visible (tap triggers confirmation sheet before leaving)
2. **Exam title** — center, `body-sm` weight 500, truncated with ellipsis
3. **Timer** — right, `body-sm` tabular-nums

**Below the header:** a full-width 3px progress bar (`primary` fill, `surface-container` track). The progress represents answered/total questions.

**Progress label:** "第 X / N 题" in `on-surface-variant`, 13px, sits directly under the progress bar, right-aligned.

### Timer States

| State | Condition | Style |
|---|---|---|
| Normal | > 60s remaining | `on-surface-variant`, no animation |
| Warning | ≤ 60s remaining | `danger` (#FF3B30), slow pulse animation (opacity 1→0.6, 1s loop) |
| Exam type = PRACTICE | no time limit | hide timer entirely |

### Answer Option Cards

Each option (A/B/C/D or 正确/错误) is a full-width card. States:

| State | Background | Border | Text |
|---|---|---|---|
| Unselected | `surface-container-lowest` (white) | 1px `outline-variant` | `on-surface` |
| Selected | `primary-container` (#E8F4FF) | 2px `primary` (#007AFF) | `primary` |
| Correct (result) | `success-container` (#E8F8EE) | 2px `success` (#34C759) | `on-surface` |
| Wrong (result) | `danger-container` (#FFECEB) | 2px `danger` (#FF3B30) | `on-surface` |

Option key letter (A / B / C / D): displayed in a 28×28 circle on the left.
- Unselected: `surface-container-high` background, `on-surface-variant` text
- Selected: `primary` background, `on-primary` text

Fill-blank inputs: full-width, 16px radius, 48px min-height, underline-only style (no box border), `primary` underline on focus.

### Answer Sheet Drawer (答题卡)

A floating pill button anchored to bottom center (above the Tab Bar): "答题卡 ⬆" — 48px height, pill shape (radius: full), `surface-container-low` background, `on-surface-variant` text.

Tapping it opens a **bottom sheet** (modal half-screen, 24px top radius, drag-to-dismiss):
- Title row: "答题卡" (left) + "关闭" (right)
- Grid: 5 columns of numbered circles (32×32px), 8px gap
- Circle states:
  - Unanswered: outline circle, `outline-variant` stroke, `on-surface-variant` number
  - Answered: filled `primary-container`, `primary` number
  - Current: filled `primary`, `on-primary` number, 2px `primary` outer ring
- Bottom of sheet: "交卷" button (primary solid, pill, full-width)

### Submit Flow

Tapping 交卷 → confirmation `Alert` dialog (not bottom sheet):
- Title: "确认交卷？"
- Body: "还有 X 题未作答" (or "已全部作答") — body-sm
- Actions: 取消（secondary） / 确认交卷（primary, destructive weight）

---

## Answer Result Page

After submission, each question shows its result state using the option card colors above (Correct / Wrong). Additionally:

- **Score hero:** Large centered display — score number in `headline-xl` + "/满分" in `on-surface-variant`. Below: pass/fail badge pill.
- **Analysis section:** Per-question collapsible card. Collapsed shows question stem + result icon (✓ / ✗). Expanded reveals correct answer + `analysis` text in `on-surface-variant`.

---

## States

### Loading (Skeleton)

Use animated shimmer (`surface-container` → `surface-container-high` sweep, 1.2s loop) for:
- Exam list cards: show 3 skeleton cards on first load
- Question stem: full-width block, height ~3 lines
- Option cards: 4 skeleton bars

### Empty State

Centered vertically in the content area:
- Icon: 64×64px, `surface-container-high` tinted, rounded-2xl
- Title: `headline-lg-mobile`, `on-surface`
- Subtitle: `body-sm`, `on-surface-variant`
- CTA button (if applicable): primary outline pill

Examples:
- 考试列表空: "暂无考试或练习" / "等待老师发布"
- 错题本空: "暂无错题" / "继续保持！"

---

## Teacher & Admin Side (PC Desktop)

> 复用学生端全部 color tokens。设计目标是**干净实用**，不追求毛玻璃特效。

### Layout

```
┌─────────────────────────────────────────┐
│  Sidebar (240px fixed)  │  Content Area  │
│                         │  max-w: 1200px │
│  Logo (48px height)     │  px-8 py-6     │
│  ─────────────────       │                │
│  Nav Items              │                │
│  ─────────────────       │                │
│  User Info (bottom)     │                │
└─────────────────────────────────────────┘
```

- **Sidebar background:** `surface-container-low` (#F1F3FE), no shadow, 1px right border `outline-variant`
- **Sidebar nav item:** 40px height, 12px horizontal padding, 8px border-radius
  - Default: `on-surface-variant` text + icon
  - Active: `primary-container` (#E8F4FF) background, `primary` text + icon, 3px left accent bar in `primary`
  - Hover: `surface-container` background
- **Logo area:** 48px height, app name in `headline-lg` weight 700, `primary` color

### Content Area Conventions

- **Page header:** `<h1>` in `headline-lg` (24px/600) + optional subtitle in `body-sm` `on-surface-variant`; right side for primary action button
- **Data tables:** shadcn `<Table>` default. Row hover: `surface-container-low`. Selected row: `primary-container`. No zebra striping.
- **Dialogs/Sheets:** shadcn `<Dialog>` — max-w-lg for forms, max-w-2xl for data preview (import dry-run). Confirm destructive actions with red "确认删除" button.
- **Forms:** Labels above inputs, `body-sm` label weight 500. Error messages in `danger` below the field, 12px. Submit button right-aligned, primary solid.
- **Pagination:** Bottom of table, right-aligned. Show "共 N 条" on the left.
- **Import dry-run result:** Color-coded row counts — importable (success green), skipped (warning orange), invalid (danger red). Expandable detail list below.

### Admin Side

Identical layout and conventions to Teacher side. The only difference: the Sidebar shows "超管控制台" as the title and has additional nav items for teacher account management.