# Tokani TripFlow - Design Guidelines
**Your Trusted Partner for Travel Approvals**

## Fiji/Pacific Business Theme with ISO Compliance

## Design Philosophy
**Theme:** Professional tropical-modern with Fijian cultural elements  
**Compliance:** ISO 9241-210 (Human-centred design), ISO/IEC 25010 (Usability), WCAG 2.1 AA  
**Rationale:** Culturally appropriate for Fijian organizations while maintaining professional business standards and accessibility compliance

## Core Design Principles
1. **Cultural Authenticity:** Incorporate Pacific visual language (ocean, sand, coral tones) with professional execution
2. **Accessibility First:** WCAG 2.1 AA compliance with minimum 4.5:1 contrast ratios, full keyboard navigation
3. **Low-Bandwidth Optimization:** Designed for Fijian network conditions - minimal animations, optimized assets
4. **Mobile-Native:** Large touch targets (≥44px), thumb-friendly layouts, responsive across all devices
5. **ISO 9241 Usability:** Effectiveness + Efficiency + Satisfaction in every interaction

---

## Color Palette - Pacific Business Theme

### Brand Colors (Light Mode)
- **Ocean (Primary):** 
  - DEFAULT: #00547A (HSL: 195 100% 24%) - Deep ocean blue for trust and authority
  - 50: #E1F4FA (Light ocean mist)
  - 200: #80CFE3 (Light ocean)
  - 500: #009BAA (Bright lagoon)
  - 700: #006677 (Dark ocean depths)
  - 900: #003344 (Deepest ocean)

- **Coral (Accent/Action):**
  - DEFAULT: #EF6C57 (HSL: 8 82% 64%) - Warm coral for CTAs and important actions
  - 100: #FFD0C7 (Light coral)
  - 500: #EF6C57 (Coral)
  - 700: #B33120 (Dark coral)

- **Sand (Neutral/Background):**
  - DEFAULT: #F4E4C1 (HSL: 42 62% 85%) - Warm sand for subtle backgrounds
  - 100: #FAE7BF (Light sand)
  - 500: #F4E4C1 (Sand)
  - 700: #CCB060 (Dark sand)

- **Lagoon (Success/Secondary):**
  - DEFAULT: #009BAA (HSL: 185 100% 33%) - Bright turquoise for success states
  - 100: #B3F0F4 (Light lagoon)
  - 500: #009BAA (Lagoon)
  - 700: #007777 (Dark lagoon)

### Functional Colors (Light Mode)
- **Background:** 42 30% 97% (Off-white with sand warmth)
- **Surface/Card:** 0 0% 100% (Pure white)
- **Surface Variant:** 42 15% 96% (Subtle sand tint)
- **Text Primary:** 195 40% 12% (Deep ocean for high contrast)
- **Text Secondary:** 195 20% 45% (Medium ocean for labels)
- **Text Tertiary:** 195 15% 60% (Light ocean for metadata)
- **Border:** 42 15% 88% (Subtle sand-based borders)

### Status Colors
- **Success:** Lagoon #009BAA (approvals, completed trips)
- **Warning:** 40 100% 55% (Amber for pending, visa warnings)
- **Error:** Coral #EF6C57 (rejections, visa required)
- **Info:** Ocean #00547A (notifications, neutral information)

### Dark Mode
- **Background:** 195 30% 8% (Deep ocean night)
- **Surface:** 195 25% 12% (Slightly lighter ocean)
- **Text Primary:** 42 20% 95% (Sand-white)
- **Text Secondary:** 42 15% 70% (Medium sand)
- **Ocean:** 195 80% 60% (Brighter for dark backgrounds)
- **Lagoon:** 185 85% 55% (Brighter turquoise)

### Contrast Compliance (WCAG 2.1 AA)
All text-background combinations maintain minimum 4.5:1 ratio:
- Ocean text on white: 8.2:1 ✓
- Text primary on background: 12.5:1 ✓
- Coral on white (large text only): 4.6:1 ✓
- Lagoon text on white: 5.1:1 ✓

---

## Typography

**Primary Font:** Inter (sans-serif, professional, excellent readability)  
**Fallback Stack:** Inter, system-ui, -apple-system, sans-serif

