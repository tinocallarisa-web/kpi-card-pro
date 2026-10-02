# KPI Card Pro — TCViz Web Product Page Content

Content for the four tabs of the TCViz product page. Current version: **2.1.0.0**.

The live page is generated from `src/data.jsx` in the **tcviz-web** repository
(https://tcviz.com/product/horizon-kpi/). This file is the draft: copy the changes there.

**Hero image:** the country grid with Status on — green, amber and red accent bars, each card with
its flag, value, variance, prior and target, and its own trend line. It shows the whole product,
including what is new in 2.1, in one glance.

**Video:** https://www.youtube.com/watch?v=4fP7zYKnhWo

---

## TAB 1: OVERVIEW

### On track or off track — on the card itself.

A number on a dashboard is only half an answer: is it good, against target, against last month?
KPI Card Pro puts the answer on the card — the value, its variance, the target, a trend line and a
status that says on track, warning or off track — and turns that one card into a grid, one per
channel, product or region.

**The problem it solves**
A KPI in Power BI usually means a big number and nothing else. To show the comparison you add a
second visual, for the trend a third, and to break it down by category you copy the lot once per
value. What was one figure becomes a page nobody maintains.

**How it works**
Drop a measure into Value and you have a card, in the number format of your model. Add Prior
Period and it shows the variance with its direction. Add Target and switch on Status to colour the
card. Add a date to Trend and the card grows a line — and compares periods by itself, no DAX. Add a
category to Small Multiples and the single card becomes a grid, each card with its own figures.

**Who it's for**
Anyone building executive dashboards where space is scarce and the reader has ten seconds:
commercial reporting by channel, operations by site, finance by cost centre.

**At a glance**
- Value, prior-period variance and target in a single card, in your model's number formats
- **New:** status — on track, warning or off track against target or prior period
- Up to three secondary KPIs beside the headline, placed automatically
- A trend line inside the card, with the target drawn period by period
- One card per category, up to 50, each with its own line
- A logo per category from an image column in your model
- Invert the variance logic for metrics where lower is better
- No network calls of any kind

---

## TAB 2: FEATURES

Everything below is free except the items marked **(Pro)**.

### The number
- The measure in **its own format from your model** — currency, percentage, separators — and in
  the report's language
- Display units (Auto / K / M / B) on top of that format; decimals only when you set them
- Font family, size, weight and colour
- **(Pro)** Prefix and suffix for free text such as `pts`

### The comparison
- Variance against a prior period, as a percentage with a direction arrow
- The prior value and the target shown underneath, with their own font, size and colour
- Invert the logic for cost, defects or churn, where a decrease is good
- **(Pro)** Pill style and custom positive, negative and neutral colours
- **(Pro)** Status: two thresholds, three states, colour on the value or an accent bar, and the
  state written in words so it never depends on colour alone
- **(Pro)** Comparisons without a date table: latest point or last N points against the N before

### The trend **(Pro)**
- A line inside the card over any date or ordered period: area, line or bars
- Colour, line width, area opacity, height and a marker on the last point
- The target drawn period by period across the chart, in its own colour, so a target that changes
  over time is followed rather than flattened
- Hover the line to read the value of any period

### Secondary KPIs **(Pro)**
- Up to three supporting measures with their own variance
- Beside the value, or below it in a row or a list, whichever fits — the same layout on every card

### One card per category **(Pro)**
- Up to 50 cards from a category field, each with its own value, variance and line
- One to six columns, configurable gap, category titles with their own font and colour

### Branding
- An image per card, top-right, from a column of Base64 images in your model
- Height and corner radius

### In the report
- Cross-filtering by clicking a card, with multi-select
- Cross-highlighting from other visuals dims the cards that are out of scope
- Bookmarks restore the selection
- Native, modern and report tooltips, with **(Pro)** extra measures
- Right-click context menu on a card and on empty space

### Accessibility
- Keyboard focus and activation, with ARIA labels announcing name, value and variance
- High-contrast themes follow the Power BI palette
- English and Spanish interface

### Free vs Pro

| | Free | Pro |
|---|---|---|
| The card: value, variance, target | ✓ | ✓ |
| Your model's number formats, display units, decimals, fonts and colours | ✓ | ✓ |
| Variance arrow and the invert logic | ✓ | ✓ |
| Image per card | ✓ | ✓ |
| Cross-filtering, bookmarks, keyboard, high contrast | ✓ | ✓ |
| **Status: on track / warning / off track** | — | **✓** |
| **Trend line inside the card**, hover values, period comparisons | — | **✓** |
| **Secondary KPIs**, up to 3 | — | **✓** |
| **Small Multiples**, up to 50 cards | — | **✓** |
| Prefix and suffix | — | **✓** |
| Variance pill and custom colours | — | **✓** |
| Extra tooltip measures | — | **✓** |
| Card border, radius, padding, shadow | — | **✓** |

While you edit without a licence, a Pro feature you turn on is drawn working under a "Pro preview"
watermark, and Power BI shows its own notification with the link to get one. Reading view shows the
free result. A 30-day free trial is available on AppSource.

---

## TAB 3: TECHNICAL

**Specs**
- API version: 5.11.0
- Platform: Power BI Desktop, Service and mobile
- Interface languages: English, Spanish

**Field wells**
- **Value** (measure, required) — the number on the card
- **Prior Period** (measure) — enables the variance
- **Target** (measure) — the goal, also drawn on the trend line
- **Trend (Pro)** (grouping) — a date or ordered period; the axis of the line
- **Small Multiples (Pro)** (grouping) — one card per category, up to 50
- **Image** (measure, aggregated as *First*) — a Base64 data URI per card
- **Tooltips (Pro)** (measures) — extra figures on hover
- **Secondary KPIs (Pro)** (measures, up to 3) — supporting figures beside the value
- **Secondary KPIs prior (Pro)** (measures) — their comparison values, paired by position

**Number formats**
Every figure uses its own measure's format string and the report locale through Power BI's
`valueFormatter`. Display units scale on top of it and a percentage is never scaled. Dynamic format
strings are declared and used when Power BI sends a per-value format.

**Data handling**
Matrix data view with the Total/SubTotal API enabled for row subtotals, so each card's figure uses
the measure's own aggregation rather than a sum performed by the visual. This matters as soon as
the measure is not additive — an average or a percentage. Subtotal nodes are filtered out of the
hierarchy: never an extra card, never a stray point on the line.

**Images and security**
The Image well accepts only `data:image/<type>;base64,<payload>`. Every other scheme — `http`,
`https`, `blob` — is rejected at parse time. That is what makes the "no network calls" claim
literally true rather than approximately true. Images are rendered through an `<img>` source,
never by building markup from data in your model.

**Privacy**
No telemetry, no analytics, no CDN, no endpoints of any kind. All calculation and rendering happens
inside Power BI, on your machine or your tenant. Nothing is stored outside the report.

**Licensing**
Managed entirely through Microsoft AppSource with the official `IVisualLicenseManager` API. No
external account, no separate payment system, no licence server. Resolution is asynchronous and
never blocks rendering; a licence in its payment grace period keeps working, and environments that
cannot enforce licences — Publish to Web, embedded, PDF export — never prompt a paying customer to
buy what they already own.

---

## TAB 4: CHANGELOG

### 2.1.0.0 — October 2026
- **Added:** Status — on track, warning or off track against target or prior period, also written
  as text
- **Added:** hover value on the trend line; modern visual tooltips; dynamic format strings
- **Changed:** numbers use your model's format and the report's language; decimals apply only when
  you set them
- **Changed:** secondary KPIs place themselves — right, row or list — the same on every card; the
  grid never scrolls sideways
- **Fixed:** a percentage measure shown as 0.3; Auto units showing 114,635 as 0.11M; secondary KPIs
  disappearing with seven-digit figures

### 2.0.0.0 — September 2026
- **Added:** up to three secondary KPIs beside the main value
- **Added:** period comparisons without a date table — latest point or last N points — with a
  label that prints what is compared
- **Added:** the Pro preview: Pro features drawn working under a watermark while you edit
- **Fixed:** the Upgrade bar was overwritten by the banner, leaving nothing to click

### 1.2.0.0 — September 2026
- **Added:** the trend line inside the card, over a date or period axis, with the target drawn
  period by period
- **Added:** an image per card from a Base64 column
- **Added:** Power BI's own licensing notifications, replacing a badge whose message could never
  be seen
- **Added:** Total/SubTotal API, so the card's figure uses the measure's real aggregation
- **Added:** bookmark support, and a full Spanish interface
- **Changed:** every paid setting now says `(Pro)` — six of them were silently ignored before
- **Fixed:** the cards lost their value when Trend was bound; the trend line always sloped
  downwards; cross-highlighting never reached the cards; the tooltip always showed the first card

### 1.1.0.0 — August 2026
- Cross-highlighting, keyboard navigation, landing page and colour palette support

### 1.0.0.1 — May 2026
- Formatting pane rebuilt on the current API; rendering events on every path

### 1.0.0.0 — April 2026
- Initial release
