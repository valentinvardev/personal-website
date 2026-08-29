"use client";

import { useEffect, useRef } from "react";

import { usePrefs } from "~/components/site/prefs";

/**
 * Corriente de tinta detrás de las secciones del home. Miles de partículas
 * siguen un campo de flujo (curl noise: sin divergencia, se ve como agua)
 * y dejan estelas finas que se disuelven. La tinta está pegada a la página:
 * al scrollear, las estelas se arrastran con el contenido. El cursor genera
 * un pequeño vórtice. Las corrientes más densas se tiñen apenas de azul.
 *
 * WebGL 2 sin dependencias: transform feedback mueve las partículas en la
 * GPU; un par de framebuffers ping-pong guarda la densidad de tinta y la
 * desvanece cuadro a cuadro. Sin WebGL 2 o con prefers-reduced-motion no
 * se dibuja nada. Se pausa con la pestaña oculta.
 */

const NOISE = `
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
}`;

/* Paso 1: mover partículas (transform feedback). Posiciones en px CSS del
   viewport, y hacia abajo. */
const UPDATE_VS = `#version 300 es
precision highp float;
in vec2 a_pos;
in vec2 a_meta;
out vec2 v_pos;
out vec2 v_meta;
uniform vec2 u_size;
uniform float u_dt;
uniform float u_time;
uniform float u_scroll;
uniform float u_dscroll;
uniform vec2 u_mouse;
uniform float u_mouseOn;
${NOISE}
vec2 curl(vec2 p){
  float e=0.35;
  float a=snoise(p+vec2(0.0,e)),b=snoise(p-vec2(0.0,e));
  float c=snoise(p+vec2(e,0.0)),d=snoise(p-vec2(e,0.0));
  return vec2(a-b,-(c-d))/(2.0*e);
}
float hash(float n){return fract(sin(n)*43758.5453);}
void main(){
  vec2 p=a_pos;
  float age=a_meta.x+u_dt;
  float seed=a_meta.y;
  /* El campo vive en coordenadas de página, no de viewport. */
  vec2 page=vec2(p.x,p.y+u_scroll);
  vec2 f=curl(page*0.003+vec2(u_time*0.04,-u_time*0.025));
  vec2 vel=f*36.0+vec2(0.0,10.0);
  if(u_mouseOn>0.5){
    vec2 d=p-u_mouse;
    float r=max(length(d),1.0);
    float k=1.0-smoothstep(30.0,190.0,r);
    vec2 n=d/r;
    vel+=(vec2(-n.y,n.x)*110.0+n*35.0)*k;
  }
  p+=vel*u_dt;
  p.y-=u_dscroll;
  float life=5.0+7.0*hash(seed);
  if(age>life||p.x<-8.0||p.x>u_size.x+8.0||p.y<-8.0||p.y>u_size.y+8.0){
    p=vec2(hash(seed*1.37+u_time),hash(seed*2.91-u_time))*u_size;
    age=0.0;
    seed=hash(seed+u_time*0.37)*4096.0;
  }
  v_pos=p;
  v_meta=vec2(age,seed);
}`;
const EMPTY_FS = `#version 300 es
precision highp float;
out vec4 o;
void main(){o=vec4(0.0);}`;

/* Paso 2: dibujar puntos aditivos en el buffer de tinta. */
const POINT_VS = `#version 300 es
precision highp float;
in vec2 a_pos;
in vec2 a_meta;
uniform vec2 u_size;
uniform float u_psize;
out float v_a;
void main(){
  vec2 c=vec2(a_pos.x/u_size.x*2.0-1.0,1.0-a_pos.y/u_size.y*2.0);
  gl_Position=vec4(c,0.0,1.0);
  gl_PointSize=u_psize;
  v_a=smoothstep(0.0,0.8,a_meta.x);
}`;
const POINT_FS = `#version 300 es
precision highp float;
in float v_a;
out vec4 o;
void main(){
  float m=1.0-smoothstep(0.15,0.5,length(gl_PointCoord-0.5));
  o=vec4(0.11*v_a*m,0.0,0.0,1.0);
}`;

const QUAD_VS = `#version 300 es
in vec2 a;
out vec2 v;
void main(){v=a*0.5+0.5;gl_Position=vec4(a,0.0,1.0);}`;

/* Paso 0: desvanecer el buffer anterior, arrastrándolo con el scroll. */
const DECAY_FS = `#version 300 es
precision highp float;
in vec2 v;
out vec4 o;
uniform sampler2D u_prev;
uniform float u_decay;
uniform float u_shift;
void main(){
  vec2 uv=v-vec2(0.0,u_shift);
  float d=(uv.y<0.0||uv.y>1.0)?0.0:texture(u_prev,uv).r*u_decay;
  o=vec4(d,0.0,0.0,1.0);
}`;

