"use client";

import { NicheCard } from "~/components/site/niche-card";
import { usePrefs } from "~/components/site/prefs";
import { Reveal } from "~/components/site/reveal";
import type { RouterOutputs } from "~/trpc/react";

export function NichesPage({ niches }: { niches: RouterOutputs["catalog"]["niches"] }) {
  const { t } = usePrefs();
  return (
    <div className="wrap page-pad">
      <div className="page-head">
        <div>
          <div className="eyebrow">{t.niches.eyebrow}</div>
          <h1>{t.niches.title}</h1>
          <p className="lead">{t.niches.pageLead}</p>
        </div>
      </div>
      <div className="ngrid">
        {niches.map((n, i) => (
          <Reveal key={n.id} index={i}>
            <NicheCard n={n} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
