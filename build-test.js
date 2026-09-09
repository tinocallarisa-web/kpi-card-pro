/**
 * build-test.js — KPI Card Pro
 *
 * Genera un .pbiviz de TEST que convive con la versión de AppSource, con su
 * propio GUID, para poder importar ambos en el mismo informe y comparar.
 *
 * Uso:
 *   node build-test.js            isPro forzado a true — prueba las funciones Pro
 *                                 sin licencia. GUID ..._test
 *   node build-test.js --free     tier Free REAL, sin forzar nada. El licenseManager
 *                                 no encuentra plan para este GUID, así que resuelve
 *                                 a Free. GUID ..._testfree
 *
 * El modo --free es el único que permite ver el camino Free: con el GUID real,
 * Power BI sirve la versión instalada desde AppSource y no la tuya.
 *
 * Los dos GUID son distintos a propósito. Si compartieran sufijo, Power BI
 * trataría ambas builds como el mismo visual y al importar la segunda seguirías
 * viendo la primera.
 *
 * El fuente queda SIEMPRE en estado producción: el script restaura al final,
 * incluso si el empaquetado falla.
 */

const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const ROOT        = __dirname;
const PBIVIZ_JSON = path.join(ROOT, 'pbiviz.json');
const VISUAL_TS   = path.join(ROOT, 'src', 'visual.ts');

const ORIGINAL_GUID = 'kpiCardProTCViz';
const TEST_GUID     = 'kpiCardProTCViz_test';
const FREE_GUID     = 'kpiCardProTCViz_testfree';

// La línea del inicializador, tal cual está en el fuente. Si cambia de forma,
// actualiza ESTE script — no toques el fuente para encajar con él.
const ISPRO_FALSE = 'private isPro: boolean = false;';
const ISPRO_TRUE  = 'private isPro: boolean = true; ';

const pbivizOrig = fs.readFileSync(PBIVIZ_JSON, 'utf8');
const visualOrig = fs.readFileSync(VISUAL_TS,   'utf8');

function restore() {
    fs.writeFileSync(PBIVIZ_JSON, pbivizOrig, 'utf8');
    fs.writeFileSync(VISUAL_TS,   visualOrig,  'utf8');
    console.log('✅  Ficheros restaurados al estado de producción.');
}

try {
    const freeMode = process.argv.includes('--free');
    const guid     = freeMode ? FREE_GUID : TEST_GUID;

    const pbiviz = JSON.parse(pbivizOrig);
    if (pbiviz.visual.guid !== ORIGINAL_GUID) {
        throw new Error(
            `GUID inesperado en pbiviz.json: "${pbiviz.visual.guid}".\n` +
            `Se esperaba "${ORIGINAL_GUID}". Restaura el fichero antes de seguir.`
        );
    }
    pbiviz.visual.guid = guid;
    fs.writeFileSync(PBIVIZ_JSON, JSON.stringify(pbiviz, null, 2), 'utf8');
    console.log(`📝  GUID   →  ${guid}`);

    if (freeMode) {
        console.log('📝  isPro  →  false  (--free: tier Free real, sin forzar)');
    } else {
        if (!visualOrig.includes(ISPRO_FALSE)) {
            throw new Error(
                `No se encontró "${ISPRO_FALSE}" en src/visual.ts.\n` +
                `Actualiza este script para que coincida con el fuente actual.`
            );
        }
        fs.writeFileSync(VISUAL_TS, visualOrig.replace(ISPRO_FALSE, ISPRO_TRUE), 'utf8');
        console.log('📝  isPro  →  true');
    }

    console.log('\n🔨  Ejecutando pbiviz package...\n');
    execSync('npx pbiviz package', { stdio: 'inherit', cwd: ROOT, shell: true });

    console.log('\n✅  Build de TEST completado.');
    console.log(`    GUID: ${guid}`);
    console.log('    Importa el .pbiviz de /dist/ en Power BI Desktop.\n');
} catch (err) {
    console.error('\n❌  Falló el build de test:', err.message, '\n');
    process.exitCode = 1;
} finally {
    restore();
}
