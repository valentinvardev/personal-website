"use client";

import { useEffect, useState } from "react";

import { Avatar, Badge, Button, Note, Spinner } from "~/components/geist";
import { shortDate, timeAgo } from "~/lib/time";
import { api, type RouterOutputs } from "~/trpc/react";
import { ButtonLink } from "~/components/site/button-link";

type Message = RouterOutputs["contact"]["list"][number];

/** Bandeja de entrada del formulario de contacto. */
export function MessagesAdmin() {
  const messages = api.contact.list.useQuery();
  const [openId, setOpenId] = useState<number | null>(null);

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

  const open = messages.data.find((m) => m.id === openId) ?? null;

  return (
    <div className="adm-section">
      {messages.data.length === 0 ? (
        <Note type="default" label="Bandeja vacía">
          Cuando alguien complete el formulario de contacto, su mensaje aparece acá.
        </Note>
      ) : (
        <div className="adm-rows">
          {messages.data.map((m) => (
            <button
              key={m.id}
              type="button"
              className={"msg-row" + (m.read ? "" : " is-unread")}
              onClick={() => setOpenId(m.id)}
            >
              <span className="msg-row__dot" aria-hidden="true" />
              <Avatar name={m.name} size={34} />
              <span className="msg-row__body">
                <span className="msg-row__head">
                  <strong>{m.name}</strong>
                  <span className="msg-row__mail">{m.email}</span>
                </span>
                <span className="msg-row__subject">
                  {m.subject ?? (m.message.length > 80 ? m.message.slice(0, 80) + "…" : m.message)}
                </span>
              </span>
              <time className="msg-row__when" suppressHydrationWarning>
                {timeAgo(m.createdAt, "es")}
              </time>
            </button>
          ))}
        </div>
      )}
      {open && <MessageModal message={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function MessageModal({ message, onClose }: { message: Message; onClose: () => void }) {
  const utils = api.useUtils();
  const invalidate = () => {
    void utils.contact.invalidate();
  };
  const markRead = api.contact.markRead.useMutation({ onSuccess: invalidate });
  const remove = api.contact.delete.useMutation({
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  // Abrir el mensaje lo marca como leído.
  useEffect(() => {
    if (!message.read) markRead.mutate({ id: message.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const mailto = `mailto:${message.email}?subject=${encodeURIComponent(
    message.subject ? `Re: ${message.subject}` : "Re: tu consulta en valentinvarela.cloud",
  )}`;

  return (
    <div className="pv-scrim" onClick={onClose}>
      <div
        className="msgm"
        role="dialog"
        aria-modal="true"
        aria-label={`Mensaje de ${message.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="msgm__head">
          <Avatar name={message.name} size={44} />
          <div className="msgm__who">
            <strong>{message.name}</strong>
            <a href={`mailto:${message.email}`}>{message.email}</a>
          </div>
          <button type="button" className="pv__close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="msgm__meta">
          {message.subject && <Badge color="gray" size="small">{message.subject}</Badge>}
          <span className="msgm__date" suppressHydrationWarning>
            {shortDate(message.createdAt, "es")} ·{" "}
            {message.createdAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="msgm__body">
          {message.message.split(/\n{2,}/).map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
        <div className="msgm__actions">
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
    </div>
  );
}
