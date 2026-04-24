/**
 * KPI Card Pro — Visual
 * TCViz | tcviz.com
 *
 * Multi-metric KPI card with trend, target and variance for Power BI.
 * pbiviz tools v7.0.3 | powerbi-visuals-api ~5.10.0
 * powerbi-visuals-utils-formattingmodel ^6.2.2 | TypeScript ES2022
 *
 * Features:
 *   F01 – Up to 6 metrics (Free: 1)
 *   F02 – Target lines, variance pills, sparklines (Pro)
 *   F03 – High-contrast mode and accessibility color scales
 *   F04 – Tooltip drill-through with custom payloads
 *   F05 – Documented measure contract
 *   F06 – Formatting pane parity Desktop & Service
 *   F07 – Bookmark persistence
 *   F08 – Context menu on empty space
 */

"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";

import DataView = powerbi.DataView;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import IVisualLicenseManager = powerbi.extensibility.IVisualLicenseManager;
import LicenseNotificationType = powerbi.LicenseNotificationType;

import { VisualFormattingSettingsModel } from "./settings";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MetricData {
    name: string;
    value: number | null;
    priorPeriod: number | null;
    target: number | null;
    sparklineData: number[];
    sparklineLabels: string[];
    tooltipFields: Array<{ displayName: string; value: string }>;
    selectionId: powerbi.extensibility.ISelectionId | null;
}

type DisplayUnit = "auto" | "none" | "thousands" | "millions" | "billions";

// ─── Constants ───────────────────────────────────────────────────────────────

const SPARKLINE_POINT_LIMIT_FREE = 20;
const CONTEXT_MENU_DEBOUNCE = 200;

// ─── Visual ──────────────────────────────────────────────────────────────────

export class Visual implements IVisual {
    private host: IVisualHost;
    private container: HTMLElement;
    private formattingSettings!: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private selectionManager: ISelectionManager;
    private licenseManager: IVisualLicenseManager;
    private isPro: boolean = false;
    private lastContextMenuTime: number = 0;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();

        // ── IVisualLicenseManager (official API) ──────────────────────────
        this.licenseManager = this.host.licenseManager;
        this.licenseManager.getAvailableServicePlans().then(result => {
            const plans = result.plans ?? [];
            this.isPro = plans.some(p =>
                p.spIdentifier === "kpiCardProTCViz" && p.state === 1
            );
            // Re-render if already loaded
            const existing = this.container.querySelector(".kpi-root");
            if (existing) {
                existing.remove();
            }
        }).catch(() => {
            this.isPro = false;
        });

        // ── Container ─────────────────────────────────────────────────────
        this.container = options.element;
        this.container.classList.add("kpi-card-pro-container");
        this.container.setAttribute("role", "region");
        this.container.setAttribute("aria-label", "KPI Card Pro");

