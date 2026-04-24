/**
 * KPI Card Pro — Settings
 * TCViz | tcviz.com
 * powerbi-visuals-utils-formattingmodel ^6.2.2
 */

"use strict";

import powerbiVisualsApi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

const Card = formattingSettings.SimpleCard;
const Model = formattingSettings.Model;

export class CardSettings extends Card {
    name = "card";
    displayName = "Card";
    displayNameKey = "Object_Card";

    background: formattingSettings.ColorPicker = {
        name: "background", displayName: "Background Color", displayNameKey: "Prop_Card_Background",
        value: { value: "#FFFFFF" }
    };
    borderColor: formattingSettings.ColorPicker = {
        name: "borderColor", displayName: "Border Color", displayNameKey: "Prop_Card_BorderColor",
        value: { value: "#E0E0E0" }
    };
    borderWidth: formattingSettings.NumUpDown = {
        name: "borderWidth", displayName: "Border Width", displayNameKey: "Prop_Card_BorderWidth",
        value: 1,
        options: { minValue: { value: 0, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 10, type: powerbiVisualsApi.visuals.ValidatorType.Max } }
    };
    borderRadius: formattingSettings.NumUpDown = {
        name: "borderRadius", displayName: "Border Radius", displayNameKey: "Prop_Card_BorderRadius",
        value: 8,
        options: { minValue: { value: 0, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 32, type: powerbiVisualsApi.visuals.ValidatorType.Max } }
    };
    padding: formattingSettings.NumUpDown = {
        name: "padding", displayName: "Padding", displayNameKey: "Prop_Card_Padding",
        value: 16,
        options: { minValue: { value: 4, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 48, type: powerbiVisualsApi.visuals.ValidatorType.Max } }
    };
    shadow: formattingSettings.ToggleSwitch = {
        name: "shadow", displayName: "Drop Shadow", displayNameKey: "Prop_Card_Shadow",
        value: true
    };
    slices = [this.background, this.borderColor, this.borderWidth, this.borderRadius, this.padding, this.shadow];
}

export class MainValueSettings extends Card {
    name = "mainValue";
    displayName = "Main Value";
    displayNameKey = "Object_MainValue";

    fontFamily: formattingSettings.TextInput = {
        name: "fontFamily", displayName: "Font Family", displayNameKey: "Prop_FontFamily",
        placeholder: "e.g. Segoe UI", value: "Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif"
    };
    fontSize: formattingSettings.NumUpDown = {
        name: "fontSize", displayName: "Font Size", displayNameKey: "Prop_FontSize",
        value: 28,
        options: { minValue: { value: 8, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 72, type: powerbiVisualsApi.visuals.ValidatorType.Max } }
    };
    bold: formattingSettings.ToggleSwitch = {
        name: "bold", displayName: "Bold", displayNameKey: "Prop_Bold", value: true
    };
    color: formattingSettings.ColorPicker = {
        name: "color", displayName: "Color", displayNameKey: "Prop_Color",
        value: { value: "#252423" }
    };
    displayUnit: formattingSettings.AutoDropdown = {
        name: "displayUnit", displayName: "Display Units", displayNameKey: "Prop_DisplayUnit",
        value: "auto"
    };
    decimalPlaces: formattingSettings.NumUpDown = {
        name: "decimalPlaces", displayName: "Decimal Places", displayNameKey: "Prop_DecimalPlaces",
        value: 1,
        options: { minValue: { value: 0, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 6, type: powerbiVisualsApi.visuals.ValidatorType.Max } }
    };
    prefix: formattingSettings.TextInput = {
        name: "prefix", displayName: "Prefix", displayNameKey: "Prop_Prefix",
        placeholder: "e.g. $", value: ""
    };
    suffix: formattingSettings.TextInput = {
        name: "suffix", displayName: "Suffix", displayNameKey: "Prop_Suffix",
        placeholder: "e.g. %", value: ""
    };
    slices = [this.fontFamily, this.fontSize, this.bold, this.color, this.displayUnit, this.decimalPlaces, this.prefix, this.suffix];
}

