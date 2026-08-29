"use client";

import { useEffect, useRef } from "react";

import { usePrefs } from "~/components/site/prefs";

/**
 * Retrato en semitono. La foto se dibuja como una trama de puntos en tinta
 * (el tamaño sigue la luminosidad) sobre el fondo de la página. Al cargar,
 * un barrido revela la foto real una vez; después, una lente que sigue al
 * cursor resuelve los puntos en la foto. En táctil la lente descansa en el
 * rostro y se puede arrastrar.
 *
 * La <img> real queda debajo: es lo que ven los lectores de pantalla y lo
 * que se muestra si no hay WebGL o mientras carga la textura.
 */

const VERT = `attribute vec2 a;varying vec2 v;void main(){v=a*0.5+0.5;gl_Position=vec4(a,0.,1.);}`;

const FRAG = `
precision highp float;
varying vec2 v;
uniform sampler2D u_tex;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform float u_radius;
uniform float u_ring;
uniform float u_theme;
uniform float u_scale;

float lum(vec3 c){return dot(c,vec3(0.299,0.587,0.114));}

void main(){
  vec2 frag=gl_FragCoord.xy;
  float cell=5.0*u_scale;
  vec2 cid=floor(frag/cell);
  vec2 cuv=(cid+0.5)*cell/u_res;
  float L=lum(texture2D(u_tex,cuv).rgb);
  /* Claro: tinta oscura, más grande donde la foto es oscura.
     Oscuro: tinta clara, más grande donde la foto es clara.
     La curva manda el gris del fondo de estudio (~0.5) a puntos casi
     nulos, así la cara y el pelo dominan la trama. */
  float amount=smoothstep(mix(0.38,0.3,u_theme),1.0,mix(1.0-L,L,u_theme));
  float r=sqrt(clamp(amount,0.0,1.0))*0.52*cell;
  float d=length(frag-(cid+0.5)*cell);
  float aa=0.75*u_scale;
  float dot_=1.0-smoothstep(r-aa,r+aa,d);
  vec3 bg=mix(vec3(1.0),vec3(0.039),u_theme);
  vec3 ink=mix(vec3(0.09),vec3(0.93),u_theme);
  vec3 half_=mix(bg,ink,dot_);

  vec3 photo=texture2D(u_tex,v).rgb;
  float md=length(frag-u_mouse);
  float m=1.0-smoothstep(u_radius*0.45,u_radius,md);
  vec3 col=mix(half_,photo,m);

  /* Anillo azul apenas visible en el borde de la lente. */
  float ring=(1.0-smoothstep(0.0,2.5*u_scale,abs(md-u_radius)))*u_ring*0.55;
  vec3 blue=mix(vec3(0.0,0.42,1.0),vec3(0.32,0.66,1.0),u_theme);
  col=mix(col,blue,ring);
  gl_FragColor=vec4(col,1.0);
}`;

const LENS_CSS_PX = 70; // radio de la lente en px CSS
const INTRO_MS = 2200;
const MAX_FPS = 30;
const FAR = -1e5;

function domTheme(): number {
  return document.documentElement.getAttribute("data-theme") === "dark" ? 1 : 0;
}

