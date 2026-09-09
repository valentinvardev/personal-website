"use client";

import { useEffect, useRef } from "react";

import { usePrefs } from "~/components/site/prefs";

/**
 * Fondo de Sobre mí: papel milimetrado que respira. Una grilla de dibujo
 * técnico (8 px menor, 40 px mayor) en hairlines de tinta, deformada por
 * un campo de ruido lento como si una ola pasara por debajo del papel.
 * Más visible en el centro del viewport y cerca del cursor; se apaga
 * hacia los bordes. Fija detrás de toda la página.
 *
 * WebGL1 sin dependencias, 30 fps máximo, DPR limitado, se pausa con la
 * pestaña oculta. Con prefers-reduced-motion dibuja un solo cuadro (la
 * grilla deformada, quieta). Sin WebGL no se dibuja nada.
 */

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_theme;
uniform float u_scale;
uniform vec2 u_mouse;

vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));
  vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;
  i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m=m*m;m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0;
  vec3 h=abs(x)-0.5;
  vec3 ox=floor(x+0.5);
  vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}

/* Línea de grilla de ~1 px CSS de ancho, con antialias, en px CSS. */
float gridLine(vec2 q,float s){
  vec2 d=(0.5-abs(fract(q/s)-0.5))*s;
  float m=min(d.x,d.y);
  return 1.0-smoothstep(0.45,1.25,m);
}

void main(){
  vec2 frag=gl_FragCoord.xy;
  vec2 p=frag/u_scale;            /* px CSS */
  vec2 uv=frag/u_res;
  float t=u_time*0.045;

  /* La ola bajo el papel: desplazamiento suave de hasta ~10 px, lento. */
  vec2 k=p*0.0016;
  vec2 warp=10.0*vec2(snoise(k+vec2(t,-t*0.6)),snoise(k*1.3-vec2(t*0.7,t)+7.0));
  vec2 q=p+warp;

  float minor=gridLine(q,12.0);
  float major=gridLine(q,60.0);
  float line=max(minor*0.35,major);

  /* Más presente en el centro; se apaga hacia los bordes del viewport. */
  vec2 c=(uv-vec2(0.5,0.55))*vec2(1.0,1.25);
  float spot=1.0-smoothstep(0.1,0.9,length(c));
  /* Y un poco más cerca del cursor. */
  float md=length(frag-u_mouse)/u_scale;
  float near=1.0-smoothstep(60.0,380.0,md);

  vec3 bg=mix(vec3(1.0),vec3(0.039),u_theme);
  vec3 ink=mix(vec3(0.0),vec3(1.0),u_theme);
  float a=line*(mix(0.02,0.03,u_theme)+mix(0.05,0.07,u_theme)*spot+0.03*near);
  gl_FragColor=vec4(mix(bg,ink,a),1.0);
}`;

const MAX_FPS = 30;
const FAR = -1e5;

function domTheme(): number {
  return document.documentElement.getAttribute("data-theme") === "dark" ? 1 : 0;
}

export function AboutBackdrop() {
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

    const compile = (type: number, src: string): WebGLShader | null => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("[about-backdrop]", gl.getShaderInfoLog(s));
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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aLoc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uTheme = gl.getUniformLocation(prog, "u_theme");
    const uScale = gl.getUniformLocation(prog, "u_scale");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);

    let raf = 0;
    let last = 0;
    let visible = !document.hidden;
    let themeMix = themeRef.current;
    let mx = FAR;
    let my = FAR;
    let tx = FAR;
    let ty = FAR;
    const start = performance.now();

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = (now: number) => {
      resize();
      themeMix += (themeRef.current - themeMix) * 0.08;
      if (Math.abs(themeRef.current - themeMix) < 0.002) themeMix = themeRef.current;
      mx += (tx - mx) * 0.12;
      my += (ty - my) * 0.12;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform1f(uTheme, themeMix);
      gl.uniform1f(uScale, scale);
      gl.uniform2f(uMouse, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      canvas.dataset.ready = "";
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      if (now - last < 1000 / MAX_FPS) {
        raf = requestAnimationFrame(frame);
        return;
      }
      last = now;
      draw(now);
      const settling =
        themeMix !== themeRef.current || Math.abs(tx - mx) > 0.5 || Math.abs(ty - my) > 0.5;
      if (!reduced || settling) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };
    kickRef.current = kick;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX * scale;
      ty = canvas.height - e.clientY * scale;
      if (mx === FAR) {
        mx = tx;
        my = ty;
      }
      kick();
    };
    const onOut = () => {
      tx = FAR;
      ty = FAR;
      mx = FAR;
      my = FAR;
      kick();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onOut);

    const ro = new ResizeObserver(() => {
      // Ver el comentario en hero-shader.tsx: asignar canvas.width borra el
      // buffer, y con alpha:false queda negro opaco hasta el próximo cuadro.
      resize();
      draw(performance.now());
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

  return <canvas ref={ref} className="about-bg" aria-hidden="true" />;
}
