"use client";

import { useEffect, useRef } from "react";

import { usePrefs } from "~/components/site/prefs";
import { FULLSCREEN_VS, SNOISE, bindFullscreenTriangle, createProgram, domTheme } from "~/lib/gl";

/**
 * Fondo de Escritos: gotas de tinta sobre papel mojado. Cada tanto (y donde
 * el visitante hace clic) cae una gota que se expande como tinta que se
 * difunde, con el borde irregular de las fibras del papel. Nace azul (tinta
 * fresca) y seca a gris mientras el pigmento se concentra en el borde, el
 * "anillo de café". Detrás del vidrio de los posts se ve como manchas suaves.
 *
 * WebGL 1 sin dependencias, fijo detrás de la página, 30 fps máximo, se
 * pausa con la pestaña oculta. Con prefers-reduced-motion dibuja una vez
 * cuatro gotas ya secas. Sin WebGL no se dibuja nada.
 */

const MAX_DROPS = 10;
const LIFE = 11; // segundos
const MAX_FPS = 30;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_theme;
uniform float u_scale;
uniform vec4 u_drops[${MAX_DROPS}]; /* x, y (px CSS, y arriba), nacimiento, semilla */
${SNOISE}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}

void main(){
  vec2 p=gl_FragCoord.xy/u_scale;
  float ink=0.0;
  float wet=0.0;
  for(int i=0;i<${MAX_DROPS};i++){
    vec4 d=u_drops[i];
    float age=u_time-d.z;
    if(d.z<0.0||age<0.0||age>${LIFE}.0) continue;
    float k=age/${LIFE}.0;
    float size=0.7+0.6*d.w;
    /* Difusión: el radio crece con la raíz del tiempo. */
    float r=(34.0+150.0*sqrt(k))*size;
    /* Borde irregular: las fibras del papel. */
    float n=snoise((p-d.xy)*0.035+d.w*37.0)*(9.0+9.0*k);
    float dist=length(p-d.xy)+n;
    float body=1.0-smoothstep(r-10.0,r+4.0,dist);
    float rim=smoothstep(r-18.0,r-3.0,dist)*body;
    float dry=smoothstep(0.15,0.8,k);
    float fade=smoothstep(0.0,0.12,k)*(1.0-smoothstep(0.55,1.0,k));
    /* Al secar, el interior se aclara y el pigmento se junta en el borde. */
    float amount=body*mix(1.0,0.4,dry)+rim*dry*0.9;
    ink+=amount*fade;
    wet+=body*fade*(1.0-dry);
  }
  ink=min(ink,1.0);
  float wetness=clamp(wet/max(ink,0.001),0.0,1.0);
  vec3 bg=mix(vec3(1.0),vec3(0.039),u_theme);
  vec3 gray=mix(vec3(0.15),vec3(0.85),u_theme);
  vec3 blue=mix(vec3(0.0,0.42,1.0),vec3(0.32,0.66,1.0),u_theme);
  vec3 col=mix(gray,blue,wetness*0.8);
  float a=ink*mix(0.16,0.15,u_theme);
  vec3 o=mix(bg,col,a);
  o+=(hash(gl_FragCoord.xy)-0.5)*mix(0.012,0.02,u_theme);
  gl_FragColor=vec4(o,1.0);
}`;

export function WritingInk() {
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
    const prog = createProgram(gl, FULLSCREEN_VS, FRAG, "writing-ink");
    if (!prog) return;
    gl.useProgram(prog);
    bindFullscreenTriangle(gl, prog);
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uTheme = gl.getUniformLocation(prog, "u_theme");
    const uScale = gl.getUniformLocation(prog, "u_scale");
    const uDrops = gl.getUniformLocation(prog, "u_drops");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    const start = performance.now();
    const now = () => (performance.now() - start) / 1000;

    const drops = new Float32Array(MAX_DROPS * 4).fill(-1);
    const spawn = (x: number, yUp: number, birth: number) => {
      // Reusar la gota más vieja (o una libre).
      let slot = 0;
      let oldest = Infinity;
      for (let i = 0; i < MAX_DROPS; i++) {
        const b = drops[i * 4 + 2]!;
        if (b < oldest) {
          oldest = b;
          slot = i;
        }
      }
      drops[slot * 4] = x;
      drops[slot * 4 + 1] = yUp;
      drops[slot * 4 + 2] = birth;
      drops[slot * 4 + 3] = Math.random();
    };
    const randomSpot = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      // Lejos del nav; un poco más hacia los costados que el centro.
      const side = Math.random() < 0.5 ? Math.random() * 0.42 : 0.58 + Math.random() * 0.42;
      return { x: side * w, yUp: (0.05 + Math.random() * 0.8) * h };
    };

    let raf = 0;
    let last = 0;
    let visible = !document.hidden;
    let themeMix = themeRef.current;
    // Tres gotas escalonadas al cargar, para que la página no arranque vacía.
    let nextSpawn = 0.2;
    let burst = 3;

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = (t: number) => {
      resize();
      themeMix += (themeRef.current - themeMix) * 0.08;
      if (Math.abs(themeRef.current - themeMix) < 0.002) themeMix = themeRef.current;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uTheme, themeMix);
      gl.uniform1f(uScale, scale);
      gl.uniform4fv(uDrops, drops);
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
      const t = now();
      if (!reduced && t >= nextSpawn) {
        const s = randomSpot();
        spawn(s.x, s.yUp, t);
        if (burst > 0) {
          burst--;
          nextSpawn = t + 0.9;
        } else {
          nextSpawn = t + 1.8 + Math.random() * 1.6;
        }
      }
      draw(t);
      if (!reduced || themeMix !== themeRef.current) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };
    kickRef.current = kick;

    if (reduced) {
      // Cuatro gotas ya secas, quietas.
      for (let i = 0; i < 4; i++) {
        const s = randomSpot();
        spawn(s.x, s.yUp, -LIFE * 0.55);
      }
    }

    const onDown = (e: PointerEvent) => {
      if (reduced) return;
      spawn(e.clientX, canvas.clientHeight - e.clientY, now());
      kick();
    };
    window.addEventListener("pointerdown", onDown, { passive: true });

    const ro = new ResizeObserver(() => {
      // Ver el comentario en hero-shader.tsx: asignar canvas.width borra el
      // buffer, y con alpha:false queda negro opaco hasta el próximo cuadro.
      resize();
      draw(now());
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
      window.removeEventListener("pointerdown", onDown);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <canvas ref={ref} className="page-bg" aria-hidden="true" />;
}
