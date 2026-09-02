"use client";

import { useEffect, useRef, useState } from "react";

import { HomeDepth } from "~/components/site/home-depth";
import { usePrefs } from "~/components/site/prefs";
import { domTheme } from "~/lib/gl";

/**
 * Fondo del home en WebGPU (vgpu): profundidad de campo. Siete capas de
 * puntos en 3D con un plano de foco que respira; los puntos fuera de foco
 * se abren en bokeh suave. Parallax por capa con el scroll, inclinación
 * sutil hacia el cursor y un haz de luz diagonal muy tenue que barre el
 * campo y aviva lo que toca.
 *
 * vgpu se carga por import dinámico solo cuando hay WebGPU; sin WebGPU o
 * con prefers-reduced-motion se usa el fallback WebGL (HomeDepth, la
 * versión simple del mismo concepto). El shader está validado con
 * `npx vgpu check` y renderizado en Node con `vgpu/mock`.
 */

const WGSL = `
// Profundidad de campo: siete capas de puntos en 3D, foco que respira,
// bokeh fuera de foco, parallax por capa con el scroll, inclinación hacia
// el cursor y un haz de luz diagonal que barre el campo.

@group(0) @binding(0) var<uniform> time: f32;
@group(0) @binding(1) var<uniform> theme: f32;
@group(0) @binding(2) var<uniform> scroll: f32;
@group(0) @binding(3) var<uniform> dpr: f32;
@group(0) @binding(4) var<uniform> tilt: vec2f;

fn hash1(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453);
}
fn hash2v(p: vec2f) -> vec2f {
  return vec2f(hash1(p), hash1(p + vec2f(19.19, 7.7)));
}

// Una capa a profundidad z (1 = lejos, ~0.2 = cerca).
// Devuelve (tinta, acento azul).
fn layerDots(pcss: vec2f, z: f32, t: f32, focus: f32) -> vec2f {
  let near = 1.0 - z;
  var p = pcss;
  p.y += scroll * (0.55 * near);
  p += vec2f(t * 1.6, t * 0.9) * near;
  p += tilt * (-0.05 * near);
  let cell = 55.0 + near * 150.0;
  let id = floor(p / cell) + vec2f(z * 91.7);
  let h = hash2v(id);
  if (h.x < 0.42) {
    return vec2f(0.0);
  }
  let center = (floor(p / cell) + vec2f(0.12) + 0.76 * h) * cell;
  let coc = abs(z - focus);
  let r = (0.8 + near * 2.0) * (1.0 + coc * 2.2);
  let soft = 0.7 + coc * cell * 0.14;
  let d = length(p - center);
  var dotv = 1.0 - smoothstep(r - soft, r + soft, d);
  dotv = dotv / (1.0 + coc * 4.0);
  let tw = 0.8 + 0.2 * sin(t * 0.5 + h.y * 6.283);
  let blue = step(0.93, hash1(id + vec2f(5.1, 3.3)));
  let ink = dotv * tw * (0.4 + 0.6 * hash1(id + vec2f(9.4, 1.2)));
  return vec2f(ink, blue * dotv);
}

@fragment
fn main(@builtin(position) fragIn: vec4f) -> @location(0) vec4f {
  let pcss = fragIn.xy / dpr;
  let t = time;
  // El plano de foco respira despacio entre las capas.
  let focus = 0.55 + 0.2 * sin(t * 0.07);

  var ink = 0.0;
  var blue = 0.0;
  for (var i = 0; i < 7; i++) {
    let z = 1.0 - f32(i) * 0.13;
    let w = 0.45 + (1.0 - z) * 0.55;
    let l = layerDots(pcss, z, t, focus);
    ink += l.x * w;
    blue += l.y * w;
  }

  // Haz de luz diagonal que barre el campo, muy tenue.
  let dir = normalize(vec2f(0.32, 1.0));
  let coord = dot(pcss, dir);
  let bpos = mix(-300.0, 1900.0, 0.5 + 0.5 * sin(t * 0.045));
  let beam = exp(-pow((coord - bpos) / 260.0, 2.0));

  let bg = mix(vec3f(1.0), vec3f(0.039), theme);
  let gray = mix(vec3f(0.30), vec3f(0.80), theme);
  let accent = mix(vec3f(0.0, 0.42, 1.0), vec3f(0.32, 0.66, 1.0), theme);
  let col = mix(gray, accent, clamp(blue * 1.4, 0.0, 1.0) * 0.85);
  var a = min(ink * (1.0 + beam * 0.7), 1.0) * mix(0.36, 0.44, theme);
  a += beam * mix(0.015, 0.022, theme);
  return vec4f(mix(bg, col, min(a, 1.0)), 1.0);
}
`;

export function HomeField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);
  const { theme } = usePrefs();
  const themeRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    themeRef.current = theme === "dark" ? 1 : 0;
  }, [theme]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gpuApi = (navigator as Navigator & { gpu?: unknown }).gpu;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !gpuApi) {
      setFallback(true);
      return;
    }
    themeRef.current = domTheme();

    let disposed = false;
    let gpu: import("vgpu").Gpu | null = null;
    let loop: import("vgpu").FrameLoopHandle | null = null;
    const cleanups: (() => void)[] = [];

    void (async () => {
      try {
        const { init, surface, effect, frameLoop, clock } = await import("vgpu");
        const g = await init();
        if (disposed) {
          g.dispose();
          return;
        }
        gpu = g;
        const surf = surface(g, canvas, { dpr: [1, 1.5] });
        const eff = effect(g, WGSL, {
          set: { time: 0, theme: themeRef.current, scroll: 0, dpr: surf.dpr, tilt: [0, 0] },
        });
        const clk = clock(g);

        const touchOnly = window.matchMedia("(hover: none)").matches;
        let themeMix = themeRef.current;
        let mx = 0;
        let my = 0;
        let mouseOn = 0;
        let tx = 0;
        let ty = 0;

        const onMove = (e: PointerEvent) => {
          if (touchOnly) return;
          mx = e.clientX;
          my = e.clientY;
          mouseOn = 1;
        };
        const onOut = () => {
          mouseOn = 0;
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        document.addEventListener("pointerleave", onOut);
        cleanups.push(() => {
          window.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerleave", onOut);
        });

        loop = frameLoop(
          g,
          (frame) => {
            if (document.hidden) return;
            themeMix += (themeRef.current - themeMix) * 0.08;
            if (Math.abs(themeRef.current - themeMix) < 0.002) themeMix = themeRef.current;
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            const tgx = mouseOn ? mx - w * 0.5 : 0;
            const tgy = mouseOn ? my - h * 0.5 : 0;
            tx += (tgx - tx) * 0.06;
            ty += (tgy - ty) * 0.06;
            eff.set({
              time: clk.time,
              theme: themeMix,
              scroll: window.scrollY,
              dpr: surf.dpr,
              tilt: [tx, ty],
            });
            frame.pass(surf, eff);
            canvas.dataset.ready = "";
            canvas.dataset.gpu = "webgpu";
          },
          { fps: 30 },
        );
      } catch (err) {
        console.warn("[home-field] WebGPU falló, uso el fallback WebGL", err);
        if (!disposed) setFallback(true);
      }
    })();

    return () => {
      disposed = true;
      for (const c of cleanups) c();
      loop?.stop();
      gpu?.dispose();
    };
  }, []);

  if (fallback) return <HomeDepth />;
  return <canvas ref={ref} className="page-bg" aria-hidden="true" />;
}
