import Link from "next/link";

import { HeatmapYear } from "~/components/panel/heatmap-year";
import { Sparkline } from "~/components/panel/sparkline";
import { longDayLabel } from "~/lib/panel/format";
import { asPercent, type MetricResult } from "~/lib/panel/metrics";
import { db } from "~/server/db";
import { requirePanel } from "~/server/panel/auth";
import { buildOverview, WINDOW_DAYS, type Freshness } from "~/server/panel/overview";

/**
 * Nivel 1 y 2 del dashboard (spec §8). El nivel 3 (proyectos con deuda) y el
 * panel de señales no están: dependen de datos que el v1 no tiene todavía, y
 * un dashboard con veinte números no se lee, se ignora.
 *
 * Momentum y consistencia tampoco. Momentum necesita ~29 observaciones por el
 * warm-up de su EWMA lenta, así que mostrarlo el día seis sería un número
 * convincente y falso; y consistencia sobre hábitos binarios es una
 * reescritura monótona de la adherencia, o sea el mismo dato dos veces.
 */
export default async function PanelHome() {
  await requirePanel();
  const o = await buildOverview(db);

  const hasData = o.habits.some((h) => h.adherence.n > 0);

  return (
    <div className="panel-page">
      <div className="eyebrow">Hoy</div>
      <h1>{longDayLabel(o.today)}</h1>

      {!hasData && (
        <p className="panel-lead">
          Todavía no hay nada medido. Cargá tu primer{" "}
          <Link href="/panel/checkin">check-in</Link> y esto se llena solo.
        </p>
      )}

      {/* ---- Nivel 1 ---- */}
      <div className="panel-stats">
        <Stat label={`Adherencia ${WINDOW_DAYS}d`} result={o.adherence28} />
        <Stat label={`Completitud ${WINDOW_DAYS}d`} result={o.completeness28} />
      </div>

      <section className="ci-block">
        <h2>El año</h2>
        <HeatmapYear days={o.heatmap} />
      </section>

      {/* ---- Nivel 2: hábitos ---- */}
      {o.habits.length > 0 && (
        <section className="ci-block">
          <h2>Hábitos</h2>
          <div className="rows">
            {o.habits.map((h) => (
              <div className="row" key={h.key}>
                <div className="row__name">
                  <strong>{h.name}</strong>
                  <span>
                    {h.target}
                    {h.unit === "min" ? " min" : ""} por día
                  </span>
                </div>
                <Sparkline values={h.series} domain={[0, 1]} />
                <div className="row__num">
                  <strong className={barClass(h.adherence)}>{asPercent(h.adherence)}</strong>
                  <span>n {h.adherence.n}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- Nivel 2: check-in. Sin barra, sin umbral, sin racha ---- */}
      {o.checkins.length > 0 && (
        <section className="ci-block">
          <h2>Registro</h2>
          <p className="ci-sub">
            Sueño, energía y ánimo se registran, no se puntúan: no tienen objetivo ni racha.
          </p>
          <div className="rows">
            {o.checkins.map((c) => {
              const last = [...c.series].reverse().find((v) => v !== null) ?? null;
              return (
                <div className="row" key={c.key}>
                  <div className="row__name">
                    <strong>{c.name}</strong>
                  </div>
                  <Sparkline values={c.series} domain={c.domain} />
                  <div className="row__num">
                    <strong>{formatLast(last, c.unit)}</strong>
                    <span>último</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <p className="panel-fresh">{freshnessLabel(o.freshness)}</p>
    </div>
  );
}

function Stat({ label, result }: { label: string; result: MetricResult }) {
  return (
    <div className="stat">
      <strong>{asPercent(result)}</strong>
      <span>
        {label} · n {result.n}
      </span>
    </div>
  );
}

/** Umbrales de la spec §4: >80% verde, 50-80% amarillo, <50% mal diseñado. */
function barClass(r: MetricResult): string {
  if (r.value === null) return "num num--none";
  // Con muestra chica no hay semaforo. Un habito de un dia al 100% no es el
  // mismo verde que uno con 28 dias, y uno recien sembrado sin marcar saldria
  // rojo con n 1, que es el color que la spec reserva para "el habito esta
  // mal disenado". La primera semana es justo cuando decidis si el sistema sirve.
  if (r.n < 7) return "num num--none";
  if (r.value > 0.8) return "num num--good";
  if (r.value >= 0.5) return "num num--mid";
  return "num num--low";
}

/**
 * "Rollup: ok" sin fecha sigue diciendo ok el viernes aunque el cron haya
 * muerto el martes, y como los dias sin fila salen del denominador el
 * porcentaje casi no se mueve: lo unico que encoge es el n.
 */
function freshnessLabel(f: Freshness): string {
  const faltan = f.pendingDays === 1 ? "1 día cerrado" : `${f.pendingDays} días cerrados`;

  // "Todavía no corrió" es tranquilizador el primer día y alarmante a las tres
  // semanas, y el texto era el mismo en los dos casos. Los días pendientes son
  // lo que separa una cosa de la otra, y es la única señal que sobrevive a que
  // el job muera antes de escribir su fila en JobRun.
  if (!f.lastRunAt) {
    return f.pendingDays > 0
      ? `El rollup nunca corrió y hay ${faltan} sin consolidar. El cron no está andando.`
      : "El rollup todavía no corrió. Hoy se calcula en vivo igual.";
  }

  const d = f.staleDays ?? 0;
  const cuando = d <= 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`;
  if (!f.ok) return `Rollup: falló (${cuando}). Los días cerrados pueden estar desactualizados.`;
  if (f.pendingDays > 0) {
    return `Rollup: ${faltan} sin consolidar (última corrida ${cuando}). El cron no está al día.`;
  }
  if (d >= 2) return `Rollup: última corrida ${cuando}. El cron puede estar caído.`;
  return `Rollup: ok (${cuando}). Hoy se calcula en vivo.`;
}

function formatLast(v: number | null, unit: string): string {
  // Guion corto, no largo: el sitio no usa guiones largos en ningún texto.
  if (v === null) return "-";
  if (unit === "min") {
    const h = Math.floor(v / 60);
    const m = Math.round(v % 60);
    return m === 0 ? `${h} h` : `${h} h ${m}`;
  }
  return String(v);
}
