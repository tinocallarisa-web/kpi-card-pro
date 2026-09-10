/**
 * KPI Card Pro — Visual
 * TCViz | tcviz.com
 * pbiviz tools v7.0.3 | powerbi-visuals-api ~5.10.0
 * powerbi-visuals-utils-formattingmodel ^6.2.2 | TypeScript ES2022
 */

"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { VisualFormattingSettingsModel } from "./settings";

import DataView = powerbi.DataView;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import IVisualLicenseManager = powerbi.extensibility.IVisualLicenseManager;
import LicenseNotificationType = powerbi.LicenseNotificationType;

interface MetricData {
    name: string;
    value: number | null;
    highlightValue: number | null;        // highlight from cross-filter
    priorPeriod: number | null;
    target: number | null;
    tooltipFields: Array<{ displayName: string; value: string }>;
    selectionId: powerbi.extensibility.ISelectionId | null;
    isHighlighted: boolean;               // false = dim this card
    trendData: number[];                  // series for the sparkline, empty when unbound
    targetData: number[];                 // target per period, aligned with trendData
    image: string | null;                 // validated Base64 data URI, or null
}

type DisplayUnit = "auto" | "none" | "thousands" | "millions" | "billions";

const CONTEXT_MENU_DEBOUNCE = 200;

const SERVICE_PLAN_ID = "kpi-card-pro-tcviz";

/**
 * Session-level license cache.
 * Power BI recreates the visual instance on every page switch. Without this,
 * getAvailableServicePlans() is called again on each switch, racing against
 * the first render and leaving the visual blank.
 */
let licensePromise: Promise<boolean> | null = null;
let licenseResolved: boolean | null = null;
/** False in Publish-to-Web, embedded, national clouds and PDF/PPT export. */
let licenseEnvSupported = true;
/** False when the licence could not be read: offline, or not signed in. */
let licenseInfoAvailable = true;
/** Diagnostic overlay. Patched to true by `node build-test.js --debug`. */
let DBG_LICENSE = false; // DBG_LICENSE_MARKER


