# AppSource listing copy — KPI Card Pro v2.2.0.0

Copy ready to paste into Partner Center. **The marketplace description is the documentation most
people read and the one that goes stale fastest** — update it on every release, not only when the
code changes.

**This version changes what the buyer sees** (color rules on the background or border, style
templates, a setup guide inside the visual, clickable trend points, twelve languages): the
description, the short description and the "What's new" block all change, the screenshots change,
and the certification notes must be pasted again.

Rules for this listing: no comparisons with other marketplace visuals, not even implied; compare
only with Power BI's own card. "Power BI" always with that capitalisation (rejection 100.7.1).

---

## Short description (max 100 characters)

```
KPI cards with color rules, variance, target and trend — one per category, set up in a minute.
```

*(95 characters)*

---

## Long description (max 5,000 characters, "What's new" included)

```
A number on a dashboard is only half an answer. 9.7M in revenue — is that good? Against target, against last month, compared with the other countries? A plain card leaves the reader to work it out.

KPI Card Pro puts the answer on the card: the value, its variance, the target, a trend line and a color that says on track, warning or off track. Add a category and the single card becomes a grid — up to fifty cards, one per country, product or team, each with its own figures and line.

WHAT IS NEW IN 2.2

• Click a point of the trend line to filter the whole report by that period — and by that card, in a grid
• Color rules on the target, the prior period or the value itself, painted on the number, an accent bar, the card background or its border
• Six style templates, from Clean to Midnight, applied in one click
• A setup guide inside the visual: it ticks off each field as you add it and shows the templates with your own number
• A layout that fits any size: the number shrinks instead of being cut off, and the grid picks how many columns fit
• Format on the canvas, screen-reader summaries, keyboard navigation through cards and trend points
• Format pane in twelve languages

NO DATE TABLE, NO DAX

Comparing against the previous period normally means a date table, DATEADD and one measure per KPI. Bind your date field to Trend and the card reads the comparison off the series it already draws:

• Total of the period — the whole range
• Latest point — December against November, or against the same month last year
• Last N points — the rolling twelve months against the twelve before them

The card prints what it compares — "Dec 2025 vs Nov 2025" — so the step back can be checked, not assumed.

THREE KPIs BESIDE THE HEADLINE

Sales 5.2M means little without margin, orders and average ticket. Up to three Secondary KPIs sit next to the main value, each with its own variance, and step aside before they ever squeeze the headline.

WHAT YOU GET

• Variance against a prior period, with a direction arrow and invert logic for costs
• A target, on the card and drawn on the trend line period by period
• Color rules with three states, written under the value too, so meaning never depends on colour alone
• A trend line: area, line or bars, over any date or ordered period
• One card per category, in up to six columns that adapt to the width
• A logo or flag on each card, from Base64 images already in your model
• Your model's number formats, in the language of the report
• Cross-filtering by card and by period, cross-highlighting and bookmarks
• Keyboard navigation, screen-reader summaries and high-contrast support

PRIVACY

No network calls of any kind: no telemetry, no analytics, no CDN. Everything happens inside Power BI. Images must already be in your model as Base64 — links to images on a web server are rejected on purpose, which is what makes that claim literally true.

FREE AND PRO

The card is complete without a licence: value, variance with its arrow and invert logic, target, your number formats, images, style templates, the setup guide, the size-adaptive layout, format on the canvas, cross-filtering, bookmarks, keyboard, screen readers and high contrast.

Pro adds the context: color rules, the trend line with clickable points and its period comparisons, Small Multiples, Secondary KPIs, prefix and suffix, the variance pill and colours, extra tooltip measures, and the card border, radius, padding and shadow.

SEE IT BEFORE YOU BUY

While you edit a report without a licence, every Pro feature you turn on is drawn working, under a "Pro preview" watermark naming it. Reading view shows the free result, so a published report never uses a feature you have not paid for.

30-day free trial on AppSource.

Video, documentation, FAQ and sample data: https://tinocallarisa-web.github.io/kpi-card-pro/support.html
Questions: https://github.com/tinocallarisa-web/kpi-card-pro/discussions
Support: support@tcviz.com
```

---

## URLs to keep in sync

| Field | Value |
|---|---|
| Support / documentation | https://tinocallarisa-web.github.io/kpi-card-pro/support.html |
| Privacy policy | https://tinocallarisa-web.github.io/kpi-card-pro/privacy.html |
| Terms of use | https://tinocallarisa-web.github.io/kpi-card-pro/terms.html |
| Repository (certification branch) | https://github.com/tinocallarisa-web/kpi-card-pro/tree/certification |
| Demo video | https://www.youtube.com/watch?v=4fP7zYKnhWo |

No new video for 2.2 (decision 12-10-2026): the existing one still shows features that work the
same way. The novelties are told in the description and in the screenshots.

**The certification notes field caps at 2,500 characters** (counting CRLF) and truncates without
warning, mid-word. Paste `docs/CERTIFICATION-NOTES-SHORT.txt`. The full notes live in
`CERTIFICATION-NOTES.md` in the repository, linked from the short version.

**`privacyTermsLink` does not travel inside the `.pbiviz`.** The privacy URL shown to users comes
from Partner Center, so correcting it in `pbiviz.json` alone changes nothing.

---

## Listing images

| Asset | File | Notes |
|---|---|---|
| Offer screenshot 1 | `docs/infographic.png` (from `docs/infographic.html`) | 1366×768, general guide for 2.2 |
| Offer screenshot 2 | `docs/infographic-styles.png` (from `docs/infographic-styles.html`) | 1366×768, templates and color rules |
| Offer logo | `assets/logo_300x300.png` | New Nord icon. Uploaded by hand: it does not travel in the package |
| Package icon | `assets/icon.png` | 36×36, embedded in the `.pbiviz` |

---

## Before submitting — what must be pasted by hand in Partner Center

Editing this file changes nothing in the offer.

- [ ] Long description and short description
- [ ] Screenshots: the two infographics above, replacing the 2.1 one
- [ ] Offer logo: `assets/logo_300x300.png`
- [ ] Video field unchanged: `https://www.youtube.com/watch?v=4fP7zYKnhWo` (canonical form only)
- [ ] Certification notes from `docs/CERTIFICATION-NOTES-SHORT.txt` — the field is cleared on every resubmission
- [ ] Version 2.2.0.0 is above the one currently published (check Partner Center)
- [ ] Support, privacy and terms URLs checked with a real request
