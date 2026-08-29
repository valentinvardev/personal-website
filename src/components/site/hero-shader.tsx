"use client";

import { useEffect, useRef } from "react";

import { usePrefs } from "~/components/site/prefs";

/**
 * Fondo del hero: una luz azul lenta (ruido fbm) sobre una trama de píxeles.
 * Donde pasa la luz, los puntos del raster crecen: "de la base de datos al
 * último pixel". WebGL1 crudo, sin dependencias.
 *
 * - Colores derivados de los tokens Geist (blue-300/500 en claro, blue-700 en
 *   oscuro) y transición suave entre temas.
 * - 30 fps como máximo, DPR limitado a 1.5, se pausa fuera de pantalla y con
 *   la pestaña oculta. Con prefers-reduced-motion dibuja un solo cuadro.
 * - Si no hay WebGL, el canvas queda invisible y se ve el degradé CSS de
 *   respaldo (.hero-wrap::before).
 */

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_theme;
uniform float u_scale;

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
float fbm(vec2 p){
  float v=0.0;float a=0.5;
  for(int i=0;i<4;i++){v+=a*snoise(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}
  return v;
}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}

void main(){
  vec2 frag=gl_FragCoord.xy;
  vec2 uv=frag/u_res;
  vec2 p=vec2(uv.x*(u_res.x/u_res.y),uv.y);
  float t=u_time*0.05;

  /* Campo de luz: dos capas de ruido anchas, la segunda deformada por la
     primera. Rango suave para que sea un baño de luz y no nubes. */
  float n1=fbm(p*1.0+vec2(t*0.7,-t*0.4));
  float n2=fbm(p*1.6-vec2(t*0.35,t*0.55)+n1*0.7);
  float light=smoothstep(-0.35,0.95,n2*0.8+n1*0.5);
  /* Más presencia arriba a la derecha (stats); casi nada detrás del titular. */
  float bias=smoothstep(0.0,1.0,uv.x*0.7+uv.y*0.5);
  light*=0.2+0.8*bias;
  /* En pantallas angostas todo el ancho es texto: bajar la intensidad. */
  float narrow=smoothstep(1.4,0.7,u_res.x/u_res.y);
  light*=1.0-0.35*narrow;

  /* Paleta Geist: fondo + blue-300/blue-500 (claro), navy + blue-700 (oscuro). */
  vec3 bg=mix(vec3(1.0),vec3(0.039),u_theme);
  vec3 c1=mix(vec3(0.875,0.937,1.0),vec3(0.02,0.075,0.19),u_theme);
  vec3 c2=mix(vec3(0.580,0.800,1.0),vec3(0.0,0.447,0.961),u_theme);
  vec3 col=mix(bg,c1,light*0.9);
  col=mix(col,c2,pow(light,2.6)*mix(0.5,0.25,u_theme));

  /* Trama de píxeles: puntos que crecen donde hay luz. */
  float spacing=14.0*u_scale;
  vec2 cell=fract(frag/spacing)-0.5;
  float d=length(cell);
  float r=mix(0.05,0.2,light);
  float dotMask=1.0-smoothstep(r-0.06,r+0.06,d);
  vec3 dotCol=mix(vec3(0.0),vec3(1.0),u_theme);
  float dotA=dotMask*mix(0.10,0.11,u_theme)*(0.2+0.8*light);
  col=mix(col,dotCol,dotA);

  /* Grano fijo (no parpadea) para que no se vea plástico. */
  col+=(hash(frag)-0.5)*mix(0.022,0.035,u_theme);
  gl_FragColor=vec4(col,1.0);
}`;

const MAX_FPS = 30;

export function HeroShader() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { theme } = usePrefs();
  const themeRef = useRef(theme === "dark" ? 1 : 0);
  const kickRef = useRef<() => void>(() => undefined);

  useEffect(() => {
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

    const compile = (type: number, src: string): WebGLShader | null => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("[hero-shader]", gl.getShaderInfoLog(s));
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

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    let raf = 0;
    let visible = true;
    let last = 0;
    let themeMix = themeRef.current;
    const start = performance.now();

    const draw = (now: number) => {
      resize();
      themeMix += (themeRef.current - themeMix) * 0.08;
      if (Math.abs(themeRef.current - themeMix) < 0.002) themeMix = themeRef.current;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform1f(uTheme, themeMix);
      gl.uniform1f(uScale, scale);
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
      // Con reduced-motion solo se anima la transición de tema.
      if (!reduced || themeMix !== themeRef.current) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };
    kickRef.current = kick;

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw(performance.now());
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

    kick();

    return () => {
      kickRef.current = () => undefined;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <canvas ref={ref} className="hero-gl" aria-hidden="true" />;
}
