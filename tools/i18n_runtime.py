# -*- coding: utf-8 -*-
"""src/strings.ts: traducciones de los textos que el visual escribe él mismo (asistente, estado, avisos...).
Son las claves que NO están en capabilities.json: Power BI Desktop solo resuelve con getDisplayName las
claves declaradas allí (el panel salía traducido y el asistente no), así que van dentro del bundle."""
import io, json, os, re
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
caps = io.open(R + r"\capabilities.json", encoding="utf-8-sig").read()
en = json.load(io.open(R + r"\stringResources\en-US\resources.resjson", encoding="utf-8"))
src = io.open(R + r"\src\visual.ts", encoding="utf-8").read()
usadas = set(re.findall(r'this\.t\(\s*"([A-Za-z0-9_]+)"', src)) | {k for k in en if k.startswith("Pro_")}
runtime = sorted(k for k in usadas if k in en and f'"{k}"' not in caps)
langs = sorted(d for d in os.listdir(R + r"\stringResources") if d != "en-US")
tabla = {}
for l in langs:
    d = json.load(io.open(R + rf"\stringResources\{l}\resources.resjson", encoding="utf-8"))
    tabla[l] = {k: d[k] for k in runtime if d.get(k) and d[k] != en[k]}
ts = ["/**",
      " * Traducciones de los textos que escribe el propio visual (asistente, estado, avisos, etiquetas).",
      " * Power BI Desktop solo resuelve con getDisplayName las claves declaradas en capabilities.json, así",
      " * que estas, que no lo están, viajan en el bundle. Generado por i18n_runtime.py desde stringResources:",
      " * no editar a mano.",
      " */",
      "export const STRINGS: Record<string, Record<string, string>> = " + json.dumps(tabla, ensure_ascii=False, indent=4) + ";", ""]
io.open(R + r"\src\strings.ts", "w", encoding="utf-8", newline="").write("\n".join(ts))
print("claves runtime", len(runtime), "| idiomas", len(langs), "|", runtime[:8], "...")
