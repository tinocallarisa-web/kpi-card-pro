/**
 * KPI Card Pro — Visual
 * TCViz | tcviz.com
 * pbiviz tools v7.0.3 | powerbi-visuals-api ~5.10.0
 * powerbi-visuals-utils-formattingmodel ^6.2.2 | TypeScript ES2022
 */

"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";
import { VisualFormattingSettingsModel } from "./settings";
import { I18N } from "./i18n";
import { STRINGS } from "./strings";
import {
    HtmlSubSelectableClass, HtmlSubSelectionHelper, SubSelectableDisplayNameAttribute,
    SubSelectableObjectNameAttribute, SubSelectableTypeAttribute,
} from "powerbi-visuals-utils-onobjectutils";

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
    /** Formato de cada medida en el modelo (source.format). El visual lo respeta: 0,3 con
     *  formato de porcentaje se pinta 30 %, con la moneda y los separadores del informe. */
    formats: { value?: string; prior?: string; target?: string };
    /** Etiqueta del punto que muestra el valor, y del que se compara. Vacias en modo total. */
    periodLabel: string;
    comparePeriodLabel: string;
    /** KPIs de apoyo a la derecha del valor principal. Su prior se empareja por posicion. */
    secondary: Array<{ name: string; value: number | null; prior: number | null; series: number[]; format?: string }>;
    selectionId: powerbi.extensibility.ISelectionId | null;
    isHighlighted: boolean;               // false = dim this card
    trendData: number[];                  // series for the sparkline, empty when unbound
    trendLabels: string[];                // etiqueta de cada punto, para el valor al pasar el raton
    targetData: number[];                 // target per period, aligned with trendData
    /** Seleccion de cada punto de la tendencia, alineada con trendData: un clic en un
     *  punto filtra el informe por ese periodo (y por la tarjeta, en small multiples). */
    trendIds: powerbi.extensibility.ISelectionId[];
    image: string | null;                 // validated Base64 data URI, or null
    /** Colores que devuelven las reglas fx para esta tarjeta (valor y fondo); null si no hay regla. */
    fxColor: string | null;
    fxBg: string | null;
}

type DisplayUnit = "auto" | "none" | "thousands" | "millions" | "billions";

const CONTEXT_MENU_DEBOUNCE = 200;

