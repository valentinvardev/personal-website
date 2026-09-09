"use client";

import { useEffect, useRef } from "react";

import { usePrefs } from "~/components/site/prefs";

/**
 * Fondo del home completo: un mismo campo de luz (ruido fbm en dos capas)
 * dibujado de tres maneras según dónde se mira, fijo detrás de toda la
 * página y anclado al contenido: el patrón scrollea con la página. Plena
 * presencia en la franja del hero, calmado de ahí para abajo.
 * "De la base de datos al último pixel". WebGL1 crudo, sin dependencias.
 *
 * - Oscuro, escritorio: luz azul sobre una trama de puntos que crecen donde
 *   pasa la luz.
 * - Claro, escritorio: la luz tramada en tinta con dither ordenado (Bayer
 *   8x8, píxeles de 3 px); sobre blanco un brillo no se ve, una trama sí.
 * - Móvil (ambos temas): líneas de nivel del campo, como un plano
 *   topográfico; a tamaño chico se nota sin tapar el texto.
 *
 * - Colores derivados de los tokens Geist y transición suave entre temas.
 * - 30 fps como máximo, DPR limitado a 1.5, se pausa con la pestaña oculta.
 *   Con prefers-reduced-motion dibuja un cuadro y se redibuja al scrollear.
 * - Sin WebGL no se dibuja nada.
 */

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

/* Ancho (px CSS) por debajo del cual se usa la variante móvil. */
const MOBILE_MAX = 700;

const FRAG_BODY = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_theme;
uniform float u_scale;
uniform float u_mobile;
uniform float u_scroll;

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

/* Bayer 2x2 -> 8x8 por recursión (sin operaciones de bits en GLSL ES 1.0). */
float b2(vec2 p){p=mod(p,2.0);return mod(2.0*p.x+3.0*p.y,4.0);}
float bayer8(vec2 p){return (4.0*(4.0*b2(p)+b2(floor(p/2.0)))+b2(floor(p/4.0))+0.5)/64.0;}

/* Campo de luz: dos capas de ruido anchas, la segunda deformada por la
   primera. Es el mismo campo para las tres variantes. */
float field(vec2 p,float t){
  float n1=fbm(p*1.0+vec2(t*0.7,-t*0.4));
  float n2=fbm(p*1.6-vec2(t*0.35,t*0.55)+n1*0.7);
  return n2*0.8+n1*0.5;
}
/* Presencia: plena en la franja del hero, calmada de ahí para abajo. */
float envelope(float pageY){return mix(1.0,0.38,smoothstep(520.0,1050.0,pageY));}

/* En el hero, más presencia arriba a la derecha (stats) y casi nada detrás
   del titular; pasada la franja del hero, presencia uniforme. */
float bias(vec2 vp,float pageY){
  vec2 uvv=vp/(u_res/u_scale); /* 0..1, y hacia abajo */
  float hb=smoothstep(0.0,1.0,uvv.x*0.7+(1.0-uvv.y)*0.5);
  float inHero=1.0-smoothstep(420.0,950.0,pageY);
  return mix(0.75,0.1+0.9*hb,inHero);
}

/* Oscuro / escritorio: luz azul sobre puntos que crecen con la luz. */
vec3 glowDots(vec2 P,vec2 vp,float t){
  float light=smoothstep(-0.35,0.95,field(P/820.0,t))*bias(vp,P.y)*envelope(P.y);
  vec3 col=mix(vec3(0.039),vec3(0.02,0.075,0.19),light*0.9);
  col=mix(col,vec3(0.0,0.447,0.961),pow(light,2.6)*0.25);
  float d=length(fract(P/14.0)-0.5);
  float r=mix(0.05,0.2,light);
  float dotMask=1.0-smoothstep(r-0.06,r+0.06,d);
  return mix(col,vec3(1.0),dotMask*0.11*(0.2+0.8*light));
}

/* Claro / escritorio: la luz tramada en tinta (dither ordenado, 3 px). */
vec3 ditherInk(vec2 P,float t){
  vec2 cellId=floor(P/3.0);
  vec2 cP=(cellId+0.5)*3.0;
  vec2 cvp=vec2(cP.x,cP.y-u_scroll);
  float light=smoothstep(-0.35,0.95,field(cP/820.0,t))*bias(cvp,cP.y)*envelope(cP.y);
  float on=step(bayer8(cellId),light*0.6);
  vec3 col=mix(vec3(1.0),vec3(0.875,0.937,1.0),light*0.4);
  return mix(col,vec3(0.06,0.10,0.20),on*0.12);
}