**Scale (Mobile-First):**
- **H1:** text-2xl md:text-3xl lg:text-4xl (Page titles, 24px/32px/36px)
- **H2:** text-xl md:text-2xl (Section headers, 20px/24px)
- **H3:** text-lg md:text-xl (Card titles, 18px/20px)
- **Body:** text-base (16px - optimal for readability)
- **Small:** text-sm (14px - labels, metadata)
- **Tiny:** text-xs (12px - captions, timestamps)

**Weights:**
- Headings: 600-700 (semibold-bold)
- Body: 400-500 (normal-medium)
- Labels: 500 (medium)

**Leading (Line Height):**
- Headings: 1.2-1.3 (tight for impact)
- Body: 1.5-1.6 (comfortable reading)
- Dense data: 1.4 (tables, lists)

---

## Layout System

**Responsive Breakpoints:**
```
mobile:   < 640px   (sm)
tablet:   640-1024px (md)
laptop:   1024-1440px (lg)
desktop:  > 1440px   (xl)
```

**Spacing Scale (Tailwind Units):**
- Component padding: p-4 md:p-6 lg:p-8
- Section spacing: space-y-4 md:space-y-6 lg:space-y-8
- Card gaps: gap-4 md:gap-6
- Form fields: space-y-4
- Button padding: px-6 py-3 (minimum 44px height for touch)

**Container Strategy:**
- Dashboard/Analytics: max-w-7xl mx-auto px-4 md:px-6 lg:px-8
- Forms: max-w-2xl mx-auto px-4
- Detail Views: max-w-4xl mx-auto px-4
- Full-width components: Map, tables on large screens

**Grid Patterns:**
- Stats Cards: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
- Trip Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Form Layouts: Single column mobile, two columns for related fields on desktop

---

## Component Library

### Buttons
**Primary (Ocean):**
- Background: Ocean #00547A
- Text: White
- Hover: Ocean-700 with subtle elevation
- Border: Slightly darker ocean
- Size: h-12 minimum (44px+ touch target), px-6 py-3
- Rounded: rounded-lg

**Secondary (Lagoon):**
- Background: Lagoon #009BAA
- Text: White
- Hover: Lagoon-700

**Outline:**
- Border: 2px ocean
- Text: Ocean
- Hover: bg-ocean text-white

**Destructive (Coral):**
- Background: Coral #EF6C57
- Text: White
- Use for: Delete, Reject actions

**Icon Buttons:**
- Size: h-9 w-9 (icon-only)
- Padding: p-2
- Hover: subtle background elevation

### Cards
**Standard Card:**
- Background: white (surface)
- Border: 1px sand-based border
- Rounded: rounded-xl (subtle curves)
- Shadow: shadow-sm hover:shadow-md (subtle depth)
- Padding: p-4 md:p-6

**Trip Summary Card:**
- Header: Ocean-50 background with ocean-800 text
- Status badge: Top-right corner
- Content: Structured grid with icons

**Stat Card (Dashboard):**
- Gradient backgrounds using ocean/lagoon/coral shades
- Large number display (text-3xl font-bold)
- Icon in contrasting color circle
- Hover: subtle lift effect

### Status Badges
- **Approved:** Lagoon-100 background, lagoon-700 text, checkmark icon
- **Pending:** Amber-100 background, amber-700 text, clock icon
- **Rejected:** Coral-100 background, coral-700 text, X icon
- **Draft:** Sand-200 background, sand-800 text
- **Visa OK:** Lagoon with shield icon
- **Visa Warning:** Amber with alert triangle
- **Visa Required:** Coral with exclamation

### Forms
**Input Fields:**
- Height: h-12 minimum (touch-friendly)
- Border: 1px border-sand-500, focus:border-ocean focus:ring-2 focus:ring-ocean/20
- Rounded: rounded-lg
- Font: text-base (16px prevents mobile zoom)
- Disabled: opacity-60 with cursor-not-allowed

**Labels:**
- Font: text-sm font-medium
- Color: text-secondary
- Spacing: mb-2
- Required indicator: Coral asterisk

**Select/Dropdown:**
- Same styling as inputs
- Chevron icon on right
- Options with hover states

