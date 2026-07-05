"use client";

import { useState } from "react";

import { Avatar, Badge, Button, Icon, Note, Spinner } from "~/components/geist";
import { ButtonLink } from "~/components/site/button-link";
import { shortDate, timeAgo } from "~/lib/time";
import { api, type RouterOutputs } from "~/trpc/react";

type Message = RouterOutputs["contact"]["list"][number];

/** Bandeja de entrada del formulario de contacto — filas collapsables. */
export function MessagesAdmin() {
  const messages = api.contact.list.useQuery();
  const [openId, setOpenId] = useState<number | null>(null);
  const utils = api.useUtils();
  const markRead = api.contact.markRead.useMutation({
    onSuccess: () => void utils.contact.invalidate(),
  });

  if (messages.isPending)
    return (
      <div className="adm-state">
        <Spinner size="large" />
      </div>
    );
  if (messages.isError)
    return (
      <div className="adm-state">
        <Note type="error" label="Sin conexión a la base">
          No se pudieron cargar los mensajes.
        </Note>
      </div>
    );

  const toggle = (m: Message) => {
    const opening = openId !== m.id;
    setOpenId(opening ? m.id : null);
    // Expandir un mensaje no leído lo marca como leído.
    if (opening && !m.read) markRead.mutate({ id: m.id });
  };

  return (
    <div className="adm-section">
      {messages.data.length === 0 ? (
        <Note type="default" label="Bandeja vacía">
          Cuando alguien complete el formulario de contacto, su mensaje aparece acá.
        </Note>
      ) : (
        <div className="adm-rows">
          {messages.data.map((m) => (
            <div
              key={m.id}
              className={
                "msg-item" + (m.read ? "" : " is-unread") + (openId === m.id ? " is-open" : "")
              }
            >
              <button
                type="button"
                className="msg-row"
                aria-expanded={openId === m.id}
                onClick={() => toggle(m)}
              >
                <span className="msg-row__dot" aria-hidden="true" />
                <Avatar name={m.name} size={34} />
                <span className="msg-row__body">
                  <span className="msg-row__head">
                    <strong>{m.name}</strong>
                    <span className="msg-row__mail">{m.email}</span>
                  </span>
                  <span className="msg-row__subject">
                    {m.subject ??
                      (m.message.length > 80 ? m.message.slice(0, 80) + "…" : m.message)}
                  </span>
                </span>
                <time className="msg-row__when" suppressHydrationWarning>
                  {timeAgo(m.createdAt, "es")}
                </time>
                <span className="msg-row__chev" aria-hidden="true">
                  <Icon name="chevron-down" size={16} color="var(--ds-gray-700)" />
                </span>
              </button>
              {openId === m.id && <MessageDetail message={m} onClose={() => setOpenId(null)} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageDetail({ message, onClose }: { message: Message; onClose: () => void }) {
  const utils = api.useUtils();
  const remove = api.contact.delete.useMutation({
    onSuccess: () => {
      void utils.contact.invalidate();
      onClose();
    },
  });

  const mailto = `mailto:${message.email}?subject=${encodeURIComponent(
    message.subject ? `Re: ${message.subject}` : "Re: tu consulta en valentinvarela.cloud",
  )}`;

  return (
    <div className="msg-detail">
      <div className="msg-detail__meta">
        {message.subject && (
          <Badge color="gray" size="small">
            {message.subject}
          </Badge>
        )}
        <span className="msg-detail__date" suppressHydrationWarning>
          {shortDate(message.createdAt, "es")} ·{" "}
          {message.createdAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
        </span>
        <a className="msg-detail__mail" href={`mailto:${message.email}`}>
          {message.email}
        </a>
      </div>
      <div className="msg-detail__body">
        {message.message.split(/\n{2,}/).map((p) => (
          <p key={p.slice(0, 40)}>{p}</p>
        ))}
      </div>
      {remove.isError && (
        <Note type="error" style={{ marginTop: 10 }}>
          No se pudo eliminar el mensaje. Probá de nuevo.
        </Note>
      )}
      <div className="msg-detail__actions">
        <Button
          variant="error"
          size="small"
          loading={remove.isPending}
          onClick={() => {
            if (window.confirm(`¿Eliminar el mensaje de ${message.name}?`)) {
              remove.mutate({ id: message.id });
            }
          }}
        >
          Eliminar
        </Button>
        <ButtonLink href={mailto} variant="primary" size="small">
          Responder por email
        </ButtonLink>
      </div>
    </div>
  );
}
