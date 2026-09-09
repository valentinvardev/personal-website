/**
 * Guarda de versión para los CLI del panel. Se antepone a los `npm run panel:*`.
 *
 * Los CLI del panel están escritos en TypeScript y se ejecutan con `node`
 * directo, apoyados en el type-stripping NATIVO, que existe desde Node 22.6.
 * Comparten módulos con la app (sobre todo `src/lib/panel/logical-date.ts`, el
 * único lugar autorizado a decidir a qué día lógico pertenece un instante), así
 * que reescribirlos en JavaScript significaría bifurcar esa lógica: exactamente
 * lo que el resto del panel está construido para impedir.
 *
 * Este archivo es `.mjs` a propósito: tiene que poder ejecutarse en el Node
 * viejo, que es el único caso en el que sirve de algo.
 *
 * El fallo que lo justifica, del 2026-09-09: el VPS corre Node 20 del sistema
 * (paquete de NodeSource, compartido con otras diez apps) y todo CLI del panel
 * moría con `ERR_UNKNOWN_FILE_EXTENSION ".ts"` y un stack de módulos internos
 * de Node que no dice en ningún lado cuál es el problema ni qué hacer.
 */

const NEEDED = [22, 6];
const [major, minor] = process.versions.node.split(".").map(Number);

if (major < NEEDED[0] || (major === NEEDED[0] && minor < NEEDED[1])) {
  const q = process.execPath;
  console.error(
    `\nLos CLI del panel necesitan Node >= ${NEEDED[0]}.${NEEDED[1]} y este es Node ${process.versions.node}.`,
  );
  console.error(`  binario en uso: ${q}\n`);
  console.error("Están escritos en TypeScript y se ejecutan sin compilar, con el");
  console.error("type-stripping nativo que Node trae recién desde la 22.6.\n");
  console.error("En el VPS el Node del sistema es viejo y NO se toca: esa máquina");
  console.error("corre varias apps con el mismo. Hay un Node 22 aparte, en el home,");
  console.error("y los CLI se invocan con su ruta completa en vez de con npm:\n");
  console.error("  ~/node22/bin/node --env-file=.env scripts/panel-reset.ts\n");
  console.error("Verificá que exista con:  ~/node22/bin/node -v\n");
  console.error("El README lo explica en 'El cron'.\n");
  process.exit(1);
}