/* Paso 3: componer densidad -> color del tema. */
const COMPOSITE_FS = `#version 300 es
precision highp float;
in vec2 v;
out vec4 o;
uniform sampler2D u_tex;
uniform float u_theme;
void main(){
  float d=texture(u_tex,v).r;
  vec3 bg=mix(vec3(1.0),vec3(0.039),u_theme);
  vec3 gray=mix(vec3(0.2),vec3(0.8),u_theme);
  vec3 blue=mix(vec3(0.0,0.42,1.0),vec3(0.32,0.66,1.0),u_theme);
  vec3 ink=mix(gray,blue,smoothstep(0.35,1.0,d)*0.7);
  float a=smoothstep(0.0,0.9,d)*mix(0.34,0.28,u_theme);
  o=vec4(mix(bg,ink,a),1.0);
}`;

function domTheme(): number {
  return document.documentElement.getAttribute("data-theme") === "dark" ? 1 : 0;
}

export function HomeFlow() {
  const ref = useRef<HTMLCanvasElement>(null);
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
    if (!gl) return;
    themeRef.current = domTheme();

    const compile = (type: number, src: string): WebGLShader | null => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("[home-flow]", gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };
    const link = (vsSrc: string, fsSrc: string, tf?: string[]): WebGLProgram | null => {
      const vs = compile(gl.VERTEX_SHADER, vsSrc);
      const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
      const p = gl.createProgram();
      if (!vs || !fs || !p) return null;
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      if (tf) gl.transformFeedbackVaryings(p, tf, gl.SEPARATE_ATTRIBS);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.warn("[home-flow]", gl.getProgramInfoLog(p));
        return null;
      }
      return p;
    };
    const updateP = link(UPDATE_VS, EMPTY_FS, ["v_pos", "v_meta"]);
    const pointP = link(POINT_VS, POINT_FS);
    const decayP = link(QUAD_VS, DECAY_FS);
    const compP = link(QUAD_VS, COMPOSITE_FS);
    if (!updateP || !pointP || !decayP || !compP) return;

    const touchOnly = window.matchMedia("(hover: none)").matches;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    const inkScale = scale * 0.75;
    const N = window.innerWidth < 700 ? 1600 : 4500;

    /* Partículas: dos juegos de buffers (pos, meta) para leer uno y
       escribir el otro con transform feedback. */
    const pos0 = new Float32Array(N * 2);
    const meta0 = new Float32Array(N * 2);
    const W0 = window.innerWidth;
    const H0 = window.innerHeight;
    for (let i = 0; i < N; i++) {
      pos0[i * 2] = Math.random() * W0;
      pos0[i * 2 + 1] = Math.random() * H0;
      meta0[i * 2] = Math.random() * 5;
      meta0[i * 2 + 1] = Math.random() * 4096;
    }
    const mkBuf = (data: Float32Array | null, size: number) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      if (data) gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_COPY);
      else gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_COPY);
      return b;
    };
    const bufs = [
      { pos: mkBuf(pos0, 0), meta: mkBuf(meta0, 0) },
      { pos: mkBuf(null, N * 8), meta: mkBuf(null, N * 8) },
    ];
    const mkVao = (prog: WebGLProgram, b: { pos: WebGLBuffer | null; meta: WebGLBuffer | null }) => {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const aPos = gl.getAttribLocation(prog, "a_pos");
      const aMeta = gl.getAttribLocation(prog, "a_meta");
      gl.bindBuffer(gl.ARRAY_BUFFER, b.pos);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.meta);
      gl.enableVertexAttribArray(aMeta);
      gl.vertexAttribPointer(aMeta, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      return vao;
    };
    // Los layouts de a_pos/a_meta coinciden en ambos programas, así que
    // un VAO por juego de buffers sirve para actualizar y para dibujar.
    const vaos = [mkVao(updateP, bufs[0]!), mkVao(updateP, bufs[1]!)];
    const tfs = bufs.map((b) => {
      const tf = gl.createTransformFeedback();
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, b.pos);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, b.meta);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      return tf;
    });

    /* Quad para los pasos de pantalla completa. */
    const quadVao = gl.createVertexArray();
    gl.bindVertexArray(quadVao);
    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const qa = gl.getAttribLocation(decayP, "a");
    gl.enableVertexAttribArray(qa);
    gl.vertexAttribPointer(qa, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    /* Buffers de tinta (ping-pong). */
    const texs: (WebGLTexture | null)[] = [null, null];
    const fbos: (WebGLFramebuffer | null)[] = [null, null];
    let inkW = 0;
    let inkH = 0;
    const makeInk = () => {
      inkW = Math.max(1, Math.round(canvas.clientWidth * inkScale));
      inkH = Math.max(1, Math.round(canvas.clientHeight * inkScale));
      for (let i = 0; i < 2; i++) {
        gl.deleteTexture(texs[i] ?? null);
        gl.deleteFramebuffer(fbos[i] ?? null);
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, inkW, inkH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const f = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        texs[i] = t;
        fbos[i] = f;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);
    const u = {
      upSize: U(updateP, "u_size"),
      upDt: U(updateP, "u_dt"),
      upTime: U(updateP, "u_time"),
      upScroll: U(updateP, "u_scroll"),
      upDscroll: U(updateP, "u_dscroll"),
      upMouse: U(updateP, "u_mouse"),
      upMouseOn: U(updateP, "u_mouseOn"),
      ptSize: U(pointP, "u_size"),
      ptPsize: U(pointP, "u_psize"),
      dePrev: U(decayP, "u_prev"),
      deDecay: U(decayP, "u_decay"),
      deShift: U(decayP, "u_shift"),
      coTex: U(compP, "u_tex"),
      coTheme: U(compP, "u_theme"),
    };

    let src = 0;
    let inkSrc = 0;
    let raf = 0;
    let visible = !document.hidden;
    let lastNow = 0;
    let lastScroll = window.scrollY;
    let themeMix = themeRef.current;
    let mouseX = -1e5;
    let mouseY = -1e5;
    let mouseOn = 0;
    const start = performance.now();

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        makeInk();
      }
    };
    resize();

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      resize();
      const dt = Math.min(0.05, lastNow ? (now - lastNow) / 1000 : 1 / 60);
      lastNow = now;
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      const scrollY = window.scrollY;
      let dscroll = scrollY - lastScroll;
      lastScroll = scrollY;
      if (Math.abs(dscroll) > ch) dscroll = 0;
      themeMix += (themeRef.current - themeMix) * 0.08;
      if (Math.abs(themeRef.current - themeMix) < 0.002) themeMix = themeRef.current;

      /* 1. Partículas. */
      const dst = 1 - src;
      gl.useProgram(updateP);
      gl.uniform2f(u.upSize, cw, ch);
      gl.uniform1f(u.upDt, dt);
      gl.uniform1f(u.upTime, (now - start) / 1000);
      gl.uniform1f(u.upScroll, scrollY);
      gl.uniform1f(u.upDscroll, dscroll);
      gl.uniform2f(u.upMouse, mouseX, mouseY);
      gl.uniform1f(u.upMouseOn, mouseOn);
      gl.bindVertexArray(vaos[src]!);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tfs[dst]!);
      gl.enable(gl.RASTERIZER_DISCARD);
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArrays(gl.POINTS, 0, N);
      gl.endTransformFeedback();
      gl.disable(gl.RASTERIZER_DISCARD);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

      /* 2. Desvanecer la tinta anterior (arrastrada por el scroll). */
      const inkDst = 1 - inkSrc;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbos[inkDst] ?? null);
      gl.viewport(0, 0, inkW, inkH);
      gl.disable(gl.BLEND);
      gl.useProgram(decayP);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texs[inkSrc] ?? null);
      gl.uniform1i(u.dePrev, 0);
      gl.uniform1f(u.deDecay, Math.pow(0.955, dt * 60));
      gl.uniform1f(u.deShift, dscroll / ch);
      gl.bindVertexArray(quadVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      /* 3. Sumar los puntos nuevos. */
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(pointP);
      gl.uniform2f(u.ptSize, cw, ch);
      gl.uniform1f(u.ptPsize, 2.4 * inkScale);
      gl.bindVertexArray(vaos[dst]!);
      gl.drawArrays(gl.POINTS, 0, N);
      gl.disable(gl.BLEND);

      /* 4. Componer a pantalla. */
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(compP);
      gl.bindTexture(gl.TEXTURE_2D, texs[inkDst] ?? null);
      gl.uniform1i(u.coTex, 0);
      gl.uniform1f(u.coTheme, themeMix);
      gl.bindVertexArray(quadVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
      canvas.dataset.ready = "";

      src = dst;
      inkSrc = inkDst;
      raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && visible) {
        lastNow = 0;
        lastScroll = window.scrollY;
        raf = requestAnimationFrame(frame);
      }
    };

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
    const onVisibility = () => {
      visible = !document.hidden;
      kick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    kick();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onOut);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <canvas ref={ref} className="home-flow" aria-hidden="true" />;
}
