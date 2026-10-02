# KPI Card Pro — Certification Notes — v2.1.0.0

> The text pasted into Partner Center is `docs/CERTIFICATION-NOTES-SHORT.txt` (the field caps at
> 2,500 characters and is cleared on every resubmission). This file is the complete reference the
> short version points to.

**Visual GUID:** `kpiCardProTCViz`
**Plan:** `kpi-card-pro-tcviz` (matched on a Service ID ending in it)
**Publisher:** TCViz — support@tcviz.com

| | |
|---|---|
| Source (certification branch) | https://github.com/tinocallarisa-web/kpi-card-pro/tree/certification |
| Support / documentation | https://tinocallarisa-web.github.io/kpi-card-pro/support.html |
| Privacy policy | https://tinocallarisa-web.github.io/kpi-card-pro/privacy.html |
| Terms of use | https://tinocallarisa-web.github.io/kpi-card-pro/terms.html |
| Changelog | https://tinocallarisa-web.github.io/kpi-card-pro/changelog.html |
| Video walkthrough | https://www.youtube.com/watch?v=4fP7zYKnhWo |

---

## Please read first — Pro preview

Without a licence, **in edit mode only**, a Pro feature the user turns on is drawn *working*
under a "Pro preview" watermark that names it, together with Power BI's own licence notification
(banner naming the feature, then the persistent Upgrade bar). This is intentional, not missing
gating: it is how the author sees what they would be buying.

In reading view, before the licence has resolved, and wherever licences cannot be read (Publish to
Web, embedding, export), the **free** result is drawn with no watermark and no notice. A published
report therefore never uses an unpaid Pro feature. The gate is the host view mode
(`options.viewMode !== 0`), not Desktop versus Service, and it is granted **per feature**.

---

## What is new in 2.1.0.0

- **Status (Pro).** The value as a percentage of the target or the prior period, against two
  thresholds, in three states (on track, warning, off track), with a "lower is better" mode. The
  state is written as text under the value as well as coloured, so it does not rely on colour; in
  high contrast only the text is drawn.
- **Native number formatting.** Every figure uses its own measure's format string and the report
  locale through `powerbi-visuals-utils-formattingutils` (`valueFormatter`, 6.1.2). Display units
  scale on top of the format; percentages are never scaled.
- **Dynamic format strings.** `general.formatString` is declared in `capabilities.json`; when the
  host sends a per-value format it is used, otherwise the column format.
- **Secondary KPIs layout.** Right, row or list, chosen automatically, identical on every card of a
  grid. The grid never scrolls horizontally.
- **Trend hover value** and `supportEnhancedTooltips`.

## Rendering events

Every `update()` emits exactly one `renderingStarted` followed by exactly one `renderingFinished`
or `renderingFailed`, on every exit path. Repaints triggered outside `update()` (licence
resolution, the layout retry when the host element has no size yet) call the render routine
directly and emit no events.

## Privacy and network

- `privileges: []`. No HTTP requests, telemetry, analytics or CDN.
- The Image role accepts only `data:image/<type>;base64,<payload>`. Every other scheme — http,
  https, blob, javascript — is rejected at parse time. Images are rendered through an `<img>` src
  attribute, never by building markup from user data. No `innerHTML` anywhere.
- Nothing is stored outside the report.

## Data handling

The Total/SubTotal API is enabled for row subtotals, so the figure on each card is the aggregate
Power BI computes with the measure's own aggregation, not a sum performed by the visual. Subtotal
nodes are filtered out of the hierarchy: they are not rendered as cards and are excluded from the
trend series.

## Licensing

`IVisualLicenseManager` only. `getAvailableServicePlans()` is requested after the first paint and
never blocks it; on failure the visual stays Free and shows no purchase prompt. Plans in state
Active or Warning are accepted. `isLicenseUnsupportedEnv` and `isLicenseInfoAvailable` are
respected. Notifications follow `clearLicenseNotification` → `notifyFeatureBlocked` (banner naming
the feature) → `notifyLicenseRequired` after ~10 s. No licensing UI of the visual's own.

## Free and Pro

**Free:** one KPI card with value, prior-period variance with arrow and invert logic, and target;
the model's number formats, display units and decimals; label styling; card background and border
colour; images; native and modern tooltips; cross-filtering, cross-highlighting, bookmarks
(`registerOnSelectCallback`); keyboard navigation, ARIA labels, high contrast; context menu.

**Pro:** Status; the trend line with its target and hover values, and the value modes it enables;
Small Multiples (up to 50 cards, 1–6 columns); Secondary KPIs (up to 3); prefix and suffix; the
variance pill and custom variance colours; extra tooltip measures; card border width, radius,
padding and drop shadow.

## Testing instructions

1. Import the `.pbiviz` (Insert → More visuals → Import from file) and open the sample `.pbix`,
   which includes a "Tips & Hints" page.
2. **Free, no licence.** A measure in Value renders one card. Add Prior Period and Target: the
   variance pill and the "Prior: / Target:" line appear. Click the card: the report cross-filters.
   Right-click: the Power BI context menu opens.
3. Format the Value measure as a percentage in the model: the card shows it as a percentage, in
   the report's language.
4. In **edit mode**, turn on Status, bind Small Multiples or Trend, or add Secondary KPIs: each
   renders working under the "Pro preview" watermark, a banner names the feature, and after about
   10 seconds the Upgrade bar appears. Remove the feature and both go.
5. Switch to **reading view**: the free result, no watermark, no notice.
6. With Small Multiples and 6 columns: the secondary KPIs move below the value — in a list if the
   figures do not fit in a row — identically on every card, with no horizontal scrollbar.
7. Switch to another report page and back: the state is kept.
8. With an active plan, the same features render without the watermark.

No external accounts, API keys or credentials are required.
