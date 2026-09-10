# KPI Card Pro — TCViz Web Product Page Content

Content for the four tabs of the TCViz product page. Current version: **1.2.0.0**.

**Hero image:** the twelve-card grid — one card per subchannel, each with its logo, value,
variance, prior and target, and its own trend line with the target drawn across it. It shows the
whole product in one glance and needs no caption.

**Video:** https://www.youtube.com/watch?v=3VbAcI90CQQ

---

## TAB 1: OVERVIEW

### One KPI card. Twelve at a glance.

A KPI card should answer three questions at once: what is the number, how does it compare, and
where is it heading. KPI Card Pro does all three in the space of a tile — and then turns that one
card into a grid, one per channel, product or region, each with its own trend.

**The problem it solves**
A KPI in Power BI usually means a big number and nothing else. To show the comparison you add a
second visual, for the trend a third, and to break it down by category you copy the lot once per
value. What was one figure becomes a page nobody maintains.

**How it works**
Drop a measure into Value and you have a card. Add Prior Period and it shows the variance with its
direction. Add Target and it tracks the goal. Add a date to Trend and the card grows a line. Add a
category to Small Multiples and the single card becomes a grid — each card keeping its own number,
its own variance and its own line.

**Who it's for**
Anyone building executive dashboards where space is scarce and the reader has ten seconds:
commercial reporting by channel, operations by site, finance by cost centre.

**At a glance**
- Value, prior-period variance and target in a single card
- A trend line inside the card, with the target drawn period by period
- One card per category, up to 50, each with its own line
- A logo per category from an image column in your model
- Invert the variance logic for metrics where lower is better
- No network calls of any kind

---

## TAB 2: FEATURES

Everything below is free except the items marked **(Pro)**.

### The number
- The measure, formatted with display units (Auto / K / M / B) and decimal places
- Font family, size, weight and colour
- **(Pro)** Prefix and suffix — `$`, `€`, `%`, `pts` — without touching the measure

### The comparison
- Variance against a prior period, as a percentage with a direction arrow
- The prior value and the target shown underneath, with their own font, size and colour
- Positive, negative and neutral colours, all configurable
- Invert the logic for cost, defects or churn, where a decrease is good
- **(Pro)** Pill style for the variance badge

### The trend **(Pro)**
- A line inside the card over any date or ordered period: area, line or bars
- Colour, line width, area opacity, height and a marker on the last point
- The target drawn period by period across the chart, in its own colour, so a target that changes
  over time is followed rather than flattened

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
- Native and report tooltips, with **(Pro)** extra measures
- Right-click context menu on a card and on empty space

### Accessibility
- Keyboard focus and activation, with ARIA labels announcing name, value and variance
- High-contrast themes follow the Power BI palette
- English and Spanish interface

### Free vs Pro

| | Free | Pro |
|---|---|---|
| The card: value, variance, target | ✓ | ✓ |
| Display units, decimals, fonts and colours | ✓ | ✓ |
| All variance colours and the invert logic | ✓ | ✓ |
| Image per card | ✓ | ✓ |
| Cross-filtering, bookmarks, keyboard, high contrast | ✓ | ✓ |
| **Trend line inside the card** | — | **✓** |
| **Small Multiples**, up to 50 cards | — | **✓** |
| Prefix and suffix | — | **✓** |
| Variance pill | — | **✓** |
| Extra tooltip measures | — | **✓** |
| Card border, radius, padding, shadow | — | **✓** |

Changing a `(Pro)` setting without a licence leaves the card on the free result and Power BI shows
its own notification with the link to get one. Nothing is lost: the setting is stored and applies
as soon as the licence is active. A 30-day free trial is available on AppSource.

---

## TAB 3: TECHNICAL

**Specs**
- API version: 5.10.0
- Platform: Power BI Desktop, Service and mobile
- Interface languages: English, Spanish

**Field wells**
- **Value** (measure, required) — the number on the card
- **Prior Period** (measure) — enables the variance
- **Target** (measure) — the goal, also drawn on the trend line
- **Trend (Pro)** (grouping) — a date or ordered period; the axis of the line
- **Small Multiples (Pro)** (grouping) — one card per category, up to 50
- **Image** (measure, aggregated as *First*) — a Base64 data URI per card
- **Tooltips** (measures) — extra figures on hover

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
