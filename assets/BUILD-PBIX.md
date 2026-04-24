# BUILD-PBIX.md — KPI Card Pro Sample File

Instructions for creating the required AppSource sample `.pbix` file.

## Requirements
- Power BI Desktop (latest)
- `KpiCardPro.pbiviz` built and installed locally
- `assets/sample-data.csv` from this repo

---

## Step 1 — Import Sample Data

1. Open Power BI Desktop → **Home → Get Data → Text/CSV**
2. Select `assets/sample-data.csv`
3. In the Power Query preview, click **Transform Data**
4. Set the following column types:
   - `Month` → **Date** (use Locale: English)
   - All numeric columns → **Decimal Number**
5. Click **Close & Apply**

> ✅ The table should have **15 rows** and **13 columns** — this gives 15 unique Category values (months) and 13 unique metrics.

---

## Step 2 — Create Measures (DAX)

In the **Modeling** tab → **New Measure**, create:

```dax
Revenue = SUM('sample-data'[Revenue])

Prior Revenue = SUM('sample-data'[PriorRevenue])

Revenue Target = SUM('sample-data'[RevenueTarget])

Units Sold = SUM('sample-data'[Units])

Prior Units = SUM('sample-data'[PriorUnits])

Units Target = SUM('sample-data'[UnitsTarget])

Gross Margin = SUM('sample-data'[GrossMargin])

Net Profit = SUM('sample-data'[NetProfit])

CSAT Score = AVERAGE('sample-data'[CSAT])

Customer Count = SUM('sample-data'[CustomerCount])

Churn Rate = AVERAGE('sample-data'[Churn])
```

---

## Step 3 — Install the Visual

1. In the **Visualizations** pane → **…** (More options) → **Import a visual from a file**
2. Select your built `KpiCardPro.pbiviz` file
3. Confirm any security prompts

---

## Step 4 — Page 1: "KPI Overview" (Main Demo)

Create a full-page demo using multiple instances of KPI Card Pro:

### Visual A — Revenue (Single Metric, Sparkline)
- **Value:** `Revenue`
- **Prior Period:** `Prior Revenue`
- **Target:** `Revenue Target`
- **Category:** `Month`
- **Tooltips:** `Gross Margin`, `Net Profit`

**Format settings:**
- Card: Padding 16, Border Radius 8, Shadow ON
- Main Value: Font Size 32, Bold, Display Units = Millions, Decimals 1, Prefix `$`
- Variance: Show ON, Mode = Both, Show as Pill ON
- Sparkline: Show ON, Type = Area, Color = #0078D4
- Target: Show ON, Line Style = Dashed, Label = "Budget"

### Visual B — Units Sold
- **Value:** `Units Sold`
- **Prior Period:** `Prior Units`
- **Target:** `Units Target`
- **Category:** `Month`

**Format:** Sparkline Type = Bar, Suffix = " units"

### Visual C — Multi-Metric Grid (Pro features demo)
- **Value:** `Revenue`, `Units Sold`, `Gross Margin`, `Net Profit`, `CSAT Score`, `Customer Count` (add all 6)
- **Category:** `Month`
- **Metrics Layout:** Grid 2-Column

### Visual D — CSAT & Churn (Small tiles)
- **Value:** `CSAT Score`
- **Prior Period:** (empty)
- Suffix = " / 5.0"

---

## Step 5 — Page 2: "Hints & Tips" (Required by AppSource)

Create a new page named exactly **"Hints & Tips"**.

Add text boxes with the following content:

### 📌 Field Wells
| Field Well | Purpose | Required? |
|---|---|---|
| **Value** | Current period KPI value(s) | ✅ Yes |
| **Prior Period** | Previous period for variance | Optional |
| **Target** | Goal/budget line | Optional (Pro) |
| **Category** | Time dimension for sparkline | Optional |
| **Tooltips** | Extra drill-through fields | Optional (Pro) |

### 🆓 Free vs Pro
| Feature | Free | Pro |
|---|---|---|
| Number of metrics | 1 | Up to 6 |
| Sparkline | Basic (area) | Line, Area, Bar |
| Variance calculation | vs Prior | vs Prior + vs Target |
| Variance pill | ✗ | ✅ |
| Target line in sparkline | ✗ | ✅ |
| Custom colors | ✗ | ✅ |
| Tooltip drill-through | ✗ | ✅ |

### 💡 Tips
1. **Sparkline requires Category** — Add a date/time column to the Category field well to enable the sparkline trend chart.
2. **Multiple metrics** — Drop multiple measures into the Value field well. Upgrade to Pro to see all 6 at once.
3. **Variance inversion** — For cost metrics where "lower is better," enable *Invert (Lower is Better)* in the Variance settings.
4. **High Contrast** — Enable *Accessibility → High Contrast Mode* for WCAG-compliant dashboards.
5. **Context menu** — Right-click anywhere on the visual for Power BI context menu options.
6. **Cross-filtering** — Click on any metric cell to cross-filter other visuals on the page.

### 🔗 Resources
- Documentation: https://tcviz.com
- Privacy Policy: https://tinocallarisa-web.github.io/kpi-card-pro/privacy.html
- Terms of Use: https://tinocallarisa-web.github.io/kpi-card-pro/terms.html
- Support: info@tcviz.com

---

## Step 6 — Final Checks Before Submission

- [ ] Page 1 shows the visual working with real data
- [ ] Page 2 is named exactly "Hints & Tips"
- [ ] The `.pbix` has at least **13 unique Category values** (months in sample data)
- [ ] File size is reasonable (< 10 MB)
- [ ] Save as: `KPI Card Pro Sample.pbix`

---

## Step 7 — Save and Upload

1. **File → Save As** → `KPI Card Pro Sample.pbix`
2. Upload this file in the AppSource Partner Center submission under **Sample file**

---

*Last updated: June 2025 | TCViz | tcviz.com*
