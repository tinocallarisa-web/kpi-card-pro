# KPI Card Pro

**Multi-metric KPI card with trend, target and variance for Power BI executive dashboards.**

> Developed by [TCViz](https://tcviz.com) — Custom Visuals for Power BI

[![AppSource](https://img.shields.io/badge/AppSource-Published-0078D4?logo=microsoft)](https://appsource.microsoft.com)
[![Power BI API](https://img.shields.io/badge/API-5.10.0-yellow)](https://github.com/microsoft/powerbi-visuals-api)
[![License](https://img.shields.io/badge/License-Proprietary-red)](docs/terms.html)

---

## Overview

KPI Card Pro displays current value, prior-period, target, variance and a compact sparkline inside a single tile, with conditional formatting across all elements. Designed for executive dashboards that need information density without visual clutter.

![KPI Card Pro Screenshot](assets/screenshot.png)

---

## Features

| # | Feature | Free | Pro |
|---|---------|:----:|:---:|
| F01 | Metrics per card | 1 | Up to 6 |
| F02 | Target lines & variance pills | — | ✅ |
| F02 | Sparkline (line, area, bar) | Basic | ✅ |
| F03 | High-contrast & accessibility color scales | ✅ | ✅ |
| F04 | Tooltip drill-through with custom payload | — | ✅ |
| F05 | Documented measure contract | ✅ | ✅ |
| F06 | Formatting pane parity (Desktop & Service) | ✅ | ✅ |
| F07 | Bookmark persistence | ✅ | ✅ |
| F08 | Context menu on empty space | ✅ | ✅ |

---

## Data Roles (Measure Contract)

| Role | Kind | Required | Description |
|------|------|----------|-------------|
| **Value** | Measure | ✅ Yes | Current period KPI value(s). Up to 6 measures (Pro). |
| **Prior Period** | Measure | No | Previous period for % and absolute variance. |
| **Target** | Measure | No | Goal/budget value. Shown as dashed line in sparkline (Pro). |
| **Category** | Grouping | No | Time dimension for sparkline chart. |
| **Tooltips** | Measure | No | Additional fields shown in drill-through tooltip (Pro). |

---

## Quick Start

1. **Install** from [Microsoft AppSource](https://appsource.microsoft.com) or import the `.pbiviz` directly
2. **Add** at least one measure to the **Value** field well
3. Optionally add **Prior Period**, **Target**, and **Category** for full functionality
4. **Format** using the Formatting pane (Card, Main Value, Variance, Sparkline, Target, Metrics Layout, Accessibility)

---

## Freemium Model

- **Free** — 1 metric, basic sparkline (area, 20 data points), fixed color scheme. No watermark on the data area.
- **Pro** — Unlock via [Microsoft AppSource](https://appsource.microsoft.com) subscription:
  - Up to 6 metrics with independent formatting
  - Sparkline types: Line, Area, Bar
  - Variance pills with custom positive/negative/neutral colors
  - Target line in sparkline with custom style
  - Tooltip drill-through with custom payload fields
  - Custom color controls across all elements
  - Multi-metric layouts: Single, 2-Column Grid, 3-Column Grid, Horizontal Strip

---

## Formatting Pane Reference

### Card
- Background Color, Border Color, Border Width, Border Radius, Padding, Drop Shadow

### Main Value
- Font (family, size, bold, italic), Color, Display Units, Decimal Places, Prefix, Suffix

### Label
- Show, Custom Text, Font Size, Color

### Variance
- Show, Mode (vs Prior / vs Target / Both), Positive/Negative/Neutral Colors, Invert, Show Arrow, Show as Pill (Pro), Font Size

### Sparkline
- Show, Chart Type (Line/Area/Bar — Pro), Color (Pro), Area Opacity (Pro), Line Width (Pro), Show Last Point Dot, Height

### Target
- Show, Line Color (Pro), Line Style (Pro), Show Label, Label Text

### Metrics Layout
- Layout (Single / 2-Column / 3-Column / Horizontal — Pro), Show Dividers, Divider Color

### Accessibility
- High Contrast Mode, Visual Title (ARIA)

---

## Build from Source

```bash
# Requirements: Node.js 18+, pbiviz tools v7.0.3
npm install -g powerbi-visuals-tools@7.0.3

# Clone and install
git clone https://github.com/tinocallarisa-web/kpi-card-pro.git
cd kpi-card-pro
npm install

# Development server
pbiviz start

# Package for submission
pbiviz package
```

The packaged file will be at `dist/KpiCardPro.pbiviz`.

---

## Project Structure

```
kpi-card-pro/
├── src/
│   ├── visual.ts          # Main visual class
│   └── settings.ts        # Formatting model cards
├── style/
│   └── visual.less        # Visual styles
├── stringResources/
│   ├── en-US/resources.resjson
│   └── es-ES/resources.resjson
├── docs/
│   ├── privacy.html       # Privacy Policy (public URL)
│   └── terms.html         # Terms of Use (public URL)
├── assets/
│   ├── icon.png           # 20×20 visual icon
│   ├── sample-data.csv    # 15 rows × 13 columns
│   └── BUILD-PBIX.md      # Instructions for sample .pbix
├── capabilities.json
├── pbiviz.json
├── tsconfig.json
└── package.json
```

---

## Privacy & Legal

- **Privacy Policy:** https://tinocallarisa-web.github.io/kpi-card-pro/privacy.html
- **Terms of Use:** https://tinocallarisa-web.github.io/kpi-card-pro/terms.html
- The Visual collects **no data** and makes **no external network requests**.
- License verification uses Microsoft's official `IVisualLicenseManager` API.

---

## Support

- 🌐 Website: [tcviz.com](https://tcviz.com)
- 📧 Email: [info@tcviz.com](mailto:info@tcviz.com)
- 🐛 Issues: [GitHub Issues](https://github.com/tinocallarisa-web/kpi-card-pro/issues)

---

© 2025 TCViz. All rights reserved.
