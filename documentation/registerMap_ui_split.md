## registerMap UI split (desktop vs mobile)

### Why this split exists
`registerMap` used to be a single page that contained **both desktop and mobile layout/UX**, controlled mainly by large breakpoint-specific CSS and some shared JS. In practice, this made it easy to introduce regressions: a change intended for one platform often affected the other due to shared DOM structure, selectors, and initialization code.

The split is intentionally **not “DRY for its own sake”**. The goal is to keep:
- **Desktop UI work isolated** from mobile UI work.
- **Mobile layout/navigation (tabs) isolated** from desktop layout.
- **Shared registration logic** shared (stores, controllers, API calls), so core behavior remains consistent and changes are made once.

### High-level structure
- **Router entry page**: `registerMap.html`
  - Redirects once to `registerMap.desktop.html` or `registerMap.mobile.html`.
  - Optional override for testing: `?platform=desktop` or `?platform=mobile`.

- **Platform pages**
  - `registerMap.desktop.html`
  - `registerMap.mobile.html`

These pages are allowed to diverge in markup and layout to better match the UX of each platform, but they **keep the same critical element IDs** so shared JS modules can be reused safely.

### CSS philosophy
CSS is split into “shared” and “platform layout”:
- **Shared**: `css/register-map.base.css`
  - Tokens, form controls, markers, overlay wrapper/canvas/layer styles.
  - Anything that should look/function the same on both platforms.
- **Desktop-only**: `css/register-map.desktop.css`
  - Desktop layout, sticky header/palettes, side-by-side views.
- **Mobile-only**: `css/register-map.mobile.css`
  - The tabbed layout and viewport-locked behaviors for mobile.

This keeps large, platform-specific layout rules out of shared styles.

### JS philosophy
JS is split into **platform entrypoints** + a **shared initializer**:
- **Shared initializer**: `js/registerMap/initRegisterMapApp.js`
  - Creates stores, controllers, palettes, register actions, file handling, and existing-map loading.
  - Platform-neutral: it does not contain mobile tab logic or desktop-only layout behavior.
- **Desktop entry**: `js/registerMap/main.desktop.js`
  - Desktop-only glue (currently: sticky palette offset calculation).
- **Mobile entry**: `js/registerMap/main.mobile.js`
  - Mobile-only glue (currently: bottom-tab navigation and "advance to terrain tab" behavior).

Most controllers remain shared:
- `js/registerMap/controllers/*` (including overlay pan/zoom + marker managers)
- `js/registerMap/services/*`
- `js/registerMap/state/*`
- `js/registerMap/actions/*`

### How to extend this safely
- **If it’s a layout/navigation change**: do it in the platform HTML/CSS (`registerMap.desktop.html` + `register-map.desktop.css`, or `registerMap.mobile.html` + `register-map.mobile.css`).
- **If it’s core registration behavior** (data flow, API payloads, marker storage, etc.): change shared modules and keep IDs stable.
- **If it’s platform-specific interaction tuning** (e.g. later differences in overlay panning/zooming thresholds):
  - Prefer adding a thin platform-specific wrapper/config layer rather than sprinkling `if (isMobile)` checks throughout shared gesture/interaction code.

