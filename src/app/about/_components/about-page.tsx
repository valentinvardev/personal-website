"use client";

import { Avatar } from "~/components/geist";
import { StackChip } from "~/components/geist/tech-icon";
import { usePrefs } from "~/components/site/prefs";
import { SectionHead } from "~/components/site/section-head";

export function AboutPage() {
  const { t } = usePrefs();
  return (
    <div className="wrap page-pad">
      <div className="about-hero">
        <Avatar name="Valentín Varela" size={72} />
        <div>
          <div className="eyebrow">{t.about.eyebrow}</div>
          <h1>{t.about.title}</h1>
        </div>
      </div>
      <div className="about-body">
        {t.about.bio.map((para) => (
          <p key={para.slice(0, 24)}>{para}</p>
        ))}
      </div>

      <section className="section">
        <SectionHead eyebrow={t.exp.eyebrow} title={t.exp.title} />
        <div className="timeline">
          {t.exp.items.map((e) => (
            <div className="tl" key={e.role}>
              <div className="tl__dot">
                <span />
              </div>
              <div className="tl__body">
                <div className="tl__head">
                  <h3>{e.role}</h3>
                  <span className="tl__when">{e.when}</span>
                </div>
                <div className="tl__org">{e.org}</div>
                <p>{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHead eyebrow={t.stack.eyebrow} title={t.stack.title} sub={t.stack.sub} />
        <div className="stack-groups">
          {t.stack.groups.map((g) => (
            <div className="stackg" key={g.label}>
              <h4>{g.label}</h4>
              <div className="pcard__stack">
                {g.items.map((s) => (
                  <StackChip key={s} label={s} large />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHead eyebrow={t.testi.eyebrow} title={t.testi.title} />
        <div className="testi-grid">
          {t.testi.items.map((q) => (
            <figure className="testi" key={q.name}>
              <blockquote>“{q.quote}”</blockquote>
              <figcaption>
                <Avatar name={q.name} size={32} />
                <div>
                  <strong>{q.name}</strong>
                  <span>{q.role}</span>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="fineprint">{t.testi.note}</p>
      </section>
    </div>
  );
}
