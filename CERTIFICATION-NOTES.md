# KPI Card Pro — Certification Notes
# Copia este contenido en el campo "Notas para la certificación" de Partner Center antes de publicar.
# IMPORTANTE: El campo se borra en cada reenvío. Guarda este archivo.

---

Source code (certification branch):
https://github.com/tinocallarisa-web/kpi-card-pro/tree/certification

Privacy Policy: https://tinocallarisa-web.github.io/kpi-card-pro/privacy.html
Terms of Use: https://tinocallarisa-web.github.io/kpi-card-pro/terms.html
Support: https://tcviz.com

License validation:
This visual uses the official Microsoft IVisualLicenseManager API (spIdentifier: kpi-card-pro-tcviz).
No external license server is used. The license state is resolved asynchronously after
the first render, so rendering never depends on the licensing call completing.

IMPORTANT — testing note:
When the .pbiviz is imported from file in Power BI Desktop using the production GUID
(kpiCardProTCViz), Power BI applies entitlement enforcement for the published paid offer
and the visual content is cleared when navigating between report pages. This is Power BI's
own enforcement, not visual behaviour: it reproduces identically with the visual's licensing
code fully disabled. It does not occur when the visual is installed from AppSource with an
active license, nor when built under a non-production GUID.
If you observe the visual clearing on page navigation, please verify with an entitled account
or an AppSource-installed instance rather than a file import.

Free tier (no license required):
- Single KPI card with main value, prior period variance, and target
- Native Power BI tooltips (value + prior period)
- Display units (Auto / K / M / B), decimal places
- Label show/hide, font size and color
- Card background, border color, drop shadow
- High Contrast mode and ARIA title (Accessibility section)

Pro tier (requires active AppSource license — plan: kpi-card-pro-tcviz):
- Small Multiples: up to 50 cards from a category dimension
- Multi-column layout (1–6 columns) with configurable gap
- Custom prefix and suffix on main value
- Variance pill style with custom positive/negative/neutral colors
- Extended tooltips: up to 10 additional measures
- Border width, border radius, padding controls (Card section)

Testing instructions:
1. Import the .pbiviz file included in the submission via Insert > More visuals > Import from file.
2. Open the sample .pbix file included in the submission — it contains pre-configured examples and a "Tips & Hints" page.
3. Without a Pro license: verify the single KPI card renders with value, prior period variance (%), and target. Confirm the "Free" badge appears in the bottom-right corner.
4. With a Pro license assigned via Partner Center: drag a dimension field to "Small Multiples" and verify multiple cards render (up to 50). Confirm the "Free" badge disappears and Pro formatting controls are active.
5. Right-click on any card to verify the Power BI context menu appears correctly.
6. Hover over a card to verify the native tooltip shows value and prior period data.

No external accounts, API keys, or credentials are required.
