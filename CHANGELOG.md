# Changelog — KPI Card Pro

## [1.2.0.0] — 2026-09-09

### Added
- **Trend line inside the card.** A new **Trend (Pro)** field well takes a date or ordered period and
  draws the series inside each card: area, line or bars, with the target marked across it. With
  Small Multiples bound as well, every card carries its own line. The feature existed in 1.0.0 and
  was dropped a day later by the matrix rewrite, while the documentation went on describing it.
- **Power BI's own licensing notifications.** Changing a `(Pro)` setting without a licence now
  raises the platform's "feature blocked" banner, which carries the purchase path, and a persistent
  licence icon while Pro settings are set without one. Both clear as soon as a licence resolves.
- **Total/SubTotal API.** Power BI now computes the card's figure with the measure's real
  aggregation instead of the visual summing the periods itself. It matters as soon as Value is not
  additive: an average ticket or a margin percentage was showing the sum of the monthly figures,
  which is a number that means nothing. Subtotal nodes are filtered out of the hierarchy, so they
  never appear as an extra "Total" card or as a giant final bar in the trend line.
- **An image per category**, top-right of each card. A new **Image** field well takes a column of
  Base64 data URIs; anything else — http, https, blob — is rejected without comment, which is what
  keeps the promise that the visual makes no network request. It is rendered through `<img src>`,
  never by building markup, because it is user data.
- **Settings that were missing entirely.** Prior and Target had no options at all: their size and
  colour were hard-coded. The Small Multiples title could only change size and colour, not font or
  weight. The trend's target line had a fixed grey that vanished against a dark card background.
- **Bookmark support.** `registerOnSelectCallback` repaints the cards when the selection changes
  from outside — applying a bookmark, or clearing filters elsewhere. Without it a bookmark left the
  previous dimming on screen, showing a selection that no longer existed.
- **`build-test.js`**, with `--free` for the real free tier and `--debug` for a licence diagnostic
  overlay. Testing previously meant editing `isPro` by hand.

### Changed
- **Every paid setting now says so.** Border Width, Border Radius, Padding, Drop Shadow, Prefix,
  Suffix and the Small Multiples field well carry `(Pro)` in their name. They were silently ignored
  before: the user changed them, nothing happened, and nothing explained why — which reads as the
  visual being broken rather than as a paid feature.
- **A licence in the `Warning` state is honoured** alongside `Active`. Warning is a payment grace
  period, so a paying customer no longer drops to the free tier while it is resolved.
- **`isLicenseUnsupportedEnv` and `isLicenseInfoAvailable` are respected.** In Publish to Web,
  embedded, national clouds and PDF/PowerPoint export a Pro customer reads as free; there the card
  renders the free result without prompting anyone to buy what they own.

### Removed
- **The "Free" badge drawn in the corner of the card.** Microsoft's guidance is that a visual should
  not display its own licensing UI, and this one put its entire explanation in a `title` attribute
  on an element with `pointer-events: none` — so it could never be hovered and never appeared.

### Fixed
- **"Show Target Line" drew nothing.** With Trend bound, the card's Target is the total for the whole
  period while the points on the line are per period, so the horizontal line landed far above the
  maximum and outside the visible area. The target is now drawn period by period, on a scale that
  spans both series.
- **The tooltip always showed the first card's figures.** Every cell was written with index `0`, and
  the tooltip resolves its metric from the DOM. Click and keyboard were unaffected, which is why it
  went unnoticed.
- **Cross-highlighting never reached the cards.** Clicking a treemap or a chart highlights rather
  than filters, and the highlight check only looked two levels deep — with Trend bound the
  highlights sit on the leaves. Slicers kept working because a slicer filters instead.
- **The card lost its value when Trend was bound.** With a second row level the values move to the
  leaves and the card's own node carries none, so a dash was shown instead of the number.
- **The trend line always sloped downwards.** A numeric period such as a month number was delivered
  sorted by the measure, so the line was the series ordered from high to low rather than a trend.
  The row reduction also asked for the *top* N by measure instead of the first N.
- **Public URLs.** `supportUrl` pointed at the site home rather than a support page, and
  `privacyTermsLink` was missing entirely — its absence is grounds for rejection.
- **Legal pages** claimed an effective date of 1 January 2025, fifteen months before the visual
  existed, and carried the wrong contact address.
- **A stray `style/pbiviz.json`** carrying a different GUID from the real one.

### Documentation
- `support.html` described a sparkline type selector, a target line and tooltip drill-through, none
  of which existed, and a `Category` field well that does not exist either. Rewritten against the
  code. The README described a different product entirely.
- Free and Pro were both wrong in every document: Drop Shadow was listed as free when its control is
  paid, and the variance colours were sold as paid when they have always been free.
