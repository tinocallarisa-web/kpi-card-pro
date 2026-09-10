/**
 * build-changelog.js — KPI Card Pro
 *
 * Genera changelog.html a partir de CHANGELOG.md y de la versión que hay en
 * pbiviz.json. Sin dependencias.
 *
 * Existe para que la página publicada no pueda derivar del changelog real: si
 * se mantienen a mano, el HTML se queda atrás y el visual acaba anunciando una
 * versión que no es la suya. Un CHANGELOG.md que no se sirve en GitHub Pages
 * tampoco cuenta como señal de actividad de release.
 *
 * Uso:  node scripts/build-changelog.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MD = path.join(ROOT, "CHANGELOG.md");
const OUT = path.join(ROOT, "changelog.html");

const version = JSON.parse(fs.readFileSync(path.join(ROOT, "pbiviz.json"), "utf8")).visual.version;

function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Negrita, código y enlaces. Se escapa primero: el markdown va después. */
function inline(s) {
    return esc(s)
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

const lines = fs.readFileSync(MD, "utf8").split(/\r?\n/);
const out = [];
let inList = false;

const closeList = () => { if (inList) { out.push("    </ul>"); inList = false; } };

for (const raw of lines) {
    const line = raw.trimEnd();

    let m = line.match(/^## \[?([\d.]+)\]?\s*[—-]?\s*(.*)$/);
    if (m) {
        closeList();
        const actual = m[1] === version;
        out.push("    <div class=\"rel\">");
        out.push("      <div class=\"rel-head\">");
        out.push(`        <span class="rel-ver">${esc(m[1])}</span>`);
        if (actual) out.push('        <span class="tag tag-cur">Current</span>');
        if (m[2]) out.push(`        <span class="rel-date">${esc(m[2])}</span>`);
        out.push("      </div>");
        continue;
    }

    m = line.match(/^### (.+)$/);
    if (m) {
        closeList();
        const kind = m[1].toLowerCase();
        const cls = kind.startsWith("add") ? "add"
            : kind.startsWith("chang") ? "chg"
            : kind.startsWith("remov") ? "rem"
            : kind.startsWith("fix") ? "fix" : "doc";
        out.push(`      <h4><span class="tag tag-${cls}">${esc(m[1])}</span></h4>`);
        continue;
    }

    m = line.match(/^-\s+(.*)$/);
    if (m) {
        if (!inList) { out.push("    <ul>"); inList = true; }
        out.push(`      <li>${inline(m[1])}</li>`);
        continue;
    }

    // Continuación de un elemento de lista.
    if (inList && /^\s{2,}\S/.test(raw)) {
        out[out.length - 1] = out[out.length - 1].replace(/<\/li>$/, " " + inline(line.trim()) + "</li>");
        continue;
    }

    if (line === "" && inList) closeList();
}
closeList();

// Cierra el último bloque de release.
const body = out.join("\n") + "\n    </div>";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Changelog — KPI Card Pro | TCViz</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-size: 15px;
           line-height: 1.7; color: #1a1a1a; background: #fff;
           max-width: 760px; margin: 0 auto; padding: 48px 24px 80px; }
    header { border-bottom: 1px solid #e8e8e8; padding-bottom: 24px; margin-bottom: 32px; }
    .brand { font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
             color: #0078D4; text-decoration: none; }
    h1 { font-size: 28px; font-weight: 700; margin-top: 12px; }
    .meta { font-size: 13px; color: #666; margin-top: 6px; }
    .rel { border: 1px solid #e8e8e8; border-radius: 10px; padding: 20px 24px; margin-bottom: 20px; }
    .rel-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
    .rel-ver { font-size: 18px; font-weight: 700; }
    .rel-date { font-size: 13px; color: #666; }
    .tag { display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase;
           letter-spacing: .5px; padding: 2px 8px; border-radius: 20px; color: #fff; }
    .tag-cur { background: #0078D4; }
    .tag-add { background: #2E7D5B; }
    .tag-chg { background: #8A6D1F; }
    .tag-rem { background: #8C3A3A; }
    .tag-fix { background: #2E5BA8; }
    .tag-doc { background: #605E5C; }
    h4 { margin: 16px 0 6px; font-weight: 400; }
    ul { margin: 0 0 4px 20px; }
    li { margin-bottom: 8px; }
    code { background: #f1f3f5; padding: 1px 5px; border-radius: 4px; font-size: 13px; }
    a { color: #0078D4; }
    footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e8e8e8;
             font-size: 13px; color: #999; }
  </style>
</head>
<body>
  <header>
    <a class="brand" href="https://tcviz.com">TCViz</a>
    <h1>Changelog</h1>
    <p class="meta">KPI Card Pro &nbsp;·&nbsp; current version ${esc(version)}</p>
  </header>

  <main>
${body}
  </main>

  <footer>
    &copy; 2026 TCViz &nbsp;·&nbsp; <a href="https://tcviz.com">tcviz.com</a> &nbsp;·&nbsp;
    <a href="support.html">Support</a> &nbsp;·&nbsp;
    <a href="privacy.html">Privacy</a> &nbsp;·&nbsp;
    <a href="terms.html">Terms</a>
  </footer>
</body>
</html>
`;

fs.writeFileSync(OUT, html, "utf8");
console.log("Escrito: " + OUT);
console.log("  version actual: " + version);
console.log("  releases:       " + (body.match(/class="rel-ver"/g) || []).length);