/** Luminancia relativa (0 negro, 1 blanco) de un color #RRGGBB; null si no se puede leer. */
function luminance(hex: string | undefined): number | null {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");
    if (!m) return null;
    const c = [m[1], m[2], m[3]].map(h => {
        const v = parseInt(h, 16) / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Mezcla un #RRGGBB con blanco en la proporción t (0..1). */
function towardWhite(hex: string, t: number): string {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return hex;
    return "#" + [m[1], m[2], m[3]].map(h => {
        const v = parseInt(h, 16);
        return Math.round(v + (255 - v) * t).toString(16).padStart(2, "0");
    }).join("");
}

/**
 * Plantillas de estilo (2.2.0.0): [tarjeta, propiedad, valor]. Solo se aplican a lo que el
 * autor no ha tocado (lo que no está en metadata.objects), así que un ajuste a mano siempre
 * gana. Solo propiedades gratuitas: una plantilla no puede regalar el estilo Pro de la tarjeta.
 */
const TEMPLATES: Record<string, [string, string, unknown][]> = {
    classic: [],
    clean: [["card", "borderColor", "#FFFFFF"], ["mainValue", "fontSize", 32], ["mainValue", "bold", true],
            ["mainValue", "color", "#1F2937"], ["label", "color", "#6B7280"],
            ["trend", "color", "#2B6CB0"], ["trend", "areaOpacity", 12]],
    bold: [["mainValue", "fontSize", 40], ["mainValue", "bold", true], ["mainValue", "color", "#1F4E80"],
           ["label", "fontSize", 13], ["label", "bold", true], ["label", "color", "#1F4E80"],
           ["trend", "color", "#1F4E80"], ["trend", "areaOpacity", 30], ["trend", "lineWidth", 3]],
    minimal: [["card", "borderColor", "#FFFFFF"], ["mainValue", "fontSize", 34], ["mainValue", "bold", false],
              ["label", "fontSize", 11], ["label", "color", "#8A8886"],
              ["trend", "type", "line"], ["trend", "lineWidth", 1], ["trend", "color", "#605E5C"]],
    soft: [["card", "background", "#F3F7FC"], ["card", "borderColor", "#DCE7F5"], ["mainValue", "bold", true],
           ["mainValue", "color", "#1F4E80"], ["label", "color", "#4A6A8F"], ["secondary", "color", "#4A6A8F"],
           ["trend", "color", "#2B6CB0"], ["trend", "areaOpacity", 25]],
    midnight: [["card", "background", "#1F2A37"], ["card", "borderColor", "#1F2A37"], ["mainValue", "bold", true],
               ["mainValue", "color", "#FFFFFF"], ["label", "color", "#A7B4C2"], ["secondary", "color", "#C9D3DD"],
               ["trend", "color", "#5FA8F5"], ["trend", "areaOpacity", 25], ["trend", "targetColor", "#7B8794"]]
};

const SERVICE_PLAN_ID = "kpi-card-pro-tcviz";

/**
 * spIdentifier is the full Partner Center Service ID (publisher.offer.plan),
 * not the bare plan ID, so an exact comparison never matches a real licence.
 * The bare plan ID is accepted as well.
 */
function matchesPlan(spIdentifier: unknown, planId: string): boolean {
    const sp = String(spIdentifier ?? "");
    return sp === planId || sp.endsWith("." + planId);
}

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
                        (p: any) => matchesPlan(p.spIdentifier, SERVICE_PLAN_ID) &&
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
            // The licence could not be read: Free, but never a purchase prompt.
            licenseResolved = false;
            licenseInfoAvailable = false;
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
    private localization: powerbi.extensibility.ILocalizationManager | undefined;
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
    /** Pending timer for the Upgrade bar, so it can be cancelled and never leaks. */
    private licenseIconTimer: number | null = null;
    /** Edit mode, from options.viewMode. NOT Desktop vs Service: both report it. */
    private editing = false;
    /**
     * Pro features drawn for real, under a watermark, so the user sees what they would
     * be buying before paying for it. Edit mode only, and only once the licence has
     * resolved — otherwise a Pro customer sees a watermark on the first frame and a
     * published report ships an unpaid feature.
     */
    private proPreview = false;
    /** Ultimo calculo hecho sobre un dataView con roles, para el retorno de pagina. */
    private ultimasProFeatures: { labels: string[]; signature: string } | null = null;
    private watermarkEl: HTMLDivElement | null = null;
    private watermarkTitle: HTMLDivElement | null = null;
    private watermarkWhy: HTMLDivElement | null = null;
    /** Solo para el overlay de diagnostico. */
    private dbgMeasureIdx = 0;
    /** Formato sobre el lienzo (2.2.0.0): número, etiqueta, variación, tendencia y tarjeta. */
    public visualOnObjectFormatting: powerbi.extensibility.visual.VisualOnObjectFormatting;
    private subSelectionHelper: HtmlSubSelectionHelper;
    private formatMode = false;
    /** Paso del asistente de configuración (2 = comparación, 3 = estilo). El 1 es la
     *  pantalla de inicio: mientras no hay medida no hay tarjeta sobre la que flotar. */
    private guideStep = 2;
    /** Claves de lo seleccionado al pintar: tarjetas y puntos de la tendencia. */
    private selKeys: Set<string> = new Set();

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();
        // Localizacion en tiempo de ejecucion. Los .resjson solo cubren los nombres
        // del panel de formato; los textos que el visual escribe -la pagina de
        // inicio, 'Prior:', 'Target:'- salen de aqui, y sin esto quedaban en ingles
        // aunque Power BI estuviera en espanol.
        try {
            this.localization = (options.host as any).createLocalizationManager?.();
        } catch (_) { this.localization = undefined; }

        // Bookmarks.
        //
        // Applying a bookmark, or clearing filters from elsewhere, changes the
        // selection without the visual having been touched. Power BI announces it
        // here; without listening, the cards keep showing whatever was dimmed
        // before, so a bookmark leaves a selection on screen that no longer exists.
        //
        // Repainting from the cached dataView is enough: every visual state the
        // cards show — which are dimmed, which value each one carries — is derived
        // from it, so there is nothing to reconcile by hand.
        const sm = this.selectionManager as any;
        if (typeof sm.registerOnSelectCallback === "function") {
            sm.registerOnSelectCallback(() => {
                if (!this.lastDataView || !this.formattingSettings) return;
                try {
                    this.render(this.parseDataView(this.lastDataView));
                } catch (_) { /* keep what is on screen */ }
            });
        }
        this.formattingSettingsService = new FormattingSettingsService();
        this.subSelectionHelper = HtmlSubSelectionHelper.createHtmlSubselectionHelper({
            hostElement: options.element,
            subSelectionService: (options.host as any).subSelectionService,
            selectionIdCallback: () => undefined,
        });
        this.visualOnObjectFormatting = {
            getSubSelectionStyles: (subs) => this.getSubSelectionStyles(subs),
            getSubSelectionShortcuts: (subs) => this.getSubSelectionShortcuts(subs),
            getSubSelectables: (filter) => this.subSelectionHelper.getAllSubSelectables(filter),
        };
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

        // Un clic fuera de las tarjetas y de los puntos limpia la selección, como en los
        // visuales nativos.
        this.container.addEventListener("click", (e: MouseEvent) => {
            if ((this.host as any).allowInteractions === false) return;
            const t = e.target as HTMLElement;
            if (this.formatMode) return;
            if (t.closest("[data-selection-index]") || t.closest(".kpi-sparkline")) return;
            if (this.selKeys.size === 0) return;
            this.selectionManager.clear().then(() => this.repaint());
        });

        // Flechas, Inicio y Fin entre tarjetas (2.2.0.0); el tabulador sigue funcionando.
        this.container.addEventListener("keydown", (e: KeyboardEvent) => {
            const t = e.target as HTMLElement;
            if (!t.classList || !t.classList.contains("kpi-metric-cell")) return;
            const todas = Array.from(this.container.querySelectorAll(".kpi-metric-cell")) as HTMLElement[];
            const i = todas.indexOf(t);
            let j = -1;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") j = Math.min(todas.length - 1, i + 1);
            else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = Math.max(0, i - 1);
            else if (e.key === "Home") j = 0;
            else if (e.key === "End") j = todas.length - 1;
            if (j >= 0 && j !== i) { e.preventDefault(); todas[j].focus(); }
        });
    }

    /**
     * PANEL DE FORMATO EN EL IDIOMA DE POWER BI (2.2.0.0). Hasta la 2.1 los ajustes no
     * llevaban clave y el panel salía en inglés aunque existiera la traducción. Las claves
     * viven en capabilities.json (src/i18n.ts las recoge); aquí se aplican a tarjetas,
     * ajustes, descripciones y opciones de las listas. En inglés no se toca nada: el texto
     * de settings.ts es el original.
     */
    private localizeModel(): void {
        const loc = String((this.host as any).locale || "");
        if (!this.localization || /^en/i.test(loc)) return;
        for (const card of ((this.formattingSettings as any).cards || []) as any[]) {
            const m = I18N[card.name];
            if (!m) continue;
            if (m.k) card.displayName = this.t(m.k, card.displayName);
            if (m.d && card.description) card.description = this.t(m.d, card.description);
            for (const sl of (card.slices || []) as any[]) {
                const e = m.p[sl.name];
                if (!e) continue;
                if (e.k) sl.displayName = this.t(e.k, sl.displayName);
                if (e.d && sl.description) sl.description = this.t(e.d, sl.description);
                if (Array.isArray(sl.items)) {
                    sl.items = sl.items.map((it: any) => e.e[it.value]
                        ? { ...it, displayName: this.t(e.e[it.value], it.displayName) } : it);
                    const elegido = sl.items.find((it: any) => it.value === sl.value?.value);
                    if (elegido) sl.value = elegido;
                }
            }
        }
    }

    private applyTemplate(objects: powerbi.DataViewObjects | undefined): void {
        const name = (objects?.["style"]?.["template"] as string) || "classic";
        const list = TEMPLATES[name] || [];
        const cards: any[] = (this.formattingSettings as any).cards || [];
        for (const [cardName, prop, val] of list) {
            if (objects?.[cardName]?.[prop] !== undefined) { continue; }
            const card = cards.find(c => c.name === cardName);
            const slice = card?.slices?.find((s: any) => s.name === prop);
            if (!slice) { continue; }
            if (Array.isArray(slice.items)) { slice.value = slice.items.find((it: any) => it.value === val) || slice.value; }
            else if (slice.value && typeof slice.value === "object" && "value" in slice.value) { slice.value = { value: val }; }
            else { slice.value = val; }
        }
    }

    // ─── Selección ──────────────────────────────────────────────────────────

    /**
     * Lo que oye un lector de pantalla al llegar a una tarjeta: nombre y valor, periodo,
     * variación contra el anterior, objetivo y estado. Antes solo decía el nombre.
     */
    private ariaSummary(metric: MetricData): string {
        const v = metric.highlightValue !== null ? metric.highlightValue : metric.value;
        const partes = [`${metric.name}: ${this.formatMetricValue(v, metric.formats.value)}`];
        if (metric.periodLabel) partes.push(metric.periodLabel);
        if (v !== null && metric.priorPeriod !== null && metric.priorPeriod !== 0) {
            const pct = (v - metric.priorPeriod) / Math.abs(metric.priorPeriod);
            partes.push(`${pct >= 0 ? "+" : "-"}${this.pctFormatter().format(Math.abs(pct))} `
                + `${this.t("Aria_VsPrior", "vs prior")} (${this.formatMetricValue(metric.priorPeriod, metric.formats.prior)})`);
        }
        if (metric.target !== null) {
            partes.push(`${this.t("Label_Target", "Target")}: ${this.formatMetricValue(metric.target, metric.formats.target)}`);
        }
        const st = this.statusOf(metric, v);
        if (st) partes.push(st.text ? `${st.word}, ${st.text}` : st.word);
        return partes.join(". ");
    }

    private keyOf(id: powerbi.extensibility.ISelectionId | null | undefined): string {
        if (!id) return "";
        const k = (id as any).getKey?.();
        return typeof k === "string" ? k : JSON.stringify(id);
    }

    private selectedKeys(): Set<string> {
        let ids: unknown[] = [];
        try { ids = (this.selectionManager.getSelectionIds?.() as unknown[]) || []; } catch (_) { ids = []; }
        return new Set(ids.map(i => this.keyOf(i as powerbi.extensibility.ISelectionId)).filter(k => k));
    }

    /** ¿Está seleccionada la tarjeta, o alguno de sus puntos? */
    private cardSelected(metric: MetricData): boolean {
        if (this.selKeys.size === 0) return false;
        if (metric.selectionId && this.selKeys.has(this.keyOf(metric.selectionId))) return true;
        return metric.trendIds.some(id => this.selKeys.has(this.keyOf(id)));
    }

    /**
     * Selecciona y repinta. La selección propia no llega por registerOnSelectCallback (solo
     * la externa: marcadores, borrar filtros), así que sin repintar aquí el clic filtraba
     * el informe pero la tarjeta no cambiaba — que es justo lo que vio el revisor.
     * Se pinta con render(), no con update(): fuera de update() no se emiten eventos de
     * renderizado, y repetirlos es motivo de rechazo.
     */
    private selectId(id: powerbi.extensibility.ISelectionId, multi: boolean): void {
        if (this.formatMode) return;   // en formato sobre el lienzo, un clic formatea
        this.selectionManager.select(id, multi).then(() => this.repaint());
    }

    private repaint(): void {
        if (!this.lastDataView || !this.formattingSettings) return;
        try { this.render(this.parseDataView(this.lastDataView)); } catch (_) { /* se queda lo que hay */ }
    }

    // ─── Update ─────────────────────────────────────────────────────────────

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);

        try {
            const dataView = options?.dataViews?.[0];

            // ViewMode.View = 0. Edit e InFocusEdit son ambos edicion. Esto NO distingue
            // Desktop de Service: los dos informan de los dos modos, y hacerlo por host
            // dejaria la vista previa visible en un informe publicado.
            const viewMode = (options as any).viewMode;
            if (typeof viewMode === "number") { this.editing = viewMode !== 0; }
            this.formatMode = !!(options as any).formatMode;
            this.subSelectionHelper.setFormatMode(this.formatMode);

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
            this.applyTemplate(dataView?.metadata?.objects);
            this.localizeModel();

            // lastDataView se asigna ANTES de parsear. attemptedProFeatures() lo lee, y
            // asignarlo despues hacia que durante el parseo mirase el dataView ANTERIOR:
            // al volver de otra pagina, las puertas Pro se resolvian contra un dataView
            // viejo y las small multiples se quedaban en una sola tarjeta hasta el
            // siguiente update. Con isPro, que era un booleano estable, no se notaba.
            const anterior = this.lastDataView;
            this.lastDataView = dataView;
            const metrics = this.parseDataView(dataView);

            // If parsing yields nothing but we already displayed real data, this is a
            // transient update (roles not yet populated on page return). Keep the
            // current display instead of wiping it with the empty placeholder.
            if (metrics.length === 0 && this.hasRenderedData) {
                this.lastDataView = anterior;   // no dejar el transitorio como bueno
                this.events.renderingFinished(options);
                return;
            }

            const ariaTitle = this.formattingSettings.accessibility.visualTitle.value || "KPI Card Pro";
            this.container.setAttribute("aria-label", ariaTitle);

            this.render(metrics);
            if (metrics.length > 0) {
                this.hasRenderedData = true;
                this.requestLicenseDeferred();
            }
            if (this.formatMode) {
                const subs = (options as any).subSelections as powerbi.visuals.CustomVisualSubSelection[] | undefined;
                this.subSelectionHelper.updateOutlinesFromSubSelections(subs ?? [], true);
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

            // Y desde que existe la vista previa, tampoco basta con notificar.
            //
            // La previa depende de que la licencia se haya RESUELTO, no de que sea Pro.
            // Power BI recrea la instancia en cada cambio de pagina, asi que al volver
            // el primer render ocurre con licenseResolved todavia en null: sin previa,
            // una sola tarjeta, sin tendencia y sin KPI secundarios. La licencia
            // resolvia a Free un instante despues y este return se iba sin repintar,
            // dejando la tarjeta rota hasta tocar cualquier ajuste.
            //
            // Antes era inofensivo: para un usuario Free nada de lo que se dibujaba
            // dependia de la licencia. Ahora si.
            if (this.computePreview() && this.lastDataView && this.formattingSettings) {
                try {
                    this.render(this.parseDataView(this.lastDataView));
                } catch (_) { /* keep current display */ }
            }
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
        // Al volver de otra pagina Power BI puede entregar un dataView con valores pero
        // SIN los roles poblados. Antes eso no importaba: la puerta era this.isPro, un
        // booleano estable. Ahora decide si se dibujan 50 tarjetas o una, asi que un
        // dataView sin roles apagaba las small multiples, la tendencia y los KPI
        // secundarios aunque los campos siguieran en sus pozos.
        //
        // Se distingue de una retirada real de campos: al quitar un campo, Power BI si
        // manda las fuentes, solo que sin ese rol. Sin fuentes es que aun no ha llegado
        // la metadata, y entonces vale lo ultimo que sabiamos.
        const fuentesAhora = this.lastDataView?.matrix?.columns?.levels?.[0]?.sources;
        if (!fuentesAhora?.length && this.ultimasProFeatures) {
            return this.ultimasProFeatures;
        }
        // No early return on a missing metadata.objects. A report where the user
        // has changed no formatting property has no objects at all — and that is
        // exactly the case of someone who has only dropped a field into Small
        // Multiples. Returning here skipped the data-role check below, so the
        // most visible gate in the visual stayed silent.
        const objs = (this.lastDataView?.metadata?.objects ?? {}) as any;

        const groups: [string, string, string[]][] = [
            ["card styling",   "card",                 ["borderWidth", "borderRadius", "padding", "shadow"]],
            ["small multiples layout","smallMultiplesLayout", ["columns", "gap", "showTitle", "titleFontSize", "titleColor"]],
            ["prefix/suffix",  "mainValue",            ["prefix", "suffix"]],
            ["variance pill", "variance",          ["showPill"]],
            // Bloqueadas en el render desde siempre, pero nunca anunciadas: el usuario
            // cambiaba el color y no pasaba nada, sin una palabra que lo explicara.
            ["variance colours",  "variance",           ["positiveColor", "negativeColor", "neutralColor"]],
            // Estados por umbral (2.1.0.0): encenderlos es la intencion de compra.
            ["status",            "status",             ["show"]],
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

        // Igual que Small Multiples y Trend: el pozo se enlaza en el panel de campos,
        // no en el de formato, asi que no deja rastro en metadata.objects. Sin esto la
        // funcion mas visible que hemos añadido se activaria en silencio.
        const fuentes = (this.lastDataView?.matrix?.columns?.levels?.[0]?.sources ?? []) as any[];
        const secBound = fuentes.some(src => src?.roles?.["secondaryKpis"]);
        if (secBound) {
            labels.push("secondary KPIs");
            parts.push("role.secondaryKpis=1");
        }

        // Tooltips extra: tambien es un pozo, tambien estaba gateado en silencio.
        const tipBound = fuentes.filter(src => src?.roles?.["tooltips"]).length;
        if (tipBound > 0) {
            labels.push("extra tooltip fields");
            parts.push(`role.tooltips=${tipBound}`);
        }

        // Binding Trend is intent too, and it leaves no trace in metadata.objects.
        if (anyGrouping && roles.trend >= 0) {
            labels.push("trend line");
            parts.push("role.trend=1");
        }

        // Formato condicional (fx) en el color del valor o el fondo: Power BI deja el resultado en los nodos de la
        // matriz, no en metadata.objects, así que se busca ahí. Una regla aplicada es la intención.
        const conRegla = [smRows?.root, ...smKids].some((n: any) => n?.objects?.mainValue?.color || n?.objects?.card?.background
            || Object.values(n?.values ?? {}).some((v: any) => v?.objects?.mainValue?.color || v?.objects?.card?.background));
        if (conRegla) {
            labels.push("conditional formatting (fx)");
            parts.push("fx=1");
        }

        if (smHasGrouping) {
            const n = smKids.length;
            labels.push("small multiples");
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
        const salida = { labels, signature: parts.join("|") };
        if (fuentesAhora?.length) { this.ultimasProFeatures = salida; }
        return salida;
    }

    /**
     * Take the licence notice down: the licence resolved, or the user removed
     * every Pro setting. Both notifications live for the visual's lifetime until
     * cleared, so leaving one up would tell a paying customer to buy what they
     * have just bought.
     */
    /**
     * Lo que se DIBUJA, funcion a funcion.
     *
     * La previa no puede concederse en bloque: varios ajustes Pro tienen un valor por
     * defecto util, asi que un interruptor global los regalaria nada mas insertar el
     * visual, sin marca de agua y sin aviso, porque el usuario no habria pedido nada.
     * Solo vale para la funcion que el usuario ha tocado de verdad, que es tambien el
     * momento en que aparecen la marca y el aviso de compra.
     */
    private previewOf(feature: string): boolean {
        if (this.isPro) return true;
        // En vivo, no desde el campo: parseDataView corre ANTES de render y es quien
        // decide el limite de tarjetas, asi que leer un valor cacheado lo dejaria a uno.
        if (!this.computePreview()) return false;
        // Coincidencia exacta, no por prefijo: "small multiples layout" empieza igual que
        // "small multiples", y con prefijo tocar el layout desbloqueaba las 50 tarjetas.
        return this.attemptedProFeatures().labels.indexOf(feature) >= 0;
    }

    /** La marca solo aparece si hay alguna funcion Pro realmente pedida. */
    private updateWatermark(): void {
        if (!this.watermarkEl) {
            this.watermarkEl = document.createElement("div");
            this.watermarkEl.setAttribute("aria-hidden", "true");
            this.watermarkEl.style.cssText =
                "position:absolute;left:0;top:0;right:0;bottom:0;display:none;" +
                "align-items:center;justify-content:center;flex-direction:column;" +
                "text-align:center;pointer-events:none;z-index:5;" +
                "font-family:'Segoe UI',sans-serif;font-weight:700;letter-spacing:0.06em;" +
                "color:#FFFFFF;opacity:0.72;transform:rotate(-20deg);" +
                "text-shadow:0 0 3px rgba(46,52,64,0.95),0 2px 6px rgba(46,52,64,0.75);";
            this.watermarkTitle = document.createElement("div");
            this.watermarkTitle.textContent = "Pro preview";
            this.watermarkWhy = document.createElement("div");
            this.watermarkEl.appendChild(this.watermarkTitle);
            this.watermarkEl.appendChild(this.watermarkWhy);
            if (getComputedStyle(this.container).position === "static") {
                this.container.style.position = "relative";
            }
        }
        // El render reconstruye el contenido del contenedor, asi que la marca se
        // reinserta: encenderla sobre un nodo desconectado no pinta nada.
        if (this.watermarkEl.parentNode !== this.container) {
            this.container.appendChild(this.watermarkEl);
        }
        const labels = this.attemptedProFeatures().labels;
        const activa = this.computePreview() && labels.length > 0;
        this.watermarkEl.style.display = activa ? "flex" : "none";
        if (!activa) return;

        if (this.watermarkWhy) {
            // Con cuatro o cinco funciones activas la lista se convertia en un parrafo
            // cruzando la tarjeta entera y tapaba justo lo que queremos enseñar. Dos y
            // un contador bastan para saber por que esta la marca.
            const corta = labels.length <= 2
                ? labels
                : labels.slice(0, 2).concat([`+${labels.length - 2}`]);
            this.watermarkWhy.textContent = corta.join(" · ");
        }
        const w = this.container.clientWidth  || 0;
        const h = this.container.clientHeight || 0;
        const size = Math.round(Math.max(22, Math.min(80, w / 7.5, h / 3.5)));
        this.watermarkEl.style.fontSize = `${size}px`;
        if (this.watermarkWhy) {
            this.watermarkWhy.style.cssText =
                `font-size:${Math.round(size * 0.32)}px;font-weight:600;`
                + "margin-top:0.25em;opacity:0.95;";
        }
    }

    private cancelLicenseIcon(): void {
        if (this.licenseIconTimer !== null) {
            window.clearTimeout(this.licenseIconTimer);
            this.licenseIconTimer = null;
        }
    }

    private clearLicenseNotice(): void {
        this.lastBlockedNotice = "";
        this.cancelLicenseIcon();
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
            `colSources=${this.lastDataView?.matrix?.columns?.levels?.[0]?.sources?.length ?? "-"}`
              + ` roles=[${(this.lastDataView?.matrix?.columns?.levels?.[0]?.sources ?? [])
                    .map((x: any) => Object.keys(x?.roles ?? {}).join("+") || "?").join(" ")}]`,
            `rowLevel0Roles=${JSON.stringify(Object.keys(
                (this.lastDataView?.matrix?.rows?.levels?.[0]?.sources?.[0] as any)?.roles ?? {}))}`,
            `cache=${this.ultimasProFeatures ? "[" + this.ultimasProFeatures.labels.join(" / ") + "]" : "null"}`,
            `editing=${this.editing} preview(campo)=${this.proPreview} modo=${this.formattingSettings?.period?.valueMode?.value}`,
            `computePreview()=${this.computePreview()}`
              + ` | !isPro=${!this.isPro} editing=${this.editing}`
              + ` resolved!==null=${licenseResolved !== null} env=${licenseEnvSupported} info=${licenseInfoAvailable}`,
            `previewOf(small multiples)=${this.previewOf("small multiples")}`
              + ` previewOf(trend line)=${this.previewOf("trend line")}`,
        ];

        // La serie tal y como llega: clave del periodo y valor, en orden de entrega.
        const roles2 = this.rowRoles(rows);
        const card0  = rows?.root?.children?.[0];
        const serieNode = roles2.sm >= 0 ? card0 : rows?.root;
        const kids = serieNode?.children ?? [];
        lines.push(this.fxPaths());
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
            // Abajo, una línea, semitransparente y sin capturar clics: la tarjeta tiene que seguir viéndose.
            box.style.cssText = "position:absolute;bottom:2px;left:2px;right:2px;z-index:99999;max-height:28%;overflow:hidden;" +
                "font:9px/1.3 monospace;color:#fff;background:rgba(201,100,66,0.78);padding:2px 5px;" +
                "border-radius:3px;white-space:normal;word-break:break-all;pointer-events:none;";
            this.container.appendChild(box);
        }
        // Solo la línea del fx (lo que se está probando); el resto del diagnóstico de licencia tapaba la tarjeta.
        const fx = lines.filter(l => l.startsWith("fx meta="));
        box.textContent = (fx.length ? fx : lines.slice(0, 2)).join(" · ");
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
            line.setAttribute("stroke", hc ? "#FFFF00" : (t.targetColor.value?.value ?? "#A19F9D"));
            line.setAttribute("stroke-width", "1");
            line.setAttribute("stroke-dasharray", "4 2");
            line.setAttribute("vector-effect", "non-scaling-stroke");
            svg.appendChild(line);
        }

        const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");

        // Puntos seleccionados (por clic aquí, o por un marcador): se marcan, y en barras el
        // resto se atenúa. Sin esto el filtro salía hacia el informe sin rastro en la tarjeta.
        const elegidos = new Set<number>();
        metric.trendIds.forEach((id, i) => { if (this.selKeys.has(this.keyOf(id))) elegidos.add(i); });

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
                const fuerte = elegidos.size === 0 || elegidos.has(i);
                rect.setAttribute("fill-opacity", String(fuerte ? Math.min(1, opacity + 0.4) : 0.15));
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

        if (kind !== "bar") {
            const r = lineW + 2.5;
            elegidos.forEach(i => {
                const p = pts[i];
                const m = document.createElement("div");
                m.className = "kpi-point-selected";
                m.style.cssText =
                    `position:absolute;left:${p[0]}%;top:${p[1]}px;` +
                    `width:${r * 2}px;height:${r * 2}px;margin:${-r}px 0 0 ${-r}px;box-sizing:border-box;` +
                    `border-radius:50%;background:${hc ? "#000000" : "#FFFFFF"};border:2px solid ${color};` +
                    "pointer-events:none;z-index:2;";
                wrapper.appendChild(m);
            });
        }

        // VALOR AL PASAR EL RATON (2.1.0.0): guia vertical, punto y etiqueta con el
        // periodo y su valor formateado. HTML encima del SVG, por la misma razon que el
        // punto final: el viewBox estirado deformaria la geometria.
        const guia = document.createElement("div");
        guia.style.cssText = `position:absolute;top:0;bottom:0;width:1px;background:${color};opacity:0.5;display:none;pointer-events:none;z-index:2;`;
        const etq = document.createElement("div");
        etq.style.cssText = "position:absolute;top:-2px;transform:translate(-50%,-100%);padding:1px 6px;border-radius:4px;"
            + `font:600 10px 'Segoe UI',sans-serif;white-space:nowrap;display:none;pointer-events:none;z-index:3;`
            + (hc ? "background:#000000;color:#FFFFFF;border:1px solid #FFFFFF;" : "background:rgba(37,36,35,0.88);color:#FFFFFF;");
        wrapper.appendChild(guia);
        wrapper.appendChild(etq);
        const fmtSerie = metric.formats.value;
        const textoPunto = (i: number): string => {
            const lab = metric.trendLabels[i] ?? "";
            return `${lab ? lab + ": " : ""}${this.formatMetricValue(data[i], fmtSerie)}`;
        };
        const mostrar = (i: number) => {
            const xPct = kind === "bar" ? ((i + 0.5) / data.length) * 100 : (i / (data.length - 1)) * 100;
            guia.style.left = `${xPct}%`;
            guia.style.display = "block";
            etq.textContent = textoPunto(i);
            etq.style.left = `${Math.max(12, Math.min(88, xPct))}%`;
            etq.style.display = "block";
        };
        const ocultar = () => { guia.style.display = "none"; etq.style.display = "none"; };
        wrapper.addEventListener("mousemove", (e: MouseEvent) => {
            const r = wrapper.getBoundingClientRect();
            if (r.width <= 0) return;
            const fx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
            mostrar(kind === "bar" ? Math.min(data.length - 1, Math.floor(fx * data.length))
                                   : Math.round(fx * (data.length - 1)));
        });
        wrapper.addEventListener("mouseleave", () => { if (document.activeElement !== wrapper) ocultar(); });

        // TECLADO Y LECTOR DE PANTALLA (2.2.0.0). La tendencia es un control deslizante: las
        // flechas recorren los puntos y se anuncian (aria-valuetext), Intro o Espacio filtran
        // por el punto. stopPropagation para que las flechas no salten a otra tarjeta.
        let actual = data.length - 1;
        const anunciar = () => {
            wrapper.setAttribute("aria-valuenow", String(actual + 1));
            wrapper.setAttribute("aria-valuetext", textoPunto(actual));
        };
        wrapper.tabIndex = 0;
        wrapper.setAttribute("role", "slider");
        wrapper.setAttribute("aria-label", `${this.t("Aria_Trend", "Trend")} ${metric.name}`);
        wrapper.setAttribute("aria-valuemin", "1");
        wrapper.setAttribute("aria-valuemax", String(data.length));
        anunciar();
        wrapper.style.outline = "none";
        wrapper.addEventListener("focus", () => {
            wrapper.style.boxShadow = `0 0 0 2px ${hc ? "#FFFF00" : "#2B6CB0"}`;
            mostrar(actual);
        });
        wrapper.addEventListener("blur", () => { wrapper.style.boxShadow = "none"; ocultar(); });
        wrapper.addEventListener("keydown", (e: KeyboardEvent) => {
            let i = actual;
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") i = Math.max(0, actual - 1);
            else if (e.key === "ArrowRight" || e.key === "ArrowUp") i = Math.min(data.length - 1, actual + 1);
            else if (e.key === "Home") i = 0;
            else if (e.key === "End") i = data.length - 1;
            else if (e.key === "Enter" || e.key === " ") {
                e.preventDefault(); e.stopPropagation();
                if ((this.host as any).allowInteractions === false) return;
                if (metric.trendIds[actual]) this.selectId(metric.trendIds[actual], e.ctrlKey || e.metaKey);
                return;
            } else { return; }
            e.preventDefault(); e.stopPropagation();
            actual = i; anunciar(); mostrar(i);
        });

        // CLIC EN UN PUNTO (2.2.0.0): filtra el informe por ese periodo. El mismo cálculo de
        // índice que el valor al pasar el ratón, para que se filtre lo que se está viendo.
        if (metric.trendIds.length === data.length) {
            wrapper.style.cursor = "pointer";
            wrapper.addEventListener("click", (e: MouseEvent) => {
                if ((this.host as any).allowInteractions === false) return;
                const r = wrapper.getBoundingClientRect();
                if (r.width <= 0) return;
                e.stopPropagation();
                const fx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
                const i = kind === "bar" ? Math.min(data.length - 1, Math.floor(fx * data.length))
                                         : Math.round(fx * (data.length - 1));
                this.selectId(metric.trendIds[i], e.ctrlKey || e.metaKey);
            });
        }
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

        // Fires on each fresh change and only then: update() also runs on resize,
        // selection and data refresh, and the notice must not reappear for those.
        if (signature === this.lastBlockedNotice) return;
        this.lastBlockedNotice = signature;
        this.licenseIconShown = true;

        // En el idioma del informe (2.2.0.0): el aviso es lo que explica qué se compra.
        const nombres = wanted.map(w => this.t("Pro_" + w.replace(/[^A-Za-z]+/g, "_"), w));
        const list = nombres.length === 1
            ? nombres[0]
            : nombres.slice(0, -1).join(", ") + " " + this.t("Msg_And", "and") + " " + nombres[nombres.length - 1];
        const msg = this.t(nombres.length === 1 ? "Msg_ProOne" : "Msg_ProMany",
            nombres.length === 1
                ? "KPI Card Pro: {0} is part of the Pro plan. Get a licence to enable it."
                : "KPI Card Pro: {0} are part of the Pro plan. Get a licence to enable them.").replace("{0}", list);

        // Power BI shows ONE licence notification at a time and the last call replaces
        // the one before it. Until 1.2.1.0 notifyLicenseRequired ran first and
        // notifyFeatureBlocked second, in the same update(), so on the user's first
        // attempt at a Pro feature the banner wiped out the Upgrade bar — which is the
        // call that carries the purchase path. They were told to buy and left with
        // nothing to click. The order is the whole fix.
        const show = () => {
            try {
                (this.licenseManager as any)?.notifyFeatureBlocked?.(msg.slice(0, 500));
            } catch (_) { /* best-effort */ }
            this.cancelLicenseIcon();
            // The Upgrade bar goes last, or the banner above replaces it. It also
            // covers a trial running out: the user changed nothing, so the banner
            // would never fire, and the cards silently drop to one column with
            // nothing explaining why.
            this.licenseIconTimer = window.setTimeout(() => {
                this.licenseIconTimer = null;
                if (this.isPro || !this.licenseIconShown) return;
                // const enum: TypeScript inlines General to 0. Referencing the
                // enum object at runtime would give undefined.
                try {
                    (this.licenseManager as any)?.notifyLicenseRequired?.(
                        LicenseNotificationType.General
                    );
                } catch (_) { /* best-effort */ }
            }, 10500);
        };

        // clearLicenseNotification may return a promise; showing before it settles
        // would let the clear wipe the banner just raised.
        let cleared: any;
        try { cleared = (this.licenseManager as any)?.clearLicenseNotification?.(); }
        catch (_) { /* best-effort */ }
        if (cleared && typeof cleared.then === "function") { cleared.then(show, show); }
        else { show(); }
    }

    // ─── Formato sobre el lienzo (2.2.0.0) ───────────────────────────────────

    private subSelectable(el: Element, objectName: string, displayName: string, type: powerbi.visuals.SubSelectionStylesType): void {
        if (!this.formatMode) return;
        el.classList.add(HtmlSubSelectableClass);
        el.setAttribute(SubSelectableObjectNameAttribute, objectName);
        el.setAttribute(SubSelectableDisplayNameAttribute, displayName);
        el.setAttribute(SubSelectableTypeAttribute, String(type));
    }

    private getSubSelectionStyles(subs: powerbi.visuals.CustomVisualSubSelection[]): powerbi.visuals.SubSelectionStyles | undefined {
        const name = subs[0]?.customVisualObjects[0]?.objectName;
        const ref = (objectName: string, propertyName: string, label: string) => ({ reference: { objectName, propertyName }, label });
        switch (name) {
            case "mainValue":
                return { type: powerbi.visuals.SubSelectionStylesType.Text,
                    fontFamily: ref("mainValue", "fontFamily", this.t("OO_Font", "Font")),
                    fontSize: ref("mainValue", "fontSize", this.t("OO_Size", "Size")),
                    fontColor: ref("mainValue", "color", this.t("OO_Color", "Color")),
                    bold: ref("mainValue", "bold", this.t("OO_Bold", "Bold")) } as any;
            case "label":
                return { type: powerbi.visuals.SubSelectionStylesType.Text,
                    fontFamily: ref("label", "fontFamily", this.t("OO_Font", "Font")),
                    fontSize: ref("label", "fontSize", this.t("OO_Size", "Size")),
                    fontColor: ref("label", "color", this.t("OO_Color", "Color")),
                    bold: ref("label", "bold", this.t("OO_Bold", "Bold")) } as any;
            case "variance":
                return { type: powerbi.visuals.SubSelectionStylesType.Text, fontSize: ref("variance", "fontSize", this.t("OO_Size", "Size")) } as any;
            case "trend":
                return { type: powerbi.visuals.SubSelectionStylesType.Shape, fill: ref("trend", "color", this.t("OO_Color", "Color")) } as any;
            case "card":
                return { type: powerbi.visuals.SubSelectionStylesType.Shape,
                    fill: ref("card", "background", this.t("OO_Background", "Background")),
                    outline: ref("card", "borderColor", this.t("OO_Border", "Border")) } as any;
        }
        return undefined;
    }

    private getSubSelectionShortcuts(subs: powerbi.visuals.CustomVisualSubSelection[]): powerbi.visuals.VisualSubSelectionShortcuts | undefined {
        const name = subs[0]?.customVisualObjects[0]?.objectName;
        const id = (objectName: string, propertyName: string) => ({ objectName, propertyName });
        const nav = (card: string, label: string) => ({ type: powerbi.visuals.VisualShortcutType.Navigate, destinationInfo: { cardUid: "Visual-" + card + "-card" }, label });
        const reset = (ids: { objectName: string; propertyName: string }[]) => ({ type: powerbi.visuals.VisualShortcutType.Reset, relatedResetFormattingIds: ids });
        switch (name) {
            case "mainValue":
                return [
                    { type: powerbi.visuals.VisualShortcutType.Picker, ...id("mainValue", "displayUnit"), label: this.t("OO_Units", "Display units") },
                    { type: powerbi.visuals.VisualShortcutType.Picker, ...id("style", "template"), label: this.t("Prop_Style_Template", "Template") },
                    { type: powerbi.visuals.VisualShortcutType.Divider },
                    reset([id("mainValue", "fontFamily"), id("mainValue", "fontSize"), id("mainValue", "color"), id("mainValue", "bold")]),
                    nav("mainValue", this.t("OO_More", "More options")),
                ] as any;
            case "label":
                return [
                    { type: powerbi.visuals.VisualShortcutType.Toggle, ...id("label", "show"), label: this.t("OO_ShowLabel", "Show label") },
                    { type: powerbi.visuals.VisualShortcutType.Divider },
                    reset([id("label", "fontFamily"), id("label", "fontSize"), id("label", "color"), id("label", "bold")]),
                    nav("label", this.t("OO_More", "More options")),
                ] as any;
            case "variance":
                return [
                    { type: powerbi.visuals.VisualShortcutType.Toggle, ...id("variance", "showArrow"), label: this.t("OO_Arrow", "Show arrow") },
                    { type: powerbi.visuals.VisualShortcutType.Toggle, ...id("variance", "invertColors"), label: this.t("OO_Invert", "Lower is better") },
                    { type: powerbi.visuals.VisualShortcutType.Divider },
                    nav("variance", this.t("OO_More", "More options")),
                ] as any;
            case "trend":
                return [
                    { type: powerbi.visuals.VisualShortcutType.Picker, ...id("trend", "type"), label: this.t("OO_ChartType", "Chart type") },
                    { type: powerbi.visuals.VisualShortcutType.Toggle, ...id("trend", "showDot"), label: this.t("OO_LastPoint", "Highlight last point") },
                    { type: powerbi.visuals.VisualShortcutType.Divider },
                    reset([id("trend", "color"), id("trend", "type")]),
                    nav("trend", this.t("OO_More", "More options")),
                ] as any;
            case "card":
                return [
                    { type: powerbi.visuals.VisualShortcutType.Picker, ...id("style", "template"), label: this.t("Prop_Style_Template", "Template") },
                    { type: powerbi.visuals.VisualShortcutType.Divider },
                    reset([id("card", "background"), id("card", "borderColor")]),
                    nav("card", this.t("OO_More", "More options")),
                ] as any;
        }
        return undefined;
    }

    // ─── Asistente de configuración (2.2.0.0) ────────────────────────────────

    /**
     * Panel flotante que guía la configuración mientras se edita. No puede tocar los pozos
     * de campos (eso solo lo hace el usuario en Power BI): comprueba lo que ya está, explica
     * qué da cada campo y aplica la plantilla elegida. Al terminar o cerrarlo se guarda
     * style.guide = false; se reabre desde Formato → Plantilla de estilo.
     * persistProperties sale de un clic del usuario, nunca del callback de selección.
     */
    private buildGuide(hc: boolean, muestra: string): HTMLElement {
        const azul = hc ? "#FFFF00" : "#2B6CB0";
        const fg = hc ? "#FFFFFF" : "#252423";
        const muted = hc ? "#FFFFFF" : "#605E5C";
        const g = document.createElement("div");
        g.className = "kpi-guide";
        g.setAttribute("role", "dialog");
        g.setAttribute("aria-label", this.t("Guide_Title", "Setup guide"));
        g.style.cssText = "position:absolute;left:8px;right:8px;bottom:8px;max-height:calc(100% - 16px);overflow:auto;"
            + `background:${hc ? "#000000" : "#FFFFFF"};border:1px solid ${azul};border-radius:8px;`
            + "box-shadow:0 4px 16px rgba(0,0,0,0.18);padding:10px 12px;box-sizing:border-box;z-index:20;"
            + `font:12px/1.4 'Segoe UI',sans-serif;color:${fg};text-align:left;cursor:default;`;
        // Los clics dentro del asistente no seleccionan tarjetas ni limpian la selección.
        g.addEventListener("click", e => e.stopPropagation());
        g.addEventListener("keydown", e => e.stopPropagation());

        const terminar = () => {
            this.guideStep = 2;
            this.host.persistProperties({ merge: [{ objectName: "style", selector: null as any, properties: { guide: false } }] });
        };
        const boton = (texto: string, principal: boolean, accion: () => void): HTMLButtonElement => {
            const b = document.createElement("button");
            b.type = "button";
            b.textContent = texto;
            b.style.cssText = "font:600 12px 'Segoe UI',sans-serif;border-radius:4px;padding:3px 12px;cursor:pointer;"
                + (principal ? `background:${azul};color:${hc ? "#000000" : "#FFFFFF"};border:1px solid ${azul};`
                             : `background:transparent;color:${azul};border:1px solid ${azul};`);
            b.addEventListener("click", accion);
            return b;
        };

        const cab = document.createElement("div");
        cab.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:4px;";
        const paso = document.createElement("div");
        paso.textContent = this.t("Guide_Step", "Setup · step {0} of 3").replace("{0}", String(this.guideStep));
        paso.style.cssText = `font-weight:700;color:${azul};flex:1;`;
        const cerrar = document.createElement("button");
        cerrar.type = "button";
        cerrar.textContent = "✕";
        cerrar.title = this.t("Guide_Close", "Close the guide");
        cerrar.setAttribute("aria-label", cerrar.title);
        cerrar.style.cssText = `border:none;background:transparent;color:${muted};cursor:pointer;font-size:13px;`;
        cerrar.addEventListener("click", terminar);
        cab.appendChild(paso); cab.appendChild(cerrar);
        g.appendChild(cab);

        const titulo = document.createElement("div");
        titulo.style.cssText = "font-weight:600;font-size:13px;margin-bottom:6px;";
        g.appendChild(titulo);
        const pie = document.createElement("div");
        pie.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:8px;";

        if (this.guideStep !== 3) {
            titulo.textContent = this.t("Guide_Compare", "Add a comparison");
            const fuentes = (this.lastDataView?.matrix?.columns?.levels?.[0]?.sources ?? []) as any[];
            const tiene = (rol: string) => fuentes.some(f => f?.roles?.[rol]);
            const filas = this.rowRoles(this.lastDataView?.matrix?.rows);
            const items: [boolean, string, string][] = [
                [tiene("priorPeriod"), this.t("Guide_Prior", "Prior period"), this.t("Guide_PriorWhy", "variance against the previous period")],
                [tiene("target"), this.t("Guide_Target", "Target"), this.t("Guide_TargetWhy", "% achieved and colour rules (Pro)")],
                [filas.trend >= 0, this.t("Guide_Trend", "Trend (a date field)"), this.t("Guide_TrendWhy", "trend line, and latest period vs previous without DAX (Pro)")],
                [filas.sm >= 0, this.t("Guide_SM", "Small multiples (a category)"), this.t("Guide_SMWhy", "one card per country, product or team (Pro)")]
            ];
            const lista = document.createElement("div");
            lista.setAttribute("role", "list");
            for (const [hecho, nombre, porque] of items) {
                const f = document.createElement("div");
                f.setAttribute("role", "listitem");
                f.style.cssText = "display:flex;gap:6px;align-items:baseline;margin:2px 0;";
                const marca = document.createElement("span");
                marca.textContent = hecho ? "✓" : "○";
                marca.setAttribute("aria-label", hecho ? this.t("Guide_Done", "added") : this.t("Guide_Todo", "not added"));
                marca.style.cssText = `font-weight:700;color:${hecho ? (hc ? "#00FF00" : "#107C10") : muted};width:12px;flex-shrink:0;`;
                const txt = document.createElement("span");
                const b = document.createElement("b");
                b.textContent = nombre;
                txt.appendChild(b);
                txt.appendChild(document.createTextNode(" — " + porque));
                txt.style.color = hecho ? muted : fg;
                f.appendChild(marca); f.appendChild(txt);
                lista.appendChild(f);
            }
            g.appendChild(lista);
            const nota = document.createElement("div");
            nota.textContent = this.t("Guide_Wells", "Drag the fields into the field wells; this list updates by itself. All optional.");
            nota.style.cssText = `color:${muted};font-size:11px;margin-top:4px;`;
            g.appendChild(nota);
            pie.appendChild(boton(this.t("Guide_Next", "Next"), true, () => { this.guideStep = 3; this.repaint(); }));
        } else {
            titulo.textContent = this.t("Guide_Style", "Pick a style");
            const actual = String((this.formattingSettings.style.template.value as any)?.value ?? "classic");
            const rejilla = document.createElement("div");
            rejilla.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px;";
            for (const nombre of Object.keys(TEMPLATES)) {
                const val = (card: string, prop: string, def: string) =>
                    String((TEMPLATES[nombre].find(([c, p]) => c === card && p === prop) || [])[2] ?? def);
                const chip = document.createElement("button");
                chip.type = "button";
                chip.setAttribute("aria-pressed", String(nombre === actual));
                chip.style.cssText = `border:${nombre === actual ? 2 : 1}px solid ${nombre === actual ? azul : "#C8C6C4"};`
                    + `border-radius:6px;padding:6px;cursor:pointer;text-align:left;background:${val("card", "background", "#FFFFFF")};`;
                const num = document.createElement("div");
                num.textContent = muestra;   // el número del propio informe, no uno de ejemplo
                num.style.cssText = `font:${val("mainValue", "bold", "true") === "false" ? 400 : 700} 15px 'Segoe UI',sans-serif;`
                    + `color:${val("mainValue", "color", "#252423")};`;
                const etq = document.createElement("div");
                etq.textContent = nombre.charAt(0).toUpperCase() + nombre.slice(1);
                etq.style.cssText = `font:11px 'Segoe UI',sans-serif;color:${val("label", "color", "#6B6B6B")};`;
                chip.appendChild(num); chip.appendChild(etq);
                chip.addEventListener("click", () => {
                    this.host.persistProperties({ merge: [{ objectName: "style", selector: null as any, properties: { template: nombre } }] });
                });
                rejilla.appendChild(chip);
            }
            g.appendChild(rejilla);
            pie.appendChild(boton(this.t("Guide_Back", "Back"), false, () => { this.guideStep = 2; this.repaint(); }));
            pie.appendChild(boton(this.t("Guide_Finish", "Finish"), true, terminar));
        }
        g.appendChild(pie);
        return g;
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

        const paso = document.createElement("div");
        paso.textContent = this.t("Guide_Step", "Setup · step {0} of 3").replace("{0}", "1");
        paso.style.cssText = `font-size: 11px; font-weight: 700; letter-spacing: .3px; color: ${isHC ? fg : "#2B6CB0"};`;
        landing.appendChild(paso);

        const hint = document.createElement("div");
        hint.textContent = this.t("Msg_Landing", "Add a measure to the Value field well to get started.");
        hint.style.cssText = `font-size: 12px; color: ${muted}; max-width: 200px; line-height: 1.5;`;
        landing.appendChild(hint);

        const subHint = document.createElement("div");
        subHint.textContent = this.t("Msg_LandingHint", "Prior Period for variance · Target for goal tracking · Small Multiples for multi-card layout (Pro)");
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
    /** Cadena localizada, con el ingles como respaldo si falta la clave. */
    /**
     * Texto en el idioma de Power BI. Primero la tabla del bundle (src/strings.ts): Power BI Desktop solo
     * resuelve con getDisplayName las claves declaradas en capabilities.json, y los textos del propio
     * visual —asistente, estado, avisos— no lo están; en 2.2 el panel salía en español y el asistente en
     * inglés. Después el gestor de Power BI (claves del panel) y, si nada responde, el inglés.
     */
    private t(key: string, fallback: string): string {
        const propio = this.stringsFor()?.[key];
        if (propio) return propio;
        try {
            const v = this.localization?.getDisplayName(key);
            return v && v !== key ? v : fallback;
        } catch (_) {
            return fallback;
        }
    }

    private stringsFor(): Record<string, string> | undefined {
        const loc = String((this.host as any).locale || "");
        if (!loc || /^en/i.test(loc)) return undefined;
        if (STRINGS[loc]) return STRINGS[loc];
        // es-MX, fr-CA, pt...: el idioma sin región; pt sin región es pt-BR, el primero por orden.
        const lang = loc.split("-")[0].toLowerCase();
        const k = Object.keys(STRINGS).sort().find(x => x.toLowerCase().startsWith(lang + "-"));
        return k ? STRINGS[k] : undefined;
    }

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
    /** Los puntos de la serie en orden: por fecha o número si todos lo son, si no tal cual llegan. */
    private sortedKids(node: powerbi.DataViewMatrixNode | undefined): powerbi.DataViewMatrixNode[] {
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
        return kids;
    }

    private seriesFrom(node: powerbi.DataViewMatrixNode | undefined, measureIdx: number): number[] {
        return this.sortedKids(node).map(k => this.getNodeValue(k.values ?? {}, measureIdx) ?? 0);
    }

    /**
     * Una selección por punto, en el mismo orden que seriesFrom(). En small multiples se
     * encadena la tarjeta: un clic en marzo de España filtra España y marzo, no marzo de todos.
     */
    private seriesIdsFrom(node: powerbi.DataViewMatrixNode | undefined, levels: powerbi.DataViewHierarchyLevel[],
                          card?: powerbi.DataViewMatrixNode): powerbi.extensibility.ISelectionId[] {
        return this.sortedKids(node).map(k => {
            let b = this.host.createSelectionIdBuilder();
            if (card) { b = b.withMatrixNode(card, levels); }
            return b.withMatrixNode(k, levels).createSelectionId();
        });
    }

    /**
     * Los puntos de la serie con su etiqueta, en el mismo orden que seriesFrom().
     *
     * La etiqueta es el valor del nodo tal cual lo da Power BI, formateado si es fecha.
     * No se interpreta: el visual NO sabe si un punto es un mes, una semana o un año,
     * solo que es el anterior. Por eso se imprime — si alguien puso la jerarquia de
     * fechas y la serie son años, la etiqueta lo dice y se ve al instante.
     */
    private seriesLabelsFrom(node: powerbi.DataViewMatrixNode | undefined): string[] {
        return this.sortedKids(node).map(k => {
            const v = k.value as any;
            if (v instanceof Date) {
                try {
                    return v.toLocaleDateString(this.host.locale || undefined,
                                                { year: "numeric", month: "short" });
                } catch (_) { return String(v); }
            }
            return v === null || v === undefined ? "" : String(v);
        });
    }

    /**
     * Sustituye valor y prior por el ultimo punto de la serie y uno anterior.
     *
     * Solo cuando hay serie y al menos dos puntos: sin punto de comparacion no se
     * inventa un 0%, se deja el prior a null y la varianza no se dibuja, que es lo que
     * ya hace buildVariancePill.
     *
     * Un Prior Period explicito NO se toca: quien ya tiene sus medidas DAX no debe ver
     * cambiar su informe por una opcion nueva.
     */
    private aplicarUltimoPunto(m: MetricData, labels: string[], priorExplicito: boolean,
                                  secPriorExplicito: boolean): void {
        const serie = m.trendData;
        if (serie.length === 0) return;

        const iUlt = serie.length - 1;
        m.value = serie[iUlt];
        m.periodLabel = labels[iUlt] ?? "";

        const salto = Math.max(1, Math.round(this.formattingSettings.period.compareOffset.value ?? 1));
        const iCmp = iUlt - salto;
        if (iCmp >= 0) {
            if (!priorExplicito) { m.priorPeriod = serie[iCmp]; }
            m.comparePeriodLabel = labels[iCmp] ?? "";
        } else if (!priorExplicito) {
            m.priorPeriod = null;
        }
        // El objetivo sigue siendo el del mismo punto, no el acumulado.
        if (m.targetData.length > iUlt) { m.target = m.targetData[iUlt]; }

        // Y los secundarios, el mismo punto: una tarjeta que enseña diciembre arriba y
        // veinticuatro meses a la derecha no compara nada, compara dos cosas distintas.
        for (const k of m.secondary) {
            if (k.series.length === 0) continue;
            const j = k.series.length - 1;
            k.value = k.series[j];
            const jc = j - salto;
            // El pozo 'Secondary KPIs prior' es el que manda aqui, no el principal:
            // alguien puede tener medidas propias para el valor grande y no para estos.
            if (secPriorExplicito) continue;
            k.prior = jc >= 0 ? k.series[jc] : null;
        }
    }

    /**
     * Ventana movil: el valor es la suma de los ultimos N puntos y el prior la de los N
     * anteriores. Con serie mensual y N=12, el año movil contra el previo — la
     * comparacion que de verdad se lleva a un comite — conservando los 24 puntos de la
     * linea de tendencia.
     *
     * Con menos de N puntos se suma lo que hay y no se compara: media ventana contra
     * una entera daria una caida inventada.
     */
    private aplicarVentana(m: MetricData, labels: string[], priorExplicito: boolean,
                              secPriorExplicito: boolean): void {
        const serie = m.trendData;
        const n = serie.length;
        if (n === 0) return;

        const N = Math.max(2, Math.round(this.formattingSettings.period.windowSize.value ?? 12));
        const suma = (desde: number, hasta: number) =>
            serie.slice(Math.max(0, desde), hasta).reduce((a, b) => a + b, 0);

        const iniAct = Math.max(0, n - N);
        m.value = suma(iniAct, n);
        m.periodLabel = labels.length
            ? `${labels[iniAct] ?? ""} – ${labels[n - 1] ?? ""}`
            : "";

        // Solo se compara si la ventana anterior esta COMPLETA.
        const iniPrev = n - 2 * N;
        if (iniPrev >= 0) {
            if (!priorExplicito) { m.priorPeriod = suma(iniPrev, n - N); }
            m.comparePeriodLabel = labels.length
                ? `${labels[iniPrev] ?? ""} – ${labels[n - N - 1] ?? ""}`
                : "";
        } else if (!priorExplicito) {
            m.priorPeriod = null;
        }

        if (m.targetData.length) {
            m.target = m.targetData.slice(Math.max(0, m.targetData.length - N))
                                   .reduce((a, b) => a + b, 0);
        }

        // Misma ventana para los secundarios, por la misma razon.
        for (const k of m.secondary) {
            const ks = k.series;
            if (ks.length === 0) continue;
            const sumaK = (d: number, h: number) =>
                ks.slice(Math.max(0, d), h).reduce((a, b) => a + b, 0);
            k.value = sumaK(Math.max(0, ks.length - N), ks.length);
            const iniK = ks.length - 2 * N;
            if (!secPriorExplicito) { k.prior = iniK >= 0 ? sumaK(iniK, ks.length - N) : null; }
        }
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
        // Emparejados por posicion, no por nombre: el primer prior acompaña al primer
        // KPI secundario. Es la unica forma de relacionarlos sin inventar una
        // convencion de nombres que el usuario tendria que acertar.
        const secIdxs: number[] = [];
        const secPriorIdxs: number[] = [];

        if (cols?.levels?.[0]?.sources) {
            cols.levels[0].sources.forEach((src, i) => {
                const roles = src.roles ?? {};
                if (roles["measure"] && measureIdx === -1) measureIdx = i;
                else if (roles["priorPeriod"] && priorIdx === -1) priorIdx = i;
                else if (roles["target"] && targetIdx === -1) targetIdx = i;
                else if (roles["image"] && imageIdx === -1) imageIdx = i;
                else if (roles["tooltips"]) tooltipIdxs.push(i);
                else if (roles["secondaryKpis"]) secIdxs.push(i);
                else if (roles["secondaryPrior"]) secPriorIdxs.push(i);
            });
        }

        if (measureIdx === -1) return [];
        this.dbgMeasureIdx = measureIdx;

        // FORMATO NATIVO: Power BI entrega el valor crudo y su formato aparte. Sin esto, un
        // porcentaje 0,3 se pintaba "0.3" y el sufijo % daba "0.3%", un dato falso.
        const fmtOf = (i: number): string | undefined =>
            i >= 0 ? ((cols?.levels?.[0]?.sources?.[i] as any)?.format as string | undefined) || undefined : undefined;
        // FORMATO DINAMICO (2.1.0.0): con general.formatString declarado en capabilities,
        // una medida con formato dinamico (DAX que decide el formato por fila) trae el suyo
        // valor a valor. Se usa ese si llega; si no, el de la columna.
        const fmtFor = (node: powerbi.DataViewMatrixNode | undefined, i: number): string | undefined =>
            this.dynFormat(node, i) ?? fmtOf(i);
        const formatsFor = (node: powerbi.DataViewMatrixNode | undefined) => ({
            value: fmtFor(node, measureIdx),
            prior: priorIdx >= 0 ? fmtFor(node, priorIdx) : fmtFor(node, measureIdx),
            target: targetIdx >= 0 ? fmtFor(node, targetIdx) : fmtFor(node, measureIdx)
        });

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

            const unica: MetricData[] = [{
                name: measureName,
                value,
                highlightValue,
                priorPeriod: prior,
                target,
                tooltipFields: [],
                formats: formatsFor(valueNode),
                fxColor: this.fxColorOf(valueNode, measureIdx, "mainValue", "color"),
                fxBg: this.fxColorOf(valueNode, measureIdx, "card", "background"),
                periodLabel: "",
                comparePeriodLabel: "",
                secondary: secIdxs.map((si, k) => ({
                    series: trendBound ? this.seriesFrom(rows?.root, si) : [],
                    name: cols?.levels?.[0]?.sources?.[si]?.displayName ?? "",
                    format: fmtFor(valueNode, si),
                    value: this.nodeOrChildrenValue(valueNode, si) ?? this.getNodeValue(rootValues, si),
                    prior: secPriorIdxs[k] !== undefined
                        ? (this.nodeOrChildrenValue(valueNode, secPriorIdxs[k])
                           ?? this.getNodeValue(rootValues, secPriorIdxs[k]))
                        : null
                })),
                selectionId: null,
                isHighlighted: true,  // single card always visible
                // Only Trend bound: the root's children are the points of the series.
                trendData: trendBound ? this.seriesFrom(rows?.root, measureIdx) : [],
                trendLabels: trendBound ? this.seriesLabelsFrom(rows?.root) : [],
                targetData: trendBound && targetIdx >= 0 ? this.seriesFrom(rows?.root, targetIdx) : [],
                trendIds: trendBound && rows ? this.seriesIdsFrom(rows.root, rows.levels) : [],
                image: this.nodeOrChildrenText(valueNode, imageIdx)
            }];
            const modo = this.formattingSettings.period.valueMode.value;
            if (trendBound && (modo === "latest" || modo === "window")) {
                const etiquetas = this.seriesLabelsFrom(rows?.root);
                if (modo === "latest") { this.aplicarUltimoPunto(unica[0], etiquetas, priorIdx >= 0, secPriorIdxs.length > 0); }
                else                   { this.aplicarVentana(unica[0], etiquetas, priorIdx >= 0, secPriorIdxs.length > 0); }
            }
            return unica;
        }

        // Small multiples — one card per row
        const metrics: MetricData[] = [];
        const limit = this.previewOf("small multiples") ? 50 : 1;

        // Subtotal nodes are not cards: without this the grid would show an extra
        // "Total" card, and it would eat one of the 50 Pro slots.
        const cardNodes = this.realChildren(rows.root);
        for (let i = 0; i < Math.min(cardNodes.length, limit); i++) {
            const child = cardNodes[i];
            const categoryName = child.value != null ? String(child.value) : `${this.t("Label_Item", "Item")} ${i + 1}`;
            const rowValues = child.values ?? {};

            const value = this.nodeOrChildrenValue(child, measureIdx);
            const highlightValue = hasHighlights ? this.nodeOrChildrenHighlight(child, measureIdx) : null;
            const prior = priorIdx >= 0 ? this.nodeOrChildrenValue(child, priorIdx) : null;
            const target = targetIdx >= 0 ? this.nodeOrChildrenValue(child, targetIdx) : null;

            // Card is highlighted if it has a highlight value or there are no highlights at all
            const isHighlighted = !hasHighlights || highlightValue !== null;

            const tooltipFields = tooltipIdxs.map(ti => ({
                displayName: cols?.levels?.[0]?.sources?.[ti]?.displayName ?? "",
                value: this.formatValue(this.nodeOrChildrenValue(child, ti), fmtFor(child, ti))
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
                formats: formatsFor(child),
                fxColor: this.fxColorOf(child, measureIdx, "mainValue", "color"),
                fxBg: this.fxColorOf(child, measureIdx, "card", "background"),
                periodLabel: "",
                comparePeriodLabel: "",
                secondary: secIdxs.map((si, k) => ({
                    series: trendBound ? this.seriesFrom(child, si) : [],
                    name: cols?.levels?.[0]?.sources?.[si]?.displayName ?? "",
                    format: fmtFor(child, si),
                    value: this.nodeOrChildrenValue(child, si),
                    prior: secPriorIdxs[k] !== undefined
                        ? this.nodeOrChildrenValue(child, secPriorIdxs[k])
                        : null
                })),
                selectionId,
                isHighlighted,
                // With both roles bound, each card's children are its own series.
                trendData: trendBound ? this.seriesFrom(child, measureIdx) : [],
                trendLabels: trendBound ? this.seriesLabelsFrom(child) : [],
                targetData: trendBound && targetIdx >= 0 ? this.seriesFrom(child, targetIdx) : [],
                trendIds: trendBound ? this.seriesIdsFrom(child, rows.levels, child) : [],
                image: this.nodeOrChildrenText(child, imageIdx)
            });
            const modo = this.formattingSettings.period.valueMode.value;
            if (trendBound && (modo === "latest" || modo === "window")) {
                const m = metrics[metrics.length - 1];
                const etiquetas = this.seriesLabelsFrom(child);
                if (modo === "latest") { this.aplicarUltimoPunto(m, etiquetas, priorIdx >= 0, secPriorIdxs.length > 0); }
                else                   { this.aplicarVentana(m, etiquetas, priorIdx >= 0, secPriorIdxs.length > 0); }
            }
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

    /**
     * Formato dinamico de un valor de la matriz (objects.general.formatString), del nodo o,
     * si el nodo no lo trae, de su primer hijo con dato. La documentacion de Microsoft lo
     * describe en el mapping categorical; en matrix se lee igual, de forma defensiva.
     */
    /**
     * Resultado de una regla fx del color del valor. En una matriz Power BI puede dejarlo en la celda del valor,
     * en el propio nodo o, con una sola tarjeta, en la raíz; se miran los tres (y los hijos, si la tarjeta agrupa
     * una tendencia). El color fijo NO llega aquí: está en metadata.objects y lo lee formattingSettings.
     */
    /**
     * Resultado de una regla fx (color del valor o fondo) para la tarjeta. Power BI la evalúa en cada nodo de la matriz:
     * la tarjeta, su subtotal y, con tendencia, cada periodo. Lo que vale es el resultado sobre lo que ENSEÑA la tarjeta:
     *  1. su propio nodo o su subtotal (el total de la tarjeta);
     *  2. con tendencia en modo "último punto", el último periodo;
     *  3. nada más: en modo total, un color de un mes sería falso (20-10: con meses de 300K, una regla "< 2,5M" pintaba
     *     de azul tarjetas de 3,6M).
     * El color fijo NO llega aquí: está en metadata.objects y lo lee formattingSettings.
     */
    private fxColorOf(node: powerbi.DataViewMatrixNode | undefined, idx: number, obj: string, prop: string): string | null {
        const leer = (o: any): string | null => o?.[obj]?.[prop]?.solid?.color ?? null;
        const de = (n: any): string | null => n ? (leer(n?.values?.[idx]?.objects) ?? leer(n?.objects)) : null;
        const propio = de(node) ?? de((node?.children ?? []).find((k: any) => k.isSubtotal));
        if (propio) { return propio; }
        const hijos = this.realChildren(node);
        if (hijos.length > 0) {
            return this.formattingSettings?.period?.valueMode?.value === "latest" ? de(hijos[hijos.length - 1]) : null;
        }
        // Tarjeta sin agrupación de filas: el total puede llegar en la raíz o en la columna de la medida.
        const root = this.lastDataView?.matrix?.rows?.root as any;
        const m: any = this.lastDataView?.matrix;
        return de(root) ?? leer(m?.columns?.root?.children?.[idx]?.objects) ?? leer(m?.valueSources?.[idx]?.objects);
    }

    /** Diagnóstico (--debug): dónde ha dejado Power BI un objeto mainValue dentro de la matriz. */
    private fxPaths(): string {
        const out: string[] = [];
        const walk = (o: any, p: string, d: number) => {
            if (!o || typeof o !== "object" || d > 7 || out.length > 8) { return; }
            const ob = o.objects?.mainValue ?? o.objects?.card;
            if (ob) { out.push(p + (o.isSubtotal ? "[SUB]" : "") + "=" + JSON.stringify(ob).replace(/[{}"]|solid|color/g, "").slice(0, 16)); }
            for (const k of Object.keys(o)) {
                if (k === "objects" || k === "identity" || k === "source" || k === "sources") { continue; }
                walk(o[k], p + "." + k, d + 1);
            }
        };
        walk(this.lastDataView?.matrix, "matrix", 0);
        const meta = (this.lastDataView?.metadata?.objects as any)?.mainValue;
        return "fx meta=" + (meta ? JSON.stringify(meta).slice(0, 50) : "-") + " | " + (out.join(" ; ") || "ninguno");
    }

    private dynFormat(node: powerbi.DataViewMatrixNode | undefined, idx: number): string | undefined {
        const read = (vals: any): string | undefined => {
            const f = vals?.[idx]?.objects?.general?.formatString;
            return typeof f === "string" && f ? f : undefined;
        };
        const own = read(node?.values);
        if (own) return own;
        for (const k of this.realChildren(node)) {
            const f = read(k.values);
            if (f) return f;
        }
        return undefined;
    }

    /**
     * ESTADO (Pro, 2.1.0.0): el valor como % de la referencia (objetivo o periodo
     * anterior). Umbrales T1 <= T2. Mayor es mejor: >= T2 en linea, >= T1 aviso, si no
     * desviado. Menor es mejor: <= T1 en linea, <= T2 aviso, si no desviado.
     */
    /**
     * Fondo y borde de la tarjeta según las reglas de color, cuando se aplican a la tarjeta
     * entera. El fondo es un tinte del 12 % sobre el fondo elegido, para que el texto siga
     * leyéndose; en alto contraste no se toca nada (el estado se dice con texto).
     */
    private ruleFrame(metric: MetricData, hc: boolean, bg: string, border: string, bw: number):
            { bg: string; border: string; bw: number } {
        const out = { bg, border, bw };
        if (hc) return out;
        const st = this.statusOf(metric, metric.highlightValue !== null ? metric.highlightValue : metric.value);
        if (!st) return out;
        const a = String((this.formattingSettings.status.applyTo.value as any)?.value ?? "both");
        if (a === "background") {
            const tinte = /^#[0-9a-f]{6}$/i.test(st.color) ? st.color + "1F" : st.color;
            out.bg = `linear-gradient(${tinte}, ${tinte}), ${bg}`;
        } else if (a === "border") {
            out.border = st.color;
            out.bw = Math.max(2, bw);
        }
        return out;
    }

    private statusOf(metric: MetricData, value: number | null): { color: string; text: string; word: string } | null {
        const s = this.formattingSettings.status;
        if (!s.show.value || !this.previewOf("status") || value === null) return null;
        const basis = String((s.basis.value as any)?.value ?? s.basis.value ?? "target");
        // "value": umbrales en las unidades del propio valor (2.2.0.0), sin referencia.
        let pct = value;
        if (basis !== "value") {
            const ref = basis === "prior" ? metric.priorPeriod : metric.target;
            if (ref === null || ref === 0) return null;
            pct = (value / Math.abs(ref)) * 100;
        }
        let t1 = s.lowThreshold.value ?? 90, t2 = s.highThreshold.value ?? 100;
        if (t1 > t2) { const x = t1; t1 = t2; t2 = x; }
        let level: "good" | "warn" | "bad";
        if (!s.lowerIsBetter.value) level = pct >= t2 ? "good" : pct >= t1 ? "warn" : "bad";
        else                        level = pct <= t1 ? "good" : pct <= t2 ? "warn" : "bad";
        const color = level === "good" ? (s.goodColor.value?.value ?? "#107C10")
                    : level === "warn" ? (s.warnColor.value?.value ?? "#C19C00")
                    : (s.badColor.value?.value ?? "#D13438");
        const word = level === "good" ? this.t("Status_Good", "On track")
                   : level === "warn" ? this.t("Status_Warn", "Warning")
                   : this.t("Status_Bad", "Off track");
        if (basis === "value") { return { color, text: "", word }; }
        const pctTxt = this.pctFormatter().format(pct / 100);
        const text = basis === "prior"
            ? this.t("Status_OfPrior", "{0} of prior").replace("{0}", pctTxt)
            : this.t("Status_OfTarget", "{0} of target").replace("{0}", pctTxt);
        return { color, text, word };
    }

    private getNodeHighlight(values: powerbi.DataViewMatrixNodeValue, idx: number): number | null {
        const v = values[idx];
        if (v == null || (v as any).highlight == null) return null;
        const h = (v as any).highlight;
        return typeof h === "number" ? h : null;
    }

    // ─── Render ─────────────────────────────────────────────────────────────

    /**
     * Se recalcula en CADA render, no solo en update().
     *
     * Al volver de otra pagina la licencia aun no se ha resuelto (licenseResolved es
     * null), asi que la previa sale false. La resolucion termina despues y llama a
     * render() por su cuenta, sin pasar por update() — y calculandolo solo alli, la
     * previa se quedaba en false para siempre: una tarjeta, sin tendencia y sin KPI
     * secundarios, hasta tocar algo. Diagnosticado con el overlay: resolved=false
     * junto a preview=false, que es imposible salvo por este desfase.
     */
    private computePreview(): boolean {
        return !this.isPro && this.editing && licenseResolved !== null
            && licenseEnvSupported && licenseInfoAvailable;
    }

    private render(metrics: MetricData[]): void {
        this.proPreview = this.computePreview();   // solo para el overlay de diagnostico
        // INVARIANT: once real data has been painted, never repaint an empty state.
        // Power BI emits partial updates (e.g. only the Prior Period role, with no
        // Value role) and re-entrant repaints come from several places: the layout
        // retry, resize updates with no sources, and the license callback. Enforcing
        // this here means every caller is covered, not just the ones we remembered.
        if (metrics.length === 0 && this.hasRenderedData) return;

        const s = this.formattingSettings;
        const palette = this.host.colorPalette;
        this.selKeys = this.selectedKeys();

        // High contrast: auto-detect from host OR manual setting
        const hc = palette.isHighContrast || s.accessibility.highContrast.value;

        // Theme-aware defaults from color palette
        const themeBg    = palette.background?.value ?? "#FFFFFF";
        const themeFg    = palette.foreground?.value ?? "#252423";
        const themeMuted = (palette as any).foregroundNeutralSecondary?.value ?? "#6B6B6B";

        const root = document.createElement("div");
        root.className = "kpi-root" + (hc ? " high-contrast" : "");
        this.subSelectable(root, "card", this.t("OO_Card", "Card"), powerbi.visuals.SubSelectionStylesType.Shape);

        const fxOn       = this.previewOf("conditional formatting (fx)");
        const cardBg     = hc ? "#000000" : ((fxOn && metrics.length === 1 ? metrics[0]?.fxBg : null) ?? s.card.background.value?.value ?? themeBg);
        const cardBorder = hc ? "#FFFFFF"  : (s.card.borderColor.value?.value ?? "#E0E0E0");
        const bw  = this.previewOf("card styling") ? (s.card.borderWidth.value ?? 1) : 1;
        const br  = this.previewOf("card styling") ? (s.card.borderRadius.value ?? 8) : 8;
        const pad = this.previewOf("card styling") ? (s.card.padding.value ?? 16) : 16;
        const shadow = this.previewOf("card styling") ? s.card.shadow.value : true;

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
            const marco = this.ruleFrame(metrics[0], hc, cardBg, cardBorder, bw);
            root.style.background = marco.bg;
            root.style.borderColor = marco.border;
            root.style.borderWidth = `${marco.bw}px`;
            const cell = this.buildMetricCell(metrics[0], hc, true, themeFg, themeMuted, 0);
            // Tarjeta unica: el ancho minimo solo cuenta si hay sparkline, que es lo
            // que de verdad necesita anchura. Sin ella el valor ocupa lo que ocupa y
            // el resto de la tarjeta queda libre; retirar los secundarios por un
            // numero fijo dejaba "Ventas and PdVs" en el titulo y solo Ventas dentro.
            // Lo que protege el valor principal sin trend es fitSecondaryColumns().
            const ancho = this.hasSparkline(metrics[0]) ? this.viewport.width : 0;
            this.mountSecondary(root, cell, metrics[0], hc, ancho, 16, false);
        } else {
            this.renderGrid(root, metrics, hc, themeFg, themeMuted);
        }

        // The "Free" badge used to be drawn here. Removed: Microsoft's guidance is
        // that a visual "shouldn't display its own licensing UX", and this one put
        // its whole explanation in a title attribute on an element with
        // pointer-events: none, so it could never be hovered and never showed.
        // Power BI's own notifications replace it, and they carry a purchase path.
        this.notifyProFeatureBlocked();

        // Asistente de configuración (2.2.0.0): solo editando y con datos.
        if (metrics.length > 0 && this.editing && !this.formatMode && s.style.guide.value
            && (this.host as any).allowInteractions !== false) {
            const m0 = metrics[0];
            root.appendChild(this.buildGuide(hc, this.formatMetricValue(m0.highlightValue !== null ? m0.highlightValue : m0.value, m0.formats.value)));
        }

        // ── Atomic swap: clear ONLY after building succeeded ──────────────
        // If anything above threw, the container keeps its previous content.
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        this.container.appendChild(root);
        this.fitSecondaryColumns(root);
        this.fitToSize(root);
        // Segunda pasada con el tamaño final: la barra de desplazamiento de la rejilla
        // aparece despues del primer ajuste y estrecha las tarjetas, y un numero que cabia
        // pasaba a salir recortado ("52.6…") sin que nada lo moviera a la lista.
        requestAnimationFrame(() => { if (root.isConnected) { this.fitSecondaryColumns(root); this.fitToSize(root); } });
        this.dbgOverlay("render");
        // El swap de arriba vacia el contenedor, asi que la marca se reinserta aqui:
        // encenderla sobre un nodo desconectado no pinta nada.
        this.updateWatermark();

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
        const gap  = this.previewOf("small multiples layout") ? (s.gap.value ?? 12) : 12;
        // Las columnas elegidas son un máximo: si no caben con un ancho mínimo legible por
        // tarjeta, se usan menos (2.2.0.0). Con 3 columnas en 300 px cada tarjeta medía 70.
        const pedidas = this.previewOf("small multiples layout") ? (s.columns.value ?? 3) : 1;
        const ANCHO_MIN = 150;
        const caben = this.viewport.width > 0
            ? Math.max(1, Math.floor((this.viewport.width + gap) / (ANCHO_MIN + gap)))
            : pedidas;
        const cols = Math.max(1, Math.min(pedidas, caben));

        const grid = document.createElement("div");
        grid.className = "kpi-grid";
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${cols}, minmax(0, 1fr));
            gap: ${gap}px;
            flex: 1;
            /* Desplazamiento solo VERTICAL. Con overflow:hidden en cada tarjeta (02-10, primer
               intento) la rejilla perdia el alto minimo de contenido de las tarjetas y las
               aplastaba hasta cortarlas; el recorte horizontal va aqui, en la rejilla. */
            overflow-x: hidden; overflow-y: auto;
        `;

        // Ancho real de una celda: el mismo criterio de ancho minimo que en la tarjeta
        // grande, pero aplicado a lo que de verdad mide cada tarjeta de la rejilla. Asi
        // los secundarios salen en small multiples cuando caben y se retiran cuando no,
        // en lugar de estar prohibidos por decreto.
        const anchoCelda = this.viewport.width > 0
            ? Math.floor((this.viewport.width - gap * (cols - 1)) / cols)
            : 0;

        metrics.forEach((metric, idx) => {
            const s2 = this.formattingSettings;
            const palette = this.host.colorPalette;
            const cardBg     = hc ? "#000000" : ((this.previewOf("conditional formatting (fx)") ? metric.fxBg : null)
                ?? s2.card.background.value?.value ?? (palette.background?.value ?? "#FFFFFF"));
            const cardBorder = hc ? "#FFFFFF"  : (s2.card.borderColor.value?.value ?? "#E0E0E0");
            const cellBr     = this.previewOf("card styling") ? (s2.card.borderRadius.value ?? 8) : 8;

            const marco = this.ruleFrame(metric, hc, cardBg, cardBorder, 1);
            const wrapper = document.createElement("div");
            wrapper.style.cssText = `
                background: ${marco.bg};
                border: ${marco.bw}px solid ${marco.border};
                border-radius: ${cellBr}px;
                padding: 12px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
                transition: opacity 0.15s ease;
                opacity: ${!metric.isHighlighted || (this.selKeys.size > 0 && !this.cardSelected(metric)) ? "0.3" : "1"};
            `;
            wrapper.dataset.selectionIndex = String(idx);

            const cell = this.buildMetricCell(metric, hc, false, themeFg, themeMuted, idx);
            this.mountSecondary(wrapper, cell, metric, hc, anchoCelda, 12, true);
            grid.appendChild(wrapper);
        });

        root.appendChild(grid);
    }

    private renderEmpty(root: HTMLElement, hc: boolean): void {
        const palette = this.host.colorPalette;
        const empty = document.createElement("div");
        empty.className = "kpi-empty";
        empty.title = "KPI Card Pro — " + this.t("Msg_Empty", "Add a measure to the Value field well");
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
        emptySpan.textContent = this.t("Msg_Empty", "Add a measure to the Value field well");
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
        // Botón solo si hay algo que seleccionar; si no, un grupo con su resumen.
        cell.setAttribute("role", metric.selectionId ? "button" : "group");
        cell.setAttribute("aria-label", this.ariaSummary(metric));
        if (metric.selectionId) { cell.setAttribute("aria-pressed", String(this.cardSelected(metric))); }
        cell.setAttribute("tabindex", "0");                   // Keyboard Navigation
        cell.style.cssText = "display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 2px; cursor: default; outline: none;";

        // ── Keyboard: focus ring ───────────────────────────────────────────
        cell.addEventListener("focus", () => {
            cell.style.outline = `2px solid ${hc ? "#FFFF00" : "#2B6CB0"}`;
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
                    this.selectId(metric.selectionId, e.ctrlKey || e.metaKey);
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
                this.selectId(metric.selectionId, e.ctrlKey || e.metaKey);
            }
        });

        // ── Label ──────────────────────────────────────────────────────────
        // In grid mode (small multiples), respect smallMultiples.showTitle setting
        const isGridMode = !large;
        const showLabel = isGridMode
            ? (this.previewOf("small multiples layout") ? s.smallMultiples.showTitle.value : true)
            : s.label.show.value;

        if (showLabel) {
            const labelEl = document.createElement("div");
            labelEl.className = "kpi-label";
            this.subSelectable(labelEl, "label", this.t("OO_Label", "Label"), powerbi.visuals.SubSelectionStylesType.Text);
            labelEl.textContent = metric.name;
            labelEl.title = metric.name;
            labelEl.setAttribute("aria-hidden", "true");
            const labelFontSize = isGridMode && this.previewOf("small multiples layout")
                ? (s.smallMultiples.titleFontSize.value ?? 11)
                : (s.label.fontSize.value ?? 12);
            const labelColor = isGridMode && this.previewOf("small multiples layout")
                ? (hc ? "#FFFFFF" : (s.smallMultiples.titleColor.value?.value ?? themeMuted))
                : (hc ? "#FFFFFF" : (s.label.color.value?.value ?? themeMuted));
            // La fuente sigue la misma regla que el tamano y el color: en rejilla
            // manda Small Multiples, en tarjeta unica manda Label.
            const labelFont = isGridMode && this.previewOf("small multiples layout")
                ? (s.smallMultiples.titleFontFamily.value || "Segoe UI, sans-serif")
                : (s.label.fontFamily.value || "Segoe UI, sans-serif");
            const labelBold = isGridMode && this.previewOf("small multiples layout")
                ? s.smallMultiples.titleBold.value
                : s.label.bold.value;
            labelEl.style.cssText = `
                font-family: ${labelFont};
                font-weight: ${labelBold ? 700 : 400};
                font-size: ${labelFontSize}px;
                color: ${labelColor};
                line-height: 1.3;
                ${isGridMode
                    ? "white-space: normal; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; word-break: break-word;"
                    : "white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"}
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
        const formatted = this.formatMetricValue(displayValue, metric.formats.value);
        valueEl.textContent = formatted;
        valueEl.title = formatted;
        valueEl.setAttribute("aria-label", `${metric.name}: ${formatted}`);
        this.subSelectable(valueEl, "mainValue", this.t("OO_Value", "Main value"), powerbi.visuals.SubSelectionStylesType.Text);
        const fontSize = large
            ? (s.mainValue.fontSize.value ?? 28)
            : Math.max(16, (s.mainValue.fontSize.value ?? 28) * 0.7);
        // Estado: color del valor y/o barra de acento. En alto contraste se deja el
        // color del tema y el estado se dice con texto, que es lo que no depende del color.
        const st = this.statusOf(metric, displayValue);
        const stApply = String((s.status.applyTo.value as any)?.value ?? s.status.applyTo.value ?? "both");
        const valueColor = hc ? "#FFFFFF"
            : (st && (stApply === "both" || stApply === "value") ? st.color
                : ((this.previewOf("conditional formatting (fx)") ? metric.fxColor : null) ?? s.mainValue.color.value?.value ?? themeFg));
        valueEl.style.cssText = `
            font-family: ${s.mainValue.fontFamily.value ?? "Segoe UI, sans-serif"};
            font-size: ${fontSize}px;
            font-weight: ${s.mainValue.bold.value ? "700" : "400"};
            color: ${valueColor};
            line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        `;
        cell.appendChild(valueEl);
        if (st && !hc && (stApply === "both" || stApply === "accent")) {
            cell.style.borderLeft = `4px solid ${st.color}`;
            cell.style.paddingLeft = "8px";
        }
        if (st) {
            valueEl.setAttribute("aria-label", `${metric.name}: ${formatted}. ${st.word}${st.text ? ", " + st.text : ""}`);
            if (s.status.showText.value) {
                const stEl = document.createElement("div");
                stEl.className = "kpi-status";
                stEl.textContent = st.text ? `● ${st.word} · ${st.text}` : `● ${st.word}`;
                stEl.style.cssText = `font-family:${s.label.fontFamily.value || "'Segoe UI', sans-serif"};font-size:${large ? 11 : 10}px; font-weight:600;`
                    + `color:${hc ? "#FFFFFF" : st.color};`
                    + " white-space:nowrap; overflow:hidden; text-overflow:ellipsis;";
                cell.appendChild(stEl);
            }
        }

        // ── Etiqueta del periodo ───────────────────────────────────────────
        // El visual no sabe si un punto es un mes, una semana o un año: solo que es el
        // anterior. Imprimirlo es lo que convierte "compara con 12 atras" en algo
        // verificable de un vistazo — y si alguien puso la jerarquia de fechas y la
        // serie son años, la etiqueta lo delata antes de que el numero se use.
        if (metric.periodLabel && s.period.showPeriodLabel.value) {
            const per = document.createElement("div");
            per.textContent = metric.comparePeriodLabel
                ? `${metric.periodLabel} ${this.t("Label_Vs", "vs")} ${metric.comparePeriodLabel}`
                : metric.periodLabel;
            per.style.cssText = `font-size:${large ? 11 : 10}px;`
                + `color:${hc ? "#FFFFFF" : (s.secondary.color.value?.value ?? "#605E5C")};`
                + " white-space:nowrap; overflow:hidden; text-overflow:ellipsis;";
            cell.appendChild(per);
        }

        // ── Variance ───────────────────────────────────────────────────────
        if (s.variance.show.value && metric.priorPeriod !== null) {
            const pill = this.buildVariancePill(displayValue, metric.priorPeriod, hc, metric.formats.value);
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
                const ppFormatted = this.formatMetricValue(metric.priorPeriod, metric.formats.prior);
                ppSpan.textContent = `${this.t("Label_Prior", "Prior")}: ${ppFormatted}`;
                ppSpan.title = `Prior Period: ${ppFormatted}`;
                subRow.appendChild(ppSpan);
            }
            if (metric.target !== null) {
                const tgSpan = document.createElement("span");
                const tgFormatted = this.formatMetricValue(metric.target, metric.formats.target);
                tgSpan.textContent = `${this.t("Label_Target", "Target")}: ${tgFormatted}`;
                tgSpan.title = `${this.t("Label_Target", "Target")}: ${tgFormatted}`;
                subRow.appendChild(tgSpan);
            }
            cell.appendChild(subRow);
        }

        // Trend line (Pro). Free renders the card without it; the notification
        // path explains why, so nothing disappears without a word.
        if (this.hasSparkline(metric)) {
            const spark = this.buildSparkline(metric, hc);
            if (spark) {
                this.subSelectable(spark, "trend", this.t("OO_Trend", "Trend line"), powerbi.visuals.SubSelectionStylesType.Shape);
                cell.appendChild(spark);
            }
        }

        return cell;
    }

    // ─── Variance Pill ───────────────────────────────────────────────────────

    /**
     * Hasta tres KPIs de apoyo apilados a la derecha del valor principal.
     *
     * No llevan identidad de seleccion a proposito: son contexto del titular, no
     * entidades que filtrar. Darles clic obligaria a decidir que significa filtrar
     * por "Margen", y no significa nada.
     *
     * Vale tambien en small multiples, pero ahi la regla de ancho minimo se aplica al
     * ancho REAL de cada celda, no al del visual. Con cuatro columnas cada tarjeta mide
     * un cuarto, cae por debajo del minimo y los secundarios se retiran solos: cincuenta
     * tarjetas con tres KPIs cada una son doscientos numeros, y eso no es un cuadro de
     * mando. Con una o dos columnas si caben, y entonces se ven.
     *
     * anchoTarjeta = 0 desactiva la regla de ancho minimo (tarjeta unica sin trend);
     * entonces solo decide fitSecondaryColumns(), midiendo si el valor principal cabe.
     */
    private buildSecondaryColumn(metric: MetricData, hc: boolean, anchoTarjeta: number,
                                 orient: "right" | "bottom" | "stack" | "stack2" = "right"): HTMLElement | null {
        const s = this.formattingSettings.secondaryKpis;
        if (!s.show.value) return null;
        if (!this.previewOf("secondary KPIs")) return null;

        const items = (metric.secondary || []).filter(k => k.value !== null).slice(0, 3);
        if (items.length === 0) return null;

        // Por debajo del ancho minimo se retira la columna entera: comprimir el valor
        // principal para meter contexto es perder lo unico que la tarjeta tiene que
        // comunicar. Mejor no enseñar los secundarios que enseñar mal el titular.
        const minimo = s.minWidth.value ?? 320;
        if (anchoTarjeta > 0 && anchoTarjeta < minimo) return null;

        const linea = hc ? "#FFFFFF" : "#EDEBE9";
        const col = document.createElement("div");
        col.className = orient === "right" ? "kpi-secondary-col"
                      : orient === "bottom" ? "kpi-secondary-row"
                      : orient === "stack" ? "kpi-secondary-stack" : "kpi-secondary-stack2";
        col.setAttribute("aria-hidden", "true");
        // Tres disposiciones (Tino, 02-10-2026):
        //  - right:  REJILLA de dos columnas. Antes cada pildora iba detras de su numero y
        //            salian en zigzag, como en Likert. Numeros a la derecha en la primera
        //            columna, pildoras todas en la misma x; la etiqueta ocupa las dos.
        //  - bottom: una fila a lo ancho, un KPI por tercio. Es la primera opcion abajo.
        //  - stack:  uno debajo de otro, en tres columnas alineadas (nombre, numero,
        //            pildora). fitSecondaryColumns() cambia bottom por stack cuando algun
        //            numero no cabe: "si caben adelante, si no en lineas multiples".
        const pie = ` flex:0 0 auto; min-width:0; margin-top:8px; padding-top:8px; border-top:1px solid ${linea};`;
        col.style.cssText = orient === "right"
            ? "display:grid; grid-template-columns:max-content max-content; align-content:center;"
              + " column-gap:6px; row-gap:1px; flex:0 0 auto; max-width:45%; min-width:0;"
              + ` border-left:1px solid ${linea}; padding-left:14px;`
            : orient === "bottom"
            ? "display:flex; flex-direction:row; align-items:flex-start; gap:12px;" + pie
            : orient === "stack"
            ? "display:grid; grid-template-columns:minmax(0,1fr) max-content max-content; align-items:center;"
              + " column-gap:8px; row-gap:3px;" + pie
            // stack2, la mas compacta para tarjetas muy estrechas: el nombre arriba y
            // debajo numero y pildora, alineados entre KPIs como la columna derecha.
            : "display:grid; grid-template-columns:minmax(0,1fr) max-content; align-items:center;"
              + " column-gap:6px; row-gap:1px;" + pie;

        const valColor   = hc ? "#FFFFFF" : (s.color.value?.value ?? "#323130");
        const labColor   = hc ? "#FFFFFF" : (s.labelColor.value?.value ?? "#605E5C");
        const valSize    = s.valueFontSize.value ?? 16;
        const labSize    = s.labelFontSize.value ?? 10;
        const enRejilla  = orient !== "bottom";

        items.forEach((k, i) => {
            // En rejilla la fila no es una caja: sus piezas son celdas de la rejilla de la
            // columna, y por eso quedan alineadas entre KPIs.
            const fila = document.createElement("div");
            fila.style.cssText = enRejilla
                ? "display:contents;"
                : "display:flex; flex-direction:column; gap:1px; min-width:0; flex:1 1 0;"
                  + (i > 0 ? ` border-left:1px solid ${linea}; padding-left:12px;` : "");

            const lab = document.createElement("div");
            lab.textContent = k.name;
            lab.title = k.name;
            lab.style.cssText = `font-size:${labSize}px; color:${labColor};`
                              + " white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0;"
                              + (orient === "right" || orient === "stack2"
                                    ? ` grid-column:1 / -1;${i > 0 ? " margin-top:7px;" : ""}` : "");

            const lineaValor = document.createElement("div");
            lineaValor.style.cssText = enRejilla
                ? "display:contents;"
                : "display:flex; align-items:baseline; gap:6px; min-width:0;";

            const val = document.createElement("div");
            val.className = "kpi-sec-value";
            val.textContent = this.formatMetricValue(k.value, k.format);
            val.style.cssText = `font-size:${valSize}px; font-weight:600; color:${valColor};`
                              + " white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"
                              + (enRejilla ? " justify-self:end; text-align:right;" : "");
            lineaValor.appendChild(val);

            // La varianza necesita su prior emparejado por posicion. Sin el, el KPI
            // se dibuja igual: media funcion es mejor que un hueco sin explicacion.
            if (s.showVariance.value && k.prior !== null) {
                const pill = this.buildVariancePill(k.value, k.prior, hc, k.format);
                if (pill) {
                    pill.style.transform = "scale(0.82)";
                    pill.style.transformOrigin = "left center";
                    if (enRejilla) { pill.style.justifySelf = "start"; pill.style.alignSelf = "center"; }
                    lineaValor.appendChild(pill);
                }
            } else if (enRejilla) {
                // Sin pildora la celda queda vacia: la rejilla no se descuadra.
                lineaValor.appendChild(document.createElement("span"));
            }

            fila.appendChild(lab);
            fila.appendChild(lineaValor);
            col.appendChild(fila);
        });
        return col;
    }

    /** Mismas condiciones que buildMetricCell para dibujar la sparkline. */
    private hasSparkline(metric: MetricData): boolean {
        return this.previewOf("trend line") && this.formattingSettings.trend.show.value
            && metric.trendData.length >= 2;
    }

    /** Para Auto: la version "abajo" que sustituye a una columna derecha que no cabe. */
    private secondaryFallback = new WeakMap<HTMLElement, () => HTMLElement | null>();

    /**
     * Coloca la celda principal y sus KPIs secundarios en la tarjeta segun Position:
     *  - Right:  columna a la derecha (comportamiento de siempre).
     *  - Bottom: fila bajo el valor, y bajo la sparkline si la hay.
     *  - Auto:   derecha, salvo que haya sparkline y la tarjeta no llegue al ancho
     *            minimo: entonces abajo, en vez de retirarlos. Si a la derecha
     *            recortan el valor principal, fitSecondaryColumns() los baja.
     * En la rejilla el ancho minimo sigue retirandolos en cualquier modo: ahi la
     * regla es de densidad, no de sitio.
     */
    private mountSecondary(card: HTMLElement, cell: HTMLElement, metric: MetricData,
                           hc: boolean, ancho: number, gap: number, rejilla: boolean): void {
        const s = this.formattingSettings.secondaryKpis;
        const modo = String(s.position.value?.["value"] ?? s.position.value ?? "auto");
        const minimo = s.minWidth.value ?? 320;

        // Auto y tarjeta estrecha: los secundarios BAJAN, en la tarjeta unica y tambien en
        // la rejilla (Tino, 02-10-2026: con 6 columnas desaparecian). Debajo hay sitio:
        // si no caben en fila pasan a lista, y la rejilla se desplaza en vertical. Solo
        // con Position = Right explicito se retiran por debajo del ancho minimo.
        let orient: "right" | "bottom" = modo === "bottom" ? "bottom" : "right";
        if (modo === "auto" && ancho > 0 && ancho < minimo) orient = "bottom";
        const anchoRegla = orient === "bottom" ? 0 : ancho;
        void rejilla;

        const aside = this.buildSecondaryColumn(metric, hc, anchoRegla, orient);
        if (!aside) { card.appendChild(cell); return; }

        if (orient === "bottom") {
            card.appendChild(cell);
            card.appendChild(aside);
            this.registrarLista(aside, card, metric, hc);
            return;
        }

        // Fila: el valor principal manda y los secundarios ocupan lo que sobra.
        const fila = document.createElement("div");
        fila.style.cssText = "display:flex; flex-direction:row; align-items:stretch;"
                           + ` gap:${gap}px; flex:1; min-height:0;`;
        cell.style.flex = "1 1 auto";
        cell.style.minWidth = "0";
        fila.appendChild(cell);
        fila.appendChild(aside);
        card.appendChild(fila);

        if (modo === "auto") {
            this.secondaryFallback.set(aside, () => {
                const abajo = this.buildSecondaryColumn(metric, hc, 0, "bottom");
                if (abajo) { card.appendChild(abajo); this.registrarLista(abajo, card, metric, hc); }
                return abajo;
            });
        }
    }

    /**
     * Alternativas abajo, de mas ancha a mas compacta: fila -> lista (una linea por KPI)
     * -> lista compacta (nombre encima de numero y pildora). Cada una registra la siguiente.
     */
    private registrarLista(fila: HTMLElement, card: HTMLElement, metric: MetricData, hc: boolean,
                           siguiente: "stack" | "stack2" = "stack"): void {
        this.secondaryFallback.set(fila, () => {
            const lista = this.buildSecondaryColumn(metric, hc, 0, siguiente);
            if (lista && fila.parentElement === card) card.replaceChild(lista, fila);
            if (lista && siguiente === "stack") this.registrarLista(lista, card, metric, hc, "stack2");
            return lista;
        });
    }

    /**
     * Red de seguridad, ya con el DOM montado. El titular manda; los secundarios solo
     * se quedan si caben de verdad:
     *  - A la derecha, si el valor principal sale recortado (con elipsis) la columna
     *    se retira; en Auto se prueba antes a bajarla.
     *  - Abajo, si la fila se sale por el fondo de la tarjeta o alguno de sus textos
     *    sale recortado, se retira: medio numero es peor que ninguno.
     * Sin caja de layout (pagina en transicion) clientWidth es 0 y no se toca nada:
     * ensureLaidOut() vuelve a pintar cuando la hay.
     */
    /**
     * ADAPTACION AL TAMAÑO (2.2.0.0). Dos reglas, en este orden:
     *  1. El número principal nunca se corta: si no cabe, se encoge (hasta 10 px). En la
     *     rejilla todas las tarjetas toman el tamaño de la que más lo necesita, para que se
     *     sigan comparando de un vistazo.
     *  2. Si la tarjeta única no cabe a lo alto, se retira lo accesorio por prioridad:
     *     tendencia, prior/target, KPIs secundarios, texto del estado, variación y etiqueta.
     *     El número se queda siempre. Antes el contenido se salía por abajo, cortado.
     * Va después de fitSecondaryColumns(): primero se aparta la columna derecha, que es
     * lo que más espacio quita al número.
     */
    private fitToSize(root: HTMLElement): void {
        this.autoCrecer(root);
        const valores = Array.from(root.querySelectorAll(".kpi-value")) as HTMLElement[];
        // Ancho real del texto con un Range: scrollWidth se redondea a entero y un número que
        // se pasa por décimas de píxel salía con elipsis aunque scrollWidth == clientWidth.
        const anchoTexto = (el: HTMLElement): number => {
            const r = document.createRange();
            r.selectNodeContents(el);
            return r.getBoundingClientRect().width;
        };
        let escala = 1;
        for (const v of valores) {
            if (v.clientWidth <= 0) continue;
            const w = anchoTexto(v);
            if (w > v.clientWidth - 0.5) { escala = Math.min(escala, (v.clientWidth - 1) / w); }
        }
        if (escala < 1) {
            for (const v of valores) {
                const actual = parseFloat(v.style.fontSize) || 28;
                v.style.fontSize = `${Math.max(10, Math.floor(actual * escala))}px`;
            }
        }

        if (root.querySelector(".kpi-grid")) return;   // la rejilla se desplaza; la tarjeta única no
        const desborda = () => root.scrollHeight > root.clientHeight + 1;
        const orden = [".kpi-sparkline", ".kpi-sub-row",
                       ".kpi-secondary-row, .kpi-secondary-stack, .kpi-secondary-stack2, .kpi-secondary-col",
                       ".kpi-status", ".kpi-variance-pill", ".kpi-label"];
        for (const sel of orden) {
            if (!desborda()) break;
            root.querySelectorAll(sel).forEach(e => (e as HTMLElement).style.display = "none");
        }
    }

    /**
     * TAMAÑO AUTOMÁTICO (2.3). Con una sola tarjeta y sin tamaño de letra elegido por el usuario, el contenido crece
     * hasta llenar el visual, como la tarjeta nativa: antes el número se quedaba en 28 px en una esquina de un visual
     * de 1000×500. Todos los textos crecen en la misma proporción (búsqueda binaria del factor) y nada puede
     * desbordar ni cortar el número. Idempotente: parte siempre del tamaño original guardado en data-fs0.
     */
    private autoCrecer(root: HTMLElement): void {
        if (root.querySelector(".kpi-grid")) { return; }
        const fijado = (this.lastDataView?.metadata?.objects as any)?.mainValue?.fontSize;
        if (fijado !== undefined) { return; }
        const valor = root.querySelector(".kpi-value") as HTMLElement | null;
        if (!valor || root.clientHeight <= 0) { return; }
        // El asistente y la marca de agua no son la tarjeta: no crecen con ella.
        const els = (Array.from(root.querySelectorAll("*")) as HTMLElement[])
            .filter(e => e.style && e.style.fontSize && !e.closest(".kpi-guide"));
        for (const e of els) { if (!e.dataset.fs0) { e.dataset.fs0 = String(parseFloat(e.style.fontSize) || 0); } }
        const base = parseFloat(valor.dataset.fs0 || "28") || 28;
        // El número crece del todo; el resto (etiqueta, variación, prior) bastante menos, como en la tarjeta nativa.
        const aplica = (f: number) => {
            const g = 1 + (f - 1) * 0.3;
            for (const e of els) { e.style.fontSize = `${(parseFloat(e.dataset.fs0 || "0") || 0) * (e === valor ? f : g)}px`; }
        };
        const anchoTexto = (el: HTMLElement): number => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; };
        const cabe = () => root.scrollHeight <= root.clientHeight + 1 && root.scrollWidth <= root.clientWidth + 1
            && anchoTexto(valor) <= valor.clientWidth - 0.5;
        // Centrado vertical con una sola tarjeta (sin tendencia, que necesita el ancho y el alto).
        // La celda ocupa todo el alto (flex: 1), así que el centrado va en ella, no en la raíz.
        const celda = valor.closest(".kpi-metric-cell") as HTMLElement | null;
        if (celda) { celda.style.justifyContent = "center"; }
        // Con tendencia, el número no pasa del 40 % del alto: la línea necesita el suyo.
        const tope = root.querySelector(".kpi-sparkline") ? (root.clientHeight * 0.4) / (base * 1.1) : 8;
        let lo = 1, hi = Math.max(1, Math.min(8, 220 / base, tope));
        aplica(1);
        if (!cabe()) { return; }
        for (let i = 0; i < 9; i++) {
            const mid = (lo + hi) / 2;
            aplica(mid);
            if (cabe()) { lo = mid; } else { hi = mid; }
        }
        aplica(lo * 0.97);
    }

    private fitSecondaryColumns(root: HTMLElement): void {
        const recortado = (el: HTMLElement) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1;

        const encajaAbajo = (row: HTMLElement): boolean => {
            const card = row.parentElement;
            if (!card) return false;
            const cs = getComputedStyle(card);
            const fondo = card.getBoundingClientRect().bottom
                - (parseFloat(cs.paddingBottom) || 0) - (parseFloat(cs.borderBottomWidth) || 0);
            if (row.getBoundingClientRect().bottom > fondo + 1) return false;
            // Solo los NUMEROS: medio numero es peor que ninguno. Los nombres de los KPI se
            // recortan con elipsis a proposito (llevan el nombre completo en el title).
            const numeros = Array.from(row.querySelectorAll(".kpi-sec-value")) as HTMLElement[];
            return !numeros.some(n => recortado(n));
        };

        // TODAS LAS TARJETAS CON LA MISMA DISPOSICION (Tino, 02-10-2026: "si va en lista
        // todas en lista"). Cada paso decide para el conjunto, no tarjeta a tarjeta:
        //  1. Derecha: si en UNA el valor principal sale recortado, bajan en todas.
        //  2. Abajo en fila: si en UNA algun numero no cabe, todas pasan a lista.
        //  3. Si en UNA no caben ni asi (se salen por el fondo), se retiran en todas.
        // Un numero comprimido a ANCHO CERO tambien esta recortado: en la fila la pildora no
        // se encoge y el numero si, y con 6 columnas desaparecia entero sin que nada lo
        // detectara (recortado() exige ancho > 0). Y el bloque no puede salirse de la tarjeta.
        const numerosCaben = (row: HTMLElement): boolean =>
            !(Array.from(row.querySelectorAll(".kpi-sec-value")) as HTMLElement[])
                .some(n => n.scrollWidth > n.clientWidth + 1)
            && row.scrollWidth <= row.clientWidth + 1;
        const todos = (sel: string) => Array.from(root.querySelectorAll(sel)) as HTMLElement[];
        const conCaja = (els: HTMLElement[]) => els.filter(e => e.clientWidth > 0);

        // 1. Columna derecha
        const cols = todos(".kpi-secondary-col");
        const algunaRecorta = cols.some(col => {
            const valor = col.parentElement?.querySelector(".kpi-value") as HTMLElement | null;
            return !!valor && valor.clientWidth > 0 && recortado(valor);
        });
        if (algunaRecorta) {
            for (const col of cols) {
                col.parentElement?.removeChild(col);
                this.secondaryFallback.get(col)?.();
            }
        }

        // 2. Fila de abajo -> lista -> lista compacta, siempre todas a la vez
        for (const sel of [".kpi-secondary-row", ".kpi-secondary-stack"]) {
            const bloques = conCaja(todos(sel));
            if (bloques.some(r => !numerosCaben(r))) {
                for (const r of bloques) this.secondaryFallback.get(r)?.();
            }
        }

        // 3. Lo que quede abajo tiene que caber en todas las tarjetas, a lo ancho y a lo alto
        const abajo = conCaja(todos(".kpi-secondary-row, .kpi-secondary-stack, .kpi-secondary-stack2"));
        if (abajo.some(r => !encajaAbajo(r) || !numerosCaben(r))) {
            for (const r of abajo) r.remove();
        }
    }

    private buildVariancePill(current: number | null, base: number | null, hc: boolean, format?: string): HTMLElement | null {
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
        } else if (this.previewOf("variance colours")) {
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
        // Sobre una tarjeta oscura (plantilla Midnight, o un fondo elegido) el verde y el rojo
        // por defecto no se leen: se aclaran hacia el blanco, manteniendo el tono.
        const fondo = luminance(this.formattingSettings.card.background.value?.value);
        if (!hc && fondo !== null && fondo < 0.18) { color = towardWhite(color, 0.45); }

        const arrow   = s.showArrow.value ? (isNeutral ? "→" : (diff > 0 ? "▲" : "▼")) : "";
        // El porcentaje de variacion en el idioma del informe: 12,5 % en español, 12.5% en inglés.
        const pctStr  = `${arrow} ${this.pctFormatter().format(Math.abs(pct) / 100)}`;
        const usePill = this.previewOf("variance pill") && s.showPill.value;

        const pill = document.createElement("div");
        pill.className = "kpi-variance-pill";
        this.subSelectable(pill, "variance", this.t("OO_Variance", "Variance"), powerbi.visuals.SubSelectionStylesType.Text);
        pill.textContent = pctStr;
        pill.title = `Variance: ${pctStr} (${diff >= 0 ? "+" : ""}${this.formatMetricValue(diff, format)})`;
        pill.setAttribute("aria-label", `${this.t("Aria_Variance", "Variance")} ${pctStr}`);

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
                    value: this.formatMetricValue(displayValue, metric.formats.value),
                    color: this.formattingSettings.mainValue.color.value?.value ?? "#252423"
                }
            ];
            if (metric.priorPeriod !== null) {
                items.push({ displayName: this.t("Role_PriorPeriod", "Prior Period"), value: this.formatMetricValue(metric.priorPeriod, metric.formats.prior), color: "#605E5C" });
            }
            if (metric.target !== null) {
                items.push({ displayName: this.t("Role_Target", "Target"), value: this.formatMetricValue(metric.target, metric.formats.target), color: "#605E5C" });
            }
            {
                const stT = this.statusOf(metric, displayValue);
                if (stT) items.push({ displayName: this.t("Label_Status", "Status"), value: `${stT.word} · ${stT.text}`, color: stT.color });
            }
            if (this.previewOf("extra tooltip fields")) {
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

    /**
     * FORMATO NATIVO DE POWER BI (valueFormatter): el formato de la medida en el modelo
     * (moneda, porcentaje, separadores) y el idioma del informe. Display Units y Decimal
     * Places actuan SOBRE ese formato, como en las tarjetas nativas:
     *  - Unidades: Auto escala a K/M/B; None, sin escalar. Con un formato de PORCENTAJE no
     *    se escala nunca: 15 es 1.500 %, no "1,5K%".
     *  - Decimales: solo si el usuario los ha cambiado en el panel. Si no, los del formato
     *    de la medida (o los automaticos al escalar).
     * Prefijo y sufijo (Pro) se añaden despues, tal cual.
     */
    private formatMetricValue(value: number | null, format?: string): string {
        if (value === null || value === undefined) return "—";
        const s      = this.formattingSettings.mainValue;
        const prefix = this.previewOf("prefix/suffix") ? (s.prefix.value ?? "") : "";
        const suffix = this.previewOf("prefix/suffix") ? (s.suffix.value ?? "") : "";
        const unit = String((s.displayUnit.value as any)?.value ?? s.displayUnit.value ?? "auto") as DisplayUnit;
        const userDecimals = (this.lastDataView?.metadata?.objects as any)?.mainValue?.decimalPlaces;
        const precision = typeof userDecimals === "number" ? Math.max(0, Math.min(6, s.decimalPlaces.value ?? userDecimals)) : undefined;
        return `${prefix}${this.nativeFormat(value, format, unit, precision)}${suffix}`;
    }

    /** Valores sueltos (campos de tooltip): su formato, sin escalar. */
    private formatValue(value: number | null, format?: string): string {
        if (value === null || value === undefined) return "—";
        return this.nativeFormat(value, format, "none", undefined);
    }

    private nativeFormat(value: number, format: string | undefined, unit: DisplayUnit, precision: number | undefined): string {
        const esPorcentaje = !!format && /%/.test(format.replace(/"[^"]*"|\\./g, ""));
        let escala: number | undefined;
        if (!esPorcentaje) {
            if (unit === "auto") escala = Math.abs(value);
            else if (unit === "thousands") escala = 1e3;
            else if (unit === "millions") escala = 1e6;
            else if (unit === "billions") escala = 1e9;
        }
        // Sin escalar y con decimales pedidos, value 0 hace que valueFormatter los aplique.
        if (escala === undefined && precision !== undefined) escala = 0;
        try {
            return valueFormatter.create({
                format: format || undefined,
                value: escala,
                precision,
                // Sistema de unidades "WholeUnits" (2), el de Bar Chart: con el de por
                // defecto la libreria pinta 114.635 como "0.11M" en vez de "114.64K".
                displayUnitSystemType: 2,
                cultureSelector: this.host.locale
            }).format(value);
        } catch (_) {
            return String(value);
        }
    }

    /** Porcentaje de variacion con un decimal, en el idioma del informe. */
    private pctFormatter(): valueFormatter.IValueFormatter {
        const loc = this.host.locale || "";
        if (!this.pctFmt || this.pctFmtLocale !== loc) {
            this.pctFmt = valueFormatter.create({ format: "0.0%", cultureSelector: loc });
            this.pctFmtLocale = loc;
        }
        return this.pctFmt;
    }
    private pctFmt: valueFormatter.IValueFormatter | null = null;
    private pctFmtLocale = "";

    // ─── Formatting Pane API ─────────────────────────────────────────────────

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
