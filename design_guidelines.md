# I-Approver Fiji - Design Guidelines

## Design Approach
**System Selected:** Material Design adapted for enterprise productivity, optimized for low-bandwidth Fijian context
**Rationale:** Utility-focused travel management requiring efficiency, clear hierarchy, and robust form handling. Material Design provides excellent structure for data-heavy workflows while maintaining visual clarity.

## Core Design Principles
1. **Efficiency First:** Minimize cognitive load with clear visual hierarchies and familiar patterns
2. **Bandwidth Conscious:** No decorative animations, optimized assets, progressive enhancement
3. **Trust & Clarity:** Professional aesthetics that inspire confidence for financial/compliance-critical workflows
4. **Mobile-Native:** Large touch targets (minimum 44px), thumb-friendly layouts, responsive grids

---

## Color Palette

### Light Mode
- **Primary:** 210 80% 45% (Professional blue - trust, authority)
- **Primary Variant:** 210 70% 35% (Darker blue for hover states)
- **Secondary:** 160 60% 45% (Teal - accent for CTAs and highlights)
- **Success:** 140 60% 45% (Green - approvals, visa OK status)
- **Warning:** 40 95% 55% (Amber - pending reviews, visa warnings)
- **Error:** 0 70% 50% (Red - rejections, visa action required)
- **Background:** 210 20% 98% (Off-white canvas)
- **Surface:** 0 0% 100% (White cards/panels)
- **Surface Variant:** 210 15% 95% (Subtle grey for secondary surfaces)
- **Text Primary:** 215 25% 15% (Near-black for primary content)
- **Text Secondary:** 215 15% 45% (Medium grey for labels)
- **Border:** 210 15% 85% (Light grey for dividers)

### Dark Mode
- **Primary:** 210 75% 60% (Brighter blue for dark backgrounds)
- **Surface:** 215 20% 12% (Dark charcoal cards)
- **Background:** 215 25% 8% (Darker canvas)
- **Text Primary:** 210 10% 95% (Off-white)
- **Text Secondary:** 210 10% 70% (Medium grey)

---

## Typography

**Primary Font:** Inter (Google Fonts CDN)
- **Headings:** 600-700 weight, tight leading (1.2-1.3)
- **Body:** 400-500 weight, comfortable reading (1.5-1.6 leading)
- **Labels/Meta:** 500 weight, uppercase tracking for clarity

**Scale:**
- H1: text-3xl md:text-4xl (Page titles)
- H2: text-2xl md:text-3xl (Section headers)
- H3: text-xl md:text-2xl (Card titles, subsections)
- Body: text-base (16px default for readability)
- Small: text-sm (Labels, metadata)
- Tiny: text-xs (Captions, timestamps)

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Component padding: p-4 md:p-6 lg:p-8
- Section spacing: space-y-6 md:space-y-8
- Card gaps: gap-4 md:gap-6
- Form field spacing: space-y-4

**Container Strategy:**
- Dashboard/List Views: max-w-7xl mx-auto
- Forms: max-w-2xl mx-auto
- Detail Panels: max-w-4xl mx-auto
- Mobile: px-4, Tablet: px-6, Desktop: px-8

**Grid Patterns:**
- Dashboard Stats: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Request Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Form Layouts: Single column on mobile, 2-column for related fields on desktop

---

## Component Library

### Navigation
- **Top Bar:** Sticky header with logo, user avatar, notification bell
- **Mobile:** Hamburger menu → slide-in drawer
- **Desktop:** Horizontal nav with dropdown for user settings
- **Active State:** Primary color underline/background

### Status Badges
- **Pending:** Amber background, dark amber text, clock icon
- **Approved:** Green background, dark green text, checkmark icon
- **Rejected:** Red background, dark red text, X icon
- **Visa OK:** Green with shield icon
- **Visa Warning:** Amber with alert triangle
- **Visa Action Required:** Red with exclamation mark

