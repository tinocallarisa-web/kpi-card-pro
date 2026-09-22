# Changelog — KPI Card Pro

## [2.0.0.0] — 2026-09-22

### Added
- **Secondary KPIs.** Up to three supporting measures, stacked to the right of the main value, each with its own variance. A `Secondary KPIs prior` well pairs the comparison values **by position** — the first prior with the first KPI — which is the only way to relate them without inventing a naming convention the user would have to guess. They carry no selection identity: they are context for the headline, not entities to filter by, and clicking one would have to answer what "filter by Margin" means, which is nothing. The whole column is dropped below a configurable card width instead of being squeezed: compressing the main value to fit context loses the one thing the card exists to say. It applies in small multiples too, measured against the width of each cell rather than of the visual, so it appears when it fits and withdraws when it does not.
- **Value & comparison: three modes for what the big number shows.** *Total of the period* is unchanged and remains the default. *Latest point in Trend* takes the last point of the series and compares it with an earlier one. *Last N points* sums the last N and compares against the N before — on a monthly series, N = 12 is the rolling year against the previous one, while the sparkline keeps all its points. Both new modes **remove the need for a date table and DATEADD measures**: bind the date field and the visual reads the comparison off the series it already has.
- **Period label.** Prints which point the value is and which one it is compared against — *Dec 2025 vs Nov 2025*. The visual has no notion of calendar: it steps back a position in the series, so a step of 12 is 12 months only if the series is regular. Printing it is what makes that verifiable instead of assumed, and it also catches the common mistake of binding the date hierarchy, where the series turns out to be years.
- **Pro preview.** Without a licence, and **in edit mode only**, a Pro feature the user turns on is drawn *working* under a "Pro preview" watermark naming it, instead of being silently ignored. Reading view — and any environment where licences cannot be read — still draws the free result with no watermark, so a published report never uses an unpaid feature. Granted **per feature**, only for the one actually turned on.

### Fixed
- **The Upgrade bar was being overwritten, so a user told to buy had nothing to click.** Power BI shows one licence notification at a time and the last call replaces the previous one. `notifyLicenseRequired()` ran before `notifyFeatureBlocked()` in the same `update()`, so on the first attempt at a Pro feature the banner wiped out the Upgrade bar — the call that carries the purchase path. The sequence is now `clearLicenseNotification()` → the banner naming the feature → and, after ~10 s, the persistent Upgrade bar.
- **Variance colours and extra tooltip fields were gated but never announced.** The render blocked them; nothing told the user why. Changing the positive variance colour did nothing, with no explanation. Both now raise the notice and the preview like every other Pro feature.
- **`Small Multiples (Pro)` lost its `(Pro)` in English.** `displayNameKey` overrides `displayName`, and the `en-US` string dropped the suffix while `es-ES` kept it. `Tooltips` was missing it in both.
- **Returning from another report page dropped every Pro feature.** Power BI recreates the visual on each page switch, so the first render runs before the licence resolves and the preview is off. The licence then resolved to Free and `applyLicense()` only notified, without repainting — correct before the preview existed, since nothing drawn depended on the licence for a free user. The card stayed on one tile, with no trend and no secondary KPIs, until the user touched a setting.

### Changed
- **Secondary KPIs follow the same period as the main value.** A card showing December at the top and twenty-four months down the side is not comparing anything; it is showing two different things side by side.

## [1.2.1.0] — 2026-09-14

### Fixed
- **A paying customer could stay on Free.** `getAvailableServicePlans()` returns each plan's
  `spIdentifier` as the full Partner Center **Service ID** (`publisher.offer.plan`), as the licensing
  API documentation states. The visual compared it with the bare plan ID `kpi-card-pro-tcviz` using
  `===`, which never matches. It now accepts a Service ID ending in `.kpi-card-pro-tcviz`, and the
  bare plan ID as well.
- **A failed licence lookup could ask a paying customer to buy.** When the call threw
  synchronously, the visual fell back to Free but still treated the licence information as
  available. It now shows no purchase prompt, as it already did when the promise rejected.

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

## [1.1.0.0] — 2026-08-01

### Added
- Cross-highlighting from other visuals, with the cards outside the selection dimmed.
- Keyboard navigation and a landing page when no data is bound.
- Colour palette support, so the card follows the report theme.

### Fixed
- An invalid matrix mapping that stopped the data view from being generated.
- The label on a single card.

## [1.0.0.1] — 2026-05-07

### Changed
- Formatting pane rebuilt on the current API, with the constructor pattern.

### Added
- Rendering events on every exit path of `update()`.

## [1.0.0.0] — 2026-04-24

### Added
- Initial release: KPI card with prior-period variance and target.