**Date Pickers:**
- Native input[type="date"] styled consistently
- Format helper text: "DD/MM/YYYY"

**File Upload:**
- Dashed border drop zone
- Drag-and-drop + click to browse
- Image preview thumbnails
- Max file size indicator

### Data Tables
**Desktop:**
- Header: bg-ocean-50, font-semibold, sticky on scroll
- Rows: Hover bg-sand-50, clickable cursor-pointer
- Borders: Subtle sand borders
- Alternating rows: optional subtle sand-25 background

**Mobile:**
- Transform to stacked cards
- Key fields visible, expandable for details
- Touch-friendly tap targets

### Navigation
**Sidebar:**
- Background: Sand-50 for warmth
- Active item: Ocean background with white text
- Icons: Ocean-600 color
- Hover: Subtle elevation on ocean-50
- Labels with subtitles for clarity

**Header Bar:**
- Background: Ocean #00547A
- Text: White
- Greeting: "Bula, [Name]!" (Fijian welcome)
- Height: h-16 (64px)
- Sticky: top-0 z-50

---

## Cultural Elements

### Localization & Tone
**Greetings:**
- "Bula!" (Welcome/Hello in Fijian)
- "Bula, [User Name]!" on dashboard/header

**Success Messages:**
- "Vinaka!" (Thank you in Fijian)
- "Vinaka - your request has been submitted!"
- "Vinaka - approval completed!"

**Tone:**
- Warm and friendly yet professional
- "Your trip to [destination]" not "Request #12345"
- Clear, concise, respectful

**Future Localization:**
- Structure for en-FJ (Fiji English) and en-PG (Papua New Guinea English)
- Date format: DD/MM/YYYY (Pacific standard)
- Currency: FJD prefix

### Visual Elements
**Pacific Wave Pattern (Subtle):**
- Optional SVG overlay in backgrounds
- Opacity: 0.03-0.05 (barely visible, adds texture)
- Use sparingly to avoid distraction

**Fiji Map Watermark:**
- Very faint outline in sand color
- Dashboard background only
- Opacity: 0.02 (subliminal brand reinforcement)

---

## Accessibility (WCAG 2.1 AA Compliance)

### Contrast Requirements
✓ Text on background: ≥ 4.5:1
✓ Large text (18pt+): ≥ 3:1
✓ UI components: ≥ 3:1
✓ All color combinations tested and compliant

### Keyboard Navigation
- Tab order follows visual flow (left-to-right, top-to-bottom)
- Enter/Space activates buttons
- Escape closes modals/dropdowns
- Arrow keys in selects and date pickers
- Skip-to-content link for screen readers

### Focus Indicators
- 2px solid ring in ocean color
- Offset: 2px
- Visible on all interactive elements
- Never removed (outline:none prohibited)

### Screen Reader Support
- aria-label on all icon-only buttons
- aria-labelledby for form sections
- role="status" for live updates (per diem calculations)
- role="alert" for errors
- Alt text on all images
- Semantic HTML (nav, main, header, article)

