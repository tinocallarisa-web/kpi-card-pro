# AppSource listing copy — KPI Card Pro v2.1.0.0

Copy ready to paste into Partner Center. **The marketplace description is the documentation most
people read and the one that goes stale fastest** — update it on every release, not only when the
code changes.

**This version changes what the buyer sees** (status colours, number formats, secondary KPIs that
rearrange themselves): the description, the short description and the "What's new" block all
change, and the certification notes must be pasted again.

---

## Short description (max 100 characters)

```
KPI cards with status, variance, target and trend — one per category, in your number formats.
```

*(93 characters)*

---

## Long description (max 5,000 characters, "What's new" included)

```
A number on a dashboard is only half an answer. 9.7M in revenue — is that good? Against target, against last month, compared with the other countries? A plain card leaves the reader to work it out.

KPI Card Pro puts the answer on the card: the value, its variance, the target, a trend line and a status that says on track, warning or off track. Add a category and the single card becomes a grid — up to fifty cards, one per country, product or team, each with its own figures and line.

WHAT IS NEW IN 2.1

• Status — the value as a percentage of the target or the prior period, with two thresholds and three colours. "Lower is better" mirrors it for costs and churn. The state is also written under the value, so it never depends on colour alone.
• Your number formats — currency, percentages, separators and the language of your report come from the measure in your model, as in native visuals. Display units and decimals still work on top.
• Secondary KPIs that rearrange themselves — beside the value, in a row or in a list, whichever fits, and the same on every card.
• Hover the trend line to read any period. Modern visual tooltips are supported.

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
• A trend line: area, line or bars, over any date or ordered period
• One card per category, in one to six columns
• A logo or flag on each card, from Base64 images already in your model
• Cross-filtering, cross-highlighting and bookmarks
• Keyboard navigation, screen-reader labels and high-contrast support
• English and Spanish interface

PRIVACY

No network calls of any kind: no telemetry, no analytics, no CDN. Everything happens inside Power BI. Images must already be in your model as Base64 — links to images on a web server are rejected on purpose, which is what makes that claim literally true.

FREE AND PRO

The card is complete without a licence: value, variance with its arrow and invert logic, target, your number formats, images, cross-filtering, bookmarks, keyboard and high contrast.

Pro adds the context: status colours, the trend line and its period comparisons, Small Multiples, Secondary KPIs, prefix and suffix, the variance pill and colours, extra tooltip measures, and the card border, radius, padding and shadow.

SEE IT BEFORE YOU BUY

While you edit a report without a licence, every Pro feature you turn on is drawn working, under a "Pro preview" watermark naming it. Reading view shows the free result, so a published report never uses a feature you have not paid for.

30-day free trial on AppSource.

Video, documentation and sample data: https://tinocallarisa-web.github.io/kpi-card-pro/support.html
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

**The certification notes field caps at 2,500 characters** (counting CRLF) and truncates without
warning, mid-word. Paste `docs/CERTIFICATION-NOTES-SHORT.txt`. The full notes live in
`CERTIFICATION-NOTES.md` in the repository, linked from the short version.

**`privacyTermsLink` does not travel inside the `.pbiviz`.** The privacy URL shown to users comes
from Partner Center, so correcting it in `pbiviz.json` alone changes nothing.

---

## Listing images

`docs/infographic.png` (1366×768) is regenerated from `docs/infographic.html`. Reload the HTML with
a forced refresh before downloading, or the browser serves a cached page and the PNG silently
carries the old text.

---

## Before submitting

- [ ] Long description and short description pasted into the offer
- [ ] Video field: `https://www.youtube.com/watch?v=4fP7zYKnhWo` (canonical form only)
- [ ] Support, privacy and terms URLs checked with a real request, not assumed
- [ ] Certification notes pasted from `docs/CERTIFICATION-NOTES-SHORT.txt` — Partner Center clears
      that field on every resubmission
- [ ] Version 2.1.0.0 is above the version currently published (check Partner Center)
- [ ] New infographic uploaded
- [ ] Sample .pbix includes the Tips & Hints page, updated for this version