export class LabelSettings extends Card {
    name = "label"; displayName = "Label"; displayNameKey = "Object_Label";
    show: formattingSettings.ToggleSwitch = { name: "show", displayName: "Show", displayNameKey: "Prop_Show", value: true };
    text: formattingSettings.TextInput = { name: "text", displayName: "Custom Text", displayNameKey: "Prop_Label_Text", placeholder: "Auto (measure name)", value: "" };
    fontSize: formattingSettings.NumUpDown = { name: "fontSize", displayName: "Font Size", displayNameKey: "Prop_FontSize", value: 12, options: { minValue: { value: 8, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 32, type: powerbiVisualsApi.visuals.ValidatorType.Max } } };
    color: formattingSettings.ColorPicker = { name: "color", displayName: "Color", displayNameKey: "Prop_Color", value: { value: "#6B6B6B" } };
    slices = [this.show, this.text, this.fontSize, this.color];
}

export class VarianceSettings extends Card {
    name = "variance"; displayName = "Variance"; displayNameKey = "Object_Variance";
    show: formattingSettings.ToggleSwitch = { name: "show", displayName: "Show", displayNameKey: "Prop_Show", value: true };
    mode: formattingSettings.AutoDropdown = { name: "mode", displayName: "Variance Mode", displayNameKey: "Prop_Variance_Mode", value: "vsPrior" };
    positiveColor: formattingSettings.ColorPicker = { name: "positiveColor", displayName: "Positive Color", displayNameKey: "Prop_Variance_PositiveColor", value: { value: "#107C10" } };
    negativeColor: formattingSettings.ColorPicker = { name: "negativeColor", displayName: "Negative Color", displayNameKey: "Prop_Variance_NegativeColor", value: { value: "#D13438" } };
    neutralColor: formattingSettings.ColorPicker = { name: "neutralColor", displayName: "Neutral Color", displayNameKey: "Prop_Variance_NeutralColor", value: { value: "#605E5C" } };
    invertColors: formattingSettings.ToggleSwitch = { name: "invertColors", displayName: "Invert (Lower is Better)", displayNameKey: "Prop_Variance_Invert", value: false };
    showArrow: formattingSettings.ToggleSwitch = { name: "showArrow", displayName: "Show Arrow", displayNameKey: "Prop_Variance_Arrow", value: true };
    showPill: formattingSettings.ToggleSwitch = { name: "showPill", displayName: "Show as Pill (Pro)", displayNameKey: "Prop_Variance_Pill", value: true };
    fontSize: formattingSettings.NumUpDown = { name: "fontSize", displayName: "Font Size", displayNameKey: "Prop_FontSize", value: 12, options: { minValue: { value: 8, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 24, type: powerbiVisualsApi.visuals.ValidatorType.Max } } };
    slices = [this.show, this.mode, this.positiveColor, this.negativeColor, this.neutralColor, this.invertColors, this.showArrow, this.showPill, this.fontSize];
}

export class SparklineSettings extends Card {
    name = "sparkline"; displayName = "Sparkline"; displayNameKey = "Object_Sparkline";
    show: formattingSettings.ToggleSwitch = { name: "show", displayName: "Show", displayNameKey: "Prop_Show", value: true };
    type: formattingSettings.AutoDropdown = { name: "type", displayName: "Chart Type", displayNameKey: "Prop_Sparkline_Type", value: "area" };
    color: formattingSettings.ColorPicker = { name: "color", displayName: "Color", displayNameKey: "Prop_Color", value: { value: "#0078D4" } };
    areaOpacity: formattingSettings.NumUpDown = { name: "areaOpacity", displayName: "Area Opacity (%)", displayNameKey: "Prop_Sparkline_Opacity", value: 20, options: { minValue: { value: 0, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 100, type: powerbiVisualsApi.visuals.ValidatorType.Max } } };
    lineWidth: formattingSettings.NumUpDown = { name: "lineWidth", displayName: "Line Width", displayNameKey: "Prop_Sparkline_LineWidth", value: 2, options: { minValue: { value: 1, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 6, type: powerbiVisualsApi.visuals.ValidatorType.Max } } };
    showDot: formattingSettings.ToggleSwitch = { name: "showDot", displayName: "Show Last Point Dot", displayNameKey: "Prop_Sparkline_Dot", value: true };
    height: formattingSettings.NumUpDown = { name: "height", displayName: "Height (px)", displayNameKey: "Prop_Sparkline_Height", value: 48, options: { minValue: { value: 24, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 120, type: powerbiVisualsApi.visuals.ValidatorType.Max } } };
    slices = [this.show, this.type, this.color, this.areaOpacity, this.lineWidth, this.showDot, this.height];
}

