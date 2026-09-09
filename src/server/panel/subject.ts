import "server-only";

/**
 * `subjectId` con namespace declarado: "metric:<key>" o "repo:<owner>/<name>".
 *
 * Se guarda la clave estable y legible, no el cuid de la fila. Tres razones:
 * el export se puede leer sin la tabla de definiciones al lado, el dato
 * sobrevive a que borres y recrees una métrica, y un `subjectId` mal armado se
 * ve a simple vista en la base.
 *
 * La misma expresión vive como CHECK en `prisma/panel-sql/001_panel_core.sql`.
 * Ésta es la validación de la aplicación; aquélla es la red para cualquier
 * escritura que no pase por acá.
 */
const SUBJECT_RE = /^(metric|repo):[A-Za-z0-9_./-]{1,80}$/;

export type SubjectId = string & { readonly __subject: unique symbol };

export function metricSubject(key: string): SubjectId {
  return assertSubject(`metric:${key}`);
}

export function repoSubject(fullName: string): SubjectId {
  return assertSubject(`repo:${fullName}`);
}

export function assertSubject(value: string): SubjectId {
  if (!SUBJECT_RE.test(value)) {
    throw new Error(`subjectId inválido: "${value}"`);
  }
  return value as SubjectId;
}

export function isSubject(value: string): boolean {
  return SUBJECT_RE.test(value);
}
