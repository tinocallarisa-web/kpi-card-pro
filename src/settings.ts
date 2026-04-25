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
    name = "card"; displayName = "Card"; displayNameKey = "Object_Card";
    background: formattingSettings.ColorPicker = { name: "background", displayName: "Background Color", displayNameKey: "Prop_Card_Background", value: { value: "#FFFFFF" } };
    borderColor: formattingSettings.ColorPicker = { name: "borderColor", displayName: "Border Color", displayNameKey: "Prop_Card_BorderColor", value: { value: "#E0E0E0" } };
    borderWidth: formattingSettings.NumUpDown = { name: "borderWidth", displayName: "Border Width", displayNameKey: "Prop_Card_BorderWidth", value: 1, options: { minValue: { value: 0, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 10, type: powerbiVisualsApi.visuals.ValidatorType.Max } } };
    borderRadius: formattingSettings.NumUpDown = { name: "borderRadius", displayName: "Border Radius", displayNameKey: "Prop_Card_BorderRadius", value: 8, options: { minValue: { value: 0, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 32, type: powerbiVisualsApi.visuals.ValidatorType.Max } } };
    padding: formattingSettings.NumUpDown = { name: "padding", displayName: "Padding", displayNameKey: "Prop_Card_Padding", value: 16, options: { minValue: { value: 4, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 48, type: powerbiVisualsApi.visuals.ValidatorType.Max } } };
    shadow: formattingSettings.ToggleSwitch = { name: "shadow", displayName: "Drop Shadow", displayNameKey: "Prop_Card_Shadow", value: true };
    slices = [this.background, this.borderColor, this.borderWidth, this.borderRadius, this.padding, this.shadow];
}

export class MainValueSettings extends Card {
    name = "mainValue"; displayName = "Main Value"; displayNameKey = "Object_MainValue";
    fontFamily: formattingSettings.TextInput = { name: "fontFamily", displayName: "Font Family", displayNameKey: "Prop_FontFamily", placeholder: "e.g. Segoe UI", value: "Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif" };
    fontSize: formattingSettings.NumUpDown = { name: "fontSize", displayName: "Font Size", displayNameKey: "Prop_FontSize", value: 28, options: { minValue: { value: 8, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 72, type: powerbiVisualsApi.visuals.ValidatorType.Max } } };
    bold: formattingSettings.ToggleSwitch = { name: "bold", displayName: "Bold", displayNameKey: "Prop_Bold", value: true };
    color: formattingSettings.ColorPicker = { name: "color", displayName: "Color", displayNameKey: "Prop_Color", value: { value: "#252423" } };
    displayUnit: formattingSettings.AutoDropdown = { name: "displayUnit", displayName: "Display Units", displayNameKey: "Prop_DisplayUnit", value: "auto" };
    decimalPlaces: formattingSettings.NumUpDown = { name: "decimalPlaces", displayName: "Decimal Places", displayNameKey: "Prop_DecimalPlaces", value: 1, options: { minValue: { value: 0, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 6, type: powerbiVisualsApi.visuals.ValidatorType.Max } } };
    prefix: formattingSettings.TextInput = { name: "prefix", displayName: "Prefix", displayNameKey: "Prop_Prefix", placeholder: "e.g. $", value: "" };
    suffix: formattingSettings.TextInput = { name: "suffix", displayName: "Suffix", displayNameKey: "Prop_Suffix", placeholder: "e.g. %", value: "" };
    slices = [this.fontFamily, this.fontSize, this.bold, this.color, this.displayUnit, this.decimalPlaces, this.prefix, this.suffix];
}

export class LabelSettings extends Card {
    name = "label"; displayName = "Label"; displayNameKey = "Object_Label";
    show: formattingSettings.ToggleSwitch = { name: "show", displayName: "Show", displayNameKey: "Prop_Show", value: true };
    fontSize: formattingSettings.NumUpDown = { name: "fontSize", displayName: "Font Size", displayNameKey: "Prop_FontSize", value: 12, options: { minValue: { value: 8, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 32, type: powerbiVisualsApi.visuals.ValidatorType.Max } } };
    color: formattingSettings.ColorPicker = { name: "color", displayName: "Color", displayNameKey: "Prop_Color", value: { value: "#6B6B6B" } };
    slices = [this.show, this.fontSize, this.color];
}

