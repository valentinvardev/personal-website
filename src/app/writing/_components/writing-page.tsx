"use client";

import { Note } from "~/components/geist";
import { Ambient } from "~/components/site/ambient";
import { PostCard } from "~/components/site/post-card";
import { usePrefs } from "~/components/site/prefs";
import { Reveal } from "~/components/site/reveal";
import type { RouterOutputs } from "~/trpc/react";

export function WritingPage({ posts }: { posts: RouterOutputs["posts"]["list"] }) {
  const { t } = usePrefs();
  return (
    <div className="writing">
      <Ambient />
      <div className="wrap page-pad">
        <div className="page-head page-head--center">
          <div>
            <div className="eyebrow">{t.writing.eyebrow}</div>
            <h1>{t.writing.title}</h1>
            <p className="lead">{t.writing.pageLead}</p>
          </div>
        </div>
        <div className="feed">
          {posts.length === 0 ? (
            <Note type="default">{t.writing.empty}</Note>
          ) : (
            posts.map((p, i) => (
              <Reveal key={p.id} index={Math.min(i, 5)}>
                <PostCard post={p} />
              </Reveal>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
