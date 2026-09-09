import { nightLabel, longDayLabel } from "~/lib/panel/format";
import { todayLogical } from "~/lib/panel/logical-date";
import { db } from "~/server/db";
import { requirePanel } from "~/server/panel/auth";
import { CheckinForm } from "./_components/checkin-form";

export default async function CheckinPage() {
  await requirePanel();

  // El día lógico y las etiquetas se calculan acá, en el servidor, no con un
  // useQuery: son aritmética de reloj y no necesitan la base. Con un round
  // trip a Supabase (~1 s) el presupuesto de 5 segundos de fricción se lo
  // comería el spinner en vez del gesto.
  const today = todayLogical();

  const metrics = await db.panelMetric.findMany({
    where: { archivedAt: null },
    orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
    select: { key: true, name: true, kind: true, unit: true, targetValue: true },
  });

  return (
    <CheckinForm
      logicalDate={today}
      dayLabel={longDayLabel(today)}
      nightLabel={nightLabel(today)}
      habits={metrics.filter((m) => m.kind === "habit")}
    />
  );
}
