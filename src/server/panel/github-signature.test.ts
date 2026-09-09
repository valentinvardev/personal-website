import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import { test } from "node:test";

import { verifyGithubSignature } from "./github-signature.ts";

const SECRET = "un-secreto-de-prueba";
const body = Buffer.from(JSON.stringify({ ref: "refs/heads/main", commits: [] }));
const sign = (b: Buffer, secret = SECRET): string =>
  "sha256=" + createHmac("sha256", secret).update(b).digest("hex");

test("acepta una firma válida", () => {
  assert.equal(verifyGithubSignature(body, sign(body), SECRET), true);
});

test("rechaza una firma de otro secreto", () => {
  assert.equal(verifyGithubSignature(body, sign(body, "otro-secreto"), SECRET), false);
});

test("rechaza si el cuerpo cambió aunque sea un byte", () => {
  const firma = sign(body);
  const alterado = Buffer.from(JSON.stringify({ ref: "refs/heads/main", commits: [1] }));
  assert.equal(verifyGithubSignature(alterado, firma, SECRET), false);
});

test("un header de largo distinto devuelve false, NO tira", () => {
  // timingSafeEqual tira RangeError con buffers de distinto largo, y acá el
  // largo lo controla quien manda el request: sin la guarda esto sería un 500.
  assert.doesNotThrow(() => verifyGithubSignature(body, "sha256=corto", SECRET));
  assert.equal(verifyGithubSignature(body, "sha256=corto", SECRET), false);
  assert.equal(verifyGithubSignature(body, "", SECRET), false);
  assert.equal(verifyGithubSignature(body, null, SECRET), false);
});

test("sin secreto configurado no valida nada", () => {
  assert.equal(verifyGithubSignature(body, sign(body), ""), false);
});

test("el prefijo importa: una firma sin sha256= no pasa", () => {
  const hex = createHmac("sha256", SECRET).update(body).digest("hex");
  assert.equal(verifyGithubSignature(body, hex, SECRET), false);
});