/* Móvil: líneas de nivel del campo, plano topográfico en tinta. */
vec3 contours(vec2 P,vec2 vp,float t){
  float f=field(P/780.0,t);
  float v=f*6.0;
#ifdef HAS_DERIV
  float w=fwidth(v)*0.9;
#else
  float w=0.05;
#endif
  float env=envelope(P.y);
  float d=abs(fract(v)-0.5);
  float line=1.0-smoothstep(0.0,w,d);
  float crest=smoothstep(0.1,0.9,f);
  vec3 bg=mix(vec3(1.0),vec3(0.039),u_theme);
  vec3 wash=mix(vec3(0.875,0.937,1.0),vec3(0.02,0.075,0.19),u_theme);
  vec3 ink=mix(vec3(0.0),vec3(1.0),u_theme);
  vec3 blue=mix(vec3(0.0,0.42,1.0),vec3(0.32,0.66,1.0),u_theme);
  vec3 col=mix(bg,wash,crest*0.35*env);
  vec3 lc=mix(ink,blue,crest);
  float a=line*mix(0.2,0.24,u_theme)*(0.55+0.45*crest)*env;
  return mix(col,lc,a);
}

void main(){
  /* vp: viewport en px CSS (y hacia abajo). P: coordenada de página. */
  vec2 vp=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y)/u_scale;
  vec2 P=vec2(vp.x,vp.y+u_scroll);
  float t=u_time*0.05;
  vec3 col;

  if(u_mobile>0.5){
    col=contours(P,vp,t);
  }else{
    /* Solo se calcula la variante que se ve; ambas durante la transición. */
    vec3 dark=vec3(0.0);vec3 light=vec3(0.0);
    if(u_theme>0.001)dark=glowDots(P,vp,t);
    if(u_theme<0.999)light=ditherInk(P,t);
    col=mix(light,dark,u_theme);
  }

  /* Grano fijo (no parpadea) para que no se vea plástico. */
  col+=(hash(gl_FragCoord.xy)-0.5)*mix(0.02,0.035,u_theme);
  gl_FragColor=vec4(col,1.0);
}`;

const MAX_FPS = 30;

/* El tema real ya está en <html data-theme> antes de hidratar (script inline);
   el estado de React arranca en "light" y se sincroniza después. */
function domTheme(): number {
  return document.documentElement.getAttribute("data-theme") === "dark" ? 1 : 0;
}

export function HeroShader() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { theme } = usePrefs();
  const themeRef = useRef(0);
  const kickRef = useRef<() => void>(() => undefined);
  const mountedRef = useRef(false);

  useEffect(() => {
    // En el montaje React todavía dice "light" aunque sea de noche: se ignora
    // y se usa el DOM. Después, cada cambio real de tema anima la transición.
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

    const hasDeriv = Boolean(gl.getExtension("OES_standard_derivatives"));
    const FRAG = (hasDeriv ? "#extension GL_OES_standard_derivatives : enable\n#define HAS_DERIV 1\n" : "") + FRAG_BODY;

    const compile = (type: number, src: string): WebGLShader | null => {
      const s = gl.createShader(type);
      if (!s) return null;
      // `#extension` debe ir antes que cualquier otra línea del shader.
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
    const uMobile = gl.getUniformLocation(prog, "u_mobile");
    const uScroll = gl.getUniformLocation(prog, "u_scroll");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    let mobile = 0;

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      mobile = canvas.clientWidth < MOBILE_MAX ? 1 : 0;
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
      gl.uniform1f(uMobile, mobile);
      gl.uniform1f(uScroll, window.scrollY);
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
      // Redibujar SIEMPRE, no solo con reduced-motion: asignar canvas.width
      // borra el buffer de WebGL, y con alpha:false el buffer vacío es negro
      // OPACO. Sin este draw inmediato el canvas queda negro hasta el próximo
      // cuadro (hasta 33 ms a 30 fps). Eso es el flash negro al abrir o
      // cerrar un modal: ocultar la barra de scroll cambia el ancho del
      // viewport y dispara este observer. En tema oscuro no se nota porque
      // el fondo ya es casi negro; en tema claro es blanco, negro, blanco.
      resize();
      draw(performance.now());
    });
    ro.observe(canvas);

    const onVisibility = () => {
      visible = !document.hidden;
      kick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    /* Con reduced-motion no hay loop: el patrón se redibuja al scrollear. */
    const onScroll = () => {
      if (reduced) kick();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    kick();

    return () => {
      kickRef.current = () => undefined;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <canvas ref={ref} className="page-bg" aria-hidden="true" />;
}
