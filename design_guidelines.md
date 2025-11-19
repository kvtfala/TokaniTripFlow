# Tokani TripFlow - Design System
**Enterprise Travel Management for the Pacific**

## Design Philosophy

**Brand Identity:** Professional, trustworthy, enterprise-ready aesthetic using official Tokani brand colors  
**Accessibility:** WCAG 2.1 AA compliance minimum (≥4.5:1 contrast ratios)  
**Typography:** Modern, clean sans-serif with clear hierarchy  
**Methodology:** Consistent, centralized design system for maintainability

---

## 1. Brand Colors - Tokani Official Theme

### Primary Brand Colors

**Tokani Blue (Primary)**
- Hex: `#0057B8`
- HSL: `212 100% 36%`
- Usage: Primary actions, main brand color, CTAs
- Classes: `bg-primary`, `text-primary`, `bg-ttf-blue`, `text-ttf-blue`

**Navy (Dark Accent)**
- Hex: `#002A52`
- HSL: `212 100% 16%`
- Usage: Headers, dark text, professional accents
- Classes: `bg-ttf-navy`, `text-ttf-navy`

**Aqua (Secondary)**
- Hex: `#1FBED6`
- HSL: `189 75% 48%`
- Usage: Secondary actions, highlights, success states
- Classes: `bg-secondary`, `text-secondary`, `bg-ttf-aqua`, `text-ttf-aqua`

**Light Sky (Backgrounds)**
- Hex: `#EAF7FF`
- HSL: `200 100% 97%`
- Usage: Sidebar backgrounds, subtle sections
- Classes: `bg-ttf-light-sky`

### Semantic Colors

**Success:** `hsl(145 63% 42%)` - #27AE60  
**Warning:** `hsl(28 87% 62%)` - #F2994A  
**Error/Destructive:** `hsl(0 79% 63%)` - #EB5757  
**Neutral:** `hsl(0 0% 55%)` - #8C8C8C

### Grayscale Palette

