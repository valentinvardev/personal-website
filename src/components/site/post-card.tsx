"use client";

import { useState } from "react";

import { Badge, Icon } from "~/components/geist";
import type { IconName } from "~/components/geist/icons-data";
import { formatBytes, shortDate, timeAgo } from "~/lib/time";
import type { RouterOutputs } from "~/trpc/react";
import { Monogram } from "./monogram";
import { usePrefs } from "./prefs";

export type PostRow = RouterOutputs["posts"]["list"][number];

const CLAMP_AT = 420;

function fileIcon(name: string): IconName {
  const ext = (/\.([a-z0-9]+)$/i.exec(name)?.[1] ?? "").toLowerCase();
  if (ext === "pdf" || ext === "md" || ext === "txt") return "book-open";
  if (ext === "zip") return "box";
  if (ext === "mp4" || ext === "webm") return "camera";
  if (ext === "mp3") return "activity";
  if (ext === "json" || ext === "csv") return "code";
  return "box";
}

/** Post del feed de escritos — tarjeta estilo red social, solo lectura. */
export function PostCard({ post }: { post: PostRow }) {
  const { t, lang } = usePrefs();
  const [expanded, setExpanded] = useState(false);

  const images = post.attachments.filter((a) => a.kind === "image");
  const files = post.attachments.filter((a) => a.kind === "file");

  const needsClamp = post.body.length > CLAMP_AT;
  const shown =
    needsClamp && !expanded ? post.body.slice(0, CLAMP_AT).trimEnd() + "…" : post.body;
  const paragraphs = shown.split(/\n{2,}/);

  return (
    <article className="wpost">
      <header className="wpost__head">
        <Monogram size={38} />
        <div className="wpost__who">
          <div className="wpost__name">
            Valentín Varela
            {post.pinned && (
              <span className="wpost__pin" title={t.writing.pinned}>
                <Icon name="circle-dot" size={13} /> {t.writing.pinned}
              </span>
            )}
          </div>
          <div className="wpost__meta">
            <span>@valentinvardev</span>
            <span aria-hidden="true">·</span>
            <time
              dateTime={post.createdAt.toISOString()}
              title={shortDate(post.createdAt, lang)}
              suppressHydrationWarning
            >
              {timeAgo(post.createdAt, lang)}
            </time>
          </div>
        </div>
        {post.category && (
          <Badge color="gray" size="small">
            {post.category}
          </Badge>
        )}
      </header>

      {post.title && <h3 className="wpost__title">{post.title}</h3>}
      <div className="wpost__body">
        {paragraphs.map((p) => (
          <p key={p.slice(0, 40)}>{p}</p>
        ))}
      </div>
      {needsClamp && (
        <button type="button" className="wpost__more" onClick={() => setExpanded(!expanded)}>
          {expanded ? t.writing.readLess : t.writing.readMore}
        </button>
      )}

      {images.length > 0 && (
        <div className={"wpost__gallery" + (images.length === 1 ? " single" : "")}>
          {images.map((img) => (
            <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.name} loading="lazy" />
            </a>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="wpost__files">
          <div className="wpost__files-label">{t.writing.filesLabel}</div>
          {files.map((f) => (
            <a
              key={f.id}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="wfile"
              download={f.name}
            >
              <span className="wfile__ic">
                <Icon name={fileIcon(f.name)} size={16} />
              </span>
              <span className="wfile__name">{f.name}</span>
              <span className="wfile__size">{formatBytes(f.size, lang)}</span>
              <Icon name="arrow-up-right" size={14} color="var(--ds-gray-700)" />
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