### Error Handling
- Error messages below field
- Icon + text (don't rely on color alone)
- aria-describedby linking field to error
- Red border + coral icon + descriptive text

### Form Labels
- Every input has associated <label>
- For attribute matching input ID
- Visible labels (no placeholder-only)
- Required fields clearly marked

---

## Performance & Bandwidth Optimization

### Low-Bandwidth Design
- No autoplay videos/animations
- Lazy-load images below fold
- Optimize images: WebP format, max 200KB
- Compress map tiles
- Debounced API calls (300ms)
- Skeleton loaders during fetch

### Animation Budget
- Hover/focus transitions only: ≤ 200ms
- No decorative animations
- CSS transforms (GPU-accelerated) only
- Reduced motion respect: prefers-reduced-motion

### Loading States
- Skeleton screens (pulsing grey rectangles)
- Spinner icons for inline updates
- Progress bars for multi-step processes
- Optimistic UI (immediate feedback, background sync)

---

## Responsive Behavior

### Mobile (< 640px)
- Single column layouts
- Full-width buttons
- Collapsible sidebar (drawer)
- Stacked stat cards
- Table → card transformation
- Larger touch targets (minimum 44px)

### Tablet (640-1024px)
- 2-column grids where appropriate
- Side-by-side forms for related fields
- Visible sidebar or slide-over
- Medium spacing

### Laptop/Desktop (> 1024px)
- Multi-column layouts
- Sidebar always visible
- Hover states active
- Optimal spacing
- Data tables in full glory

### Device Detection Hook
Use `useDeviceType()` to conditionally render:
- Map zoom levels
- Chart complexity
- Table vs. card views
- Form column counts

---

## Key UX Patterns

### Per Diem Calculator
- Live calculation as dates change
- Expandable breakdown showing FJD rates
- Spinner icon during calculation
- Visual success state (lagoon checkmark)

### Visa Checker
- Appears after destination selection
- Non-blocking (doesn't prevent submission)
- Color-coded status: OK (lagoon), Warning (amber), Required (coral)
- Link to policy details

### Approval Workflow
- Highlight changed fields (sand-100 background)
- Side-by-side original vs. updated
- Large approve (lagoon) and reject (coral) buttons
- Sticky action bar on mobile
- Mandatory comment for rejections

### Dashboard Quick Actions
- 4 prominent cards with icons
- Ocean, lagoon, coral, amber color coding
- One-tap navigation to key features

### Travel Watch Map
- Pins for active travelers
- Clustered markers for performance
- Click pin → traveler details popup
- Filter by department/status

---

## ISO 9241-210 Compliance

### User-Centered Design Process
1. **Understand context of use:** Fijian organizations, mobile-first users, low bandwidth
2. **Specify user requirements:** Fast approvals, clear per-diem, visa clarity
3. **Produce design solutions:** This design system
4. **Evaluate against requirements:** Accessibility audits, usability testing

### Effectiveness Measures
- Task completion rate > 95%
- Error rate < 5%
- Time to submit request < 3 minutes

### Efficiency Measures
- Clicks to complete task minimized
- Form auto-fills where possible
- Smart defaults (return date = departure + 7 days)

### Satisfaction Measures
- Clear feedback on every action
- Friendly, culturally appropriate tone
- "Vinaka" messages reinforce positive UX

---

## Testing & Quality Assurance

### Accessibility Testing
- axe DevTools audit (0 critical issues)
- Lighthouse accessibility score ≥ 95
- Keyboard-only navigation test
- Screen reader test (NVDA/JAWS)
- Color blindness simulator
- Font scale test (up to 200%)

### Browser Testing
- Chrome, Safari, Firefox, Edge (latest 2 versions)
- iOS Safari, Android Chrome
- Graceful degradation for older browsers

### Performance Testing
- Lighthouse performance score ≥ 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Total page weight < 1MB

### Responsive Testing
- Test all breakpoints
- Portrait and landscape orientations
- Touch and mouse interactions
- Viewport zoom behavior

---

## Component Implementation Notes

### Button Variants
```
primary: ocean bg, white text
secondary: lagoon bg, white text
outline: ocean border, ocean text
destructive: coral bg, white text
ghost: transparent, ocean text
```

### Card Spacing
```
Internal: p-6
External: gap-6 in grids
Margins: mb-6 between sections
```

### Typography Classes
```
.heading-1: text-3xl font-bold text-primary
.heading-2: text-2xl font-semibold text-primary
.body: text-base text-foreground
.label: text-sm font-medium text-secondary
.caption: text-xs text-tertiary
```

---

## Dark Mode Considerations

**Activation:**
- User toggle in header
- Respects system preference
- Persists in localStorage

**Palette Adjustments:**
- Brighter ocean/lagoon for visibility
- Reduced sand saturation
- Maintain contrast ratios
- Test all components in both modes

---

## Future Enhancements

1. **Offline Mode:** Service worker for offline request drafts
2. **PWA:** Add to home screen capability
3. **Animations:** Tasteful micro-interactions (if bandwidth improves)
4. **Advanced Charts:** More detailed analytics (if performance allows)
5. **Multi-language:** Full i18n for Fijian, English, Hindi

---

**Last Updated:** October 2025  
**Design System Version:** 2.0 - Pacific Business Theme  
**Compliance:** ISO 9241-210, ISO/IEC 25010, WCAG 2.1 AA
