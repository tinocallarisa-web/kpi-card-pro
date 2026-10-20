# KPI Card Pro

**KPI cards with status, prior-period variance, target, trend line and small multiples for Power BI.**

> Developed by [TCViz](https://tcviz.com) — Custom Visuals for Power BI

[![AppSource](https://img.shields.io/badge/AppSource-Published-0078D4?logo=microsoft)](https://marketplace.microsoft.com/en-us/product/tino_callarisa.kpicard-pro?tab=Overview)
[![Power BI API](https://img.shields.io/badge/API-5.11.0-yellow)](https://github.com/microsoft/powerbi-visuals-api)
[![Version](https://img.shields.io/badge/version-2.3.0.0-brightgreen)](pbiviz.json)
[![License](https://img.shields.io/badge/License-Proprietary-red)](https://tinocallarisa-web.github.io/kpi-card-pro/terms.html)

📖 **[Documentation & Support](https://tinocallarisa-web.github.io/kpi-card-pro/support.html)** ·
🎬 **[Video walkthrough](https://www.youtube.com/watch?v=4fP7zYKnhWo)** ·
📝 **[Changelog](https://tinocallarisa-web.github.io/kpi-card-pro/changelog.html)**

---

## Overview

Drop a measure into **Value** and you have a card, in the number format of your model. Add
**Prior Period** and it shows the variance with a direction arrow. Add **Target** and switch on
**Color rules** to colour the number, the background or the border on track, warning or off track. Add a date to **Trend** and the card
grows a trend line — and can compare periods by itself, with no date table and no DAX. Add a
category to **Small Multiples** and the single card becomes a grid, one card per category. Add up
to three **Secondary KPIs** to show supporting figures beside the headline.

New in 2.2: click a trend point to filter by that period; selection drawn on the card; six style
templates; a setup guide inside the visual (edit mode only); format on the canvas; a layout that
adapts to the size of the visual; screen-reader summaries and keyboard navigation through cards and
trend points; the Format pane in twelve languages.

## Data roles

| Well | Type | What it does |
|---|---|---|
| **Value** | Measure | The number on the card. Required. |
| **Prior Period** | Measure | Comparison value: variance percentage, arrow and the "Prior:" line. |
| **Target** | Measure | A goal, shown on the card and drawn on the trend line. |
| **Image** | Measure (First) | A Base64 data URI shown top-right of each card. External URLs are rejected. |
| **Small Multiples (Pro)** | Grouping | One card per category, up to 50. |
| **Trend (Pro)** | Grouping | A date or ordered period. Draws a trend line inside each card. |
| **Tooltips (Pro)** | Measures | Extra figures shown on hover. |
| **Secondary KPIs (Pro)** | Measures (up to 3) | Supporting figures beside the main value, each with its variance. |
| **Secondary KPIs prior (Pro)** | Measures | Comparison for each secondary KPI, paired by position. |

## Number formats

Every figure uses the format string of its own measure and the report's language through Power
BI's `valueFormatter`: currency, percentage, separators and decimal mark. Display Units scale on top
of that format (a percentage is never scaled); Decimal Places applies only once you change it.
Dynamic format strings are declared and used when Power BI sends a per-value format.

## Free vs Pro

The card is fully functional without a licence. Settings that need one carry **(Pro)** in the
format pane.

| Feature | Free | Pro |
|---|---|---|
| KPI card with value, variance, arrow, invert logic and target | ✓ | ✓ |
| Model number formats, display units, decimal places, label styling | ✓ | ✓ |
| Card background and border colour, images | ✓ | ✓ |
| Native and modern tooltips, cross-filtering, cross-highlighting, bookmarks, context menu | ✓ | ✓ |
| Keyboard navigation, screen-reader summaries, high contrast | ✓ | ✓ |
| Style templates, setup guide, size-adaptive layout, format on the canvas | ✓ | ✓ |
| **Color rules** — on track / warning / off track on target, prior or the value itself | ✗ | **✓** |
| **Trend line** — area, line or bars, target per period, hover values, period comparisons | ✗ | **✓** |
| **Small Multiples** — up to 50 cards, 1–6 columns, category titles | ✗ | **✓** |
| **Secondary KPIs** — up to 3, auto layout | ✗ | **✓** |
| **Prefix and suffix** on the main value | ✗ | **✓** |
| **Variance pill** and custom variance colours | ✗ | **✓** |
| **Extra measures in tooltips** | ✗ | **✓** |
| **Border width, radius, padding, drop shadow** | ✗ | **✓** |

Without a licence, in edit mode, a Pro feature is drawn working under a "Pro preview" watermark and
Power BI shows its licence notification. Reading view shows the free result.

## Formatting pane reference

- **Card** — Background, Border Colour · *(Pro)* Border Width, Border Radius, Padding, Drop Shadow
- **Main Value** — Font family, size, bold, colour, display units, decimal places · *(Pro)* Prefix, Suffix
- **Label (single card)** — Show, font family, size, bold, colour
- **Variance** — Show, invert, show arrow, font size · *(Pro)* positive / negative / neutral colours, Show as Pill
- **Color rules (Pro)** — Show, compare with target, prior or the value itself, lower and upper threshold, lower is better, colours, apply to the value, an accent bar, the background or the border, show status text
- **Style template** — Classic, Clean, Bold, Minimal, Soft, Midnight; setup guide on or off
- **Prior & Target** — Show, font family, size, colour
- **Value & comparison** — Value shows (total, latest point, last N points), window size, compare against, show period label
- **Secondary KPIs (Pro)** — Show, position (auto / right / bottom), min width beside value, show variance, text sizes and colours
- **Image** — Show, height, corner radius
- **Trend (Pro)** — Show, chart type, colour, line width, area opacity, height, last-point marker, target line and colour
- **Small Multiples (Pro)** — Columns, gap, category title font, size, bold, colour
- **Accessibility** — High contrast handling, visual title announced to screen readers

## Build from source

```bash
# Requirements: Node.js 18+, powerbi-visuals-tools (pbiviz)
npm install

npm run eslint                       # the lint command certification runs
npx pbiviz package                   # production .pbiviz, output in dist/

node build-test.js                   # test build, isPro forced, guid ..._test
node build-test.js --free            # test build, real Free tier, guid ..._testfree
```

The `--free` build is the only way to exercise the free path: with the production GUID, Power BI
serves the version installed from AppSource rather than yours.

## Project structure

```
kpiCardPro/
├── src/
│   ├── visual.ts          # rendering, formatting, licensing, interactions
│   └── settings.ts        # formatting model
├── stringResources/       # en-US and es-ES
├── assets/
├── docs/                  # served by GitHub Pages: support, privacy, terms, changelog,
│                          # infographic and release deliverables
├── scripts/build-changelog.js
├── capabilities.json
├── pbiviz.json
└── build-test.js
```

## Licensing and privacy

Licensing is handled entirely through Microsoft AppSource using the official
`IVisualLicenseManager` API (plan `kpi-card-pro-tcviz`). There is no external account, no separate
payment system and no licence server. Resolution is asynchronous and never blocks rendering; both
Active and Warning licence states are honoured.

All calculation and rendering happens inside Power BI. The visual makes no network calls of any
kind and stores nothing outside the report. See the
[Privacy Policy](https://tinocallarisa-web.github.io/kpi-card-pro/privacy.html) and the
[Terms of Use](https://tinocallarisa-web.github.io/kpi-card-pro/terms.html).

**Commercial software.** Source is published for AppSource review transparency. Redistribution is
not permitted.

## Support

- 📖 [Documentation](https://tinocallarisa-web.github.io/kpi-card-pro/support.html)
- 📧 [support@tcviz.com](mailto:support@tcviz.com)
