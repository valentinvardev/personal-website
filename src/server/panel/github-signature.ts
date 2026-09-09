import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verificación de la firma de un webhook de GitHub (`X-Hub-Signature-256`).
 *
 * Tres cosas que hay que hacer bien o la verificación no sirve:
 *
 * 1. **Sobre el cuerpo CRUDO.** GitHub firma los bytes exactos que mandó.
 *    Un `JSON.parse` y vuelta a serializar cambia espacios y orden de claves,
 *    y la firma deja de coincidir. El handler tiene que leer el body como
 *    bytes ANTES de tocarlo.
 *
 * 2. **Comparación en tiempo constante.** `===` sobre strings corta en el
 *    primer byte distinto, y esa diferencia de tiempo es medible desde
 *    afuera: alcanza para reconstruir la firma byte a byte.
 *
 * 3. **Guarda de longitud antes de `timingSafeEqual`.** Con buffers de largo
 *    distinto esa función TIRA una excepción en vez de devolver false, y acá
 *    el largo lo controla quien manda el request. Sin la guarda, un header
 *    corto es un 500 en vez de un 401.
 */
export function verifyGithubSignature(
  rawBody: Buffer,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;

  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
