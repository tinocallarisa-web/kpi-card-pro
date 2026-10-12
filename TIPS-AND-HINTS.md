# KPI Card Pro 2.2 — Tips & Hints (Sample File)

Copia estos textos como Text Boxes en Power BI Desktop dentro del archivo .pbix de muestra.
Crea una página llamada "Tips & Hints" o "How to use" y añade un bloque por sección.
Para pegar sin perder formato, usa `docs/TIPS-AND-HINTS-PLAIN.txt` (mismo contenido, sin tablas).

---

## TEXT BOX 1 — Título

KPI Card Pro — How to use this visual

---

## TEXT BOX 2 — Getting Started

1. Add KPI Card Pro to your report page.
2. Drag a measure to the **Value** field well — the card renders immediately.
3. Follow the **setup guide** inside the visual: it lists the optional fields, ticks each one as you
   add it, and lets you pick a style template with one click. It only shows while you edit; reopen it
   from *Format → Style template → Setup guide*.
4. Optional fields: **Prior Period** (variance), **Target** (goal and color rules), **Trend** (Pro, a
   date), **Small Multiples** (Pro, a category), **Secondary KPIs** (Pro).

---

## TEXT BOX 3 — Field Wells

| Well | What it does |
|---|---|
| **Value** (required) | The main KPI measure. |
| **Prior Period** | The previous period; the visual calculates the variance. |
| **Target** | A budget or target, below the value and on the trend line period by period. |
| **Trend** (Pro) | A date or ordered period: trend line; click a point to filter by it. |
| **Small Multiples** (Pro) | One card per category member, up to 50. |
| **Secondary KPIs** (Pro) | Up to three supporting measures beside the value. |
| **Image** | A Base64 data URI, aggregation *First*. Web links are rejected. |
| **Tooltips** (Pro) | Extra measures on hover. |

---

## TEXT BOX 4 — Color rules and templates

- **Color rules (Pro)** compare the value with the Target, the Prior Period or the value itself, with two
  thresholds: on track, warning, off track. Paint the number, an accent bar, the card background or its
  border. *Lower is better* mirrors the logic for costs and churn. The state is also written as text.
- **Style templates** (free): Classic, Clean, Bold, Minimal, Soft, Midnight. A template only fills what
  you have not changed yourself.

---

## TEXT BOX 5 — No date table, no DAX

With a date in Trend, *Format → Value & comparison → Value shows*: **Total of the period**, **Latest
point** (against the previous point, or 12 back for the same month last year) or **Last N points**
(the rolling twelve months). The card prints what it compares — "Dec 2025 vs Nov 2025".

---

## TEXT BOX 6 — Filtering

- Small Multiples: click a card to filter the page; the others dim.
- Trend: click a point of the line to filter by that period (and card).
- Ctrl+click adds, click again removes, click empty space to clear.
- Keyboard: arrows between cards; on the trend line, arrows between points and Enter to filter.

---

## TEXT BOX 7 — Free vs Pro

| Feature | Free | Pro |
|---|---|---|
| Value, variance, target, your number formats, images | ✅ | ✅ |
| Style templates, setup guide, size-adaptive layout | ✅ | ✅ |
| Format on the canvas, 12 languages | ✅ | ✅ |
| Cross-filtering, bookmarks, keyboard, screen readers, high contrast | ✅ | ✅ |
| **Color rules** | ❌ | ✅ |
| **Trend line** and period comparisons | ❌ | ✅ |
| Small Multiples (up to 50) | ❌ | ✅ |
| Secondary KPIs | ❌ | ✅ |
| Prefix / suffix, variance pill and colours, extra tooltips | ❌ | ✅ |
| Card border width, radius, padding, shadow | ❌ | ✅ |

Without a licence, Pro features are drawn working in edit mode under a "Pro preview" watermark; reading
view shows the free result.

---

## TEXT BOX 8 — Tips

- Format percentages in the model: the card uses that format. Never add a "%" suffix to a raw ratio.
- **Auto** display units handle values from hundreds to billions.
- For costs or effort, switch on **Invert (lower is better)** in Variance.
- In **Trend**, use a real date column: a month stored as text sorts alphabetically.
- Small visual? The number shrinks to stay whole and the extras step aside — trend first.
- In format mode, click the number, the label, the trend line or the card to format it right there.
- Right-click a card for the Power BI context menu (drill-through, export data).

---

## TEXT BOX 9 — Example configurations

- **Sales dashboard:** Value = Total Revenue · Target = Revenue Budget · Trend = Date · Small Multiples = Region · Color rules on Target, applied to the background.
- **HR overview:** Value = Headcount · Prior Period = Headcount previous month · Target = Headcount plan.
- **Cost tracking:** Value = Total Costs · Trend = Date · Value shows = Latest point · Invert = ON · Color rules with *Lower is better*.