export function PortraitHalftone({ src, alt }: { src: string; alt: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) return;
    themeRef.current = domTheme();

    const compile = (type: number, source: string): WebGLShader | null => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("[portrait]", gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aLoc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");
    const uRadius = gl.getUniformLocation(prog, "u_radius");
    const uRing = gl.getUniformLocation(prog, "u_ring");
    const uTheme = gl.getUniformLocation(prog, "u_theme");
    const uScale = gl.getUniformLocation(prog, "u_scale");

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touchOnly = window.matchMedia("(hover: none)").matches;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const R = LENS_CSS_PX * scale;

    let ready = false;
    let raf = 0;
    let last = 0;
    let visible = true;
    let themeMix = themeRef.current;
    let introStart = -1;
    let pointer: { x: number; y: number } | null = null;
    // Estado suavizado de la lente (px de canvas).
    let mx = FAR;
    let my = FAR;
    let radius = R;
    let ring = 0;

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

    const draw = () => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, mx, my);
      gl.uniform1f(uRadius, radius);
      gl.uniform1f(uRing, ring);
      gl.uniform1f(uTheme, themeMix);
      gl.uniform1f(uScale, scale);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      canvas.dataset.ready = "";
    };

    const frame = (now: number) => {
      raf = 0;
      if (!ready || !visible) return;
      if (now - last < 1000 / MAX_FPS) {
        raf = requestAnimationFrame(frame);
        return;
      }
      last = now;
      resize();
      const w = canvas.width;
      const h = canvas.height;

      // Objetivo de la lente según el momento.
      let tx: number;
      let ty: number;
      let tr = R;
      let tring: number;
      let snap = false;
      const introT = introStart < 0 ? 1 : (now - introStart) / INTRO_MS;
      if (pointer) {
        tx = pointer.x * scale;
        ty = h - pointer.y * scale;
        tring = 1;
      } else if (introT < 1) {
        // Barrido de arriba hacia abajo, con salida suave.
        const e = 1 - Math.pow(1 - introT, 3);
        tx = w * 0.5;
        ty = h * (1.15 - 1.3 * e);
        tr = R * 1.5;
        tring = 0.7;
        snap = mx === FAR;
      } else if (touchOnly) {
        tx = w * 0.5;
        ty = h * 0.58; // a la altura de los ojos
        tr = R * 0.9;
        tring = 0.35;
      } else {
        tx = mx === FAR ? FAR : mx;
        ty = mx === FAR ? FAR : -R * 3; // sale por abajo y desaparece
        tring = 0;
      }
      if (snap) {
        mx = tx;
        my = ty;
      } else {
        mx = lerp(mx, tx, 0.22);
        my = lerp(my, ty, 0.22);
      }
      radius = lerp(radius, tr, 0.15);
      ring = lerp(ring, tring, 0.15);
      themeMix = lerp(themeMix, themeRef.current, 0.08);
      if (Math.abs(themeRef.current - themeMix) < 0.002) themeMix = themeRef.current;
      draw();

      const settled =
        Math.abs(mx - tx) < 0.3 &&
        Math.abs(my - ty) < 0.3 &&
        Math.abs(radius - tr) < 0.3 &&
        Math.abs(ring - tring) < 0.005 &&
        themeMix === themeRef.current &&
        introT >= 1;
      if (!settled || pointer) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && ready && visible) raf = requestAnimationFrame(frame);
    };
    kickRef.current = kick;

    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      ready = true;
      if (!reduced) introStart = performance.now();
      resize();
      draw();
      kick();
    };
    img.src = src;

    const onMove = (e: PointerEvent) => {
      const rect = box.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      introStart = -1;
      kick();
    };
    const onLeave = () => {
      pointer = null;
      kick();
    };
    box.addEventListener("pointermove", onMove);
    box.addEventListener("pointerdown", onMove);
    box.addEventListener("pointerleave", onLeave);
    box.addEventListener("pointercancel", onLeave);

    const ro = new ResizeObserver(() => {
      resize();
      if (ready) draw();
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(
      (entries) => {
        visible = Boolean(entries[0]?.isIntersecting) && !document.hidden;
        kick();
      },
      { threshold: 0 },
    );
    io.observe(canvas);
    const onVisibility = () => {
      visible = !document.hidden;
      kick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      kickRef.current = () => undefined;
      if (raf) cancelAnimationFrame(raf);
      img.onload = null;
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerdown", onMove);
      box.removeEventListener("pointerleave", onLeave);
      box.removeEventListener("pointercancel", onLeave);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [src]);

  return (
    <div ref={boxRef} className="portrait">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={400} height={400} />
      <canvas ref={canvasRef} className="portrait__gl" aria-hidden="true" />
    </div>
  );
}
