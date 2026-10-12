/**
 * Claves de traducción del panel de formato, sacadas de capabilities.json (objeto ->
 * propiedad -> clave, y clave de cada opción de las listas). Generado por i18n_wire.py:
 * no editar a mano; regenerar si cambian las claves.
 */
export interface I18nProp { k?: string; d?: string; e: Record<string, string>; }
export interface I18nCard { k?: string; d?: string; p: Record<string, I18nProp>; }
export const I18N: Record<string, I18nCard> = {
    "style": {
        "k": "Object_Style",
        "d": undefined,
        "p": {
            "template": {
                "k": "Prop_Style_Template",
                "d": undefined,
                "e": {
                    "classic": "Enum_Style_Classic",
                    "clean": "Enum_Style_Clean",
                    "bold": "Enum_Style_Bold",
                    "minimal": "Enum_Style_Minimal",
                    "soft": "Enum_Style_Soft",
                    "midnight": "Enum_Style_Midnight"
                }
            },
            "guide": {
                "k": "Prop_Style_Guide",
                "d": undefined,
                "e": {}
            }
        }
    },
    "card": {
        "k": "Object_Card",
        "d": undefined,
        "p": {
            "background": {
                "k": "Prop_Card_Background",
                "d": undefined,
                "e": {}
            },
            "borderColor": {
                "k": "Prop_Card_BorderColor",
                "d": undefined,
                "e": {}
            },
            "borderWidth": {
                "k": "Prop_Card_BorderWidth",
                "d": undefined,
                "e": {}
            },
            "borderRadius": {
                "k": "Prop_Card_BorderRadius",
                "d": undefined,
                "e": {}
            },
            "padding": {
                "k": "Prop_Card_Padding",
                "d": undefined,
                "e": {}
            },
            "shadow": {
                "k": "Prop_Card_Shadow",
                "d": undefined,
                "e": {}
            }
        }
    },
    "mainValue": {
        "k": "Object_MainValue",
        "d": undefined,
        "p": {
            "fontFamily": {
                "k": "Prop_FontFamily",
                "d": undefined,
                "e": {}
            },
            "fontSize": {
                "k": "Prop_FontSize",
                "d": undefined,
                "e": {}
            },
            "bold": {
                "k": "Prop_Bold",
                "d": undefined,
                "e": {}
            },
            "color": {
                "k": "Prop_Color",
                "d": undefined,
                "e": {}
            },
            "displayUnit": {
                "k": "Prop_DisplayUnit",
                "d": undefined,
                "e": {}
            },
            "decimalPlaces": {
                "k": "Prop_DecimalPlaces",
                "d": undefined,
                "e": {}
            },
            "prefix": {
                "k": "Prop_Prefix",
                "d": undefined,
                "e": {}
            },
            "suffix": {
                "k": "Prop_Suffix",
                "d": undefined,
                "e": {}
            }
        }
    },
    "label": {
        "k": "Object_Label",
        "d": undefined,
        "p": {
            "show": {
                "k": "Prop_Show",
                "d": undefined,
                "e": {}
            },
            "fontSize": {
                "k": "Prop_FontSize",
                "d": undefined,
                "e": {}
            },
            "color": {
                "k": "Prop_Color",
                "d": undefined,
                "e": {}
            },
            "fontFamily": {
                "k": "Prop_Label_FontFamily",
                "d": undefined,
                "e": {}
            },
            "bold": {
                "k": "Prop_Label_Bold",
                "d": undefined,
                "e": {}
            }
        }
    },
    "variance": {
        "k": "Object_Variance",
        "d": undefined,
        "p": {
            "show": {
                "k": "Prop_Show",
                "d": undefined,
                "e": {}
            },
            "positiveColor": {
                "k": "Prop_Variance_PositiveColor",
                "d": undefined,
                "e": {}
            },
            "negativeColor": {
                "k": "Prop_Variance_NegativeColor",
                "d": undefined,
                "e": {}
            },
            "neutralColor": {
                "k": "Prop_Variance_NeutralColor",
                "d": undefined,
                "e": {}
            },
            "invertColors": {
                "k": "Prop_Variance_Invert",
                "d": undefined,
                "e": {}
            },
            "showArrow": {
                "k": "Prop_Variance_Arrow",
                "d": undefined,
                "e": {}
            },
            "showPill": {
                "k": "Prop_Variance_Pill",
                "d": undefined,
                "e": {}
            },
            "fontSize": {
                "k": "Prop_FontSize",
                "d": undefined,
                "e": {}
            }
        }
    },
    "smallMultiplesLayout": {
        "k": "Object_SmallMultiples",
        "d": undefined,
        "p": {
            "columns": {
                "k": "Prop_SM_Columns",
                "d": undefined,
                "e": {}
            },
            "gap": {
                "k": "Prop_SM_Gap",
                "d": undefined,
                "e": {}
            },
            "showTitle": {
                "k": "Prop_SM_ShowTitle",
                "d": undefined,
                "e": {}
            },
            "titleFontSize": {
                "k": "Prop_SM_TitleFontSize",
                "d": undefined,
                "e": {}
            },
            "titleColor": {
                "k": "Prop_SM_TitleColor",
                "d": undefined,
                "e": {}
            },
            "titleFontFamily": {
                "k": "Prop_SM_TitleFontFamily",
                "d": undefined,
                "e": {}
            },
            "titleBold": {
                "k": "Prop_SM_TitleBold",
                "d": undefined,
                "e": {}
            }
        }
    },
    "status": {
        "k": "Object_Status",
        "d": "Object_Status_Desc",
        "p": {
            "show": {
                "k": "Prop_Status_Show",
                "d": undefined,
                "e": {}
            },
            "basis": {
                "k": "Prop_Status_Basis",
                "d": undefined,
                "e": {
                    "target": "Enum_Status_Target",
                    "prior": "Enum_Status_Prior",
                    "value": "Enum_Status_ValueItself"
                }
            },
            "lowThreshold": {
                "k": "Prop_Status_Low",
                "d": undefined,
                "e": {}
            },
            "highThreshold": {
                "k": "Prop_Status_High",
                "d": undefined,
                "e": {}
            },
            "lowerIsBetter": {
                "k": "Prop_Status_LowerBetter",
                "d": undefined,
                "e": {}
            },
            "goodColor": {
                "k": "Prop_Status_Good",
                "d": undefined,
                "e": {}
            },
            "warnColor": {
                "k": "Prop_Status_Warn",
                "d": undefined,
                "e": {}
            },
            "badColor": {
                "k": "Prop_Status_Bad",
                "d": undefined,
                "e": {}
            },
            "applyTo": {
                "k": "Prop_Status_ApplyTo",
                "d": undefined,
                "e": {
                    "both": "Enum_Status_Both",
                    "value": "Enum_Status_Value",
                    "accent": "Enum_Status_Accent",
                    "background": "Enum_Status_Background",
                    "border": "Enum_Status_Border"
                }
            },
            "showText": {
                "k": "Prop_Status_ShowText",
                "d": undefined,
                "e": {}
            }
        }
    },
    "general": {
        "k": "Object_General",
        "d": undefined,
        "p": {
            "formatString": {
                "k": undefined,
                "d": undefined,
                "e": {}
            }
        }
    },
    "accessibility": {
        "k": "Object_Accessibility",
        "d": undefined,
        "p": {
            "highContrast": {
                "k": "Prop_Accessibility_HighContrast",
                "d": undefined,
                "e": {}
            },
            "visualTitle": {
                "k": "Prop_Accessibility_Title",
                "d": undefined,
                "e": {}
            }
        }
    },
    "trend": {
        "k": "Object_Trend",
        "d": undefined,
        "p": {
            "show": {
                "k": "Prop_Trend_Show",
                "d": undefined,
                "e": {}
            },
            "type": {
                "k": "Prop_Trend_Type",
                "d": undefined,
                "e": {}
            },
            "color": {
                "k": "Prop_Trend_Color",
                "d": undefined,
                "e": {}
            },
            "lineWidth": {
                "k": "Prop_Trend_LineWidth",
                "d": undefined,
                "e": {}
            },
            "areaOpacity": {
                "k": "Prop_Trend_AreaOpacity",
                "d": undefined,
                "e": {}
            },
            "height": {
                "k": "Prop_Trend_Height",
                "d": undefined,
                "e": {}
            },
            "showDot": {
                "k": "Prop_Trend_ShowDot",
                "d": undefined,
                "e": {}
            },
            "showTargetLine": {
                "k": "Prop_Trend_ShowTargetLine",
                "d": undefined,
                "e": {}
            },
            "targetColor": {
                "k": "Prop_Trend_TargetColor",
                "d": undefined,
                "e": {}
            }
        }
    },
    "subTotals": {
        "k": undefined,
        "d": undefined,
        "p": {
            "rowSubtotals": {
                "k": undefined,
                "d": undefined,
                "e": {}
            },
            "perRowLevel": {
                "k": undefined,
                "d": undefined,
                "e": {}
            },
            "columnSubtotals": {
                "k": undefined,
                "d": undefined,
                "e": {}
            },
            "perColumnLevel": {
                "k": undefined,
                "d": undefined,
                "e": {}
            },
            "levelSubtotalEnabled": {
                "k": undefined,
                "d": undefined,
                "e": {}
            }
        }
    },
    "image": {
        "k": "Object_Image",
        "d": undefined,
        "p": {
            "show": {
                "k": "Prop_Image_Show",
                "d": undefined,
                "e": {}
            },
            "height": {
                "k": "Prop_Image_Height",
                "d": undefined,
                "e": {}
            },
            "radius": {
                "k": "Prop_Image_Radius",
                "d": undefined,
                "e": {}
            }
        }
    },
    "period": {
        "k": "Obj_Period",
        "d": "Obj_Period_Desc",
        "p": {
            "valueMode": {
                "k": "Prop_Period_ValueMode",
                "d": undefined,
                "e": {
                    "total": "Enum_Period_Total",
                    "latest": "Enum_Period_Latest",
                    "window": "Enum_Period_Window"
                }
            },
            "windowSize": {
                "k": "Prop_Period_WindowSize",
                "d": undefined,
                "e": {}
            },
            "compareOffset": {
                "k": "Prop_Period_CompareOffset",
                "d": undefined,
                "e": {}
            },
            "showPeriodLabel": {
                "k": "Prop_Period_ShowPeriodLabel",
                "d": undefined,
                "e": {}
            }
        }
    },
    "secondaryKpis": {
        "k": "Obj_SecondaryKpis",
        "d": undefined,
        "p": {
            "show": {
                "k": "Prop_SecKpi_Show",
                "d": undefined,
                "e": {}
            },
            "position": {
                "k": "Prop_SecKpi_Position",
                "d": undefined,
                "e": {
                    "auto": "Enum_SecKpi_Auto",
                    "right": "Enum_SecKpi_Right",
                    "bottom": "Enum_SecKpi_Bottom"
                }
            },
            "minWidth": {
                "k": "Prop_SecKpi_MinWidth",
                "d": undefined,
                "e": {}
            },
            "showVariance": {
                "k": "Prop_SecKpi_ShowVariance",
                "d": undefined,
                "e": {}
            },
            "valueFontSize": {
                "k": "Prop_SecKpi_ValueFontSize",
                "d": undefined,
                "e": {}
            },
            "labelFontSize": {
                "k": "Prop_SecKpi_LabelFontSize",
                "d": undefined,
                "e": {}
            },
            "color": {
                "k": "Prop_SecKpi_Color",
                "d": undefined,
                "e": {}
            },
            "labelColor": {
                "k": "Prop_SecKpi_LabelColor",
                "d": undefined,
                "e": {}
            }
        }
    },
    "secondary": {
        "k": "Object_Secondary",
        "d": undefined,
        "p": {
            "show": {
                "k": "Prop_Secondary_Show",
                "d": undefined,
                "e": {}
            },
            "fontFamily": {
                "k": "Prop_Secondary_FontFamily",
                "d": undefined,
                "e": {}
            },
            "fontSize": {
                "k": "Prop_Secondary_FontSize",
                "d": undefined,
                "e": {}
            },
            "color": {
                "k": "Prop_Secondary_Color",
                "d": undefined,
                "e": {}
            }
        }
    }
};
