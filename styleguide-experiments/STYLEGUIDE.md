# Sunny Glen — Light Theme Styleguide (v1)

A calm, forest-inspired light theme for a map-centric orienteering app. Designed to feel like a warm summer afternoon in a shaded forest glen: peaceful, focused, and readable. The map is the “canvas”; the UI should support it without fighting it.

This styleguide is compatible with the accompanying single-file HTML demo (`styleguide-demo.html`). Token names and component behaviors match.

---

## 0) Design intent

- **Mood:** calm, outdoorsy, “warm summer afternoon under treetops”.
- **Hierarchy:** the map and content stay in focus; UI chrome stays quiet.
- **Contrast:** ensure clear readability without harsh “pure black on pure white”.
- **Consistency:** unify the app via shared tokens (colors, radii, spacing, typography), not ad-hoc styling.

---

## 1) Color system

### 1.1 Tokens (canonical source of truth)

**Neutrals**
- `--bg`: `#F4F6F1` — warm paper background
- `--surface`: `#FFFFFF` — cards, sheets, primary surfaces
- `--surface-2`: `#EEF3EE` — subtle tinted surfaces (forms, sub-panels)
- `--text`: `#131815` — primary text
- `--muted`: `#5B675F` — secondary text
- `--border`: `#D7DED5` — separators and borders

**Brand**
- `--primary`: `#1F3A2D` — pine (navigation, selected outlines, emphasis)
- `--primary-hover`: `#254535` — hover state for primary buttons
- `--accent`: `#FF6A2B` — control orange (focus rings, primary CTAs, map highlights)

**Semantics**
- `--success`: `#2F7D4C`
- `--warning`: `#C98A1A`
- `--danger`: `#C2413A`

**Map overlay surfaces**
- `--glass`: `rgba(255,255,255,0.82)` — floating panels above maps
- `--glass-border`: `rgba(31,58,45,0.14)` — subtle border for glass panels

**Selected state**
- `--selected-bg`: `rgba(31,58,45,0.08)` — subtle pine tint background for selected rows/chips

### 1.2 Usage rules (prevents visual chaos)

- **Primary (pine)** is used for navigation, headings, emphasis text, and selected outlines.
- **Accent (orange)** is the only “loud” color:
  - primary call-to-action buttons
  - focus rings
  - “current position” marker / active selection highlight on maps
  - “start” or “go” actions
- **Danger (red)** is for destructive actions and danger banners only. Never use red as a general highlight.
- **Non-map pages:** use solid surfaces (`--surface`, `--surface-2`) on `--bg`.
- **Map pages:** controls float on `--glass` panels; avoid solid opaque blocks that cover the map.

---

## 2) Typography

### 2.1 Font

- Use system UI (`ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial...`).
- Optional: Inter if already shipped; do not mix multiple UI fonts.

### 2.2 Type scale (keep it consistent)

- `Title`: 22px / 28px, semibold (~650)
- `Section header (H2)`: 18px / 24px, semibold
- `Body`: 15–16px / 22px
- `Caption`: 12–13px / 16px, medium/regular, uses `--muted`

**Rule:** do not invent random sizes/weights. Always snap to the scale.

---

## 3) Spacing, radii, layout

### 3.1 Spacing

- Use an **8px grid**.
- Common paddings: 8 / 12 / 16 / 24 / 32.
- Button/input heights: **40–44px**.

### 3.2 Corner radii

- Cards / sheets: `14px` (`--r-card`)
- Buttons / inputs: `12px` (`--r-control`)
- Chips: `999px` (`--r-pill`)

### 3.3 Layout patterns

**Non-map pages (card-on-paper)**
- Background `--bg`
- Primary content in `--surface` cards
- Sections separated by spacing + subtle dividers

**Map pages (canvas + floating controls)**
- Map is the background canvas
- Controls are limited, concentrated, and placed in floating `--glass` panels

---

## 4) Elevation and borders

- Prefer **border + soft shadow** for standard cards.
- Glass overlays use **shadow + hairline border**, optionally `backdrop-filter: blur(10px)` if performance allows.

**Shadow tokens (example)**
- `--shadow-1`: `0 8px 24px rgba(19,24,21,0.08)` — cards
- `--shadow-2`: `0 14px 38px rgba(19,24,21,0.12)` — floating overlays

**Rule:** use one consistent shadow language app-wide. Avoid mixing multiple elevation styles.

---

## 5) Interaction states & accessibility

### 5.1 Focus

