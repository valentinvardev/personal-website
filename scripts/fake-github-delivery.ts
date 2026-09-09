/**
 * Simula una entrega de webhook de GitHub contra el servidor local.
 *
 *   node --env-file=.env scripts/fake-github-delivery.ts
 *   node --env-file=.env scripts/fake-github-delivery.ts --tamper
 *   node --env-file=.env scripts/fake-github-delivery.ts --event ping
 *   node --env-file=.env scripts/fake-github-delivery.ts --url http://localhost:3000 --delivery abc
 *
 * Existe para poder ejercitar el camino completo (firma, Inbox, after,
 * inserción de commits) sin esperar a hacer un push real ni depender de que
 * GitHub llegue al VPS.
 */

import { createHmac } from "node:crypto";

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : (process.argv[i + 1] ?? fallback);
}

const base = arg("url", "http://localhost:3099")!;
const event = arg("event", "push")!;
const delivery = arg("delivery", "fake-delivery-1")!;
const tamper = process.argv.includes("--tamper");

const secret = process.env.GITHUB_WEBHOOK_SECRET;
if (!secret) {
  console.error("falta GITHUB_WEBHOOK_SECRET. Corré con: node --env-file=.env");
  process.exit(1);
}

const payload = {
  ref: "refs/heads/main",
  repository: { full_name: "valentinvardev/personal-website" },
  commits: [
    { id: "a".repeat(40), timestamp: new Date().toISOString(), message: "Primer commit de prueba", distinct: true },
    { id: "b".repeat(40), timestamp: new Date().toISOString(), message: "Segundo commit de prueba", distinct: true },
  ],
};

const body = Buffer.from(JSON.stringify(payload));
// Con --tamper se firma un cuerpo y se manda otro: es exactamente lo que
// haría alguien que intercepta y modifica la entrega.
const signedBody = tamper ? Buffer.from(JSON.stringify({ ...payload, ref: "otra" })) : body;
const signature = "sha256=" + createHmac("sha256", secret).update(signedBody).digest("hex");

const res = await fetch(`${base}/api/ingest/github`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-GitHub-Event": event,
    "X-GitHub-Delivery": delivery,
    "X-Hub-Signature-256": signature,
  },
  body,
});

console.log(`${res.status} ${await res.text()}`);
process.exitCode = res.ok ? 0 : 1;
