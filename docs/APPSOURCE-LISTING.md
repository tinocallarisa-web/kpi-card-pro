# AppSource listing copy — KPI Card Pro v1.2.0.0

Copy ready to paste into Partner Center. **The marketplace description is the documentation most
people read and the one that goes stale fastest** — update it on every release, not only when the
code changes.

---

## Short description (max 100 characters)

```
KPI card with prior-period variance, target, trend line and one card per category.
```

*(81 characters)*

---

## Long description

```
A KPI card should answer three questions at once: what is the number, how does it compare, and
where is it heading. KPI Card Pro answers all three in the space of a tile — and then turns that
one card into a grid, one per channel, product or region, each with its own trend.

Drop a measure into Value and you have a card. Add a prior-period measure and it shows the variance
with its direction and the comparison underneath. Add a target and it tracks the goal. Add a date
and the card grows a trend line, with the target drawn across it period by period. Add a category
and the single card becomes a grid — up to fifty cards, each keeping its own number, its own
variance and its own line.

WHAT YOU GET

• The value formatted with display units and decimals, in the font and colour you choose
• Variance against a prior period, as a percentage with a direction arrow
• Invert the logic for cost, defects or churn, where a decrease is the good news
• A target measure, shown on the card and drawn on the trend line
• A trend line inside the card: area, line or bars, over any date or ordered period
• One card per category, in one to six columns, with category titles
• A logo on each card, from a column of images already in your model
• Cross-filtering by clicking a card, cross-highlighting from other visuals, and bookmarks
• Keyboard navigation, ARIA labels and high-contrast support
• English and Spanish interface

BUILT FOR REAL REPORTS

The card's figure uses your measure's own aggregation through the Total and Subtotal API, so an
average or a percentage stays correct when the card summarises a period. Cross-highlighting dims
the cards that fall outside the selection instead of ignoring it.

PRIVACY

No network calls of any kind: no telemetry, no analytics, no CDN, no endpoints. All calculation and
rendering happens inside Power BI. Images must already be embedded in your model as Base64 — links
to images on a web server are rejected on purpose, which is what makes that claim literally true.

FREE AND PRO

The card is complete without a licence: value, variance, target, all the variance colours and the
invert logic, images, display units, styling, cross-filtering, bookmarks, keyboard and high
contrast.

Pro adds the context: the trend line inside the card, and Small Multiples — up to fifty cards from
a category field, each with its own line. Plus prefix and suffix on the value, the variance pill,
extra tooltip measures, and the card border, radius, padding and shadow controls.

30-day free trial on AppSource.
```

---

## What's new — v1.2.0.0

```
• A trend line inside the card, over any date or period axis, with the target drawn period by
  period rather than as a flat line — so a target that moves is followed, not averaged away.
• An image per card, taken from a column of Base64 images in your model.
• Every setting that needs a licence now says (Pro) in the format pane. Six of them used to be
  ignored in silence, which reads as the visual being broken rather than as a paid feature.
• The card's figure now uses your measure's own aggregation through the Total and Subtotal API.
  An average or a percentage was previously summed across periods.
• Bookmarks restore the selection, and the interface is available in Spanish.
• Fixed: the cards lost their value when a trend field was bound; the trend line sloped downwards
  whatever the data did; cross-highlighting from another visual never reached the cards; and the
  tooltip showed the first card's figures on every card.
```

---

## URLs to keep in sync

| Field | Value |
|---|---|
| Support / documentation | https://tinocallarisa-web.github.io/kpi-card-pro/support.html |
| Privacy policy | https://tinocallarisa-web.github.io/kpi-card-pro/privacy.html |
| Terms of use | https://tinocallarisa-web.github.io/kpi-card-pro/terms.html |
| Repository (certification branch) | https://github.com/tinocallarisa-web/kpi-card-pro/tree/certification |
| Demo video | https://www.youtube.com/watch?v=3VbAcI90CQQ |

**The certification notes field caps at 2,500 characters** and truncates without warning, mid-word.
Paste `docs/CERTIFICATION-NOTES-SHORT.txt`, which is written to fit at 2,499. The full notes live in
`CERTIFICATION-NOTES.md` in the repository, linked from the first line of the short version.

**`privacyTermsLink` does not travel inside the `.pbiviz`.** The privacy URL shown to users comes
from Partner Center, so correcting it in `pbiviz.json` alone changes nothing.

---

## Listing images

The hero image is the twelve-card grid: one card per subchannel, each with its logo, value,
variance, prior and target, and its own trend line with the target drawn across it. It shows the
product whole in a single glance, which is what a marketplace thumbnail has to do.

`docs/infographic.png` is regenerated from `docs/infographic.html`. Reload the HTML with a forced
refresh before downloading, or the browser serves a cached page and the PNG silently carries the
old text.

---

## Before submitting

- [ ] Long description pasted into the offer
- [ ] "What's new" pasted
- [ ] Support, privacy and terms URLs checked with a real request, not assumed
- [ ] Certification notes pasted from `docs/CERTIFICATION-NOTES-SHORT.txt` — Partner Center clears
      that field on every resubmission
- [ ] Version 1.2.0.0 is above the published 1.1.0.0
- [ ] Video renamed to something that says what the visual does, without a version number
- [ ] Sample .pbix includes the Tips & Hints page, updated for this version
