# WhatsApp AI Chatbot CRM - Design Guidelines

## Design Approach
**Reference-Based Approach**: Inspired by Sence.Point's modern industrial aesthetic, combined with utility-focused CRM patterns from Linear and Notion for data-dense interfaces.

**Key Design Principles**:
- Professional industrial aesthetic with premium metallic finishes
- Data clarity and information hierarchy for CRM functionality
- Efficient workflows with minimal visual friction
- Sophisticated gradient treatments and depth layering

## Core Design Elements

### A. Color Palette

**Dark Mode Primary** (Industrial Metals Theme):
- Background Base: `220 25% 8%` (deep charcoal)
- Surface Cards: `220 20% 12%` (elevated steel)
- Surface Elevated: `220 18% 16%` (lighter panels)
- Border Subtle: `220 15% 22%` (card borders)

**Brand & Accent Colors**:
- Primary Steel Blue: `215 75% 55%` (vibrant steel blue for CTAs)
- GMD Brand Accent: `205 85% 60%` (bright industrial blue)
- Metallic Gray: `220 10% 45%` (secondary text, icons)
- Success Green: `145 60% 50%` (conversion metrics)
- Warning Amber: `35 90% 60%` (pending states)
- Danger Red: `0 70% 55%` (inactive/error states)

**Gradient Headers** (Sence.Point inspired):
- Primary Header: `linear-gradient(135deg, 215 75% 55%, 205 85% 65%)`
- Card Headers: `linear-gradient(90deg, 220 20% 12%, 220 15% 16%)`
- Accent Gradients: Subtle metallic sheens using gray variations

**Text Hierarchy**:
- Primary Text: `220 10% 95%` (high contrast white)
- Secondary Text: `220 10% 65%` (muted gray)
- Tertiary/Meta: `220 10% 45%` (subtle details)

### B. Typography

**Font Families**:
- Primary: 'Inter' (headings, UI elements, data)
- Monospace: 'JetBrains Mono' (metrics, IDs, code snippets)

**Scale & Weights**:
- Page Titles: text-3xl font-bold (dashboard headers)
- Section Headers: text-xl font-semibold (module titles)
- Card Titles: text-lg font-medium (stat cards, panels)
- Body Text: text-base font-normal (content, descriptions)
- Meta Text: text-sm font-medium (labels, timestamps)
- Micro Copy: text-xs (table headers, badge text)

### C. Layout System

**Spacing Primitives**: Tailwind units of **2, 4, 6, 8, 12, 16** (p-2, m-4, gap-6, h-8, py-12, mt-16)

**Grid Structure**:
- Dashboard: 12-column grid with 24px gaps
- Stat Cards: 4-column grid (lg:grid-cols-4 md:grid-cols-2)
- Main Content: 8-column main + 4-column sidebar pattern
- Data Tables: Full-width with internal column spacing

**Container Widths**:
- Dashboard: max-w-7xl mx-auto
- Modals/Forms: max-w-2xl
- Data Tables: w-full with internal padding

### D. Component Library

**Navigation**:
- Sidebar: Fixed left, 280px wide, dark gradient background
- Top Bar: Gradient header (h-16) with search, notifications, profile
- Breadcrumbs: Metallic gray with chevron separators

**Cards & Panels**:
- Stat Cards: Gradient borders, glass morphism effect, rounded-xl
- Data Cards: Elevated surface with subtle shadows (shadow-lg)
- Modal Cards: Centered, backdrop blur, sharp corners (rounded-lg)

**Data Display**:
- Tables: Striped rows, hover states, sticky headers
- Metrics: Large numbers (text-4xl font-bold) with trend indicators
- Charts: Steel blue primary, gray secondary, gradient fills
- Status Badges: Pill-shaped (rounded-full), colored backgrounds with text

**Forms & Inputs**:
- Input Fields: Dark surface (220 20% 12%), steel blue focus ring
- Dropdowns: Native select with custom styling, chevron icons
- Date Pickers: Calendar overlay with gradient header
- Toggle Switches: Steel blue active state

**CTAs & Buttons**:
- Primary: Steel blue gradient, rounded-lg, font-medium
- Secondary: Outlined with steel blue border
- Ghost: Transparent with hover background
- Icon Buttons: Circular (rounded-full), 40px size

**Conversations UI**:
- Message Bubbles: User (right, steel blue), AI (left, dark gray)
- Conversation List: Card-based with avatar, preview, timestamp
- Filters: Chip-based multi-select with counts

**Analytics Components**:
- Funnel Charts: Vertical flow with conversion percentages
- Line Graphs: Gradient area fills, steel blue lines
- Donut Charts: Metallic color palette with center metrics

### E. Animations & Interactions

**Micro-interactions** (subtle, purposeful):
- Card Hover: Slight elevation increase (translate-y-1, shadow-xl)
- Button Hover: Brightness increase on gradient
- Loading States: Skeleton screens with shimmer effect
- Toast Notifications: Slide-in from top-right

**Page Transitions**: Fade-in only, no elaborate animations

## Special Implementations

**Glass Morphism Effects**:
- Stat cards with backdrop blur (backdrop-blur-sm)
- Modal overlays with backdrop-blur-md
- Semi-transparent surfaces with border highlights

**Gradient Applications**:
- Page headers: Full-width gradient banners
- Card accents: Subtle top border gradients
- Button backgrounds: Hover state gradients
- Chart backgrounds: Faded gradient fills

**Industrial Textures**:
- Noise overlay on dark backgrounds (opacity-5)
- Metallic sheen on elevated surfaces
- Brushed metal effect on primary cards

## Images & Visual Assets

**No Hero Images** (Dashboard Application)

**Icons**: Heroicons (outline style for navigation, solid for actions)

**Avatars**: Circular, 40px default, gradient ring for active users

**Data Visualizations**: Chart.js with custom steel blue theme

This design creates a premium, professional CRM dashboard with an industrial edge that emphasizes data clarity while maintaining sophisticated visual appeal through gradient treatments and metallic color schemes.