/**
 * Logo de la marca: negro en tema claro, blanco en tema oscuro.
 * El cambio es CSS puro sobre [data-theme] (que se setea antes de la
 * hidratación), así que no hay flash ni mismatch.
 *
 * `mark` usa solo el isotipo (triángulo); sin `mark`, el lockup completo.
 */
export function Logo({
  height = 30,
  mark = false,
  className,
}: {
  height?: number;
  mark?: boolean;
  className?: string;
}) {
  const base = mark ? "/logo-mark" : "/logo";
  return (
    <span className={"logo" + (className ? " " + className : "")} style={{ height }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${base}-black.png`} alt="Valentín Varela" className="logo__light" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${base}-white.png`} alt="" aria-hidden="true" className="logo__dark" />
    </span>
  );
}