function resolveLicense(licenseManager: IVisualLicenseManager): Promise<boolean> {
    if (licenseResolved !== null) return Promise.resolve(licenseResolved);
    if (licensePromise) return licensePromise;

    // getAvailableServicePlans() returns IPromise2, not a native Promise —
    // wrap it so we can cache and chain with standard Promise semantics.
    licensePromise = new Promise<boolean>(resolve => {
        try {
            licenseManager.getAvailableServicePlans().then(
                (result: any) => {
                    const plans = result?.plans ?? [];
                    // Microsoft: "only the active and warning states represent a
                    // usable license". Warning is a payment grace period, so a
                    // paying customer keeps their features through it.
                    // ServicePlanState: Active = 1, Warning = 2.
                    licenseResolved = plans.some(
                        (p: any) => p.spIdentifier === SERVICE_PLAN_ID &&
                                    (p.state === 1 || p.state === 2)
                    );
                    // A Pro customer legitimately reads as Free in these cases, so
                    // they must never be asked to buy what they already own.
                    licenseEnvSupported  = !result?.isLicenseUnsupportedEnv;
                    licenseInfoAvailable = result?.isLicenseInfoAvailable !== false;
                    resolve(licenseResolved);
                },
                () => {
                    licenseResolved = false;
                    licenseInfoAvailable = false;
                    resolve(false);
                }
            );
        } catch (_) {
            licenseResolved = false;
            resolve(false);
        }
    });

    return licensePromise;
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private container: HTMLElement;
    private formattingSettings!: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private selectionManager: ISelectionManager;
    private licenseManager: IVisualLicenseManager;
    private events: powerbi.extensibility.IVisualEventService;
    private isPro: boolean = false; // set true locally to test Pro features
    private lastContextMenuTime: number = 0;
    private lastDataView: DataView | undefined = undefined;
    private hasRenderedData: boolean = false;
    private viewport: powerbi.IViewport = { width: 0, height: 0 };
    private layoutRetries: number = 0;

    private licenseRequested = false;
    /** Last set of Pro settings already notified, to avoid nagging. */
    private lastBlockedNotice = "";
    /** The persistent icon is a one-shot: it stays until cleared. */
    private licenseIconShown = false;
    /** Solo para el overlay de diagnostico. */
    private dbgMeasureIdx = 0;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        this.events = options.host.eventService;

        // ── Container (assign BEFORE any async work touches it) ───────────
        this.container = options.element;
        this.container.classList.add("kpi-card-pro-container");
        this.container.setAttribute("role", "region");
        this.container.setAttribute("aria-label", "KPI Card Pro");


        // ── IVisualLicenseManager ─────────────────────────────────────────
        // NOTE: the license check is deliberately NOT performed here.
        // Calling getAvailableServicePlans() during construction races the first
        // render and leaves the visual blank when returning to a report page.
        // It is triggered lazily from update(), after data has been rendered.
        this.licenseManager = this.host.licenseManager;
        if (licenseResolved !== null) {
            this.isPro = this.isPro || licenseResolved;   // reuse session result
        }

        // ── Context menu on empty space ────────────────────────────────────
        this.container.addEventListener("contextmenu", (e: MouseEvent) => {
            if ((this.host as any).allowInteractions === false) return;
            const now = Date.now();
            if (now - this.lastContextMenuTime < CONTEXT_MENU_DEBOUNCE) return;
            this.lastContextMenuTime = now;
            e.preventDefault();
            const target = e.target as HTMLElement;
            const metricEl = target.closest("[data-selection-index]") as HTMLElement | null;
            if (!metricEl) {
                this.host.tooltipService?.hide({ immediately: true, isTouchEvent: false });
                this.selectionManager.showContextMenu(null, { x: e.clientX, y: e.clientY });
            }
        });
    }

    // ─── Update ─────────────────────────────────────────────────────────────

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);

        try {
            const dataView = options?.dataViews?.[0];

            // Power BI's viewport is authoritative. Relying on the container being
            // sized (width/height 100%) fails on page return, where the element can
            // still have zero dimensions — the content renders but is invisible until
            // a resize forces a reflow.
            if (options.viewport && options.viewport.width > 0 && options.viewport.height > 0) {
                this.viewport = options.viewport;
            }


            // Only act on updates that contain real measure data.
            // Power BI sends skeleton/resize/viewport updates (matrix exists but no
            // column sources) especially on page return — we must ignore these to
            // prevent clearing the container and losing the displayed values.
            const hasSources = (dataView?.matrix?.columns?.levels?.[0]?.sources?.length ?? 0) > 0;

            if (!hasSources) {
                if (!this.lastDataView) {
                    this.renderLandingPage();
                } else if (this.formattingSettings) {
                    // Resize / viewport update with no new data: repaint from cache so
                    // the layout picks up the current viewport.
                    this.render(this.parseDataView(this.lastDataView));
                }
                this.events.renderingFinished(options);
                return;
            }

            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
                VisualFormattingSettingsModel,
                dataView
            ) as VisualFormattingSettingsModel;

            const metrics = this.parseDataView(dataView);

            // If parsing yields nothing but we already displayed real data, this is a
            // transient update (roles not yet populated on page return). Keep the
            // current display instead of wiping it with the empty placeholder.
            if (metrics.length === 0 && this.hasRenderedData) {
                this.events.renderingFinished(options);
                return;
            }

            this.lastDataView = dataView;

            const ariaTitle = this.formattingSettings.accessibility.visualTitle.value || "KPI Card Pro";
            this.container.setAttribute("aria-label", ariaTitle);

            this.render(metrics);
            if (metrics.length > 0) {
                this.hasRenderedData = true;
                this.requestLicenseDeferred();
            }

            this.events.renderingFinished(options);
        } catch (error) {
            this.events.renderingFailed(options);
        }
    }

    // ─── License (deferred, session-cached) ─────────────────────────────────

    /**
     * Resolves the license AFTER the visual has painted real data.
     * Deferred to a macrotask so the current render completes first, and cached
     * at module level so a page switch never triggers a second call.
     * A failure here is silent by design: the visual stays on the Free tier.
     */
    private requestLicenseDeferred(): void {
        if (this.licenseRequested) return;
        if (this.isPro) return;                       // already Pro (test build)
        this.licenseRequested = true;

        if (licenseResolved !== null) {
            this.applyLicense(licenseResolved);
            return;
        }

        setTimeout(() => {
            try {
                resolveLicense(this.licenseManager).then(isPro => this.applyLicense(isPro));
            } catch (_) { /* stay on Free tier */ }
        }, 0);
    }

    private applyLicense(isPro: boolean): void {
        if (!isPro || this.isPro) {
            // Free stays Free — but the answer has arrived, and notifying is the
            // one thing still pending. render() already ran and bailed out of the
            // notification because the licence was unresolved; nothing re-renders
            // for a Free user, so without this the banner never appears at all.
            this.notifyProFeatureBlocked();
            return;
        }
        this.isPro = true;
        this.clearLicenseNotice();
        if (this.lastDataView && this.formattingSettings) {
            try {
                this.render(this.parseDataView(this.lastDataView));
            } catch (_) { /* keep current display */ }
        }
    }

    /**
     * Which Pro settings the user has explicitly changed.
     *
     * Reads `metadata.objects`, which carries only properties the user actually
     * set. The settings model is no use here: every Pro property has a default
     * and several default to a truthy value, so comparing against it would fire
     * on a report nobody has touched. Presence here is a deliberate action, and
     * therefore a real moment of purchase intent.
     */
    private attemptedProFeatures(): { labels: string[]; signature: string } {
        // No early return on a missing metadata.objects. A report where the user
        // has changed no formatting property has no objects at all — and that is
        // exactly the case of someone who has only dropped a field into Small
        // Multiples. Returning here skipped the data-role check below, so the
        // most visible gate in the visual stayed silent.
        const objs = (this.lastDataView?.metadata?.objects ?? {}) as any;

        const groups: [string, string, string[]][] = [
            ["card styling",   "card",                 ["borderWidth", "borderRadius", "padding", "shadow"]],
            ["the small multiples layout","smallMultiplesLayout", ["columns", "gap", "showTitle", "titleFontSize", "titleColor"]],
            ["prefix/suffix",  "mainValue",            ["prefix", "suffix"]],
            ["the variance pill", "variance",          ["showPill"]],
        ];

        const labels: string[] = [];
        const parts:  string[] = [];

        // Small Multiples is bound in a field well, not the format pane, so it
        // leaves nothing in metadata.objects. Without this the most visible gate
        // in the visual — a dozen categories rendering as a single card — passed
        // in silence.
        //
        // Binding the field is the intent: nobody drags a category in expecting
        // one card. So this fires on the binding, not on the category count.
        //
        // hasGrouping repeats the test parseDataView uses, and it needs both
        // halves: a matrix with no grouping still returns one anonymous child,
        // so levels.length alone would report grouping that is not there.
        const smRows = this.lastDataView?.matrix?.rows;
        const roles  = this.rowRoles(smRows);

        // Both roles share the row hierarchy, so a grouping level is not enough:
        // with only Trend bound, the root's children are dates, not categories.
        // Ask which role owns the level instead of assuming the first one is a card.
        const smKids = this.realChildren(smRows?.root);
        const anyGrouping = (smRows?.levels?.length ?? 0) > 0
            && smKids.length > 0
            && smKids[0].value !== undefined;
        const smHasGrouping = anyGrouping && roles.sm >= 0;

        // Binding Trend is intent too, and it leaves no trace in metadata.objects.
        if (anyGrouping && roles.trend >= 0) {
            labels.push("the trend line");
            parts.push("role.trend=1");
        }

        if (smHasGrouping) {
            const n = smKids.length;
            labels.push(n > 1
                ? `small multiples (${n} categories, showing 1)`
                : "small multiples");
            parts.push(`role.smallMultiples=${n}`);
        }

        for (const [label, card, props] of groups) {
            let touched = false;
            for (const p of props) {
                const v = objs?.[card]?.[p];
                if (v === undefined) continue;
                touched = true;
                // The value, not just the name: nudging Columns from 2 to 3 is a
                // fresh attempt at the same feature. A resize changes neither.
                parts.push(`${card}.${p}=${JSON.stringify(v)}`);
            }
            if (touched) labels.push(label);
        }
        return { labels, signature: parts.join("|") };
    }

    /**
     * Take the licence notice down: the licence resolved, or the user removed
     * every Pro setting. Both notifications live for the visual's lifetime until
     * cleared, so leaving one up would tell a paying customer to buy what they
     * have just bought.
     */
    private clearLicenseNotice(): void {
        this.lastBlockedNotice = "";
        if (!this.licenseIconShown) return;
        this.licenseIconShown = false;
        try {
            (this.licenseManager as any)?.clearLicenseNotification?.();
        } catch (_) { /* best-effort */ }
    }

    /**
     * Power BI's own notifications, which carry the purchase path.
     *
     * This replaces the "Free" badge the visual used to draw. Microsoft is
     * explicit that a visual "shouldn't display its own licensing UX, instead
     * use one of Power BI supported predefined notifications" — and that badge
     * put its only explanation in a `title` attribute on an element with
     * `pointer-events: none`, so it could never be hovered and never appeared.
     */
    /** Diagnostic overlay: what the licence detection actually sees. */
    private dbgOverlay(stage: string): void {
        if (!DBG_LICENSE) return;
        const rows = this.lastDataView?.matrix?.rows;
        const a = this.attemptedProFeatures();
        const lines = [
            `stage=${stage}`,
            `isPro=${this.isPro} resolved=${licenseResolved}`,
            `env=${licenseEnvSupported} info=${licenseInfoAvailable}`,
            `levels=${rows?.levels?.length ?? "-"} children=${rows?.root?.children?.length ?? "-"}`,
            `child0.value=${JSON.stringify(rows?.root?.children?.[0]?.value)}`,
            `labels=[${a.labels.join(" / ")}]`,
            `sig=${a.signature || "(vacio)"}`,
            `lastNotice=${this.lastBlockedNotice || "(vacio)"} icon=${this.licenseIconShown}`,
        ];

        // La serie tal y como llega: clave del periodo y valor, en orden de entrega.
        const roles2 = this.rowRoles(rows);
        const card0  = rows?.root?.children?.[0];
        const serieNode = roles2.sm >= 0 ? card0 : rows?.root;
        const kids = serieNode?.children ?? [];
        lines.push(`serie de: ${roles2.sm >= 0 ? String(card0?.value) : "raiz"}  n=${kids.length}`);
        const mIdx = this.dbgMeasureIdx;
        kids.slice(0, 8).forEach((k, i) => {
            const v = this.getNodeValue(k.values ?? {}, mIdx);
            lines.push(`  [${i}] ${JSON.stringify(k.value)} = ${v}`);
        });
        // Deferred: render() clears the container in an atomic swap right after
        // this runs, so anything appended now is wiped before it is ever seen.
        // The original badge survived because it was appended to the new tree;
        // this overlay is not part of that tree, so it has to wait for the swap.
        setTimeout(() => this.dbgPaint(lines), 0);
    }

    private dbgPaint(lines: string[]): void {
        let box = this.container.querySelector("#dbg-lic") as HTMLElement | null;
        if (!box) {
            box = document.createElement("div");
            box.id = "dbg-lic";
            box.style.cssText = "position:absolute;top:2px;left:2px;z-index:99999;max-width:96%;" +
                "font:10px/1.35 monospace;color:#fff;background:#C96442;padding:3px 6px;" +
                "border-radius:3px;white-space:pre;pointer-events:none;";
            this.container.appendChild(box);
        }
        box.textContent = lines.join(String.fromCharCode(10));
    }

    /**
     * The trend line inside a card.
     *
     * Restored from 1.0.0, where it lived for a single day before the matrix
     * rewrite dropped it — while the documentation went on describing it for
     * months. It is Pro: the free card gives you the number, Pro gives you the
     * context. Styling alone was never worth paying for.
     *
     * Geometry is normalised to a 0-100 viewBox with preserveAspectRatio="none",
     * so the same path stretches to any card width without recomputing.
     */
    private buildSparkline(metric: MetricData, hc: boolean): HTMLElement | null {
        const t = this.formattingSettings.trend;
        const data = metric.trendData;
        if (data.length < 2) return null;

        const height = Math.max(16, Math.min(160, t.height.value ?? 40));
        const wrapper = document.createElement("div");
        wrapper.className = "kpi-sparkline";
        wrapper.style.cssText = `width:100%;height:${height}px;margin-top:6px;flex-shrink:0;position:relative;`;

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", String(height));
        svg.setAttribute("viewBox", `0 0 100 ${height}`);
        svg.setAttribute("preserveAspectRatio", "none");
        svg.setAttribute("aria-hidden", "true");

        const color   = hc ? "#FFFFFF" : (t.color.value?.value ?? "#0078D4");
        const kind    = String(t.type.value?.["value"] ?? t.type.value ?? "area");
        const lineW   = t.lineWidth.value ?? 2;
        const opacity = (t.areaOpacity.value ?? 20) / 100;

        // La escala abarca las dos series. Si solo cubriera los valores, un
        // objetivo por encima del maximo -o por debajo del minimo- se dibujaria
        // fuera del area y pareceria que la opcion no hace nada.
        const tgt = t.showTargetLine.value ? metric.targetData : [];
        const all = tgt.length === data.length ? data.concat(tgt) : data;
        const minV = Math.min(...all);
        const maxV = Math.max(...all);
        const range = maxV - minV || 1;
        const y = (v: number) => height - ((v - minV) / range) * (height * 0.8) - height * 0.1;
        const pts: Array<[number, number]> = data.map((v, i) => [
            (i / (data.length - 1)) * 100, y(v)
        ]);

        // El objetivo, periodo a periodo, no una linea plana.
        //
        // metric.target es el total del periodo: con Trend vinculado suma los
        // objetivos de todos los meses. Dibujar una horizontal en ese numero la
        // situaba muy por encima de unos puntos que son mensuales, fuera del
        // area visible — de ahi que la opcion pareciera no hacer nada. Si el
        // objetivo es constante, esta serie sale plana igualmente.
        if (tgt.length === data.length && tgt.length > 1) {
            const dTgt = tgt
                .map((v, i) => `${i === 0 ? "M" : "L"}${(i / (tgt.length - 1)) * 100},${y(v)}`)
                .join(" ");
            const line = document.createElementNS(svgNS, "path");
            line.setAttribute("d", dTgt);
            line.setAttribute("fill", "none");
            line.setAttribute("stroke", hc ? "#FFFF00" : "#A19F9D");
            line.setAttribute("stroke-width", "1");
            line.setAttribute("stroke-dasharray", "4 2");
            line.setAttribute("vector-effect", "non-scaling-stroke");
            svg.appendChild(line);
        }

        const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");

        if (kind === "bar") {
            const barW = (100 / data.length) * 0.7;
            data.forEach((v, i) => {
                const rect = document.createElementNS(svgNS, "rect");
                const h = ((v - minV) / range) * (height * 0.8);
                rect.setAttribute("x", String((i / data.length) * 100 + barW * 0.2));
                rect.setAttribute("y", String(height - h - height * 0.1));
                rect.setAttribute("width", String(barW));
                rect.setAttribute("height", String(Math.max(0, h)));
                rect.setAttribute("fill", color);
                rect.setAttribute("fill-opacity", String(Math.min(1, opacity + 0.4)));
                svg.appendChild(rect);
            });
        } else {
            if (kind === "area") {
                const area = document.createElementNS(svgNS, "path");
                area.setAttribute("d", `${pathD} L100,${height} L0,${height} Z`);
                area.setAttribute("fill", color);
                area.setAttribute("fill-opacity", String(opacity));
                area.setAttribute("stroke", "none");
                svg.appendChild(area);
            }
            const path = document.createElementNS(svgNS, "path");
            path.setAttribute("d", pathD);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", color);
            path.setAttribute("stroke-width", String(lineW));
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("stroke-linejoin", "round");
            // Without this the horizontal stretch of the viewBox thickens the line.
            path.setAttribute("vector-effect", "non-scaling-stroke");
            svg.appendChild(path);

            if (t.showDot.value) {
                // Not an SVG circle: preserveAspectRatio="none" stretches the
                // viewBox horizontally, and that deforms geometry — a circle comes
                // out as an ellipse. vector-effect only spares the stroke, not the
                // fill. An HTML element positioned over the chart stays round at
                // any card width.
                const last = pts[pts.length - 1];
                const r = lineW + 1.5;
                const dot = document.createElement("div");
                dot.style.cssText =
                    `position:absolute;left:${last[0]}%;top:${last[1]}px;` +
                    `width:${r * 2}px;height:${r * 2}px;margin:${-r}px 0 0 ${-r}px;` +
                    `border-radius:50%;background:${color};pointer-events:none;z-index:1;`;
                wrapper.appendChild(dot);
            }
        }

        wrapper.appendChild(svg);
        return wrapper;
    }

    private notifyProFeatureBlocked(): void {
        this.dbgOverlay("enter");
        if (this.isPro) { this.clearLicenseNotice(); return; }

        // The licence resolves after the first paint, so isPro is false on the way
        // in for everyone, a Pro customer included. Saying anything before the
        // answer arrives would flash "you need a licence" at someone who has one.
        // applyLicense() re-renders once it resolves, and this runs again then.
        if (licenseResolved === null) return;

        const { labels: wanted, signature } = this.attemptedProFeatures();
        if (wanted.length === 0) { this.clearLicenseNotice(); return; }

        // Licence unreadable, or an environment without licence enforcement:
        // a Pro customer lands here too, so say nothing.
        if (!licenseEnvSupported || !licenseInfoAvailable) return;

        // The persistent icon covers the state, not the action — chiefly a trial
        // that has run out. The user's Pro settings stay saved, so the cards
        // silently lose their styling and drop to a single column with nothing to
        // explain it. The banner below is no help there: it only fires on a
        // change, and this user changed nothing. Power BI shows the icon in Edit
        // mode only, so report consumers see nothing.
        if (!this.licenseIconShown) {
            this.licenseIconShown = true;
            try {
                // const enum: TypeScript inlines General to 0. Referencing the
                // enum object at runtime would give undefined.
                (this.licenseManager as any)?.notifyLicenseRequired?.(
                    LicenseNotificationType.General
                );
            } catch (_) { /* best-effort */ }
        }

        // Fires on each fresh change and only then: update() also runs on resize,
        // selection and data refresh, and the banner must not reappear for those.
        if (signature === this.lastBlockedNotice) return;
        this.lastBlockedNotice = signature;

        const list = wanted.length === 1
            ? wanted[0]
            : wanted.slice(0, -1).join(", ") + " and " + wanted[wanted.length - 1];

        try {
            (this.licenseManager as any)?.notifyFeatureBlocked?.(
                `KPI Card Pro: ${list} ${wanted.length === 1 ? "is" : "are"} part of the Pro plan. ` +
                `Get a licence to enable ${wanted.length === 1 ? "it" : "them"}.`
            );
        } catch (_) { /* notification is best-effort; never break the render */ }
    }

    // ─── Landing Page ────────────────────────────────────────────────────────

    private renderLandingPage(): void {
        // Never replace already-painted data with the landing page.
        if (this.hasRenderedData) return;

        const palette = this.host.colorPalette;
        const isHC = palette.isHighContrast;
        const fg = isHC ? "#FFFFFF" : (palette.foreground?.value ?? "#3D3929");
        const bg = isHC ? "#000000" : (palette.background?.value ?? "#FAF9F5");
        const muted = isHC ? "#CCCCCC" : "#83827D";
        const accent = "#C96442";

        const landing = document.createElement("div");
        landing.setAttribute("role", "region");
        landing.setAttribute("aria-label", "KPI Card Pro — Add data to get started");
        const lvW = this.viewport.width  > 0 ? `${this.viewport.width}px`  : "100%";
        const lvH = this.viewport.height > 0 ? `${this.viewport.height}px` : "100%";

        landing.style.cssText = `
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            width: ${lvW}; height: ${lvH};
            background: ${bg};
            font-family: 'Segoe UI', sans-serif;
            text-align: center;
            padding: 20px; box-sizing: border-box; gap: 8px;
        `;

        // Icon
        const svgNS = "http://www.w3.org/2000/svg";
        const icon = document.createElementNS(svgNS, "svg");
        icon.setAttribute("width", "40"); icon.setAttribute("height", "40");
        icon.setAttribute("viewBox", "0 0 40 40"); icon.setAttribute("fill", "none");
        icon.setAttribute("aria-hidden", "true");
        const iconRect = document.createElementNS(svgNS, "rect");
        iconRect.setAttribute("x", "4"); iconRect.setAttribute("y", "4");
        iconRect.setAttribute("width", "32"); iconRect.setAttribute("height", "32");
        iconRect.setAttribute("rx", "6"); iconRect.setAttribute("stroke", accent);
        iconRect.setAttribute("stroke-width", "1.5"); iconRect.setAttribute("fill", "none");
        icon.appendChild(iconRect);
        const bars = [[10, 26, 6], [16, 20, 12], [22, 14, 18], [28, 8, 24]];
        bars.forEach(([x, y, h]) => {
            const r = document.createElementNS(svgNS, "rect");
            r.setAttribute("x", String(x)); r.setAttribute("y", String(y));
            r.setAttribute("width", "4"); r.setAttribute("height", String(h));
            r.setAttribute("rx", "1"); r.setAttribute("fill", accent);
            icon.appendChild(r);
        });
        landing.appendChild(icon);

        const title = document.createElement("div");
        title.textContent = "KPI Card Pro";
        title.style.cssText = `font-size: 15px; font-weight: 700; color: ${fg};`;
        landing.appendChild(title);

        const hint = document.createElement("div");
        hint.textContent = "Add a measure to the Value field well to get started.";
        hint.style.cssText = `font-size: 12px; color: ${muted}; max-width: 200px; line-height: 1.5;`;
        landing.appendChild(hint);

        const subHint = document.createElement("div");
        subHint.textContent = "Prior Period for variance · Target for goal tracking · Small Multiples for multi-card layout (Pro)";
        subHint.style.cssText = `font-size: 10px; color: ${muted}; max-width: 220px; line-height: 1.5; margin-top: 4px;`;
        landing.appendChild(subHint);

        // Atomic swap
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        this.container.appendChild(landing);
    }

    // ─── Parse DataView (Matrix) ─────────────────────────────────────────────

    /**
     * Which row level carries which role.
     *
     * Both Small Multiples and Trend are grouping roles on the same row hierarchy,
     * so the level index alone says nothing: with only Trend bound, level 0 is the
     * time axis, and treating its children as cards would render one card per date.
     */
    /**
     * A node's measure value, falling back to the sum of its children.
     *
     * With Trend bound the values sit on the leaves — one per period — and the
     * card's own node carries none, so the card rendered a dash where the number
     * should be. Power BI would supply a proper subtotal through the Total/SubTotal
     * API; until that is implemented, summing the leaves is the honest
     * approximation. It is exact for additive measures (sums, counts) and wrong
     * for averages and ratios, which is why the sum is only a fallback and never
     * overrides a value Power BI did provide.
     */
    private nodeOrChildrenValue(node: powerbi.DataViewMatrixNode | undefined, idx: number): number | null {
        const own = this.getNodeValue(node?.values ?? {}, idx);
        if (own !== null) return own;
        const kids = this.realChildren(node);
        if (kids.length === 0) return null;
        let sum = 0;
        let seen = false;
        for (const k of kids) {
            const v = this.getNodeValue(k.values ?? {}, idx);
            if (v !== null) { sum += v; seen = true; }
        }
        return seen ? sum : null;
    }

    /**
     * A node's real children, with subtotal nodes filtered out.
     *
     * With the Total/SubTotal API enabled Power BI inserts subtotal nodes into the
     * hierarchy. They are aggregates, not data points: left in, a subtotal would
     * appear in the sparkline as one enormous final bar, and in the grid as an
     * extra card called "Total".
     */
    private realChildren(node: powerbi.DataViewMatrixNode | undefined): powerbi.DataViewMatrixNode[] {
        return (node?.children ?? []).filter(k => !(k as any).isSubtotal);
    }

    /**
     * A safe image for the card, or null.
     *
     * Only `data:image/<type>;base64,<payload>` is accepted. Every other scheme —
     * http, https, blob, javascript — is rejected without comment, which is what
     * keeps the promise that the visual makes no network request of any kind. That
     * promise is not decoration: it is what the privacy policy and the
     * certification notes claim, and an external URL would quietly make both
     * false. A sibling visual was rejected for XSS over exactly this.
     */
    private safeImage(raw: unknown): string | null {
        if (typeof raw !== "string") return null;
        const v = raw.trim();
        if (v.length < 32 || v.length > 2_000_000) return null;
        return /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/i.test(v)
            ? v
            : null;
    }

    /** Text value of a node, searching descendants when the node itself has none. */
    private nodeOrChildrenText(node: powerbi.DataViewMatrixNode | undefined, idx: number): string | null {
        if (idx < 0) return null;
        const own = this.safeImage((node?.values?.[idx] as any)?.value);
        if (own) return own;
        for (const k of this.realChildren(node)) {
            const found = this.nodeOrChildrenText(k, idx);
            if (found) return found;
        }
        return null;
    }

    private rowRoles(rows: powerbi.DataViewHierarchy | undefined): { sm: number; trend: number } {
        const out = { sm: -1, trend: -1 };
        (rows?.levels ?? []).forEach((lvl, i) => {
            const roles = lvl?.sources?.[0]?.roles ?? {};
            if (roles["smallMultiples"] && out.sm === -1) out.sm = i;
            if (roles["trend"] && out.trend === -1) out.trend = i;
        });
        return out;
    }

    /**
     * The sparkline series: a node's children, in time order.
     *
     * Power BI does not always deliver them chronologically. A real date column
     * comes ordered; a plain numeric period — a month number, a week number —
     * arrives sorted by the measure instead, descending. The line then slid
     * downwards on every card whatever the data did, because it was not a trend
     * at all but the same values sorted from high to low.
     *
     * So: sort by the key ourselves, but only when every key is a number or a
     * date, where ascending order is unambiguous. Text keys are left exactly as
     * delivered — sorting "Enero, Febrero, Marzo" alphabetically would break the
     * Sort-by-column the user set up precisely to avoid that.
     */
    private seriesFrom(node: powerbi.DataViewMatrixNode | undefined, measureIdx: number): number[] {
        const kids = this.realChildren(node).slice();

        const key = (k: powerbi.DataViewMatrixNode): number | null => {
            const v = k.value as any;
            if (typeof v === "number") return v;
            if (v instanceof Date) return v.getTime();
            return null;
        };
        if (kids.length > 1 && kids.every(k => key(k) !== null)) {
            kids.sort((a, b) => (key(a) as number) - (key(b) as number));
        }

        return kids.map(k => this.getNodeValue(k.values ?? {}, measureIdx) ?? 0);
    }

    private parseDataView(dataView?: DataView): MetricData[] {
        if (!dataView?.matrix) return [];

        const matrix = dataView.matrix;
        const rows = matrix.rows;
        const cols = matrix.columns;

        let measureIdx = -1;
        let priorIdx = -1;
        let targetIdx = -1;
        let imageIdx = -1;
        const tooltipIdxs: number[] = [];

        if (cols?.levels?.[0]?.sources) {
            cols.levels[0].sources.forEach((src, i) => {
                const roles = src.roles ?? {};
                if (roles["measure"] && measureIdx === -1) measureIdx = i;
                else if (roles["priorPeriod"] && priorIdx === -1) priorIdx = i;
                else if (roles["target"] && targetIdx === -1) targetIdx = i;
                else if (roles["image"] && imageIdx === -1) imageIdx = i;
                else if (roles["tooltips"]) tooltipIdxs.push(i);
            });
        }

        if (measureIdx === -1) return [];
        this.dbgMeasureIdx = measureIdx;

        // Detect active cross-highlight in the whole matrix
        const hasHighlights = this.detectHighlights(matrix, measureIdx);

        // Small Multiples is only truly bound when the row hierarchy has a grouping
        // level. Power BI still returns one anonymous child when nothing is bound,
        // so checking children alone would mislabel the card as "Item 1".
        // Against realChildren, not children: rowSubtotalsType defaults to "Bottom"
        // but can be "Top", and a subtotal node in first place would carry no value
        // and make a real grouping look like none.
        const groupKids = this.realChildren(rows?.root);
        const anyGrouping = (rows?.levels?.length ?? 0) > 0
            && groupKids.length > 0
            && groupKids[0].value !== undefined;

        // Trend shares the row hierarchy with Small Multiples, so a grouping level
        // is not necessarily a card. With only Trend bound, level 0 is the time
        // axis and its children are data points, not cards.
        const roles = this.rowRoles(rows);
        const smBound    = roles.sm >= 0 && anyGrouping;
        const trendBound = roles.trend >= 0 && anyGrouping;
        const hasGrouping = smBound;

        // No small multiples — single card
        if (!hasGrouping) {
            const anonChild = rows?.root?.children?.[0];
            const rootValues = anonChild?.values
                ?? matrix.rows?.root?.values
                ?? matrix.columns?.root?.values
                ?? {};
            // With Trend bound and no Small Multiples, root.children are periods,
            // not cards: anonChild would give January instead of the total.
            const valueNode = trendBound ? rows?.root : anonChild;
            const value = this.nodeOrChildrenValue(valueNode, measureIdx)
                ?? this.getNodeValue(rootValues, measureIdx);
            const highlightValue = hasHighlights ? this.nodeOrChildrenHighlight(valueNode, measureIdx) : null;
            const prior = priorIdx >= 0
                ? (this.nodeOrChildrenValue(valueNode, priorIdx) ?? this.getNodeValue(rootValues, priorIdx))
                : null;
            const target = targetIdx >= 0
                ? (this.nodeOrChildrenValue(valueNode, targetIdx) ?? this.getNodeValue(rootValues, targetIdx))
                : null;
            const measureName = cols?.levels?.[0]?.sources?.[measureIdx]?.displayName ?? "Value";

            return [{
                name: measureName,
                value,
                highlightValue,
                priorPeriod: prior,
                target,
                tooltipFields: [],
                selectionId: null,
                isHighlighted: true,  // single card always visible
                // Only Trend bound: the root's children are the points of the series.
                trendData: trendBound ? this.seriesFrom(rows?.root, measureIdx) : [],
                targetData: trendBound && targetIdx >= 0 ? this.seriesFrom(rows?.root, targetIdx) : [],
                image: this.nodeOrChildrenText(valueNode, imageIdx)
            }];
        }

        // Small multiples — one card per row
        const metrics: MetricData[] = [];
        const limit = this.isPro ? 50 : 1;

        // Subtotal nodes are not cards: without this the grid would show an extra
        // "Total" card, and it would eat one of the 50 Pro slots.
        const cardNodes = this.realChildren(rows.root);
        for (let i = 0; i < Math.min(cardNodes.length, limit); i++) {
            const child = cardNodes[i];
            const categoryName = child.value != null ? String(child.value) : `Item ${i + 1}`;
            const rowValues = child.values ?? {};

            const value = this.nodeOrChildrenValue(child, measureIdx);
            const highlightValue = hasHighlights ? this.nodeOrChildrenHighlight(child, measureIdx) : null;
            const prior = priorIdx >= 0 ? this.nodeOrChildrenValue(child, priorIdx) : null;
            const target = targetIdx >= 0 ? this.nodeOrChildrenValue(child, targetIdx) : null;

            // Card is highlighted if it has a highlight value or there are no highlights at all
            const isHighlighted = !hasHighlights || highlightValue !== null;

            const tooltipFields = tooltipIdxs.map(ti => ({
                displayName: cols?.levels?.[0]?.sources?.[ti]?.displayName ?? "",
                value: this.formatValue(this.nodeOrChildrenValue(child, ti))
            }));

            const selectionId = this.host.createSelectionIdBuilder()
                .withMatrixNode(child, rows.levels)
                .createSelectionId();

            metrics.push({
                name: categoryName,
                value,
                highlightValue,
                priorPeriod: prior,
                target,
                tooltipFields,
                selectionId,
                isHighlighted,
                // With both roles bound, each card's children are its own series.
                trendData: trendBound ? this.seriesFrom(child, measureIdx) : [],
                targetData: trendBound && targetIdx >= 0 ? this.seriesFrom(child, targetIdx) : [],
                image: this.nodeOrChildrenText(child, imageIdx)
            });
        }

        return metrics;
    }

    /**
     * Is any highlight active anywhere in the matrix?
     *
     * Walks the whole hierarchy rather than just the root and its children. With
     * Trend bound the values — and therefore the highlights — sit on the leaves,
     * one level deeper, so the old two-level check found nothing and the visual
     * ignored cross-highlighting entirely. Slicers still worked because a slicer
     * filters the data; a treemap or a chart highlights it, which is a different
     * mechanism and the one that was broken.
     */
    private detectHighlights(matrix: powerbi.DataViewMatrix, measureIdx: number): boolean {
        const rootVals = matrix.rows?.root?.values ?? matrix.columns?.root?.values ?? {};
        if (this.getNodeHighlight(rootVals, measureIdx) !== null) return true;

        const walk = (node: powerbi.DataViewMatrixNode | undefined): boolean => {
            for (const k of (node?.children ?? [])) {
                if (this.getNodeHighlight(k.values ?? {}, measureIdx) !== null) return true;
                if (walk(k)) return true;
            }
            return false;
        };
        return walk(matrix.rows?.root);
    }

    /**
     * A node's highlight, falling back to the sum of its descendants'.
     *
     * Same shape as nodeOrChildrenValue and for the same reason: with Trend bound
     * the card's own node carries nothing. Null means genuinely not highlighted,
     * which is what dims the card — so an empty result must stay null rather than
     * become zero.
     */
    private nodeOrChildrenHighlight(node: powerbi.DataViewMatrixNode | undefined, idx: number): number | null {
        const own = this.getNodeHighlight(node?.values ?? {}, idx);
        if (own !== null) return own;

        let sum = 0;
        let seen = false;
        const walk = (n: powerbi.DataViewMatrixNode | undefined): void => {
            for (const k of this.realChildren(n)) {
                const h = this.getNodeHighlight(k.values ?? {}, idx);
                if (h !== null) { sum += h; seen = true; }
                walk(k);
            }
        };
        walk(node);
        return seen ? sum : null;
    }

    private getNodeValue(values: powerbi.DataViewMatrixNodeValue, idx: number): number | null {
        const v = values[idx];
        if (v == null || v.value == null) return null;
        return typeof v.value === "number" ? v.value : null;
    }

    private getNodeHighlight(values: powerbi.DataViewMatrixNodeValue, idx: number): number | null {
        const v = values[idx];
        if (v == null || (v as any).highlight == null) return null;
        const h = (v as any).highlight;
        return typeof h === "number" ? h : null;
    }

    // ─── Render ─────────────────────────────────────────────────────────────

    private render(metrics: MetricData[]): void {
        // INVARIANT: once real data has been painted, never repaint an empty state.
        // Power BI emits partial updates (e.g. only the Prior Period role, with no
        // Value role) and re-entrant repaints come from several places: the layout
        // retry, resize updates with no sources, and the license callback. Enforcing
        // this here means every caller is covered, not just the ones we remembered.
        if (metrics.length === 0 && this.hasRenderedData) return;

        const s = this.formattingSettings;
        const palette = this.host.colorPalette;

        // High contrast: auto-detect from host OR manual setting
        const hc = palette.isHighContrast || s.accessibility.highContrast.value;

        // Theme-aware defaults from color palette
        const themeBg    = palette.background?.value ?? "#FFFFFF";
        const themeFg    = palette.foreground?.value ?? "#252423";
        const themeMuted = (palette as any).foregroundNeutralSecondary?.value ?? "#6B6B6B";

        const root = document.createElement("div");
        root.className = "kpi-root" + (hc ? " high-contrast" : "");

        const cardBg     = hc ? "#000000" : (s.card.background.value?.value ?? themeBg);
        const cardBorder = hc ? "#FFFFFF"  : (s.card.borderColor.value?.value ?? "#E0E0E0");
        const bw  = this.isPro ? (s.card.borderWidth.value ?? 1) : 1;
        const br  = this.isPro ? (s.card.borderRadius.value ?? 8) : 8;
        const pad = this.isPro ? (s.card.padding.value ?? 16) : 16;
        const shadow = this.isPro ? s.card.shadow.value : true;

        // Explicit pixel sizing from the Power BI viewport, with a 100% fallback.
        const vpW = this.viewport.width  > 0 ? `${this.viewport.width}px`  : "100%";
        const vpH = this.viewport.height > 0 ? `${this.viewport.height}px` : "100%";

        root.style.cssText = `
            background: ${cardBg};
            border: ${bw}px solid ${cardBorder};
            border-radius: ${br}px;
            padding: ${pad}px;
            box-shadow: ${shadow ? "0 2px 8px rgba(0,0,0,0.10)" : "none"};
            width: ${vpW}; height: ${vpH};
            box-sizing: border-box;
            display: flex; flex-direction: column;
            overflow: hidden; position: relative;
        `;

        if (metrics.length === 0) {
            this.renderEmpty(root, hc);
        } else if (metrics.length === 1) {
            const cell = this.buildMetricCell(metrics[0], hc, true, themeFg, themeMuted, 0);
            root.appendChild(cell);
        } else {
            this.renderGrid(root, metrics, hc, themeFg, themeMuted);
        }

        // The "Free" badge used to be drawn here. Removed: Microsoft's guidance is
        // that a visual "shouldn't display its own licensing UX", and this one put
        // its whole explanation in a title attribute on an element with
        // pointer-events: none, so it could never be hovered and never showed.
        // Power BI's own notifications replace it, and they carry a purchase path.
        this.notifyProFeatureBlocked();

        // ── Atomic swap: clear ONLY after building succeeded ──────────────
        // If anything above threw, the container keeps its previous content.
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        this.container.appendChild(root);

        this.setupTooltips(root, metrics);

        this.ensureLaidOut();
    }

    /**
     * Power BI can render the visual while the page is still transitioning, when the
     * host element has no layout box yet. The DOM is correct but nothing is painted
     * until something forces a reflow — which is why a manual resize "fixes" it.
     * This reads a layout property to force the reflow, and if the element still has
     * no size, repaints on the next frame (bounded, so it can never spin).
     */
    private ensureLaidOut(): void {
        // Reading a layout property forces a synchronous reflow.
        const laidOut = this.container.offsetHeight > 0 && this.container.offsetWidth > 0;

        if (laidOut) {
            this.layoutRetries = 0;
            return;
        }
        if (this.layoutRetries >= 10) return;
        this.layoutRetries++;

        requestAnimationFrame(() => {
            if (!this.lastDataView || !this.formattingSettings) return;
            try {
                this.render(this.parseDataView(this.lastDataView));
            } catch (_) { /* keep current display */ }
        });
    }

    private renderGrid(root: HTMLElement, metrics: MetricData[], hc: boolean, themeFg: string, themeMuted: string): void {
        const s = this.formattingSettings.smallMultiples;
        const cols = this.isPro ? (s.columns.value ?? 3) : 1;
        const gap  = this.isPro ? (s.gap.value ?? 12) : 12;

        const grid = document.createElement("div");
        grid.className = "kpi-grid";
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${cols}, 1fr);
            gap: ${gap}px;
            flex: 1;
            overflow: auto;
        `;

        metrics.forEach((metric, idx) => {
            const s2 = this.formattingSettings;
            const palette = this.host.colorPalette;
            const cardBg     = hc ? "#000000" : (s2.card.background.value?.value ?? (palette.background?.value ?? "#FFFFFF"));
            const cardBorder = hc ? "#FFFFFF"  : (s2.card.borderColor.value?.value ?? "#E0E0E0");
            const cellBr     = this.isPro ? (s2.card.borderRadius.value ?? 8) : 8;

            const wrapper = document.createElement("div");
            wrapper.style.cssText = `
                background: ${cardBg};
                border: 1px solid ${cardBorder};
                border-radius: ${cellBr}px;
                padding: 12px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                gap: 2px;
                transition: opacity 0.15s ease;
                opacity: ${metric.isHighlighted ? "1" : "0.3"};
            `;
            wrapper.dataset.selectionIndex = String(idx);

            const cell = this.buildMetricCell(metric, hc, false, themeFg, themeMuted, idx);
            wrapper.appendChild(cell);
            grid.appendChild(wrapper);
        });

        root.appendChild(grid);
    }

    private renderEmpty(root: HTMLElement, hc: boolean): void {
        const palette = this.host.colorPalette;
        const empty = document.createElement("div");
        empty.className = "kpi-empty";
        empty.title = "KPI Card Pro — Add a measure to the Value field well";
        empty.style.cssText = `
            display: flex; flex: 1; align-items: center; justify-content: center;
            flex-direction: column; gap: 8px;
            color: ${hc ? "#FFFFFF" : ((palette as any).foregroundNeutralSecondary?.value ?? "#A19F9D")};
            font-family: 'Segoe UI', sans-serif;
            font-size: 13px; text-align: center;
        `;

        const svgNS = "http://www.w3.org/2000/svg";
        const emptyIcon = document.createElementNS(svgNS, "svg");
        emptyIcon.setAttribute("width", "32"); emptyIcon.setAttribute("height", "32");
        emptyIcon.setAttribute("viewBox", "0 0 32 32"); emptyIcon.setAttribute("fill", "none");
        emptyIcon.setAttribute("aria-hidden", "true");
        const iconRect = document.createElementNS(svgNS, "rect");
        iconRect.setAttribute("x", "4"); iconRect.setAttribute("y", "4");
        iconRect.setAttribute("width", "24"); iconRect.setAttribute("height", "24");
        iconRect.setAttribute("rx", "4"); iconRect.setAttribute("stroke", "currentColor");
        iconRect.setAttribute("stroke-width", "1.5"); iconRect.setAttribute("fill", "none");
        emptyIcon.appendChild(iconRect);
        const iconPath = document.createElementNS(svgNS, "path");
        iconPath.setAttribute("d", "M10 20 L14 14 L18 17 L22 10");
        iconPath.setAttribute("stroke", "currentColor"); iconPath.setAttribute("stroke-width", "1.5");
        iconPath.setAttribute("stroke-linecap", "round"); iconPath.setAttribute("stroke-linejoin", "round");
        emptyIcon.appendChild(iconPath);
        empty.appendChild(emptyIcon);

        const emptySpan = document.createElement("span");
        emptySpan.textContent = "Add a measure to the Value field well";
        empty.appendChild(emptySpan);
        root.appendChild(empty);
    }

    private buildMetricCell(metric: MetricData, hc: boolean, large: boolean, themeFg: string, themeMuted: string, index: number): HTMLElement {
        const s = this.formattingSettings;
        const cell = document.createElement("div");
        cell.className = "kpi-metric-cell";
        // The real index. This used to be hard-coded to "0" on every card, and the
        // tooltip resolves its metric with closest("[data-selection-index]") — which
        // finds the cell before the wrapper that carried the right value, so every
        // card showed the first card's figures. Click and keyboard were unaffected:
        // they capture the metric in the closure instead of looking it up.
        cell.dataset.selectionIndex = String(index);
        cell.setAttribute("role", "button");
        cell.setAttribute("aria-label", metric.name);
        cell.setAttribute("tabindex", "0");                   // Keyboard Navigation
        cell.style.cssText = "display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 2px; cursor: default; outline: none;";

        // ── Keyboard: focus ring ───────────────────────────────────────────
        cell.addEventListener("focus", () => {
            cell.style.outline = "2px solid #C96442";
            cell.style.outlineOffset = "2px";
        });
        cell.addEventListener("blur", () => {
            cell.style.outline = "none";
        });

        // ── Keyboard: Enter/Space to select ───────────────────────────────
        cell.addEventListener("keydown", (e: KeyboardEvent) => {
            if ((this.host as any).allowInteractions === false) return;
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (metric.selectionId) {
                    this.selectionManager.select(metric.selectionId, e.ctrlKey || e.metaKey);
                }
            }
        });

        cell.addEventListener("contextmenu", (e: MouseEvent) => {
            if ((this.host as any).allowInteractions === false) return;
            e.preventDefault(); e.stopPropagation();
            this.selectionManager.showContextMenu(metric.selectionId, { x: e.clientX, y: e.clientY });
        });

        cell.addEventListener("click", (e: MouseEvent) => {
            if ((this.host as any).allowInteractions === false) return;         // Allow Interactions
            e.stopPropagation();
            if (metric.selectionId) {
                this.selectionManager.select(metric.selectionId, e.ctrlKey || e.metaKey);
            }
        });

        // ── Label ──────────────────────────────────────────────────────────
        // In grid mode (small multiples), respect smallMultiples.showTitle setting
        const isGridMode = !large;
        const showLabel = isGridMode
            ? (this.isPro ? s.smallMultiples.showTitle.value : true)
            : s.label.show.value;

        if (showLabel) {
            const labelEl = document.createElement("div");
            labelEl.className = "kpi-label";
            labelEl.textContent = metric.name;
            labelEl.title = metric.name;
            labelEl.setAttribute("aria-hidden", "true");
            const labelFontSize = isGridMode && this.isPro
                ? (s.smallMultiples.titleFontSize.value ?? 11)
                : (s.label.fontSize.value ?? 12);
            const labelColor = isGridMode && this.isPro
                ? (hc ? "#FFFFFF" : (s.smallMultiples.titleColor.value?.value ?? themeMuted))
                : (hc ? "#FFFFFF" : (s.label.color.value?.value ?? themeMuted));
            // La fuente sigue la misma regla que el tamano y el color: en rejilla
            // manda Small Multiples, en tarjeta unica manda Label.
            const labelFont = isGridMode && this.isPro
                ? (s.smallMultiples.titleFontFamily.value || "Segoe UI, sans-serif")
                : (s.label.fontFamily.value || "Segoe UI, sans-serif");
            const labelBold = isGridMode && this.isPro
                ? s.smallMultiples.titleBold.value
                : s.label.bold.value;
            labelEl.style.cssText = `
                font-family: ${labelFont};
                font-weight: ${labelBold ? 700 : 400};
                font-size: ${labelFontSize}px;
                color: ${labelColor};
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                line-height: 1.4;
            `;
            cell.appendChild(labelEl);
        }

        // Image, top-right. A flex header rather than absolute positioning, so a
        // long category title shrinks instead of running underneath the logo.
        const imgSrc = s.image.show.value ? metric.image : null;
        if (imgSrc) {
            const h = Math.max(12, Math.min(96, s.image.height.value ?? 28));
            const img = document.createElement("img");
            // An <img> src, never innerHTML: this is user data, and the sibling
            // visual that built markup from a data role was rejected for XSS.
            // Script inside an SVG does not run in an <img> context either.
            img.src = imgSrc;
            img.alt = "";
            img.setAttribute("aria-hidden", "true");
            img.style.cssText =
                `height:${h}px;width:auto;max-width:45%;object-fit:contain;` +
                `border-radius:${Math.max(0, s.image.radius.value ?? 4)}px;flex-shrink:0;`;

            const header = cell.querySelector(".kpi-header") as HTMLElement | null ?? (() => {
                const hd = document.createElement("div");
                hd.className = "kpi-header";
                hd.style.cssText = "display:flex;align-items:flex-start;justify-content:space-between;gap:8px;";
                // Move the label inside the header so the two share a row.
                const existing = cell.querySelector(".kpi-label");
                if (existing) {
                    cell.removeChild(existing);
                    // Inside a flex row, text-overflow only works with min-width: 0 —
                    // otherwise the item refuses to shrink below its content and the
                    // title pushes the image out of the card instead of ellipsing.
                    (existing as HTMLElement).style.flex = "1";
                    (existing as HTMLElement).style.minWidth = "0";
                    hd.appendChild(existing);
                }
                else { hd.appendChild(document.createElement("span")); }
                cell.insertBefore(hd, cell.firstChild);
                return hd;
            })();
            header.appendChild(img);
        }

        // ── Main Value — show highlight value if cross-filter active ───────
        const displayValue = metric.highlightValue !== null ? metric.highlightValue : metric.value;
        const valueEl = document.createElement("div");
        valueEl.className = "kpi-value";
        const formatted = this.formatMetricValue(displayValue);
        valueEl.textContent = formatted;
        valueEl.title = formatted;
        valueEl.setAttribute("aria-label", `${metric.name}: ${formatted}`);
        const fontSize = large
            ? (s.mainValue.fontSize.value ?? 28)
            : Math.max(16, (s.mainValue.fontSize.value ?? 28) * 0.7);
        valueEl.style.cssText = `
            font-family: ${s.mainValue.fontFamily.value ?? "Segoe UI, sans-serif"};
            font-size: ${fontSize}px;
            font-weight: ${s.mainValue.bold.value ? "700" : "400"};
            color: ${hc ? "#FFFFFF" : (s.mainValue.color.value?.value ?? themeFg)};
            line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        `;
        cell.appendChild(valueEl);

        // ── Variance ───────────────────────────────────────────────────────
        if (s.variance.show.value && metric.priorPeriod !== null) {
            const pill = this.buildVariancePill(displayValue, metric.priorPeriod, hc);
            if (pill) cell.appendChild(pill);
        }

        // ── Prior & Target ─────────────────────────────────────────────────
        if (s.secondary.show.value && (metric.priorPeriod !== null || metric.target !== null)) {
            const subRow = document.createElement("div");
            subRow.className = "kpi-sub-row";
            const sec = s.secondary;
            subRow.style.cssText = `
                display: flex; flex-wrap: wrap; gap: 8px;
                font-family: ${sec.fontFamily.value || "Segoe UI, sans-serif"};
                font-size: ${sec.fontSize.value ?? 11}px;
                color: ${hc ? "#FFFFFF" : (sec.color.value?.value ?? "#605E5C")};
            `;
            if (metric.priorPeriod !== null) {
                const ppSpan = document.createElement("span");
                const ppFormatted = this.formatMetricValue(metric.priorPeriod);
                ppSpan.textContent = `Prior: ${ppFormatted}`;
                ppSpan.title = `Prior Period: ${ppFormatted}`;
                subRow.appendChild(ppSpan);
            }
            if (metric.target !== null) {
                const tgSpan = document.createElement("span");
                const tgFormatted = this.formatMetricValue(metric.target);
                tgSpan.textContent = `Target: ${tgFormatted}`;
                tgSpan.title = `Target: ${tgFormatted}`;
                subRow.appendChild(tgSpan);
            }
            cell.appendChild(subRow);
        }

        // Trend line (Pro). Free renders the card without it; the notification
        // path explains why, so nothing disappears without a word.
        if (this.isPro && this.formattingSettings.trend.show.value) {
            const spark = this.buildSparkline(metric, hc);
            if (spark) cell.appendChild(spark);
        }

        return cell;
    }

    // ─── Variance Pill ───────────────────────────────────────────────────────

    private buildVariancePill(current: number | null, base: number | null, hc: boolean): HTMLElement | null {
        if (current === null || base === null || base === 0) return null;

        const s = this.formattingSettings.variance;
        const palette = this.host.colorPalette;
        const diff = current - base;
        const pct  = (diff / Math.abs(base)) * 100;
        const isPositive = s.invertColors.value ? diff < 0 : diff > 0;
        const isNeutral  = diff === 0;

        let color: string;
        if (hc) {
            color = isNeutral ? "#FFFFFF" : (isPositive ? "#00FF00" : "#FF0000");
        } else if (this.isPro) {
            // Color Palette: use host palette sentiment colors as fallback
            const positiveDefault = (palette as any).foregroundNeutralLight?.value ?? "#107C10";
            const negativeDefault = "#D13438";
            color = isNeutral
                ? (s.neutralColor.value?.value ?? "#605E5C")
                : (isPositive
                    ? (s.positiveColor.value?.value ?? positiveDefault)
                    : (s.negativeColor.value?.value ?? negativeDefault));
        } else {
            color = isNeutral ? "#605E5C" : (isPositive ? "#107C10" : "#D13438");
        }

        const arrow   = s.showArrow.value ? (isNeutral ? "→" : (diff > 0 ? "▲" : "▼")) : "";
        const pctStr  = `${arrow} ${Math.abs(pct).toFixed(1)}%`;
        const usePill = this.isPro && s.showPill.value;

        const pill = document.createElement("div");
        pill.className = "kpi-variance-pill";
        pill.textContent = pctStr;
        pill.title = `Variance: ${pctStr} (${diff >= 0 ? "+" : ""}${this.formatMetricValue(diff)})`;
        pill.setAttribute("aria-label", `Variance ${pctStr}`);

        pill.style.cssText = usePill
            ? `display: inline-flex; align-items: center; background: ${color}22; color: ${color};
               border: 1px solid ${color}44; border-radius: 999px; padding: 1px 8px;
               font-family: 'Segoe UI', sans-serif; font-size: ${s.fontSize.value ?? 12}px;
               font-weight: 600; white-space: nowrap; width: fit-content; margin-top: 2px;`
            : `display: inline-flex; align-items: center; color: ${color};
               font-family: 'Segoe UI', sans-serif; font-size: ${s.fontSize.value ?? 12}px;
               font-weight: 600; white-space: nowrap; margin-top: 2px;`;

        return pill;
    }

    // ─── Free Badge ──────────────────────────────────────────────────────────


    // ─── Tooltips ────────────────────────────────────────────────────────────

    private setupTooltips(root: HTMLElement, metrics: MetricData[]): void {
        root.addEventListener("mousemove", (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const cell = target.closest(".kpi-metric-cell") as HTMLElement | null;
            if (!cell) return;
            // Index lives on the wrapper in grid mode, on the cell itself in single-card mode
            const indexEl = target.closest("[data-selection-index]") as HTMLElement | null;
            const idx = parseInt(indexEl?.dataset.selectionIndex ?? "0", 10);
            const metric = metrics[idx] ?? metrics[0];
            if (!metric) return;

            const displayValue = metric.highlightValue !== null ? metric.highlightValue : metric.value;
            const items: powerbi.extensibility.VisualTooltipDataItem[] = [
                {
                    displayName: metric.name,
                    value: this.formatMetricValue(displayValue),
                    color: this.formattingSettings.mainValue.color.value?.value ?? "#252423"
                }
            ];
            if (metric.priorPeriod !== null) {
                items.push({ displayName: "Prior Period", value: this.formatMetricValue(metric.priorPeriod), color: "#605E5C" });
            }
            if (metric.target !== null) {
                items.push({ displayName: "Target", value: this.formatMetricValue(metric.target), color: "#605E5C" });
            }
            if (this.isPro) {
                for (const tf of metric.tooltipFields) {
                    items.push({ displayName: tf.displayName, value: tf.value });
                }
            }

            this.host.tooltipService?.show({
                dataItems: items,
                identities: metric.selectionId ? [metric.selectionId] : [],
                coordinates: [e.clientX, e.clientY],
                isTouchEvent: false
            });
        });

        root.addEventListener("mouseleave", () => {
            this.host.tooltipService?.hide({ immediately: false, isTouchEvent: false });
        });
    }

    // ─── Formatting Helpers ──────────────────────────────────────────────────

    private formatMetricValue(value: number | null): string {
        if (value === null || value === undefined) return "—";
        const s      = this.formattingSettings.mainValue;
        const prefix = this.isPro ? (s.prefix.value ?? "") : "";
        const suffix = this.isPro ? (s.suffix.value ?? "") : "";
        const decimals = s.decimalPlaces.value ?? 1;
        const unit = String((s.displayUnit.value as any)?.value ?? s.displayUnit.value ?? "auto") as DisplayUnit;
        return `${prefix}${this.applyDisplayUnit(value, unit, decimals)}${suffix}`;
    }

    private formatValue(value: number | null): string {
        if (value === null) return "—";
        return this.applyDisplayUnit(value, "auto", 1);
    }

    private applyDisplayUnit(value: number, unit: DisplayUnit, decimals: number): string {
        const abs = Math.abs(value);
        if (unit === "none")                                return value.toFixed(decimals);
        if (unit === "billions"  || (unit === "auto" && abs >= 1e9)) return `${(value / 1e9).toFixed(decimals)}B`;
        if (unit === "millions"  || (unit === "auto" && abs >= 1e6)) return `${(value / 1e6).toFixed(decimals)}M`;
        if (unit === "thousands" || (unit === "auto" && abs >= 1e3)) return `${(value / 1e3).toFixed(decimals)}K`;
        return value.toFixed(decimals);
    }

    // ─── Formatting Pane API ─────────────────────────────────────────────────

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