**Text Colors:**
- `ttf-grey-900` - Foreground/primary text (#1A1A1A)
- `ttf-grey-700` - Secondary text (labels, descriptions)
- `ttf-grey-500` - Tertiary text (captions, metadata)

**Border/Background Colors:**
- `ttf-gray-300` - Borders
- `ttf-gray-100` - Subtle borders, dividers

### Color Usage Rules

1. **Never use arbitrary Tailwind colors** (blue-500, gray-200, etc.) - always use `ttf-*` palette
2. **Semantic tokens preferred:** Use `bg-primary`, `text-foreground`, `bg-card` instead of hardcoded hex values
3. **Gradients require dark overlays:** White text on brand gradients needs 40-50% black wash for WCAG AA compliance (≥4.5:1 contrast)
4. **Reserve red (#EB5757)** for error states only - not the logo red (#D7263D)

---

## 2. Typography

### Font Family

**Primary UI Font:**
```css
font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

**Monospace (if needed):**
```css
font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
```

### Type Scale (Desktop Defaults)

| Element | Size | Weight | Color | Tailwind Class |
|---------|------|--------|-------|----------------|
| **H1** | 30-32px (2rem) | font-semibold | ttf-navy | `text-ttf-h1 font-semibold text-ttf-navy` |
| **H2** | 24-26px (1.625rem) | font-semibold | ttf-navy | `text-ttf-h2 font-semibold text-ttf-navy` |
| **H3** | 20px (1.25rem) | font-semibold | ttf-grey-900 | `text-ttf-h3 font-semibold text-ttf-grey-900` |
| **Section Title** | 16-18px (1.125rem) | font-semibold | ttf-grey-900 | `text-ttf-section font-semibold` |
| **Body** | 14-16px (1rem) | font-normal | ttf-grey-700 | `text-ttf-body text-ttf-grey-700` |
| **Small** | 14px (0.875rem) | font-normal | ttf-grey-700 | `text-ttf-sm text-ttf-grey-700` |
| **Caption** | 12-13px (0.75rem) | font-normal | ttf-grey-500 | `text-ttf-xs text-ttf-grey-500` |

### Typography Rules

1. **Limit to two weights:** `font-normal` (400) and `font-semibold` (600) for most screens
2. **No all-caps for long labels** - Only short tags/badges (e.g., APPROVED, DRAFT)
3. **Line height:** Use `leading-relaxed` or `leading-normal` for comfortable reading
4. **Responsive scaling:** Mobile uses smaller base sizes, desktop uses larger

---

## 3. Layout & Spacing

### Spacing Scale (8px Rhythm)

Use an 8px base rhythm for consistency:

| Value | Pixels | Tailwind | TTF Class |
|-------|--------|----------|-----------|
| 1 | 4px | `p-1`, `m-1` | `p-ttf-1` |
| 2 | 8px | `p-2`, `m-2` | `p-ttf-2` |
| 3 | 12px | `p-3`, `m-3` | `p-ttf-3` |
| 4 | 16px | `p-4`, `m-4` | `p-ttf-4` |
| 5 | 20px | `p-5`, `m-5` | `p-ttf-5` |
| 6 | 24px | `p-6`, `m-6` | `p-ttf-6` |
| 8 | 32px | `p-8`, `m-8` | `p-ttf-8` |
| 10 | 40px | `p-10`, `m-10` | `p-ttf-10` |

### Spacing Rules

**Cards:** `p-4` or `p-6` internal padding  
**Page padding:** `p-6` on mobile, `p-8` on desktop  
**Form fields:** `space-y-4` between inputs  
**Sections:** `space-y-6` or `gap-6` between cards/sections

### Layout Patterns

**Main Layout:** Left sidebar + top bar pattern  
**Content max-width:** `max-w-6xl` or `max-w-7xl mx-auto` for main content  
**Breathing room:** Always maintain padding; avoid edge-to-edge cramped layouts

### Border Radius & Shadows

**Border Radius:**
- Cards/Modals: `rounded-xl` or `rounded-2xl`
- Buttons: `rounded-full` or `rounded-lg` (consistent across app)
- Inputs: `rounded-lg`

**Shadows:** Use soft single-layer shadows
- `shadow-sm` - Subtle card elevation
- `shadow-md` - Modal, popover elevation
- No heavy drop shadows

**Example Card:**
```jsx
<div className="bg-white rounded-2xl shadow-sm border border-ttf-gray-100 p-6">
  {/* card content */}
</div>
```

---

## 4. Core Components

### 4.1 Buttons

**Primary Button**  
Purpose: Main actions (Approve, Submit, Save)

```jsx
<button className="
  inline-flex items-center justify-center
  rounded-full
  bg-ttf-blue text-white
  px-5 py-2.5
  text-sm font-semibold
  shadow-sm
  hover:bg-ttf-navy
  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ttf-blue
  disabled:opacity-60 disabled:cursor-not-allowed
">
  Approve Request
</button>
```

**Secondary Button**  
Purpose: Neutral actions (View details, Edit, Back)

```jsx
<button className="
  inline-flex items-center justify-center
  rounded-full
  border border-ttf-blue
  bg-white text-ttf-blue
  px-4 py-2
  text-sm font-semibold
  hover:bg-ttf-light-sky
  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ttf-blue
">
  View Details
</button>
```

**Ghost/Tertiary Button**

```jsx
<button className="
  inline-flex items-center gap-2
  rounded-full
  px-3 py-1.5
  text-sm font-medium
  text-ttf-grey-700
  hover:bg-ttf-light-sky
">
  Cancel
</button>
```

**Destructive Button**  
Use error red (#EB5757), not logo red

```jsx
<button className="
  inline-flex items-center justify-center
  rounded-full
  bg-ttf-error text-white
  px-5 py-2.5
  text-sm font-semibold
  hover:opacity-90
">
  Delete Request
</button>
```

### 4.2 Form Inputs

**Standard Input Field:**

```jsx
<label className="block space-y-1.5">
  <span className="text-sm font-medium text-ttf-grey-700">
    Destination
  </span>
  <input
    className="
      block w-full
      rounded-lg border border-ttf-gray-300
      bg-white px-3 py-2
      text-sm text-ttf-grey-900
      shadow-sm
      focus:outline-none focus:ring-2 focus:ring-ttf-aqua focus:border-ttf-aqua
    "
    placeholder="e.g. Port Moresby, PNG"
  />
  <span className="text-xs text-ttf-grey-500">
    Used for policy and per diem checks.
  </span>
</label>
```

**Input Rules:**
- Borders: `border border-ttf-gray-300`
- Focus: `ring-2 ring-ttf-aqua border-ttf-aqua`
- Radius: `rounded-lg`
- Label: 14px, `font-medium`, `text-ttf-grey-700`
- Helper text: 12-13px, muted colors

### 4.3 Navigation

**Top Bar:**
- Background: `bg-ttf-navy`
- Text/icons: white or `ttf-light-sky`
- Show app name and key shortcuts (Search, Profile)

**Sidebar:**
- Background: white or `ttf-light-sky`
- Active item: pill with `bg-ttf-blue/10` and left border in `ttf-blue`

**Sidebar Item Example:**

```jsx
<button className={cn(
  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
  active
    ? "bg-ttf-blue/10 text-ttf-blue"
    : "text-ttf-grey-700 hover:bg-ttf-light-sky"
)}>
  <Icon className="h-4 w-4" />
  <span>Travel Requests</span>
</button>
```

### 4.4 Cards & Dashboards

**Metric Card Example:**

```jsx
<div className="bg-white rounded-2xl shadow-sm border border-ttf-gray-100 p-4 flex flex-col gap-1">
  <span className="text-xs font-medium text-ttf-grey-500 uppercase tracking-wide">
    Estimated Savings this Month
  </span>
  <span className="text-2xl font-semibold text-ttf-navy">
    $12,450
  </span>
  <span className="text-xs text-ttf-success font-medium">
    +18% vs last month
  </span>
</div>
```

**Dashboard Layout:**
- Top row: metrics (Total requests, Pending approvals, etc.)
- Middle: charts (approvals over time, cost savings)
- Bottom: tables/recent activity

### 4.5 Tables

**Table Styling:**
- Striped rows: `border-b border-ttf-gray-100`
- Header row: `bg-ttf-light-sky text-xs font-semibold text-ttf-grey-700`
- Row hover: `hover:bg-ttf-light-sky`

### 4.6 Badges & Status Pills

**Status Badge:**

```jsx
<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-ttf-light-sky text-ttf-blue">
  Pending Approval
</span>
```

**Status Colors:**
- Approved: `bg-ttf-success/10 text-ttf-success`
- Rejected: `bg-ttf-error/10 text-ttf-error`
- Pending: `bg-ttf-light-sky text-ttf-blue`

### 4.7 Alerts & Banners

- Info: `bg-ttf-light-sky border border-ttf-aqua/30 text-ttf-navy`
- Warning: `bg-ttf-warning/10 border border-ttf-warning/50 text-ttf-warning`
- Error: `bg-ttf-error/10 border border-ttf-error/40 text-ttf-error`

---

## 5. Charts & Data Visualization

**Chart Colors:**
- Primary: `#0057B8` (Tokani Blue)
- Secondary series: `#1FBED6` (Aqua), `#002A52` (Navy), neutral greys
- Avoid bright red as main chart color; reserve red for negative metrics

**Chart Requirements:**
- Clear legends & axis labels
- Use `text-ttf-grey-700` for labels
- Minimal grid lines (soft grey)

---

## 6. Microcopy & Tone

**Label Style:**
- Short, clear, action-driven: "Submit for approval", "Return to requester"
- Helper text is concrete: "This trip exceeds policy by 12% due to fare class and hotel rate."
- Avoid jargon; explain travel/policy terms in tooltips where necessary

---

## 7. Accessibility (WCAG 2.1 AA Compliance)

### Contrast Requirements

✓ Body text on background: ≥ 4.5:1  
✓ Large text (18pt+): ≥ 3:1  
✓ UI components: ≥ 3:1  
✓ White text on brand gradients: Requires 40-50% black overlay (verified 5.2:1 ratio)

### Keyboard Navigation

- Tab order follows visual flow
- Enter/Space activates buttons
- Escape closes modals
- Focus indicators visible on all interactive elements

### Screen Reader Support

- `aria-label` on icon-only buttons
- `role="status"` for live updates
- `role="alert"` for errors
- Semantic HTML (`nav`, `main`, `header`, `article`)

---

## 8. Implementation Rules

When creating or editing components:

1. **Always use ttf-\* brand colors** - Replace arbitrary Tailwind colors (blue-500, gray-200) with the ttf-\* palette
2. **Normalize spacing** to 8px scale and consistent card/button patterns
3. **Apply typography scale** consistently (H1, H2, H3, body, caption)
4. **Use semantic color tokens** (`bg-primary`, `text-foreground`) over hardcoded hex values
5. **Ensure rounded corners** match component type:
   - Buttons: `rounded-full`
   - Inputs: `rounded-lg`
   - Cards: `rounded-2xl`
6. **Keep everything cohesive** - Single enterprise app aesthetic, not random templates

### Apply These Rules To:

- Layout (main shell)
- All forms (travel request, approvals, admin settings)
- Dashboards & reports
- Modals and wizards
- Any new pages you create

---

## 9. Responsive Design

### Breakpoints

```
mobile:   < 640px   (sm)
tablet:   640-1024px (md)
laptop:   1024-1440px (lg)
desktop:  > 1440px   (xl)
```

### Mobile-First Approach

- Single column layouts on mobile
- Full-width buttons with minimum 44px touch targets
- Collapsible sidebar (drawer)
- Stacked stat cards

---

## 10. Dark Mode Support

**Palette Adjustments:**
- Brighter Tokani Blue (#0080FF) for visibility on dark backgrounds
- Brighter Aqua (#26D3E8) for dark mode
- Maintain contrast ratios (≥4.5:1)
- Test all components in both modes

---

**Last Updated:** November 2025  
**Design System Version:** 3.0 - Tokani Official Brand  
**Compliance:** WCAG 2.1 AA, Enterprise-Ready Professional Aesthetic
