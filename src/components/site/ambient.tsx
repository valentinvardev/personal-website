/**
 * Fondo ambiental del feed de escritos: tres luces radiales muy suaves
 * (azul / púrpura / teal de la paleta Geist) que derivan lentamente, más
 * una capa de grano SVG (feTurbulence) que le da la textura "grainy glass".
 * Capa fija detrás del contenido, sin capturar eventos.
 */
export function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      <span className="ambient__glow ambient__glow--a" />
      <span className="ambient__glow ambient__glow--b" />
      <span className="ambient__glow ambient__glow--c" />
      <span className="ambient__grain" />
    </div>
  );
}