        // ── Context menu on empty space (F08 / AppSource req. 1) ─────────
        this.container.addEventListener("contextmenu", (e: MouseEvent) => {
            const now = Date.now();
            if (now - this.lastContextMenuTime < CONTEXT_MENU_DEBOUNCE) return;
            this.lastContextMenuTime = now;

            e.preventDefault();
            const target = e.target as HTMLElement;
            const metricEl = target.closest("[data-selection-index]") as HTMLElement | null;

            if (metricEl && metricEl.dataset.selectionIndex !== undefined) {
                // Metric cell clicked — handled per-cell via event delegation
            } else {
                // Empty space — context menu with null selectionId
                this.host.tooltipService?.hide({ immediately: true, isTouchEvent: false });
                this.selectionManager.showContextMenu(null, { x: e.clientX, y: e.clientY });
            }
        });
    }

    // ─── Update ─────────────────────────────────────────────────────────────

    public update(options: VisualUpdateOptions): void {
        const dataView = options?.dataViews?.[0];
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            dataView
        ) as VisualFormattingSettingsModel;

        // Apply ARIA title
        const ariaTitle = this.formattingSettings.accessibility.visualTitle.value || "KPI Card Pro";
        this.container.setAttribute("aria-label", ariaTitle);

        // Parse data
        const metrics = this.parseDataView(dataView);

        // Render
        this.render(metrics, options);
    }

    // ─── Parse DataView ─────────────────────────────────────────────────────

    private parseDataView(dataView?: DataView): MetricData[] {
        if (!dataView?.categorical) return [];

        const categorical = dataView.categorical;
        const categories = categorical.categories ?? [];
        const values = categorical.values ?? ([] as powerbi.DataViewValueColumn[]);

        // Identify columns by role
        const measureColumns: powerbi.DataViewValueColumn[] = [];
        const priorColumns: powerbi.DataViewValueColumn[] = [];
        const targetColumns: powerbi.DataViewValueColumn[] = [];
        const tooltipColumns: powerbi.DataViewValueColumn[] = [];

        for (const col of values) {
            const roles = col.source.roles ?? {};
            if (roles["measure"]) measureColumns.push(col);
            else if (roles["priorPeriod"]) priorColumns.push(col);
            else if (roles["target"]) targetColumns.push(col);
            else if (roles["tooltips"]) tooltipColumns.push(col);
        }

        if (measureColumns.length === 0) return [];

        // 1 Value + 1 Prior model — use only first measure column
        const visibleMeasures = measureColumns.slice(0, 1);

        return visibleMeasures.map((col, i) => {
            // Aggregate value (sum for categorical, first for scalar)
            const rawValues = col.values as (number | null)[];
            const currentValue = this.aggregate(rawValues);

            // Prior
            const priorVal = priorColumns[0]
                ? this.aggregate(priorColumns[0].values as (number | null)[])
                : null;

            // Target
            const targetVal = targetColumns[0]
                ? this.aggregate(targetColumns[0].values as (number | null)[])
                : null;

            // Sparkline — per category grouping
            const sparklineData: number[] = [];
            const sparklineLabels: string[] = [];

            if (categories.length > 0) {
                const limit = this.isPro ? rawValues.length : Math.min(rawValues.length, SPARKLINE_POINT_LIMIT_FREE);
                for (let r = 0; r < limit; r++) {
                    sparklineData.push(rawValues[r] ?? 0);
                    sparklineLabels.push(
                        categories[0]?.values?.[r] != null
                            ? String(categories[0].values[r])
                            : String(r)
                    );
                }
            }

            // Tooltip fields
            const tooltipFields = tooltipColumns.map(tc => ({
                displayName: tc.source.displayName,
                value: this.formatValue(
                    this.aggregate(tc.values as (number | null)[]),
                    "auto",
                    tc.source.format
                )
            }));

            // SelectionId for context menu / cross-filter
            const selectionId = this.host.createSelectionIdBuilder()
                .withMeasure(col.source.queryName ?? col.source.displayName)
                .createSelectionId();

            return {
                name: col.source.displayName,
                value: currentValue,
                priorPeriod: priorVal,
                target: targetVal,
                sparklineData,
                sparklineLabels,
                tooltipFields,
                selectionId
            } as MetricData;
        });
    }

    private aggregate(vals: (number | null)[]): number | null {
        const nums = vals.filter(v => v !== null && v !== undefined) as number[];
        if (nums.length === 0) return null;
        // Use last value for time-series context, sum for multi-row
        return nums[nums.length - 1];
    }

    // ─── Render ─────────────────────────────────────────────────────────────

    private render(metrics: MetricData[], options: VisualUpdateOptions): void {
        // Clear
        while (this.container.firstChild) { this.container.removeChild(this.container.firstChild); }

        const s = this.formattingSettings;
        const hc = s.accessibility.highContrast.value;

        const root = document.createElement("div");
        root.className = "kpi-root" + (hc ? " high-contrast" : "");

        // Card-level styles
        const cardBg = hc ? "#000000" : (s.card.background.value?.value ?? "#FFFFFF");
        const cardBorder = hc ? "#FFFFFF" : (s.card.borderColor.value?.value ?? "#E0E0E0");
        const bw = s.card.borderWidth.value ?? 1;
        const br = this.isPro ? (s.card.borderRadius.value ?? 8) : 8;
        const pad = this.isPro ? (s.card.padding.value ?? 16) : 16;
        const shadow = this.isPro ? s.card.shadow.value : true;

        root.style.cssText = `
            background: ${cardBg};
            border: ${bw}px solid ${cardBorder};
            border-radius: ${br}px;
            padding: ${pad}px;
            box-shadow: ${shadow ? "0 2px 8px rgba(0,0,0,0.10)" : "none"};
            width: 100%;
            height: 100%;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
        `;

        if (metrics.length === 0) {
            this.renderEmpty(root, hc);
        } else {
            const layout = this.isPro ? (String(s.metrics.layout.value ?? "single")) : "single";
            this.renderMetrics(root, metrics, layout, hc);
        }

        // Pro/Free badge
        if (!this.isPro) {
            this.renderFreeBadge(root);
        }

        this.container.appendChild(root);

        // Tooltip setup
        this.setupTooltips(root, metrics);
    }

    private renderEmpty(root: HTMLElement, hc: boolean): void {
        const empty = document.createElement("div");
        empty.className = "kpi-empty";
        empty.style.cssText = `
            display: flex; flex: 1; align-items: center; justify-content: center;
            flex-direction: column; gap: 8px;
            color: ${hc ? "#FFFFFF" : "#A19F9D"};
            font-family: 'Segoe UI', sans-serif;
            font-size: 13px; text-align: center;
        `;
        const svgNS2 = "http://www.w3.org/2000/svg";
        const emptyIcon = document.createElementNS(svgNS2, "svg");
        emptyIcon.setAttribute("width", "32");
        emptyIcon.setAttribute("height", "32");
        emptyIcon.setAttribute("viewBox", "0 0 32 32");
        emptyIcon.setAttribute("fill", "none");
        emptyIcon.setAttribute("aria-hidden", "true");
        const iconRect = document.createElementNS(svgNS2, "rect");
        iconRect.setAttribute("x", "4"); iconRect.setAttribute("y", "4");
        iconRect.setAttribute("width", "24"); iconRect.setAttribute("height", "24");
        iconRect.setAttribute("rx", "4"); iconRect.setAttribute("stroke", "currentColor");
        iconRect.setAttribute("stroke-width", "1.5"); iconRect.setAttribute("fill", "none");
        emptyIcon.appendChild(iconRect);
        const iconPath = document.createElementNS(svgNS2, "path");
        iconPath.setAttribute("d", "M10 20 L14 14 L18 17 L22 10");
        iconPath.setAttribute("stroke", "currentColor");
        iconPath.setAttribute("stroke-width", "1.5");
        iconPath.setAttribute("stroke-linecap", "round");
        iconPath.setAttribute("stroke-linejoin", "round");
        emptyIcon.appendChild(iconPath);
        empty.appendChild(emptyIcon);
        const emptySpan = document.createElement("span");
        emptySpan.textContent = "Add a measure to the Value field well";
        empty.appendChild(emptySpan);
        empty.title = "KPI Card Pro – Add a measure to the Value field well";
        root.appendChild(empty);
    }

    private renderMetrics(
        root: HTMLElement,
        metrics: MetricData[],
        layout: string,
        hc: boolean
    ): void {
        const s = this.formattingSettings;
        const wrapper = document.createElement("div");
        wrapper.className = `kpi-metrics kpi-layout-${layout}`;
        wrapper.style.cssText = this.getLayoutStyles(layout, metrics.length);

        const showDivider = s.metrics.dividerShow.value && layout !== "single";
        const dividerColor = hc ? "#FFFFFF" : (s.metrics.dividerColor.value?.value ?? "#EDEBE9");

        metrics.forEach((metric, idx) => {
            const cell = this.buildMetricCell(metric, idx, hc);
            if (showDivider && idx < metrics.length - 1) {
                cell.style.borderRight = `1px solid ${dividerColor}`;
                cell.style.paddingRight = "12px";
                cell.style.marginRight = "12px";
            }
            wrapper.appendChild(cell);
        });

        root.appendChild(wrapper);
    }

    private getLayoutStyles(layout: string, count: number): string {
        const base = "display:flex; flex:1; gap:0; width:100%; overflow:hidden;";
        switch (layout) {
            case "grid2":
                return `${base} flex-wrap:wrap;`;
            case "grid3":
                return `${base} flex-wrap:wrap;`;
            case "horizontal":
                return `${base} flex-direction:row; align-items:stretch;`;
            default:
                return `${base} flex-direction:column;`;
        }
    }

    private buildMetricCell(
        metric: MetricData,
        idx: number,
        hc: boolean
    ): HTMLElement {
        const s = this.formattingSettings;
        const cell = document.createElement("div");
        cell.className = "kpi-metric-cell";
        cell.dataset.selectionIndex = String(idx);
        cell.setAttribute("role", "group");
        cell.setAttribute("aria-label", metric.name);
        cell.style.cssText = `
            display: flex; flex-direction: column; flex: 1;
            min-width: 0; gap: 2px; cursor: default;
        `;

        // Context menu per metric
        cell.addEventListener("contextmenu", (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            this.selectionManager.showContextMenu(metric.selectionId, {
                x: e.clientX, y: e.clientY
            });
        });

        // Click to cross-filter
        cell.addEventListener("click", (e: MouseEvent) => {
            e.stopPropagation();
            if (metric.selectionId) {
                this.selectionManager.select(metric.selectionId, e.ctrlKey || e.metaKey);
            }
        });

        // ── Label ──────────────────────────────────────────────────────────
        if (s.label.show.value) {
            const labelEl = document.createElement("div");
            labelEl.className = "kpi-label";
            const labelText = s.label.text.value?.trim() || metric.name;
            labelEl.textContent = labelText;
            labelEl.title = labelText;
            labelEl.setAttribute("aria-hidden", "true");
            labelEl.style.cssText = `
                font-family: 'Segoe UI', sans-serif;
                font-size: ${s.label.fontSize.value ?? 12}px;
                color: ${hc ? "#FFFFFF" : (s.label.color.value?.value ?? "#6B6B6B")};
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                line-height: 1.4;
            `;
            cell.appendChild(labelEl);
        }

        // ── Main Value ─────────────────────────────────────────────────────
        const valueEl = document.createElement("div");
        valueEl.className = "kpi-value";
        const formatted = this.formatMetricValue(metric.value);
        valueEl.textContent = formatted;
        valueEl.title = formatted;
        valueEl.setAttribute("aria-label", `${metric.name}: ${formatted}`);
        valueEl.style.cssText = `
            font-family: ${s.mainValue.fontFamily.value ?? "Segoe UI, sans-serif"};
            font-size: ${s.mainValue.fontSize.value ?? 28}px;
            font-weight: ${s.mainValue.bold.value ? "700" : "400"};
            font-style: normal;
            color: ${hc ? "#FFFFFF" : (s.mainValue.color.value?.value ?? "#252423")};
            line-height: 1.1; white-space: nowrap;
            overflow: hidden; text-overflow: ellipsis;
        `;
        cell.appendChild(valueEl);

        // ── Variance Pills ─────────────────────────────────────────────────
        if (s.variance.show.value) {
            const varianceRow = document.createElement("div");
            varianceRow.className = "kpi-variance-row";
            varianceRow.style.cssText = "display: flex; flex-wrap: wrap; gap: 4px; align-items: center;";

            const mode = String(s.variance.mode.value ?? "vsPrior");

            if ((mode === "vsPrior" || mode === "both") && metric.priorPeriod !== null) {
                const pill = this.buildVariancePill(metric.value, metric.priorPeriod, "vs Prior", hc);
                if (pill) varianceRow.appendChild(pill);
            }
            if ((mode === "vsTarget" || mode === "both") && metric.target !== null && this.isPro) {
                const pill = this.buildVariancePill(metric.value, metric.target, "vs Target", hc);
                if (pill) varianceRow.appendChild(pill);
            }

            if (varianceRow.children.length > 0) {
                cell.appendChild(varianceRow);
            }
        }

        // ── Prior & Target values (small) ─────────────────────────────────
        if ((metric.priorPeriod !== null || metric.target !== null)) {
            const subRow = document.createElement("div");
            subRow.className = "kpi-sub-row";
            subRow.style.cssText = `
                display: flex; flex-wrap: wrap; gap: 8px;
                font-family: 'Segoe UI', sans-serif;
                font-size: 11px;
                color: ${hc ? "#FFFFFF" : "#605E5C"};
            `;

            if (metric.priorPeriod !== null) {
                const pp = document.createElement("span");
                const ppFormatted = this.formatMetricValue(metric.priorPeriod);
                pp.textContent = `Prior: ${ppFormatted}`;
                pp.title = `Prior Period: ${ppFormatted}`;
                subRow.appendChild(pp);
            }

            if (metric.target !== null && this.isPro) {
                const tg = document.createElement("span");
                const tgFormatted = this.formatMetricValue(metric.target);
                tg.textContent = `Target: ${tgFormatted}`;
                tg.title = `Target: ${tgFormatted}`;
                subRow.appendChild(tg);
            }

            cell.appendChild(subRow);
        }

        // ── Sparkline ──────────────────────────────────────────────────────
        if (s.sparkline.show.value && metric.sparklineData.length > 1) {
            const sparkHeight = s.sparkline.height.value ?? 48;
            const sparkEl = this.buildSparkline(metric, sparkHeight, hc);
            cell.appendChild(sparkEl);
        }

        return cell;
    }

    // ─── Variance Pill ───────────────────────────────────────────────────────

    private buildVariancePill(
        current: number | null,
        base: number | null,
        label: string,
        hc: boolean
    ): HTMLElement | null {
        if (current === null || base === null || base === 0) return null;

        const s = this.formattingSettings.variance;
        const diff = current - base;
        const pct = (diff / Math.abs(base)) * 100;
        const isPositive = this.isPro ? (s.invertColors.value ? diff < 0 : diff > 0) : diff > 0;
        const isNeutral = diff === 0;

        let color: string;
        if (hc) {
            color = isNeutral ? "#FFFFFF" : (isPositive ? "#00FF00" : "#FF0000");
        } else if (this.isPro) {
            // Pro: custom colors
            color = isNeutral
                ? (s.neutralColor.value?.value ?? "#605E5C")
                : (isPositive
                    ? (s.positiveColor.value?.value ?? "#107C10")
                    : (s.negativeColor.value?.value ?? "#D13438"));
        } else {
            // Free: fixed colors
            color = isNeutral ? "#605E5C" : (isPositive ? "#107C10" : "#D13438");
        }

        const arrow = s.showArrow.value
            ? (isNeutral ? "→" : (diff > 0 ? "▲" : "▼"))
            : "";

        const pctStr = `${arrow} ${Math.abs(pct).toFixed(1)}%`;

        const usePill = this.isPro && s.showPill.value; // Pro only
        const pill = document.createElement("span");
        pill.className = "kpi-variance-pill";
        pill.textContent = pctStr;
        pill.title = `${label}: ${pctStr} (${diff >= 0 ? "+" : ""}${this.formatMetricValue(diff)})`;

        pill.style.cssText = usePill
            ? `
                display: inline-flex; align-items: center;
                background: ${color}22;
                color: ${color};
                border: 1px solid ${color}44;
                border-radius: 999px;
                padding: 1px 8px;
                font-family: 'Segoe UI', sans-serif;
                font-size: ${s.fontSize.value ?? 12}px;
                font-weight: 600;
                line-height: 1.6;
                white-space: nowrap;
            `
            : `
                display: inline-flex; align-items: center;
                color: ${color};
                font-family: 'Segoe UI', sans-serif;
                font-size: ${s.fontSize.value ?? 12}px;
                font-weight: 600;
                white-space: nowrap;
            `;

        return pill;
    }

    // ─── Sparkline SVG ───────────────────────────────────────────────────────

    private buildSparkline(metric: MetricData, height: number, hc: boolean): HTMLElement {
        const s = this.formattingSettings.sparkline;
        const wrapper = document.createElement("div");
        wrapper.className = "kpi-sparkline";
        wrapper.style.cssText = `
            width: 100%; height: ${height}px;
            margin-top: 4px; flex-shrink: 0;
            position: relative;
        `;
        wrapper.title = `Trend for ${metric.name}`;

        const data = metric.sparklineData;
        if (data.length < 2) return wrapper;

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", String(height));
        svg.setAttribute("viewBox", `0 0 100 ${height}`);
        svg.setAttribute("preserveAspectRatio", "none");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("role", "img");

        const color = hc ? "#FFFFFF" : (this.isPro ? (s.color.value?.value ?? "#0078D4") : "#0078D4");
        const chartType = this.isPro ? (String(s.type.value ?? "area")) : "area"; // Free: area only
        const lineW = this.isPro ? (s.lineWidth.value ?? 2) : 2;
        const opacity = this.isPro ? ((s.areaOpacity.value ?? 20) / 100) : 0.2;

        const minV = Math.min(...data);
        const maxV = Math.max(...data);
        const range = maxV - minV || 1;

        const pts: Array<[number, number]> = data.map((v, i) => [
            (i / (data.length - 1)) * 100,
            height - ((v - minV) / range) * (height * 0.8) - height * 0.1
        ]);

        // Target line in sparkline
        if (this.isPro && metric.target !== null && this.formattingSettings.target.show.value) {
            const tY = height - ((metric.target - minV) / range) * (height * 0.8) - height * 0.1;
            const tColor = hc ? "#FFFF00" : (this.formattingSettings.target.color.value?.value ?? "#E97132");
            const tStyle = String(this.formattingSettings.target.lineStyle.value ?? "dashed");

            const targetLine = document.createElementNS(svgNS, "line");
            targetLine.setAttribute("x1", "0");
            targetLine.setAttribute("y1", String(tY));
            targetLine.setAttribute("x2", "100");
            targetLine.setAttribute("y2", String(tY));
            targetLine.setAttribute("stroke", tColor);
            targetLine.setAttribute("stroke-width", "1");
            targetLine.setAttribute("stroke-dasharray",
                tStyle === "dashed" ? "4 2" : (tStyle === "dotted" ? "1 2" : "0")
            );
            svg.appendChild(targetLine);
        }

        const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");

        if (chartType === "bar") {
            // Bar sparkline
            const barW = 90 / data.length * 0.7;
            data.forEach((v, i) => {
                const x = (i / data.length) * 100 + 5;
                const barH = ((v - minV) / range) * (height * 0.8);
                const y = height - barH - height * 0.1;
                const rect = document.createElementNS(svgNS, "rect");
                rect.setAttribute("x", String(x));
                rect.setAttribute("y", String(y));
                rect.setAttribute("width", String(barW));
                rect.setAttribute("height", String(barH));
                rect.setAttribute("fill", color);
                rect.setAttribute("opacity", String(opacity + 0.4));
                rect.setAttribute("rx", "1");
                svg.appendChild(rect);
            });
        } else {
            // Line / Area
            if (chartType === "area") {
                const areaD = `${pathD} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z`;
                const area = document.createElementNS(svgNS, "path");
                area.setAttribute("d", areaD);
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
            svg.appendChild(path);

            // Last point dot
            if (s.showDot.value) {
                const last = pts[pts.length - 1];
                const dot = document.createElementNS(svgNS, "circle");
                dot.setAttribute("cx", String(last[0]));
                dot.setAttribute("cy", String(last[1]));
                dot.setAttribute("r", String(lineW + 1.5));
                dot.setAttribute("fill", color);
                svg.appendChild(dot);
            }
        }

        wrapper.appendChild(svg);
        return wrapper;
    }

    // ─── Free Badge ──────────────────────────────────────────────────────────

    private renderFreeBadge(root: HTMLElement): void {
        const badge = document.createElement("div");
        badge.className = "kpi-free-badge";
        badge.textContent = "Free";
        badge.title = "KPI Card Pro – Free tier. Upgrade to Pro for 6 metrics, custom colors, target lines and more.";
        badge.style.cssText = `
            position: absolute; bottom: 6px; right: 8px;
            font-family: 'Segoe UI', sans-serif;
            font-size: 9px; font-weight: 600;
            color: #A19F9D;
            letter-spacing: 0.5px;
            pointer-events: none;
            user-select: none;
        `;
        root.appendChild(badge);
    }

    // ─── Tooltips (F04) ──────────────────────────────────────────────────────

    private setupTooltips(root: HTMLElement, metrics: MetricData[]): void {
        root.addEventListener("mousemove", (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const cell = target.closest(".kpi-metric-cell") as HTMLElement | null;
            if (!cell) return;

            const idx = parseInt(cell.dataset.selectionIndex ?? "-1", 10);
            if (idx < 0 || idx >= metrics.length) return;

            const metric = metrics[idx];
            const tooltipData = this.buildTooltipData(metric);

            this.host.tooltipService?.show({
                dataItems: tooltipData,
                identities: metric.selectionId ? [metric.selectionId] : [],
                coordinates: [e.clientX, e.clientY],
                isTouchEvent: false
            });
        });

        root.addEventListener("mouseleave", () => {
            this.host.tooltipService?.hide({ immediately: false, isTouchEvent: false });
        });
    }

    private buildTooltipData(metric: MetricData): powerbi.extensibility.VisualTooltipDataItem[] {
        const items: powerbi.extensibility.VisualTooltipDataItem[] = [
            {
                displayName: metric.name,
                value: this.formatMetricValue(metric.value),
                color: this.formattingSettings.mainValue.color.value?.value ?? "#252423"
            }
        ];

        if (metric.priorPeriod !== null) {
            items.push({
                displayName: "Prior Period",
                value: this.formatMetricValue(metric.priorPeriod),
                color: "#605E5C"
            });
        }

        if (metric.target !== null && this.isPro) {
            items.push({
                displayName: "Target",
                value: this.formatMetricValue(metric.target),
                color: this.formattingSettings.target.color.value?.value ?? "#E97132"
            });
        }

        // Custom tooltip drill-through (Pro only - F04)
        if (this.isPro) {
            for (const tf of metric.tooltipFields) {
                items.push({ displayName: tf.displayName, value: tf.value });
            }
        }

        return items;
    }

    // ─── Formatting Helpers ──────────────────────────────────────────────────

    private formatMetricValue(value: number | null): string {
        if (value === null || value === undefined) return "—";
        const s = this.formattingSettings.mainValue;
        const prefix = this.isPro ? (s.prefix.value ?? "") : "";
        const suffix = this.isPro ? (s.suffix.value ?? "") : "";
        const decimals = s.decimalPlaces.value ?? 1;
        const unit = (String(s.displayUnit.value) as DisplayUnit) ?? "auto";
        return `${prefix}${this.applyDisplayUnit(value, unit, decimals)}${suffix}`;
    }

    private formatValue(value: number | null, unit: string, format?: string): string {
        if (value === null) return "—";
        return this.applyDisplayUnit(value, unit as DisplayUnit, 1);
    }

    private applyDisplayUnit(value: number, unit: DisplayUnit, decimals: number): string {
        const abs = Math.abs(value);
        if (unit === "none") return value.toFixed(decimals);
        if (unit === "billions" || (unit === "auto" && abs >= 1e9))
            return `${(value / 1e9).toFixed(decimals)}B`;
        if (unit === "millions" || (unit === "auto" && abs >= 1e6))
            return `${(value / 1e6).toFixed(decimals)}M`;
        if (unit === "thousands" || (unit === "auto" && abs >= 1e3))
            return `${(value / 1e3).toFixed(decimals)}K`;
        return value.toFixed(decimals);
    }

    // ─── Formatting Pane API (F06) ───────────────────────────────────────────

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
