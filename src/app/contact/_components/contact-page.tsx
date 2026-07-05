"use client";

import { useState, type FormEvent } from "react";

import { Button, Card, Icon, Input, Note, Textarea } from "~/components/geist";
import { usePrefs } from "~/components/site/prefs";
import { LINKS } from "~/lib/content";
import { api } from "~/trpc/react";

export function ContactPage() {
  const { t } = usePrefs();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const send = api.contact.send.useMutation();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    send.mutate(form);
  };

  return (
    <div className="wrap page-pad">
      <div className="contact-grid">
        <div>
          <div className="eyebrow">{t.contact.eyebrow}</div>
          <h1>{t.contact.title}</h1>
          <p className="lead">{t.contact.lead}</p>
          <div className="avail">
            <span className="dot dot-green" /> {t.contact.available}
          </div>
          <div className="contact-links">
            {LINKS.map((l) => (
              <a
                key={l.k}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="clink"
              >
                <span className="clink__ic">
                  <Icon name={l.icon} size={18} color="currentColor" />
                </span>
                <div>
                  <strong>{l.label}</strong>
                  <span>{l.handle}</span>
                </div>
                <Icon
                  name="arrow-up-right"
                  size={16}
                  color="var(--ds-gray-700)"
                  style={{ marginLeft: "auto" }}
                />
              </a>
            ))}
          </div>
        </div>
        <Card>
          {send.isSuccess ? (
            <Note type="success" label={t.contact.sentLabel}>
              {t.contact.sentBody}
            </Note>
          ) : (
            <form className="cform" onSubmit={onSubmit}>
              <Input
                label={t.contact.f.name}
                placeholder={t.contact.f.namePh}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                fullWidth
                required
              />
              <Input
                label={t.contact.f.email}
                type="email"
                placeholder={t.contact.f.emailPh}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                fullWidth
                required
              />
              <Input
                label={t.contact.f.subject}
                placeholder={t.contact.f.subjectPh}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                fullWidth
              />
              <Textarea
                label={t.contact.f.msg}
                rows={4}
                placeholder={t.contact.f.msgPh}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
              />
              {send.isError && (
                <Note type="error" label={t.contact.errorLabel}>
                  {t.contact.errorBody}
                </Note>
              )}
              <Button
                variant="primary"
                size="large"
                type="submit"
                fullWidth
                loading={send.isPending}
              >
                {t.contact.f.send}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
