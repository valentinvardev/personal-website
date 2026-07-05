import type { ReactNode } from "react";

export function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="sec-head">
      {eyebrow != null && <div className="eyebrow">{eyebrow}</div>}
      <h2>{title}</h2>
      {sub != null && <p>{sub}</p>}
    </div>
  );
}
