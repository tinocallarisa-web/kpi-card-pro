# KPI Card Pro

**KPI card with prior-period variance, target, trend line and small multiples for Power BI.**

> Developed by [TCViz](https://tcviz.com) — Custom Visuals for Power BI

[![AppSource](https://img.shields.io/badge/AppSource-Published-0078D4?logo=microsoft)](https://appsource.microsoft.com)
[![Power BI API](https://img.shields.io/badge/API-5.10.0-yellow)](https://github.com/microsoft/powerbi-visuals-api)
[![Version](https://img.shields.io/badge/version-1.2.0.0-brightgreen)](pbiviz.json)
[![License](https://img.shields.io/badge/License-Proprietary-red)](https://tinocallarisa-web.github.io/kpi-card-pro/terms.html)

📖 **[Documentation & Support](https://tinocallarisa-web.github.io/kpi-card-pro/support.html)**

---

## Overview

Drop a measure into **Value** and you have a card. Add **Prior Period** and it shows the variance
as a percentage with a direction arrow and the prior figure underneath. Add **Target** to track
against a goal. Add a date to **Trend** and the card grows a trend line. Add a category to
**Small Multiples** and the single card becomes a grid, one card per category — each with its own
line.

Variance colours are configurable and can be inverted, for metrics where lower is better — cost,
defects, churn.

## Data roles

| Well | Type | What it does |
|---|---|---|
| **Value** | Measure | The number on the card. Required. |
| **Prior Period** | Measure | Comparison value. Enables the variance percentage, the arrow and the "Prior:" line. |
| **Target** | Measure | A goal to compare against. |
| **Small Multiples (Pro)** | Grouping | One card per category, up to 50. Without a licence only the first category renders. |
| **Trend (Pro)** | Grouping | A date or ordered period. Draws a trend line inside each card over this axis. |
| **Tooltips** | Measures | Extra figures shown on hover. |

## Quick start

1. Add the visual to the report canvas.
2. Drag a measure into **Value**.
3. Optionally add **Prior Period**, **Target**, a date in **Trend**, and a category field in
   **Small Multiples**.

Use a real date column in **Trend**. A text month would be ordered alphabetically; a numeric
period is reordered by the visual so the line reads left to right in time.

## Free vs Pro

The card is fully functional without a licence. Settings that need one carry **(Pro)** in the
format pane.

| Feature | Free | Pro |
|---|---|---|
| KPI card with value, variance and target | ✓ | ✓ |
| Display units, decimal places, label styling | ✓ | ✓ |
| Card background and border colour | ✓ | ✓ |
| Variance colours, invert logic, direction arrow | ✓ | ✓ |
| Native tooltips, cross-filtering, context menu | ✓ | ✓ |
| Keyboard focus, ARIA labels, high contrast | ✓ | ✓ |
| **Trend line** inside the card — area, line or bars, with the target marked | ✗ | **✓** |
| **Small Multiples** — up to 50 cards, columns and titles | ✗ | **✓** |
| **Prefix and suffix** on the main value | ✗ | **✓** |
| **Variance pill** style | ✗ | **✓** |
| **Extra measures in tooltips** | ✗ | **✓** |
| **Border width, radius, padding, drop shadow** | ✗ | **✓** |

Changing a `(Pro)` setting without a licence leaves the card on the free result and raises Power
BI's own notification, which links to the licence. The setting is stored and applies as soon as
the licence is active.

## Formatting pane reference

- **Card** — Background, Border Colour · *(Pro)* Border Width, Border Radius, Padding, Drop Shadow
- **Main Value** — Font family, size, bold, colour, display units, decimal places · *(Pro)* Prefix, Suffix
- **Label** — Show, font size, colour
- **Variance** — Show, positive / negative / neutral colours, invert, show arrow, font size · *(Pro)* Show as Pill
- **Trend (Pro)** — Show, chart type (area / line / bar), colour, line width, area opacity, height, last-point marker, target line
- **Small Multiples (Pro)** — Columns, gap, category title with its font size and colour
- **Accessibility** — High contrast handling, visual title announced to screen readers

## Build from source

```bash
# Requirements: Node.js 18+, pbiviz tools v7.0.3
npm install

npm start                            # dev server, live reload in Power BI Desktop
npx pbiviz package                   # production .pbiviz, output in dist/

node build-test.js                   # test build, isPro forced, guid ..._test
node build-test.js --free            # test build, real Free tier, guid ..._testfree
node build-test.js --free --debug    # adds the licence diagnostic overlay
```

The `--free` build is the only way to exercise the free path: with the production GUID, Power BI
serves the version installed from AppSource rather than yours.

## Project structure

```
kpiCardPro/
├── src/
│   ├── visual.ts          # rendering, licensing, interactions
│   └── settings.ts        # formatting model
├── style/visual.less
├── assets/
├── privacy.html           # served at /kpi-card-pro/privacy.html
├── support.html           # served at /kpi-card-pro/support.html
├── terms.html             # served at /kpi-card-pro/terms.html
├── docs/                  # infographic and release deliverables
├── capabilities.json
├── pbiviz.json
└── build-test.js
```

The three public pages live in the repository root and are served by GitHub Pages from there.

## Licensing and privacy

Licensing is handled entirely through Microsoft AppSource using the official
`IVisualLicenseManager` API (plan `kpi-card-pro-tcviz`). There is no external account, no separate
payment system and no licence server. Resolution is asynchronous and never blocks rendering; both
Active and Warning licence states are honoured.

All calculation and rendering happens inside Power BI. The visual makes no network calls of any
kind and stores nothing outside the report.
See the [Privacy Policy](https://tinocallarisa-web.github.io/kpi-card-pro/privacy.html) and the
[Terms of Use](https://tinocallarisa-web.github.io/kpi-card-pro/terms.html).

**Commercial software.** Source is published for AppSource review transparency. Redistribution is
not permitted.

## Support

- 📖 [Documentation](https://tinocallarisa-web.github.io/kpi-card-pro/support.html)
- 🐛 [Report a bug](https://github.com/tinocallarisa-web/kpi-card-pro/issues)
- 📧 [support@tcviz.com](mailto:support@tcviz.com)
