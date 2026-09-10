# KPI Card Pro — Tips & Hints (Sample File)

Copia estos textos como Text Boxes en Power BI Desktop dentro del archivo .pbix de muestra.
Crea una página llamada "Tips & Hints" o "How to use" y añade un bloque por sección.

---

## TEXT BOX 1 — Título de página (encabezado grande)

KPI Card Pro — How to use this visual

---

## TEXT BOX 2 — Bloque "Getting Started"

**Getting Started**

1. Add KPI Card Pro to your report page.
2. Drag a measure to the **Value** field well — the card renders immediately.
3. Optionally add a **Prior Period** measure to see variance vs. previous period.
4. Optionally add a **Target** measure to display target tracking.
5. Add a date to **Trend** (Pro) and the card grows a trend line.
6. Use a dimension field in **Small Multiples** (Pro) to split into multiple cards, each with
   its own line.
7. Bind a Base64 image column to **Image** to show a logo on each card.

---

## TEXT BOX 3 — Bloque "Field Wells"

**Field Wells**

• **Value** (required) — The main KPI measure. Example: Total Sales, Revenue, Headcount.
• **Prior Period** (optional) — A measure for the previous period. The visual calculates variance % automatically.
• **Target** (optional) — A budget or target measure displayed below the main value.
• **Small Multiples** (optional, Pro) — A category dimension (e.g. Region, Product) to render one card per member, up to 50 cards.
• **Trend** (optional, Pro) — A date or ordered period. Draws the trend line inside each card.
• **Image** (optional) — A column with a Base64 data URI (`data:image/png;base64,...`), shown
  top-right of the card. Set the aggregation to *First*. External URLs are rejected.
• **Tooltips** (optional) — Additional measures shown on hover. The extra measures are Pro.

---

## TEXT BOX 4 — Bloque "Format Pane"

**Format Pane — Quick Reference**

• **Card** — Background color, border color/width/radius, padding, drop shadow.
• **Main Value** — Font family, size, bold, color, display units (Auto / K / M / B), decimal places, prefix and suffix (Pro).
• **Label (single card)** — Show, font family, size, bold, color. Governs the name above the
  number *when there is one card*; with Small Multiples that text is governed by that card.
• **Variance** — Show/hide, positive/negative/neutral colors, invert logic (for cost metrics where lower = better), arrow, pill style (Pro).
• **Trend (Pro)** — Show, chart type (area / line / bar), color, line width, area opacity,
  height, last-point marker, target line and its color.
• **Image** — Show, height, corner radius.
• **Prior & Target** — Show, font family, size and color of the "Prior:" / "Target:" line.
• **Small Multiples (Pro)** — Columns (1–6), gap, category title with font, size, bold and color.
• **Accessibility** — High Contrast mode toggle, custom ARIA title for screen readers.

---

## TEXT BOX 5 — Bloque "Free vs Pro"

**Free vs. Pro**

| Feature | Free | Pro |
|---|---|---|
| Single KPI card | ✅ | ✅ |
| Prior Period variance | ✅ | ✅ |
| Target display | ✅ | ✅ |
| Tooltips (native) | ✅ | ✅ |
| Variance colors and invert logic | ✅ | ✅ |
| Image per card | ✅ | ✅ |
| Bookmarks, keyboard, high contrast | ✅ | ✅ |
| **Trend line inside the card** | ❌ | ✅ |
| Small Multiples (up to 50) | ❌ | ✅ |
| Multi-column layout | ❌ | ✅ |
| Prefix / Suffix | ❌ | ✅ |
| Variance pill style | ❌ | ✅ |
| Extended tooltip measures | ❌ | ✅ |
| Card border, radius, padding, shadow | ❌ | ✅ |

To unlock Pro features, get a license from Microsoft AppSource.

---

## TEXT BOX 6 — Bloque "Tips"

**Tips & Best Practices**

• Use **Auto** display units to handle values from hundreds to billions without manual configuration.
• For cost or effort metrics where a decrease is positive, enable **Invert (Lower is Better)** in the Variance section.
• In Small Multiples mode, set columns to match the number of categories for a clean row layout.
• Use **Prefix** ($, €) and **Suffix** (%, pts) to give the value instant context without changing the measure format.
• Enable **High Contrast Mode** in the Accessibility section to meet WCAG 2.1 requirements.
• Right-click any card to access the Power BI context menu (drill-through, spotlight, export data).
• In **Trend**, use a real date column. A month stored as text would be ordered alphabetically.
• The target line is drawn period by period, so it follows a target that changes over time.

---

## TEXT BOX 7 — Bloque "Example Configurations"

**Example Configurations**

**Sales Dashboard:**
Value = Total Revenue | Prior Period = Revenue LY | Target = Revenue Budget |
Trend = Date | Small Multiples = Region | Image = Region logo (Base64)

**HR Overview:**
Value = Headcount | Prior Period = Headcount Previous Month | Target = Headcount Plan

**Finance KPI:**
Value = EBITDA | Prefix = $ | Display Units = Millions | Invert = OFF

**Cost Tracking:**
Value = Total Costs | Prior Period = Costs LY | Invert = ON (lower is better)
