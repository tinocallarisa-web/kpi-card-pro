"""
Genera assets/sample-data-kpi.csv para probar KPI Card Pro.

36 meses (2024-01 a 2026-12) x 12 subcanales en 5 canales, con tendencia,
estacionalidad por canal y ruido reproducible. Incluye el mes anterior y el
mismo mes del ano anterior ya calculados, para poder llenar el well
"Prior Period" sin escribir DAX.

Sin dependencias.  Uso:  python assets/make-sample-data.py
"""

import csv
import io
import os

# ─────────────────────────────────────────────────────────────── datos ────

MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
         "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

# canal -> (subcanales, base mensual, crecimiento anual, perfil estacional)
# El perfil es un multiplicador por mes: 1.0 es un mes normal.
CANALES = {
    "HOTEL": (
        ["Hotel 3*", "Hotel 4*", "Hotel 5*"],
        42000, 0.08,
        [0.72, 0.75, 0.88, 1.00, 1.10, 1.28, 1.45, 1.52, 1.18, 0.95, 0.78, 0.88],
    ),
    "BAR": (
        ["Bar Tapas", "Bar Copas"],
        31000, 0.05,
        [0.85, 0.86, 0.95, 1.02, 1.12, 1.25, 1.38, 1.40, 1.10, 0.98, 0.88, 1.05],
    ),
    "RESTAURANTE": (
        ["Restaurante Menu", "Restaurante Carta", "Restaurante Rapido"],
        38000, 0.06,
        [0.90, 0.92, 0.98, 1.05, 1.10, 1.15, 1.22, 1.20, 1.08, 1.02, 0.95, 1.20],
    ),
    "DISCOTECA": (
        ["Discoteca Sala", "Discoteca Club"],
        26000, 0.03,
        [0.70, 0.72, 0.82, 0.95, 1.15, 1.42, 1.65, 1.70, 1.15, 0.85, 0.72, 1.05],
    ),
    "CAFETERIA": (
        ["Cafeteria Centro", "Cafeteria Barrio"],
        18000, 0.04,
        [1.02, 1.00, 1.02, 1.00, 0.98, 0.92, 0.85, 0.80, 1.05, 1.08, 1.05, 1.10],
    ),
}

ANIO_INI, ANIO_FIN = 2024, 2026


def rnd(seed):
    """LCG minimo: mismo CSV en cada ejecucion, sin depender de random."""
    return ((seed * 1103515245 + 12345) >> 8) % 10000 / 10000.0


def ventas(canal, sub, i_sub, anio, mes):
    subs, base, growth, season = CANALES[canal]
    # Cada subcanal pesa distinto dentro de su canal.
    peso = [1.00, 0.72, 0.48][i_sub] if i_sub < 3 else 0.4
    meses_desde_inicio = (anio - ANIO_INI) * 12 + (mes - 1)
    tendencia = (1 + growth) ** (meses_desde_inicio / 12.0)
    ruido = 0.88 + rnd(hash((canal, sub, anio, mes)) & 0x7FFFFFFF) * 0.24
    return round(base * peso * tendencia * season[mes - 1] * ruido)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "sample-data-kpi.csv")

    # Primero todo en memoria, para poder mirar atras.
    datos = {}
    for canal, (subs, _b, _g, _s) in CANALES.items():
        for i, sub in enumerate(subs):
            for anio in range(ANIO_INI, ANIO_FIN + 1):
                for mes in range(1, 13):
                    datos[(sub, anio, mes)] = ventas(canal, sub, i, anio, mes)

    filas = 0
    with io.open(out, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow([
            "Fecha", "Anio", "MesNumero", "Mes",
            "Canal", "Subcanal",
            "Ventas", "VentasMesAnterior", "VentasAnioAnterior", "Objetivo",
        ])
        for canal, (subs, _b, _g, _s) in CANALES.items():
            for sub in subs:
                for anio in range(ANIO_INI, ANIO_FIN + 1):
                    for mes in range(1, 13):
                        v = datos[(sub, anio, mes)]

                        pm_anio, pm_mes = (anio, mes - 1) if mes > 1 else (anio - 1, 12)
                        prev_mes = datos.get((sub, pm_anio, pm_mes), "")
                        prev_anio = datos.get((sub, anio - 1, mes), "")

                        # Objetivo: el ano anterior mas un 7%, o la propia venta
                        # menos un margen cuando no hay historico.
                        objetivo = round(prev_anio * 1.07) if prev_anio else round(v * 0.95)

                        w.writerow([
                            "%04d-%02d-01" % (anio, mes), anio, mes, MESES[mes - 1],
                            canal, sub, v, prev_mes, prev_anio, objetivo,
                        ])
                        filas += 1

    print("Escrito: %s" % out)
    print("  filas      : %d" % filas)
    print("  meses      : %d (%d-01 a %d-12)" % ((ANIO_FIN - ANIO_INI + 1) * 12, ANIO_INI, ANIO_FIN))
    print("  canales    : %d" % len(CANALES))
    print("  subcanales : %d" % sum(len(v[0]) for v in CANALES.values()))
    print("  tamano     : %.1f KB" % (os.path.getsize(out) / 1024.0))


if __name__ == "__main__":
    main()
