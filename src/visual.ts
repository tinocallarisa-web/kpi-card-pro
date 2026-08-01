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

interface MetricData {
    name: string;
    value: number | null;
    highlightValue: number | null;        // highlight from cross-filter
    priorPeriod: number | null;
    target: number | null;
    tooltipFields: Array<{ displayName: string; value: string }>;
    selectionId: powerbi.extensibility.ISelectionId | null;
    isHighlighted: boolean;               // false = dim this card
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
                    licenseResolved = plans.some(
                        (p: any) => p.spIdentifier === SERVICE_PLAN_ID && p.state === 1
                    );
                    resolve(licenseResolved);
                },
                () => {
                    licenseResolved = false;
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

    private licenseRequested = false;

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

            // Only act on updates that contain real measure data.
            // Power BI sends skeleton/resize/viewport updates (matrix exists but no
            // column sources) especially on page return — we must ignore these to
            // prevent clearing the container and losing the displayed values.
            const hasSources = (dataView?.matrix?.columns?.levels?.[0]?.sources?.length ?? 0) > 0;

            if (!hasSources) {
                // No real data in this update — two cases:
                // 1. Visual never had data → show landing page
                // 2. Visual already rendered → keep current display, do nothing
                if (!this.lastDataView) {
                    this.renderLandingPage();
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
        if (!isPro || this.isPro) return;             // only ever upgrades Free → Pro
        this.isPro = true;
        if (this.lastDataView && this.formattingSettings) {
            try {
                this.render(this.parseDataView(this.lastDataView));
            } catch (_) { /* keep current display */ }
        }
    }

    // ─── Landing Page ────────────────────────────────────────────────────────

    private renderLandingPage(): void {
        // Use host color palette for theme-aware landing page
        const palette = this.host.colorPalette;
        const isHC = palette.isHighContrast;
        const fg = isHC ? "#FFFFFF" : (palette.foreground?.value ?? "#3D3929");
        const bg = isHC ? "#000000" : (palette.background?.value ?? "#FAF9F5");
        const muted = isHC ? "#CCCCCC" : "#83827D";
        const accent = "#C96442";

        const landing = document.createElement("div");
        landing.setAttribute("role", "region");
        landing.setAttribute("aria-label", "KPI Card Pro — Add data to get started");
        landing.style.cssText = `
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            width: 100%; height: 100%;
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

    private parseDataView(dataView?: DataView): MetricData[] {
        if (!dataView?.matrix) return [];

        const matrix = dataView.matrix;
        const rows = matrix.rows;
        const cols = matrix.columns;

        let measureIdx = -1;
        let priorIdx = -1;
        let targetIdx = -1;
        const tooltipIdxs: number[] = [];

        if (cols?.levels?.[0]?.sources) {
            cols.levels[0].sources.forEach((src, i) => {
                const roles = src.roles ?? {};
                if (roles["measure"] && measureIdx === -1) measureIdx = i;
                else if (roles["priorPeriod"] && priorIdx === -1) priorIdx = i;
                else if (roles["target"] && targetIdx === -1) targetIdx = i;
                else if (roles["tooltips"]) tooltipIdxs.push(i);
            });
        }

        if (measureIdx === -1) return [];

        // Detect active cross-highlight in the whole matrix
        const hasHighlights = this.detectHighlights(matrix, measureIdx);

        // Small Multiples is only truly bound when the row hierarchy has a grouping
        // level. Power BI still returns one anonymous child when nothing is bound,
        // so checking children alone would mislabel the card as "Item 1".
        const hasGrouping = (rows?.levels?.length ?? 0) > 0
            && !!rows?.root?.children
            && rows.root.children.length > 0
            && rows.root.children[0].value !== undefined;

        // No small multiples — single card
        if (!hasGrouping) {
            const anonChild = rows?.root?.children?.[0];
            const rootValues = anonChild?.values
                ?? matrix.rows?.root?.values
                ?? matrix.columns?.root?.values
                ?? {};
            const value = this.getNodeValue(rootValues, measureIdx);
            const highlightValue = hasHighlights ? this.getNodeHighlight(rootValues, measureIdx) : null;
            const prior = priorIdx >= 0 ? this.getNodeValue(rootValues, priorIdx) : null;
            const target = targetIdx >= 0 ? this.getNodeValue(rootValues, targetIdx) : null;
            const measureName = cols?.levels?.[0]?.sources?.[measureIdx]?.displayName ?? "Value";

            return [{
                name: measureName,
                value,
                highlightValue,
                priorPeriod: prior,
                target,
                tooltipFields: [],
                selectionId: null,
                isHighlighted: true  // single card always visible
            }];
        }

        // Small multiples — one card per row
        const metrics: MetricData[] = [];
        const limit = this.isPro ? 50 : 1;

        for (let i = 0; i < Math.min(rows.root.children.length, limit); i++) {
            const child = rows.root.children[i];
            const categoryName = child.value != null ? String(child.value) : `Item ${i + 1}`;
            const rowValues = child.values ?? {};

            const value = this.getNodeValue(rowValues, measureIdx);
            const highlightValue = hasHighlights ? this.getNodeHighlight(rowValues, measureIdx) : null;
            const prior = priorIdx >= 0 ? this.getNodeValue(rowValues, priorIdx) : null;
            const target = targetIdx >= 0 ? this.getNodeValue(rowValues, targetIdx) : null;

            // Card is highlighted if it has a highlight value or there are no highlights at all
            const isHighlighted = !hasHighlights || highlightValue !== null;

            const tooltipFields = tooltipIdxs.map(ti => ({
                displayName: cols?.levels?.[0]?.sources?.[ti]?.displayName ?? "",
                value: this.formatValue(this.getNodeValue(rowValues, ti))
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
                isHighlighted
            });
        }

        return metrics;
    }

    private detectHighlights(matrix: powerbi.DataViewMatrix, measureIdx: number): boolean {
        // Check root (single card case)
        const rootVals = matrix.rows?.root?.values ?? matrix.columns?.root?.values ?? {};
        if (this.getNodeHighlight(rootVals, measureIdx) !== null) return true;

        // Check children (small multiples case)
        if (matrix.rows?.root?.children) {
            for (const child of matrix.rows.root.children) {
                if (this.getNodeHighlight(child.values ?? {}, measureIdx) !== null) return true;
            }
        }
        return false;
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

        root.style.cssText = `
            background: ${cardBg};
            border: ${bw}px solid ${cardBorder};
            border-radius: ${br}px;
            padding: ${pad}px;
            box-shadow: ${shadow ? "0 2px 8px rgba(0,0,0,0.10)" : "none"};
            width: 100%; height: 100%;
            box-sizing: border-box;
            display: flex; flex-direction: column;
            overflow: hidden; position: relative;
        `;

        if (metrics.length === 0) {
            this.renderEmpty(root, hc);
        } else if (metrics.length === 1) {
            const cell = this.buildMetricCell(metrics[0], hc, true, themeFg, themeMuted);
            root.appendChild(cell);
        } else {
            this.renderGrid(root, metrics, hc, themeFg, themeMuted);
        }

        if (!this.isPro) {
            this.renderFreeBadge(root);
        }

        // ── Atomic swap: clear ONLY after building succeeded ──────────────
        // If anything above threw, the container keeps its previous content.
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        this.container.appendChild(root);
        this.setupTooltips(root, metrics);
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

            const cell = this.buildMetricCell(metric, hc, false, themeFg, themeMuted);
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

    private buildMetricCell(metric: MetricData, hc: boolean, large: boolean, themeFg: string, themeMuted: string): HTMLElement {
        const s = this.formattingSettings;
        const cell = document.createElement("div");
        cell.className = "kpi-metric-cell";
        cell.dataset.selectionIndex = "0";
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
            labelEl.style.cssText = `
                font-family: 'Segoe UI', sans-serif;
                font-size: ${labelFontSize}px;
                color: ${labelColor};
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                line-height: 1.4;
            `;
            cell.appendChild(labelEl);
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
        if (metric.priorPeriod !== null || metric.target !== null) {
            const subRow = document.createElement("div");
            subRow.className = "kpi-sub-row";
            subRow.style.cssText = `
                display: flex; flex-wrap: wrap; gap: 8px;
                font-family: 'Segoe UI', sans-serif; font-size: 11px;
                color: ${hc ? "#FFFFFF" : "#605E5C"};
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

    private renderFreeBadge(root: HTMLElement): void {
        const badge = document.createElement("div");
        badge.className = "kpi-free-badge";
        badge.textContent = "Free";
        badge.title = "KPI Card Pro — Free tier. Upgrade to Pro for Small Multiples, custom colors and more.";
        badge.style.cssText = `
            position: absolute; bottom: 6px; right: 8px;
            font-family: 'Segoe UI', sans-serif; font-size: 9px; font-weight: 600;
            color: #A19F9D; letter-spacing: 0.5px;
            pointer-events: none; user-select: none;
        `;
        root.appendChild(badge);
    }

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
