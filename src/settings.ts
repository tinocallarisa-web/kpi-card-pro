/**
 * KPI Card Pro — Settings
 * TCViz | tcviz.com
 * powerbi-visuals-utils-formattingmodel ^6.2.2
 * Uses constructor pattern for formatting pane compatibility
 */

"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsModel = formattingSettings.Model;

// ─── Card: Card Container ────────────────────────────────────────────────────

class CardSettings extends FormattingSettingsCard {
    background = new formattingSettings.ColorPicker({
        name: "background", displayName: "Background Color",
        value: { value: "#FFFFFF" }
    });
    borderColor = new formattingSettings.ColorPicker({
        name: "borderColor", displayName: "Border Color",
        value: { value: "#E0E0E0" }
    });
    borderWidth = new formattingSettings.NumUpDown({
        name: "borderWidth", displayName: "Border Width", value: 1,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 10 } }
    });
    borderRadius = new formattingSettings.NumUpDown({
        name: "borderRadius", displayName: "Border Radius", value: 8,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 32 } }
    });
    padding = new formattingSettings.NumUpDown({
        name: "padding", displayName: "Padding", value: 16,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 4 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 48 } }
    });
    shadow = new formattingSettings.ToggleSwitch({
        name: "shadow", displayName: "Drop Shadow", value: true
    });
    name = "card";
    displayName = "Card";
    slices = [this.background, this.borderColor, this.borderWidth, this.borderRadius, this.padding, this.shadow];
}

// ─── Card: Main Value ────────────────────────────────────────────────────────

class MainValueSettings extends FormattingSettingsCard {
    fontFamily = new formattingSettings.TextInput({
        name: "fontFamily", displayName: "Font Family",
        placeholder: "e.g. Segoe UI",
        value: "Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif"
    });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize", displayName: "Font Size", value: 28,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 8 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 72 } }
    });
    bold = new formattingSettings.ToggleSwitch({
        name: "bold", displayName: "Bold", value: true
    });
    color = new formattingSettings.ColorPicker({
        name: "color", displayName: "Color",
        value: { value: "#252423" }
    });
    displayUnit = new formattingSettings.ItemDropdown({
        name: "displayUnit", displayName: "Display Units",
        items: [
            { displayName: "Auto", value: "auto" },
            { displayName: "None", value: "none" },
            { displayName: "Thousands", value: "thousands" },
            { displayName: "Millions", value: "millions" },
            { displayName: "Billions", value: "billions" }
        ],
        value: { displayName: "Auto", value: "auto" }
    });
    decimalPlaces = new formattingSettings.NumUpDown({
        name: "decimalPlaces", displayName: "Decimal Places", value: 1,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 6 } }
    });
    prefix = new formattingSettings.TextInput({
        name: "prefix", displayName: "Prefix", placeholder: "e.g. $", value: ""
    });
    suffix = new formattingSettings.TextInput({
        name: "suffix", displayName: "Suffix", placeholder: "e.g. %", value: ""
    });
    name = "mainValue";
    displayName = "Main Value";
    slices = [this.fontFamily, this.fontSize, this.bold, this.color, this.displayUnit, this.decimalPlaces, this.prefix, this.suffix];
}

// ─── Card: Label ─────────────────────────────────────────────────────────────

class LabelSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show", displayName: "Show", value: true
    });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize", displayName: "Font Size", value: 12,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 8 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 32 } }
    });
    color = new formattingSettings.ColorPicker({
        name: "color", displayName: "Color",
        value: { value: "#6B6B6B" }
    });
    name = "label";
    displayName = "Label";
    slices = [this.show, this.fontSize, this.color];
}

// ─── Card: Variance ──────────────────────────────────────────────────────────

class VarianceSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show", displayName: "Show", value: true
    });
    positiveColor = new formattingSettings.ColorPicker({
        name: "positiveColor", displayName: "Positive Color",
        value: { value: "#107C10" }
    });
    negativeColor = new formattingSettings.ColorPicker({
        name: "negativeColor", displayName: "Negative Color",
        value: { value: "#D13438" }
    });
    neutralColor = new formattingSettings.ColorPicker({
        name: "neutralColor", displayName: "Neutral Color",
        value: { value: "#605E5C" }
    });
    invertColors = new formattingSettings.ToggleSwitch({
        name: "invertColors", displayName: "Invert (Lower is Better)", value: false
    });
    showArrow = new formattingSettings.ToggleSwitch({
        name: "showArrow", displayName: "Show Arrow", value: true
    });
    showPill = new formattingSettings.ToggleSwitch({
        name: "showPill", displayName: "Show as Pill (Pro)", value: true
    });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize", displayName: "Font Size", value: 12,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 8 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 24 } }
    });
    name = "variance";
    displayName = "Variance";
    slices = [this.show, this.positiveColor, this.negativeColor, this.neutralColor, this.invertColors, this.showArrow, this.showPill, this.fontSize];
}

// ─── Card: Small Multiples ───────────────────────────────────────────────────

class SmallMultiplesSettings extends FormattingSettingsCard {
    columns = new formattingSettings.NumUpDown({
        name: "columns", displayName: "Columns", value: 3,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 1 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 6 } }
    });
    gap = new formattingSettings.NumUpDown({
        name: "gap", displayName: "Gap (px)", value: 12,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 0 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 48 } }
    });
    showTitle = new formattingSettings.ToggleSwitch({
        name: "showTitle", displayName: "Show Category Title", value: true
    });
    titleFontSize = new formattingSettings.NumUpDown({
        name: "titleFontSize", displayName: "Title Font Size", value: 11,
        options: { minValue: { type: powerbi.visuals.ValidatorType.Min, value: 8 }, maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 20 } }
    });
    titleColor = new formattingSettings.ColorPicker({
        name: "titleColor", displayName: "Title Color",
        value: { value: "#605E5C" }
    });
    name = "smallMultiplesLayout";
    displayName = "Small Multiples";
    slices = [this.columns, this.gap, this.showTitle, this.titleFontSize, this.titleColor];
}

// ─── Card: Accessibility ─────────────────────────────────────────────────────

class AccessibilitySettings extends FormattingSettingsCard {
    highContrast = new formattingSettings.ToggleSwitch({
        name: "highContrast", displayName: "High Contrast Mode", value: false
    });
    visualTitle = new formattingSettings.TextInput({
        name: "visualTitle", displayName: "Visual Title (ARIA)",
        placeholder: "KPI Card", value: ""
    });
    name = "accessibility";
    displayName = "Accessibility";
    slices = [this.highContrast, this.visualTitle];
}

// ─── Root Model ──────────────────────────────────────────────────────────────

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    card = new CardSettings();
    mainValue = new MainValueSettings();
    label = new LabelSettings();
    variance = new VarianceSettings();
    smallMultiples = new SmallMultiplesSettings();
    accessibility = new AccessibilitySettings();
    cards = [this.card, this.mainValue, this.label, this.variance, this.smallMultiples, this.accessibility];
}
