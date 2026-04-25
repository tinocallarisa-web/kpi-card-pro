/**
 * KPI Card Pro — Visual
 * TCViz | tcviz.com
 * pbiviz tools v7.0.3 | powerbi-visuals-api ~5.10.0
 * powerbi-visuals-utils-formattingmodel ^6.2.2 | TypeScript ES2022
 *
 * Features:
 *   F01 – Single KPI (Free) + Small Multiples by dimension (Pro)
 *   F02 – Variance pill with conditional colors (Pro)
 *   F03 – High-contrast mode and accessibility
 *   F04 – Tooltip drill-through (Pro)
 *   F05 – Documented measure contract
 *   F06 – Formatting pane parity Desktop & Service
 *   F07 – Bookmark persistence
 *   F08 – Context menu on empty space
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface MetricData {
    name: string;
    value: number | null;
    priorPeriod: number | null;
    target: number | null;
    tooltipFields: Array<{ displayName: string; value: string }>;
    selectionId: powerbi.extensibility.ISelectionId | null;
}

type DisplayUnit = "auto" | "none" | "thousands" | "millions" | "billions";

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

        // ── IVisualLicenseManager ─────────────────────────────────────────
        this.licenseManager = this.host.licenseManager;
        this.licenseManager.getAvailableServicePlans().then(result => {
            const plans = result.plans ?? [];
            this.isPro = plans.some(p =>
                p.spIdentifier === "kpiCardProTCViz" && p.state === 1
            );
            const existing = this.container.querySelector(".kpi-root");
            if (existing) { existing.remove(); }
        }).catch(() => {
            this.isPro = false;
        });

        // ── Container ─────────────────────────────────────────────────────
        this.container = options.element;
        this.container.classList.add("kpi-card-pro-container");
        this.container.setAttribute("role", "region");
        this.container.setAttribute("aria-label", "KPI Card Pro");

        // ── Context menu on empty space (F08) ─────────────────────────────
        this.container.addEventListener("contextmenu", (e: MouseEvent) => {
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
        const dataView = options?.dataViews?.[0];
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            dataView
        ) as VisualFormattingSettingsModel;

        const ariaTitle = this.formattingSettings.accessibility.visualTitle.value || "KPI Card Pro";
        this.container.setAttribute("aria-label", ariaTitle);

        const metrics = this.parseDataView(dataView);
        this.render(metrics);
    }

    // ─── Parse DataView (Matrix) ─────────────────────────────────────────────

    private parseDataView(dataView?: DataView): MetricData[] {
        if (!dataView?.matrix) return [];

        const matrix = dataView.matrix;
        const rows = matrix.rows;
        const cols = matrix.columns;

        // Find value column indices by role
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

        // No small multiples — single card from root
        if (!rows?.root?.children || rows.root.children.length === 0) {
            const rootValues = matrix.rows?.root?.values ?? matrix.columns?.root?.values ?? {};
            const value = this.getMatrixValue(rootValues, measureIdx);
            const prior = priorIdx >= 0 ? this.getMatrixValue(rootValues, priorIdx) : null;
            const measureName = cols?.levels?.[0]?.sources?.[measureIdx]?.displayName ?? "Value";

            const target = targetIdx >= 0 ? this.getMatrixValue(rootValues, targetIdx) : null;
            return [{
                name: measureName,
                value,
                priorPeriod: prior,
                target,
                tooltipFields: [],
                selectionId: null
            }];
        }

        // Small multiples — one card per row
        const metrics: MetricData[] = [];
        const limit = this.isPro ? 50 : 1;

        for (let i = 0; i < Math.min(rows.root.children.length, limit); i++) {
            const child = rows.root.children[i];
            const categoryName = child.value != null ? String(child.value) : `Item ${i + 1}`;
            const rowValues = child.values ?? {};

            const value = this.getMatrixValue(rowValues, measureIdx);
            const prior = priorIdx >= 0 ? this.getMatrixValue(rowValues, priorIdx) : null;
            const target = targetIdx >= 0 ? this.getMatrixValue(rowValues, targetIdx) : null;

            const tooltipFields = tooltipIdxs.map(ti => ({
                displayName: cols?.levels?.[0]?.sources?.[ti]?.displayName ?? "",
                value: this.formatValue(this.getMatrixValue(rowValues, ti))
            }));

            const selectionId = this.host.createSelectionIdBuilder()
                .withMatrixNode(child, rows.levels)
                .createSelectionId();

            metrics.push({
                name: categoryName,
                value,
                priorPeriod: prior,
                target,
                tooltipFields,
                selectionId
            });
        }

        return metrics;
    }

    private getMatrixValue(values: powerbi.DataViewMatrixNodeValue, idx: number): number | null {
        const v = values[idx];
        if (v == null || v.value == null) return null;
        return typeof v.value === "number" ? v.value : null;
    }

    // ─── Render ─────────────────────────────────────────────────────────────

    private render(metrics: MetricData[]): void {
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        const s = this.formattingSettings;
        const hc = s.accessibility.highContrast.value;

        const root = document.createElement("div");
        root.className = "kpi-root" + (hc ? " high-contrast" : "");

        const cardBg = hc ? "#000000" : (s.card.background.value?.value ?? "#FFFFFF");
        const cardBorder = hc ? "#FFFFFF" : (s.card.borderColor.value?.value ?? "#E0E0E0");
        const bw = this.isPro ? (s.card.borderWidth.value ?? 1) : 1;
        const br = this.isPro ? (s.card.borderRadius.value ?? 8) : 8;
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
            // Single card
            const cell = this.buildMetricCell(metrics[0], hc, true);
            root.appendChild(cell);
        } else {
            // Small multiples grid (Pro)
            this.renderGrid(root, metrics, hc);
        }

        if (!this.isPro) {
            this.renderFreeBadge(root);
        }

        this.container.appendChild(root);
        this.setupTooltips(root, metrics);
    }

    private renderGrid(root: HTMLElement, metrics: MetricData[], hc: boolean): void {
        const s = this.formattingSettings.smallMultiples;
        const cols = this.isPro ? (s.columns.value ?? 3) : 1;
        const gap = this.isPro ? (s.gap.value ?? 12) : 12;

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
            const cardBg = hc ? "#000000" : (s2.card.background.value?.value ?? "#FFFFFF");
            const cardBorder = hc ? "#FFFFFF" : (s2.card.borderColor.value?.value ?? "#E0E0E0");
            const br = this.isPro ? (s2.card.borderRadius.value ?? 8) : 8;

            const wrapper = document.createElement("div");
            wrapper.style.cssText = `
                background: ${cardBg};
                border: 1px solid ${cardBorder};
                border-radius: ${br}px;
                padding: 12px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                gap: 2px;
            `;

            const cell = this.buildMetricCell(metric, hc, false);
            wrapper.appendChild(cell);
            grid.appendChild(wrapper);
        });

        root.appendChild(grid);
    }

    private renderEmpty(root: HTMLElement, hc: boolean): void {
        const empty = document.createElement("div");
        empty.className = "kpi-empty";
        empty.title = "KPI Card Pro — Add a measure to the Value field well";
        empty.style.cssText = `
            display: flex; flex: 1; align-items: center; justify-content: center;
            flex-direction: column; gap: 8px;
            color: ${hc ? "#FFFFFF" : "#A19F9D"};
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

    private buildMetricCell(metric: MetricData, hc: boolean, large: boolean): HTMLElement {
        const s = this.formattingSettings;
        const cell = document.createElement("div");
        cell.className = "kpi-metric-cell";
        cell.dataset.selectionIndex = "0";
        cell.setAttribute("role", "group");
        cell.setAttribute("aria-label", metric.name);
        cell.style.cssText = "display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 2px; cursor: default;";

        // Context menu per cell
        cell.addEventListener("contextmenu", (e: MouseEvent) => {
            e.preventDefault(); e.stopPropagation();
            this.selectionManager.showContextMenu(metric.selectionId, { x: e.clientX, y: e.clientY });
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
            labelEl.textContent = metric.name;
            labelEl.title = metric.name;
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
        const fontSize = large ? (s.mainValue.fontSize.value ?? 28) : Math.max(16, (s.mainValue.fontSize.value ?? 28) * 0.7);
        valueEl.style.cssText = `
            font-family: ${s.mainValue.fontFamily.value ?? "Segoe UI, sans-serif"};
            font-size: ${fontSize}px;
            font-weight: ${s.mainValue.bold.value ? "700" : "400"};
            color: ${hc ? "#FFFFFF" : (s.mainValue.color.value?.value ?? "#252423")};
            line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        `;
        cell.appendChild(valueEl);

        // ── Variance ───────────────────────────────────────────────────────
        if (s.variance.show.value && metric.priorPeriod !== null) {
            const pill = this.buildVariancePill(metric.value, metric.priorPeriod, hc);
            if (pill) cell.appendChild(pill);
        }

        // ── Prior value ────────────────────────────────────────────────────
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
        const diff = current - base;
        const pct = (diff / Math.abs(base)) * 100;
        const isPositive = s.invertColors.value ? diff < 0 : diff > 0;
        const isNeutral = diff === 0;

        let color: string;
        if (hc) {
            color = isNeutral ? "#FFFFFF" : (isPositive ? "#00FF00" : "#FF0000");
        } else if (this.isPro) {
            color = isNeutral
                ? (s.neutralColor.value?.value ?? "#605E5C")
                : (isPositive ? (s.positiveColor.value?.value ?? "#107C10") : (s.negativeColor.value?.value ?? "#D13438"));
        } else {
            color = isNeutral ? "#605E5C" : (isPositive ? "#107C10" : "#D13438");
        }

        const arrow = s.showArrow.value ? (isNeutral ? "→" : (diff > 0 ? "▲" : "▼")) : "";
        const pctStr = `${arrow} ${Math.abs(pct).toFixed(1)}%`;
        const usePill = this.isPro && s.showPill.value;

        const pill = document.createElement("div");
        pill.className = "kpi-variance-pill";
        pill.textContent = pctStr;
        pill.title = `Variance: ${pctStr} (${diff >= 0 ? "+" : ""}${this.formatMetricValue(diff)})`;

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
            const idx = parseInt(cell.dataset.selectionIndex ?? "0", 10);
            const metric = metrics[idx] ?? metrics[0];
            if (!metric) return;

            const items: powerbi.extensibility.VisualTooltipDataItem[] = [
                { displayName: metric.name, value: this.formatMetricValue(metric.value), color: this.formattingSettings.mainValue.color.value?.value ?? "#252423" }
            ];
            if (metric.priorPeriod !== null) {
                items.push({ displayName: "Prior Period", value: this.formatMetricValue(metric.priorPeriod), color: "#605E5C" });
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
        const s = this.formattingSettings.mainValue;
        const prefix = this.isPro ? (s.prefix.value ?? "") : "";
        const suffix = this.isPro ? (s.suffix.value ?? "") : "";
        const decimals = s.decimalPlaces.value ?? 1;
        const unit = String(s.displayUnit.value ?? "auto") as DisplayUnit;
        return `${prefix}${this.applyDisplayUnit(value, unit, decimals)}${suffix}`;
    }

    private formatValue(value: number | null): string {
        if (value === null) return "—";
        return this.applyDisplayUnit(value, "auto", 1);
    }

    private applyDisplayUnit(value: number, unit: DisplayUnit, decimals: number): string {
        const abs = Math.abs(value);
        if (unit === "none") return value.toFixed(decimals);
        if (unit === "billions" || (unit === "auto" && abs >= 1e9)) return `${(value / 1e9).toFixed(decimals)}B`;
        if (unit === "millions" || (unit === "auto" && abs >= 1e6)) return `${(value / 1e6).toFixed(decimals)}M`;
        if (unit === "thousands" || (unit === "auto" && abs >= 1e3)) return `${(value / 1e3).toFixed(decimals)}K`;
        return value.toFixed(decimals);
    }

    // ─── Formatting Pane API (F06) ───────────────────────────────────────────

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
