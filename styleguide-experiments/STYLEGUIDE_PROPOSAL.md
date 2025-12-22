# Visual Design Proposal: "Forest Shade"

## 1. Design Philosophy
The visual profile is built around the concept of a **"Sunny but Shaded Glen"**. Ideally, the app feels like taking a rest in the cool shade of a dense forest on a warm summer day. It balances the **peaceful** nature of the forest with the **focused** energy of an orienteering run.

### Core Attributes:
-   **Immersive:** Uses deep, natural tones to minimize screen glare and blend with the outdoor environment.
-   **Organic:** Soft shapes and rounded corners that mimic natural forms rather than strict industrial sharp edges.
-   **Clear:** High contrast for readability, specifically designed to coexist with complex orienteering maps without clashing.
-   **Warmth:** "Sunlight" accent colors guide the user's attention, evoking the feeling of sun breaking through the canopy.

---

## 2. Color Palette

The app utilizes a single unified theme (no light/dark mode switch) to maintain a consistent atmosphere.

### Base Colors (The Shade)
These colors form the foundation of the interface.
-   **Deep Forest (Background):** `#1A2621`
    -   *Usage:* Main page background. A very dark, desaturated green-grey. Darker than a typical "slate" to feel organic.
-   **Canopy Green (Surface/Cards):** `#25362E`
    -   *Usage:* Cards, sidebars, modals, floating panels. Slightly lighter than background to create depth.
-   **Moss Border (Separators):** `#3A5245`
    -   *Usage:* Borders, dividers, inactive input outlines.

### Typography Colors
-   **Mist White (Primary Text):** `#F0F4F1`
    -   *Usage:* Headings, body text. Softened white to reduce eye strain in the "shade".
-   **Lichen Grey (Secondary Text):** `#A3B8AD`
    -   *Usage:* Subtitles, helper text, metadata.

### Action Colors (The Sunlight)
-   **Sunlight Gold (Primary Action):** `#F2C94C`
    -   *Usage:* Primary buttons, active states, toggles. Represents the sun hitting the forest floor.
-   **Sunlight Hover:** `#F5D575`
    -   *Usage:* Hover state for primary actions.
-   **Warm Earth (Destructive/Alert):** `#D97D54`
    -   *Usage:* Delete buttons, error messages, "Dramatic things happen here". A warm terracotta/clay color that fits nature but signals caution.

### Map Overlay Specifics
When interacting with the map, the UI must ensure visibility against the busy, multi-colored orienteering map (White, Yellow, Green, Blue, Brown, Black, Magenta).
-   **Map Controls Background:** `rgba(26, 38, 33, 0.9)` (Deep Forest with opacity)
    -   *Reason:* Provides a solid backdrop for icons so they are readable against any map terrain.
-   **Map Active State:** Use **Sunlight Gold** for the active tool icon, but ensure it has a dark backing if it floats directly on the map.

---

## 3. Typography

**Font Family:** System Sans-Serif stack (Apple System, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial).
-   *Reasoning:* Native fonts load instantly and feel "focused" and performant.
-   *Styling:*
    -   **Headings:** Normal weight (400-600), let color and size do the work.
    -   **Body:** Readable size (16px base).

---

## 4. UI Elements & Shapes

### Shape Language
-   **Rounded Corners:** Generous border radiuses to feel organic.
    -   *Cards/Panels:* `12px` or `16px`.
    -   *Buttons:* `8px` (Standard) or `24px` (Pill/Capsule style for small toggles).
    -   *Inputs:* `8px`.

### Buttons
-   **Primary Button:**
    -   Background: Sunlight Gold (`#F2C94C`)
    -   Text: Deep Forest (`#1A2621`) - *Note: Dark text on gold for accessibility/contrast.*
    -   Style: Semi-bold, solid flat color, soft shadow (`0 2px 4px rgba(0,0,0,0.2)`).
-   **Secondary/Ghost Button:**
    -   Background: Transparent
    -   Border: 1px solid Moss Border (`#3A5245`)
    -   Text: Mist White (`#F0F4F1`)
    -   Hover: Slight background fill (`rgba(255,255,255,0.05)`).

### Menus & Panels
-   **Glassmorphism (Optional/Subtle):** Backdrop blur can be used for overlays on top of maps to maintain context, but keep opacity high (90%+) to ensure readability.
-   **Elevation:** Use shadows to lift panels off the "forest floor".
    -   `box-shadow: 0 4px 12px rgba(0,0,0,0.3)`

---

## 5. Implementation Notes for Maps

-   **Floating Action Buttons (FABs):** Circular buttons for map tools (Zoom, Location, Layers).
    -   Background: Deep Forest.
    -   Icon: Mist White (Inactive) / Sunlight Gold (Active).
-   **Track Lists / Selections:**
    -   Selected items should have a "glow" or a left-border strip in Sunlight Gold to indicate selection without overwhelming the text.

