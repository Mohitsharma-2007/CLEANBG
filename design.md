# Background Remover — Design System

## Brand Identity

**Product:** Background Remover — a professional image-processing tool.
**Feeling:** Fast, Precise, Clean, Reliable, Technical, Professional.
**NOT** an AI product. No sparkle icons, neon effects, excessive gradients, glassmorphism, or unnecessary animations.

---

## Color System

### Core Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#2563EB` | Actions, active states, links |
| `--color-primary-hover` | `#1D4ED8` | Button hover |
| `--color-primary-active` | `#1E40AF` | Button active/pressed |
| `--color-primary-light` | `#EFF6FF` | Accent backgrounds, selection |
| `--color-primary-subtle` | `#DBEAFE` | Subtle highlights |

### Background & Surface

| Token | Hex | Usage |
|---|---|---|
| `--color-bg` | `#F8FAFC` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-surface-secondary` | `#F1F5F9` | Secondary surfaces, zebra stripes |
| `--color-surface-tertiary` | `#E2E8F0` | Disabled surfaces |

### Border

| Token | Hex | Usage |
|---|---|---|
| `--color-border` | `#E2E8F0` | Default borders |
| `--color-border-strong` | `#CBD5E1` | Emphasized borders, input focus |

### Text

| Token | Hex | Usage |
|---|---|---|
| `--color-text` | `#0F172A` | Primary text |
| `--color-text-secondary` | `#475569` | Secondary text, descriptions |
| `--color-text-muted` | `#64748B` | Captions, placeholders |
| `--color-text-inverse` | `#FFFFFF` | Text on primary/dark backgrounds |

### Semantic

| Token | Hex | Usage |
|---|---|---|
| `--color-success` | `#16A34A` | Success states, completed |
| `--color-warning` | `#D97706` | Warnings, pending |
| `--color-error` | `#DC2626` | Errors, destructive actions |

---

## Typography

**Font Family:** `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

| Name | Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| Display | 48px | 1.1 | 700 | Hero text, splash |
| H1 | 36px | 1.2 | 700 | Page titles |
| H2 | 28px | 1.25 | 700 | Section headings |
| H3 | 22px | 1.3 | 600 | Subsection headings |
| Body | 16px | 1.6 | 400 | Default text |
| Small | 13px | 1.5 | 400 | Secondary info |
| Caption | 12px | 1.4 | 400 | Labels, metadata |

---

## Spacing Scale (8px base)

| Token | Value |
|---|---|
| `--space-0` | `0` |
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--space-12` | `48px` |
| `--space-16` | `64px` |

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `4px` | Small elements (badges) |
| `--radius-md` | `8px` | Buttons, inputs |
| `--radius-lg` | `12px` | Cards |
| `--radius-xl` | `16px` | Upload area, modals |

---

## Shadows

Minimal, subtle shadows. No heavy drop shadows.

| Token | Value |
|---|---|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)` |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)` |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.06), 0 4px 6px rgba(0,0,0,0.04)` |

---

## Transitions

Subtle, fast transitions. 150–250ms range.

| Token | Value |
|---|---|
| `--transition-fast` | `150ms ease` |
| `--transition-base` | `200ms ease` |
| `--transition-slow` | `250ms ease` |

---

## Component Specifications

### Header
- Fixed top, height 56px, surface background, bottom border.
- Logo (text-based) left-aligned.
- Navigation: Remove Background, Convert, History.
- Right section: Settings, Help.

### Upload Zone
- Dashed border, large tap target, 16px radius.
- Drag-over state: primary border + primary-light background.
- Icon + text + file format hints.
- Accept: PNG, JPG, JPEG, WebP.

### Queue Panel
- List items with thumbnail (48×48), filename, dimensions, file size.
- Status badge (idle, processing, complete, error).
- Progress bar for active processing.
- Action buttons: Edit, Export, Retry, Remove.

### Editor Canvas
- Checkerboard background for transparency.
- Full viewport workspace with zoom/pan.
- Right tool panel (240px width).
- Tools as icon buttons with labels.
- Brush size slider.
- Undo/Redo stack.

### Before/After Comparison
- Slider-based horizontal comparison.
- Labels: "Original" / "Processed".

### Export Dialog
- Format selector (PNG, JPEG, WebP).
- Quality slider (JPEG/WebP).
- Dimension inputs with aspect ratio lock.
- Transparency toggle.
- Background color picker (for JPEG).
- Preview + file size estimate.

### Converter Page
- Same upload zone.
- Target format selector.
- Quality/compression controls.
- Batch processing with progress.

---

## Layout

```
┌──────────────────────────────────────────────────────────┐
│ Header: Logo │ Remove │ Convert │ History │ Settings     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Main Workspace (max 1440px)            │ │
│  │                                                     │ │
│  │  [Upload Zone / Editor / Converter / Queue]         │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints
- Desktop: > 1024px — Full layout
- Tablet: 768–1024px — Stacked panels
- Mobile: < 768px — Single column, bottom nav

---

## Accessibility

- All interactive elements must have visible focus rings (2px primary outline).
- Minimum contrast ratio 4.5:1 for text.
- ARIA labels on icon-only buttons.
- Keyboard navigation: Tab order, Enter/Space activation.
- Screen reader announcements for status changes.

---

## Icons

Outline-style icons, 20×20 default size, stroke width 1.5.
No filled icons. Consistent line weight.

---

## Architecture

### Non-AI Background Removal Algorithm

The core algorithm uses a **color-based segmentation + edge refinement** pipeline:

1. **Background Color Sampling**: Sample dominant color from image borders (8px edge strip).
2. **CIELAB Color Distance**: Convert to CIELAB color space for perceptually uniform distance calculation.
3. **Flood Fill from Borders**: BFS flood fill from all border pixels, propagating inward while color distance < threshold.
4. **Edge Detection (Sobel)**: Compute gradient magnitude to identify strong edges.
5. **Mask Refinement**: At boundary between foreground/background, use edge information to preserve fine details.
6. **Morphological Operations**: Erosion/dilation to clean mask artifacts.
7. **Alpha Matting Approximation**: For semi-transparent regions (hair, fur), compute partial alpha based on color distance falloff.

### Performance Strategy

- **Web Workers**: All heavy processing runs in dedicated workers.
- **OffscreenCanvas**: Use where available for worker-based rendering.
- **Streaming Processing**: Process images in tiles for large images.
- **RequestAnimationFrame**: UI updates batched to animation frames.
- **Object URLs**: Efficient memory management for previews.
- **Worker Pool**: Reuse workers across jobs.

### File Structure

```
src/
├── main.ts                 # Entry point, routing
├── core/                   # Types, state, events, validation
├── processing/             # Image algorithms, workers
├── queue/                  # Batch processing queue
├── ui/                     # UI components
├── converter/              # Format conversion
├── utils/                  # Helpers
└── styles/                 # CSS (tokens, base, components)
```
