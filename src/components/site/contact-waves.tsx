"use client";

import { useEffect, useRef } from "react";

import { usePrefs } from "~/components/site/prefs";
import { FULLSCREEN_VS, bindFullscreenTriangle, createProgram, domTheme } from "~/lib/gl";

/**
 * Fondo de Contacto: dos señales que se encuentran. Dos emisores de ondas,
 * uno anclado en el formulario y otro que sigue al cursor (sin cursor,
 * deriva despacio). Donde las ondas coinciden se refuerzan y donde se
 * cancelan desaparecen: el patrón de interferencia, hecho de crestas finas
 * en tinta que se tiñen de azul donde las dos señales están en fase.
 *
 * WebGL 1 sin dependencias, fijo detrás de la página, 30 fps máximo, se
 * pausa con la pestaña oculta. Con prefers-reduced-motion dibuja un solo
 * cuadro. Sin WebGL no se dibuja nada.
 */

const MAX_FPS = 30;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_theme;
uniform float u_scale;
uniform vec2 u_a;
uniform vec2 u_b;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}

void main(){
  vec2 p=gl_FragCoord.xy/u_scale;
  vec2 uv=gl_FragCoord.xy/u_res;
  float k=6.28318/54.0;      /* longitud de onda: 54 px */
  float w=k*15.0;            /* velocidad: 15 px/s hacia afuera */
  float dA=length(p-u_a);
  float dB=length(p-u_b);
  float attA=1.0/(1.0+dA/520.0);
  /* El cursor emite un poco más débil: mandan los anillos del formulario
     y la segunda señal los modula, en vez de romperlos en un moteado. */
  float attB=0.75/(1.0+dB/520.0);
  float s=sin(dA*k-u_time*w)*attA+sin(dB*k-u_time*w)*attB;
  /* Solo las crestas, finas: donde se cancelan no queda nada. */
  float crest=smoothstep(0.8,1.3,s);
  float phase=smoothstep(1.3,1.75,s);
  float vig=1.0-smoothstep(0.5,1.0,length((uv-0.5)*vec2(1.0,1.2)));
  vec3 bg=mix(vec3(1.0),vec3(0.039),u_theme);
  vec3 gray=mix(vec3(0.2),vec3(0.8),u_theme);
  vec3 blue=mix(vec3(0.0,0.42,1.0),vec3(0.32,0.66,1.0),u_theme);
  vec3 ink=mix(gray,blue,phase*0.7);
  float a=crest*vig*mix(0.105,0.11,u_theme);
  vec3 o=mix(bg,ink,a);
  o+=(hash(gl_FragCoord.xy)-0.5)*mix(0.012,0.02,u_theme);
  gl_FragColor=vec4(o,1.0);
}`;

export function ContactWaves() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { theme } = usePrefs();
  const themeRef = useRef(0);
  const kickRef = useRef<() => void>(() => undefined);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    themeRef.current = theme === "dark" ? 1 : 0;
    kickRef.current();
  }, [theme]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) return;
    themeRef.current = domTheme();
    const prog = createProgram(gl, FULLSCREEN_VS, FRAG, "contact-waves");
    if (!prog) return;
    gl.useProgram(prog);
    bindFullscreenTriangle(gl, prog);
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uTheme = gl.getUniformLocation(prog, "u_theme");
    const uScale = gl.getUniformLocation(prog, "u_scale");
    const uA = gl.getUniformLocation(prog, "u_a");
    const uB = gl.getUniformLocation(prog, "u_b");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touchOnly = window.matchMedia("(hover: none)").matches;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    const start = performance.now();

    let raf = 0;
    let last = 0;
    let visible = !document.hidden;
    let themeMix = themeRef.current;
    let pointer: { x: number; y: number } | null = null;
    let bx = -1;
    let by = -1;

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    /* Emisor A: el centro de la tarjeta del formulario, en px del viewport. */
    const anchor = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const card = document.querySelector<HTMLElement>(".contact-grid .geist-card");
      if (!card) return { x: w * 0.72, y: h * 0.5 };
      const r = card.getBoundingClientRect();
      return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.45 };
    };

    const draw = (t: number) => {
      resize();
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      themeMix += (themeRef.current - themeMix) * 0.08;
      if (Math.abs(themeRef.current - themeMix) < 0.002) themeMix = themeRef.current;
      const a = anchor();
      /* Emisor B: el cursor; sin cursor, deriva despacio por la izquierda. */
      const tx = pointer ? pointer.x : w * (0.25 + 0.12 * Math.sin(t * 0.11));
      const ty = pointer ? pointer.y : h * (0.5 + 0.2 * Math.cos(t * 0.08));
      if (bx < 0) {
        bx = tx;
        by = ty;
      } else {
        bx += (tx - bx) * 0.06;
        by += (ty - by) * 0.06;
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uTheme, themeMix);
      gl.uniform1f(uScale, scale);
      gl.uniform2f(uA, a.x, h - a.y);
      gl.uniform2f(uB, bx, h - by);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      canvas.dataset.ready = "";
    };

    const frame = (ts: number) => {
      raf = 0;
      if (!visible) return;
      if (ts - last < 1000 / MAX_FPS) {
        raf = requestAnimationFrame(frame);
        return;
      }
      last = ts;
      draw((ts - start) / 1000);
      if (!reduced || themeMix !== themeRef.current) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };
    kickRef.current = kick;

    const onMove = (e: PointerEvent) => {
      if (touchOnly) return;
      pointer = { x: e.clientX, y: e.clientY };
    };
    const onOut = () => {
      pointer = null;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onOut);

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw((performance.now() - start) / 1000);
    });
    ro.observe(canvas);
    const onVisibility = () => {
      visible = !document.hidden;
      kick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    kick();

    return () => {
      kickRef.current = () => undefined;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onOut);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <canvas ref={ref} className="page-bg" aria-hidden="true" />;
}