export class VarianceSettings extends Card {
    name = "variance"; displayName = "Variance"; displayNameKey = "Object_Variance";
    show: formattingSettings.ToggleSwitch = { name: "show", displayName: "Show", displayNameKey: "Prop_Show", value: true };
    positiveColor: formattingSettings.ColorPicker = { name: "positiveColor", displayName: "Positive Color", displayNameKey: "Prop_Variance_PositiveColor", value: { value: "#107C10" } };
    negativeColor: formattingSettings.ColorPicker = { name: "negativeColor", displayName: "Negative Color", displayNameKey: "Prop_Variance_NegativeColor", value: { value: "#D13438" } };
    neutralColor: formattingSettings.ColorPicker = { name: "neutralColor", displayName: "Neutral Color", displayNameKey: "Prop_Variance_NeutralColor", value: { value: "#605E5C" } };
    invertColors: formattingSettings.ToggleSwitch = { name: "invertColors", displayName: "Invert (Lower is Better)", displayNameKey: "Prop_Variance_Invert", value: false };
    showArrow: formattingSettings.ToggleSwitch = { name: "showArrow", displayName: "Show Arrow", displayNameKey: "Prop_Variance_Arrow", value: true };
    showPill: formattingSettings.ToggleSwitch = { name: "showPill", displayName: "Show as Pill (Pro)", displayNameKey: "Prop_Variance_Pill", value: true };
    fontSize: formattingSettings.NumUpDown = { name: "fontSize", displayName: "Font Size", displayNameKey: "Prop_FontSize", value: 12, options: { minValue: { value: 8, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 24, type: powerbiVisualsApi.visuals.ValidatorType.Max } } };
    slices = [this.show, this.positiveColor, this.negativeColor, this.neutralColor, this.invertColors, this.showArrow, this.showPill, this.fontSize];
}

export class SmallMultiplesSettings extends Card {
    name = "smallMultiplesLayout"; displayName = "Small Multiples"; displayNameKey = "Object_SmallMultiples";
    columns: formattingSettings.NumUpDown = { name: "columns", displayName: "Columns", displayNameKey: "Prop_SM_Columns", value: 3, options: { minValue: { value: 1, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 6, type: powerbiVisualsApi.visuals.ValidatorType.Max } } };
    gap: formattingSettings.NumUpDown = { name: "gap", displayName: "Gap (px)", displayNameKey: "Prop_SM_Gap", value: 12, options: { minValue: { value: 0, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 48, type: powerbiVisualsApi.visuals.ValidatorType.Max } } };
    showTitle: formattingSettings.ToggleSwitch = { name: "showTitle", displayName: "Show Category Title", displayNameKey: "Prop_SM_ShowTitle", value: true };
    titleFontSize: formattingSettings.NumUpDown = { name: "titleFontSize", displayName: "Title Font Size", displayNameKey: "Prop_SM_TitleFontSize", value: 11, options: { minValue: { value: 8, type: powerbiVisualsApi.visuals.ValidatorType.Min }, maxValue: { value: 20, type: powerbiVisualsApi.visuals.ValidatorType.Max } } };
    titleColor: formattingSettings.ColorPicker = { name: "titleColor", displayName: "Title Color", displayNameKey: "Prop_SM_TitleColor", value: { value: "#605E5C" } };
    slices = [this.columns, this.gap, this.showTitle, this.titleFontSize, this.titleColor];
}

export class AccessibilitySettings extends Card {
    name = "accessibility"; displayName = "Accessibility"; displayNameKey = "Object_Accessibility";
    highContrast: formattingSettings.ToggleSwitch = { name: "highContrast", displayName: "High Contrast Mode", displayNameKey: "Prop_Accessibility_HighContrast", value: false };
    visualTitle: formattingSettings.TextInput = { name: "visualTitle", displayName: "Visual Title (ARIA)", displayNameKey: "Prop_Accessibility_Title", placeholder: "KPI Card", value: "" };
    slices = [this.highContrast, this.visualTitle];
}

export class VisualFormattingSettingsModel extends Model {
    card = new CardSettings();
    mainValue = new MainValueSettings();
    label = new LabelSettings();
    variance = new VarianceSettings();
    smallMultiples = new SmallMultiplesSettings();
    accessibility = new AccessibilitySettings();
    cards = [this.card, this.mainValue, this.label, this.variance, this.smallMultiples, this.accessibility];
}