### Forms
- **Input Fields:** Rounded-lg border, focus:ring-2 focus:ring-primary, h-12 minimum for touch
- **Labels:** text-sm font-medium text-secondary mb-2
- **Autocomplete (Amadeus):** Dropdown list with airport codes bold, city names regular, country flags as icons
- **Date Pickers:** Native input[type="date"] styled consistently
- **File Upload:** Dashed border drop zone, image preview thumbnails

### Cards
- **Request Cards:** White surface, rounded-xl, shadow-sm hover:shadow-md transition
- **Per Diem Panel:** Bordered card with table layout showing breakdown (First day 75%, Full days, Last day 75%, Total in FJD)
- **Visa Checker Panel:** Inline banner with icon, status badge, message text, "View Policy" link

### Buttons
- **Primary:** bg-primary hover:bg-primary-variant, text-white, rounded-lg, px-6 py-3
- **Secondary:** bg-secondary, same styling as primary
- **Outline:** border-2 border-primary text-primary hover:bg-primary hover:text-white
- **Large Touch Targets:** Minimum h-12, w-full on mobile for primary actions
- **Icon Buttons:** p-2 rounded-full hover:bg-surface-variant (notifications, menu)

### Data Tables
- **Headers:** bg-surface-variant, font-semibold, sticky on scroll
- **Rows:** Hover state with subtle background change, clickable rows for details
- **Mobile:** Cards replacing table rows with stacked layout
- **Pagination:** Bottom center, large tap targets

### Approval Workflow
- **Side-by-Side Comparison:** Two-column layout showing "Original" vs "Updated" values with highlighted changes
- **Action Bar:** Sticky bottom on mobile with Approve (green) and Reject (red) buttons
- **Comment Modal:** Full-screen on mobile, centered dialog on desktop, mandatory textarea for rejections

---

## Accessibility

- **Contrast Ratios:** Minimum 4.5:1 for text, 3:1 for UI components
- **Focus Indicators:** 2px solid ring in primary color with offset
- **Screen Reader Labels:** aria-label on all icon buttons and status badges
- **Keyboard Navigation:** Tab order follows visual flow, Enter/Space for actions
- **Error States:** Red border + icon + descriptive text below field

---

## Images

**Dashboard Hero Banner (Optional):**
- **Image:** Fiji landscape (beach, tropical scenery) with gradient overlay (primary color 60% opacity)
- **Placement:** Top of dashboard, h-48 md:h-64
- **Text Overlay:** White text with "Welcome back, [Name]" and quick stats
- **Note:** Only if bandwidth allows; otherwise use gradient background

**Empty States:**
- Illustration placeholders (simple line art) for "No requests yet", "No expenses", etc.
- Icons from Heroicons for consistency

**Receipt Thumbnails:**
- Max 200px width, lazy-loaded, with zoom modal on click

---

## Performance Optimizations

- No CSS animations except hover/focus states (opacity, scale)
- Lazy load images below fold
- Skeleton loaders for async content (pulsing grey rectangles)
- Debounced Amadeus autocomplete (300ms delay)
- Optimistic UI updates (immediate feedback, background sync)

---

## Key UX Patterns

**Per Diem Calculator:**
- Live updates as user types dates/destination
- Expandable breakdown showing calculation formula
- Visual indicator when recalculating (spinner icon in panel header)

**Visa Checker:**
- Appears immediately after destination selection
- Non-blocking (doesn't prevent form submission)
- Persistent warning banner at form bottom if action required

**Approval Flow:**
- Highlight changed fields with subtle yellow background
- Diff view toggled by switch ("Show Changes Only")
- One-tap approve with confirmation toast, reject requires comment + confirmation dialog

**Expense Claims:**
- Locked per-diem amounts pre-filled from approved request
- Receipt upload with drag-drop + click-to-browse
- Running total sidebar showing claimed vs allocated budget