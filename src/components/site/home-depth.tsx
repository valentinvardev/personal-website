"use client";

import { useEffect, useRef } from "react";

import { usePrefs } from "~/components/site/prefs";
import { FULLSCREEN_VS, bindFullscreenTriangle, createProgram, domTheme } from "~/lib/gl";

/**
 * Fondo del home: profundidad de píxeles. Tres capas de puntos de tinta a
 * distintas escalas que se mueven a velocidades diferentes con el scroll
 * (parallax: la página gana profundidad al scrollear), con una deriva casi
 * imperceptible y un titileo muy lento en reposo. Los puntos cerca del
 * cursor se avivan apenas; unos pocos son azules.
 *
 * WebGL 1 sin dependencias, fijo detrás de todo (el hero lo tapa con su
 * canvas y asoma por el degradé de su máscara; el footer lo tapa). 30 fps
 * máximo, se pausa con la pestaña oculta. Con prefers-reduced-motion no
 * hay deriva ni titileo: solo el parallax, que responde al scroll del
 * visitante. Sin WebGL no se dibuja nada.
 */

const MAX_FPS = 30;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_theme;
uniform float u_scale;
uniform float u_scroll;
uniform vec2 u_mouse;
uniform float u_mouseOn;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec2 hash2(vec2 p){return vec2(hash(p),hash(p+19.19));}

/* Una capa de puntos: celda de \`cell\` px, parallax \`par\`, radio base \`r\`.
   Devuelve intensidad y deja en \`blue\` si el punto es de acento. */
float layer(vec2 pcss,float cell,float par,float r,float t,out float blue){
  vec2 p=pcss;
  p.y+=u_scroll*par;
  p+=vec2(t*2.0,t*1.1)*par;
  vec2 id=floor(p/cell);
  vec2 h=hash2(id);
  blue=0.0;
  if(h.x<0.45)return 0.0;
  vec2 center=(id+vec2(0.15)+0.7*h)*cell;
  float d=length(p-center);
  float rr=r*(0.7+0.6*hash(id+3.3));
  float dot_=1.0-smoothstep(rr-0.7,rr+0.7,d);
  float tw=0.78+0.22*sin(t*0.6+h.y*6.283);
  blue=step(0.93,hash(id+7.7))*dot_;
  return dot_*tw*(0.35+0.65*hash(id+5.5));
}

void main(){
  vec2 pcss=gl_FragCoord.xy/u_scale;
  float b1;float b2;float b3;
  /* Lejos -> cerca: más grande, más denso el movimiento, más presente. */
  float l1=layer(pcss,70.0,0.08,0.8,u_time,b1)*0.45;
  float l2=layer(pcss,110.0,0.18,1.2,u_time,b2)*0.7;
  float l3=layer(pcss,170.0,0.32,1.8,u_time,b3);
  float ink=l1+l2+l3;
  float blue=max(b1*0.45,max(b2*0.7,b3));
  /* Cerca del cursor, los puntos se avivan apenas. */
  float boost=1.0+0.45*(1.0-smoothstep(40.0,260.0,length(pcss-u_mouse)))*u_mouseOn;
  ink=min(ink*boost,1.0);
  vec3 bg=mix(vec3(1.0),vec3(0.039),u_theme);
  vec3 gray=mix(vec3(0.3),vec3(0.78),u_theme);
  vec3 accent=mix(vec3(0.0,0.42,1.0),vec3(0.32,0.66,1.0),u_theme);
  vec3 col=mix(gray,accent,clamp(blue,0.0,1.0)*0.85);
  float a=ink*mix(0.34,0.4,u_theme);
  gl_FragColor=vec4(mix(bg,col,a),1.0);
}`;

export function HomeDepth() {
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
    const prog = createProgram(gl, FULLSCREEN_VS, FRAG, "home-depth");
    if (!prog) return;
    gl.useProgram(prog);
    bindFullscreenTriangle(gl, prog);
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uTheme = gl.getUniformLocation(prog, "u_theme");
    const uScale = gl.getUniformLocation(prog, "u_scale");
    const uScroll = gl.getUniformLocation(prog, "u_scroll");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");
    const uMouseOn = gl.getUniformLocation(prog, "u_mouseOn");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touchOnly = window.matchMedia("(hover: none)").matches;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    const start = performance.now();

    let raf = 0;
    let last = 0;
    let visible = !document.hidden;
    let themeMix = themeRef.current;
    let mouseX = -1e5;
    let mouseY = -1e5;
    let mouseOn = 0;

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = () => {
      resize();
      themeMix += (themeRef.current - themeMix) * 0.08;
      if (Math.abs(themeRef.current - themeMix) < 0.002) themeMix = themeRef.current;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduced ? 0 : (performance.now() - start) / 1000);
      gl.uniform1f(uTheme, themeMix);
      gl.uniform1f(uScale, scale);
      gl.uniform1f(uScroll, window.scrollY);
      gl.uniform2f(uMouse, mouseX, canvas.clientHeight - mouseY);
      gl.uniform1f(uMouseOn, mouseOn);
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
      draw();
      if (!reduced || themeMix !== themeRef.current) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };
    kickRef.current = kick;

    const onMove = (e: PointerEvent) => {
      if (touchOnly) return;
      mouseX = e.clientX;
      mouseY = e.clientY;
      mouseOn = 1;
    };
    const onOut = () => {
      mouseOn = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onOut);
    /* Con reduced-motion no hay loop: el parallax se redibuja al scrollear. */
    const onScroll = () => {
      if (reduced) kick();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw();
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
      window.removeEventListener("scroll", onScroll);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <canvas ref={ref} className="page-bg" aria-hidden="true" />;
}
