import { db } from "~/server/db";
import { requirePanel } from "~/server/panel/auth";
import { todayLogical } from "~/lib/panel/logical-date";

export default async function PanelHome() {
  // La guarda va también acá, no solo en el layout: los layouts no se
  // re-renderizan en la navegación del lado del cliente.
  await requirePanel();

  const today = todayLogical();
  const [metrics, events] = await Promise.all([
    db.panelMetric.count({ where: { archivedAt: null } }),
    db.panelEvent.count(),
  ]);

  return (
    <div className="panel-page">
      <div className="eyebrow">Hoy</div>
      <h1>{today}</h1>
      <p className="panel-lead">
        El esqueleto está en pie. Todavía no hay check-in ni métricas: eso viene en el
        próximo paso.
      </p>
      <div className="panel-stats">
        <div className="stat">
          <strong>{metrics}</strong>
          <span>Métricas definidas</span>
        </div>
        <div className="stat">
          <strong>{events}</strong>
          <span>Eventos registrados</span>
        </div>
      </div>
    </div>
  );
}