export class TargetSettings extends Card {
    name = "target"; displayName = "Target"; displayNameKey = "Object_Target";
    show: formattingSettings.ToggleSwitch = { name: "show", displayName: "Show", displayNameKey: "Prop_Show", value: true };
    color: formattingSettings.ColorPicker = { name: "color", displayName: "Line Color", displayNameKey: "Prop_Target_Color", value: { value: "#E97132" } };
    lineStyle: formattingSettings.AutoDropdown = { name: "lineStyle", displayName: "Line Style", displayNameKey: "Prop_Target_LineStyle", value: "dashed" };
    showLabel: formattingSettings.ToggleSwitch = { name: "showLabel", displayName: "Show Label", displayNameKey: "Prop_Target_ShowLabel", value: true };
    labelText: formattingSettings.TextInput = { name: "labelText", displayName: "Label Text", displayNameKey: "Prop_Target_LabelText", placeholder: "Target", value: "Target" };
    slices = [this.show, this.color, this.lineStyle, this.showLabel, this.labelText];
}

export class MetricsSettings extends Card {
    name = "metrics"; displayName = "Metrics Layout"; displayNameKey = "Object_Metrics";
    layout: formattingSettings.AutoDropdown = { name: "layout", displayName: "Layout", displayNameKey: "Prop_Metrics_Layout", value: "single" };
    dividerShow: formattingSettings.ToggleSwitch = { name: "dividerShow", displayName: "Show Dividers", displayNameKey: "Prop_Metrics_Divider", value: true };
    dividerColor: formattingSettings.ColorPicker = { name: "dividerColor", displayName: "Divider Color", displayNameKey: "Prop_Metrics_DividerColor", value: { value: "#EDEBE9" } };
    slices = [this.layout, this.dividerShow, this.dividerColor];
}

export class AccessibilitySettings extends Card {
    name = "accessibility"; displayName = "Accessibility"; displayNameKey = "Object_Accessibility";
    highContrast: formattingSettings.ToggleSwitch = { name: "highContrast", displayName: "High Contrast Mode", displayNameKey: "Prop_Accessibility_HighContrast", value: false };
    visualTitle: formattingSettings.TextInput = { name: "visualTitle", displayName: "Visual Title (ARIA)", displayNameKey: "Prop_Accessibility_Title", placeholder: "KPI Card", value: "" };
    slices = [this.highContrast, this.visualTitle];
}

export class LicenseCardSettings extends Card {
    name = "license"; displayName = "License"; displayNameKey = "Object_License";
    show: formattingSettings.ToggleSwitch = { name: "show", displayName: "Show License Info", displayNameKey: "Prop_License_Show", value: false };
    slices = [this.show];
}

export class VisualFormattingSettingsModel extends Model {
    card = new CardSettings();
    mainValue = new MainValueSettings();
    label = new LabelSettings();
    variance = new VarianceSettings();
    sparkline = new SparklineSettings();
    target = new TargetSettings();
    metrics = new MetricsSettings();
    accessibility = new AccessibilitySettings();
    licenseCard = new LicenseCardSettings();
    cards = [this.card, this.mainValue, this.label, this.variance, this.sparkline, this.target, this.metrics, this.accessibility, this.licenseCard];
}
