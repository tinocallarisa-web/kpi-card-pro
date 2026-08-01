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
5. Use a dimension field in **Small Multiples** (Pro) to split into multiple cards.

---

## TEXT BOX 3 — Bloque "Field Wells"

**Field Wells**

• **Value** (required) — The main KPI measure. Example: Total Sales, Revenue, Headcount.
• **Prior Period** (optional) — A measure for the previous period. The visual calculates variance % automatically.
• **Target** (optional) — A budget or target measure displayed below the main value.
• **Small Multiples** (optional, Pro) — A category dimension (e.g. Region, Product) to render one card per member, up to 50 cards.
• **Tooltips** (optional, Pro) — Up to 10 additional measures shown in the tooltip on hover.

---

## TEXT BOX 4 — Bloque "Format Pane"

**Format Pane — Quick Reference**

• **Card** — Background color, border color/width/radius, padding, drop shadow.
• **Main Value** — Font family, size, bold, color, display units (Auto / K / M / B), decimal places, prefix and suffix (Pro).
• **Label** — Show/hide the metric name, font size, color.
• **Variance** — Show/hide, positive/negative/neutral colors, invert logic (for cost metrics where lower = better), arrow, pill style (Pro).
• **Small Multiples** — Columns (1–6), gap between cards, category title font and color.
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
| Small Multiples (up to 50) | ❌ | ✅ |
| Prefix / Suffix | ❌ | ✅ |
| Variance pill style | ❌ | ✅ |
| Custom variance colors | ❌ | ✅ |
| Extended tooltips (up to 10 measures) | ❌ | ✅ |
| Multi-column layout | ❌ | ✅ |

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

---

## TEXT BOX 7 — Bloque "Example Configurations"

**Example Configurations**

**Sales Dashboard:**
Value = Total Revenue | Prior Period = Revenue LY | Target = Revenue Budget | Small Multiples = Region

**HR Overview:**
Value = Headcount | Prior Period = Headcount Previous Month | Target = Headcount Plan

**Finance KPI:**
Value = EBITDA | Prefix = $ | Display Units = Millions | Invert = OFF

**Cost Tracking:**
Value = Total Costs | Prior Period = Costs LY | Invert = ON (lower is better)