- All interactive elements must show a visible `:focus-visible` ring.
- Use accent focus ring:
  - `--focus-ring`: `0 0 0 4px rgba(255,106,43,0.35)`

### 5.2 Hover / active

- Hover should be subtle: a light tint (`rgba(primary, ~0.06)`) or slight darken.
- Active state can include a small `translateY(1px)` press effect for buttons.

### 5.3 Selected state

Prefer **shape + subtle tint**, not loud fills:
- Selected list row:
  - background = `--selected-bg`
  - left bar or outline in `--primary`
- Selected chip:
  - background = `--selected-bg`
  - border slightly stronger

### 5.4 “Dramatic action” signaling

- Destructive actions must use `Danger` styling plus confirmation (dialog or “hold to confirm”).
- Avoid using accent (orange) for destructive. Accent means “go/primary”, not “danger”.

---

## 6) Components

This section defines what components must exist and how they look/behave. Class names below match the HTML demo; adapt to your framework (Tailwind, CSS modules, etc.) while preserving the behavior.

### 6.1 Buttons

Variants:
- **Primary** (`.btn.primary`): pine fill, white text
- **Secondary** (`.btn.secondary`): white fill, pine border + pine text
- **Ghost** (`.btn.ghost`): transparent, pine text; hover adds subtle tinted bg
- **Danger** (`.btn.danger`): danger fill, white text

Rules:
- Height: ~42px
- Radius: `--r-control`
- Must support `:focus-visible` using `--focus-ring`

### 6.2 Icon buttons

- Size: 42x42px
- Rounded square (`--r-control`)
- Border: subtle pine tint
- Used for map controls, toolbars, compact actions

### 6.3 Inputs (text, select, textarea)

- Height: 44px (inputs/select)
- Border: subtle pine tint
- Focus: orange ring (`--focus-ring`) + border color shift toward accent

### 6.4 Chips (filters/layers/tags)

- Pill shape (`--r-pill`), height ~34px
- Default: light neutral background
- Selected: `--selected-bg`, slightly stronger border
- Use chips for filters, categories, map layers, track sets.

### 6.5 Lists and rows

- Lists have a border + rounded corners
- Rows have separators
- Selected row uses:
  - background `--selected-bg`
  - left bar in `--primary`

### 6.6 Alerts / banners

Types:
- **Info**: pine-tinted neutral
- **Warning**: warning-tinted
- **Danger**: danger-tinted

Rules:
- Alerts should be rare and meaningful
- Danger alerts should almost always pair with a danger button or explicit confirmation

---

## 7) Map-specific UI rules

Maps contain high-frequency detail and strong utilitarian colors. Map UI must remain legible over any background.

### 7.1 Overlay panels (glass)

- Use `--glass` background and `--glass-border`
- Rounded corners like cards
- Shadow: `--shadow-2`
- Optional blur: `backdrop-filter: blur(10px)`

### 7.2 Markers and critical overlays

Any critical marker (current position, selection, tapped point) must use a **halo strategy**:
- Inner fill: `--accent` or `--primary`
- Outer halo: white/near-white outline (3–4px)
- Add subtle shadow for separation

This ensures readability over purple course lines, greens, blues, browns, and contour lines.

### 7.3 Branding restraint on the map

- Do not recolor the orienteering map to match the brand.
- Only map overlays (markers, selection highlights, active tools) use brand colors.

---

## 8) Non-map pages should feel the same as map pages

The “shared feel” comes from:
- identical tokens (colors, radii, shadows, typography)
- consistent control styling (buttons, inputs, chips)
- calm use of color (pine + orange restraint)

**Difference is only the surface strategy:**
- On non-map pages: solid surfaces (`--surface`, `--surface-2`) on `--bg`
- On map pages: translucent surfaces (`--glass`) floating above the map

Everything else remains the same.

---

## 9) Implementation checklist (minimal)

- [ ] Implement the token set exactly (names + values).
- [ ] Ensure all screens use only token colors (no ad-hoc hex values).
- [ ] Standardize radii, spacing, and type scale.
- [ ] Define button variants and ensure focus rings work.
- [ ] Implement selected states (list rows + chips) via tint + shape.
- [ ] Map overlays use glass panels; markers use halo strategy.
- [ ] Add a “Styleguide” internal route/page rendering each component in isolation.

---

## 10) Reference demo

Use the accompanying `styleguide-demo.html` as the visual reference for:
- token values
- component behavior (hover/focus/selected)
- glass panel styling
- halo marker strategy
- list row selection patterns
