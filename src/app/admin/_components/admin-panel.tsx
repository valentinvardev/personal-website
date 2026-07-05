"use client";

import { useState } from "react";

import { Button, Tabs } from "~/components/geist";
import { logout } from "../actions";
import { CapturesAdmin } from "./captures-admin";
import { NichesAdmin } from "./niches-admin";
import { ProjectsAdmin } from "./projects-admin";

export function AdminPanel() {
  const [tab, setTab] = useState("projects");

  return (
    <div className="wrap page-pad">
      <div className="page-head">
        <div>
          <div className="eyebrow">Admin</div>
          <h1>Contenido del sitio</h1>
          <p className="lead">
            Proyectos, nichos con su material (tarjetas de texto e imagen) y las capturas del
            modal “Ver sitio”. Todo lo que cargues acá se publica al instante.
          </p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="secondary" size="small">
            Cerrar sesión
          </Button>
        </form>
      </div>

      <Tabs
        items={[
          { value: "projects", label: "Proyectos" },
          { value: "niches", label: "Nichos y material" },
          { value: "captures", label: "Capturas" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "projects" && <ProjectsAdmin />}
      {tab === "niches" && <NichesAdmin />}
      {tab === "captures" && <CapturesAdmin />}
    </div>
  );
}
