"use client";

import type { CSSProperties } from "react";

import { accentVar, resolveBlock, type BlockRecord } from "~/lib/catalog";
import { usePrefs } from "./prefs";
import { Reveal } from "./reveal";

/**
 * Grilla bento del "material" de un nicho: tarjetas dinámicas de texto
 * (notas) e imagen, con ancho configurable (span sm/md/lg) desde /admin.
 */
export function MaterialGrid({ blocks, color }: { blocks: BlockRecord[]; color: string }) {
  const { lang } = usePrefs();
  const kickerText = lang === "en" ? "Note" : "Nota";
  const kickerImage = lang === "en" ? "Image" : "Imagen";

  return (
    <div className="bento" style={{ "--nc": accentVar(color, 700) } as CSSProperties}>
      {blocks.map((row, i) => {
        const b = resolveBlock(row, lang);
        if (b.kind === "image") {
          return (
            <Reveal
              key={b.id}
              index={i}
              className={`bento__card bento__card--image bento__span-${b.span}`}
            >
              {b.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.imageUrl} alt={b.title ?? kickerImage} loading="lazy" />
              )}
              {b.title && <div className="bento__caption">{b.title}</div>}
            </Reveal>
          );
        }
        return (
          <Reveal
            key={b.id}
            index={i}
            className={`bento__card bento__card--text bento__span-${b.span}`}
          >
            <div className="bento__kicker">
              <span className="bento__dot" aria-hidden="true" />
              {kickerText}
            </div>
            {b.title && <h3>{b.title}</h3>}
            {b.body
              ?.split(/\n{2,}/)
              .map((para) => <p key={para.slice(0, 32)}>{para}</p>)}
          </Reveal>
        );
      })}
    </div>
  );
}
