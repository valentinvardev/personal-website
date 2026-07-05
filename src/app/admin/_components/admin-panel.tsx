"use client";

import { useState } from "react";

import { Button, Tabs } from "~/components/geist";
import { api } from "~/trpc/react";
import { logout } from "../actions";
import { CapturesAdmin } from "./captures-admin";
import { MessagesAdmin } from "./messages-admin";
import { NichesAdmin } from "./niches-admin";
import { PostsAdmin } from "./posts-admin";
import { ProjectsAdmin } from "./projects-admin";

export function AdminPanel() {
  const [tab, setTab] = useState("posts");
  const unread = api.contact.unreadCount.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  return (
    <div className="wrap page-pad">
      <div className="page-head">
        <div>
          <div className="eyebrow">Admin</div>
          <h1>Contenido del sitio</h1>
          <p className="lead">
            Escritos, proyectos, nichos con su material, las capturas del modal “Ver sitio” y
            los mensajes del formulario de contacto. Todo lo que cargues acá se publica al
            instante.
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
          { value: "posts", label: "Escritos" },
          { value: "projects", label: "Proyectos" },
          { value: "niches", label: "Nichos y material" },
          { value: "captures", label: "Capturas" },
          {
            value: "messages",
            label: "Mensajes",
            count: unread.data && unread.data > 0 ? unread.data : undefined,
          },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "posts" && <PostsAdmin />}
      {tab === "projects" && <ProjectsAdmin />}
      {tab === "niches" && <NichesAdmin />}
      {tab === "captures" && <CapturesAdmin />}
      {tab === "messages" && <MessagesAdmin />}
    </div>
  );
}
