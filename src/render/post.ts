// WebGL2 son işlem: sahne tuvali doku olarak alınır; parlama (bloom), ışık huzmesi, renk, gren, bozulma, kararma.
export interface PostParams {
  enabled: boolean;
  bloom: number;          // parlama şiddeti
  bloomThreshold: number;
  rays: number;           // ışık huzmesi şiddeti
  raysX: number; raysY: number; // güneşin ekran konumu (0..1, y aşağı)
  raysDecay: number;
  exposure: number;
  contrast: number;
  saturation: number;
  tint: [number, number, number];   // çarpımsal renk
  lift: [number, number, number];   // gölgelere eklenen renk
  vignette: number;
  grain: number;
  aberration: number;
  glitch: number;
  scanlines: number;
  fade: number;                     // 0..1 fadeColor'a karışım
  fadeColor: [number, number, number];
  warp: number;                     // dalgalanma (rüya / bellek)
  pixelate: number;                 // 0 kapalı; >1 piksel boyu
}

export const defaultPost = (): PostParams => ({
  enabled: true, bloom: 0.55, bloomThreshold: 0.72, rays: 0, raysX: 0.5, raysY: 0.3, raysDecay: 0.965,
  exposure: 1, contrast: 1.04, saturation: 1.05, tint: [1, 1, 1], lift: [0, 0, 0], vignette: 0.35, grain: 0.045,
  aberration: 0, glitch: 0, scanlines: 0, fade: 0, fadeColor: [0, 0, 0], warp: 0, pixelate: 0,
});

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;

const FS_BRIGHT = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D t; uniform float th; uniform vec2 px;
void main(){
  vec3 c = vec3(0.);
  c += texture(t, uv + px*vec2(-1.,-1.)).rgb; c += texture(t, uv + px*vec2(1.,-1.)).rgb;
  c += texture(t, uv + px*vec2(-1.,1.)).rgb; c += texture(t, uv + px*vec2(1.,1.)).rgb;
  c *= 0.25;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = smoothstep(th, th + 0.12, l);
  o = vec4(c * k, 1.);
}`;

// 13 örnekli aşağı örnekleme (Jimenez 2014)
const FS_DOWN = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D t; uniform vec2 px;
void main(){
  vec3 a=texture(t,uv+px*vec2(-2,2)).rgb, b=texture(t,uv+px*vec2(0,2)).rgb, c=texture(t,uv+px*vec2(2,2)).rgb;
  vec3 d=texture(t,uv+px*vec2(-2,0)).rgb, e=texture(t,uv).rgb, f=texture(t,uv+px*vec2(2,0)).rgb;
  vec3 g=texture(t,uv+px*vec2(-2,-2)).rgb, h=texture(t,uv+px*vec2(0,-2)).rgb, i=texture(t,uv+px*vec2(2,-2)).rgb;
  vec3 j=texture(t,uv+px*vec2(-1,1)).rgb, k=texture(t,uv+px*vec2(1,1)).rgb, l=texture(t,uv+px*vec2(-1,-1)).rgb, m=texture(t,uv+px*vec2(1,-1)).rgb;
  vec3 r = e*0.125 + (a+c+g+i)*0.03125 + (b+d+f+h)*0.0625 + (j+k+l+m)*0.125;
  o = vec4(r,1.);
}`;

const FS_UP = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D t; uniform vec2 px; uniform float w;
void main(){
  vec3 r = texture(t,uv+px*vec2(-1,1)).rgb + texture(t,uv+px*vec2(0,1)).rgb*2. + texture(t,uv+px*vec2(1,1)).rgb
   + texture(t,uv+px*vec2(-1,0)).rgb*2. + texture(t,uv).rgb*4. + texture(t,uv+px*vec2(1,0)).rgb*2.
   + texture(t,uv+px*vec2(-1,-1)).rgb + texture(t,uv+px*vec2(0,-1)).rgb*2. + texture(t,uv+px*vec2(1,-1)).rgb;
  o = vec4(r/16. * w, 1.);
}`;

const FS_RAYS = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D t; uniform vec2 sun; uniform float decay;
void main(){
  vec2 d = (uv - sun) / 72.;
  vec2 q = uv; float il = 1.; vec3 acc = vec3(0.);
  float j = fract(sin(dot(uv, vec2(12.9898,78.233)))*43758.5453);
  q -= d * j;
  for(int i=0;i<72;i++){ q -= d; acc += texture(t, q).rgb * il; il *= decay; }
  o = vec4(acc / 72., 1.);
}`;

const FS_FINAL = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D scene, bloomT, raysT;
uniform float bloom, rays, exposure, contrast, saturation, vignette, grain, aberration, glitch, scanlines, fade, time, warp, pixelate, hasRays;
uniform vec3 tint, lift, fadeColor; uniform vec2 res;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
vec3 sampleScene(vec2 q){
  if (aberration > 0.) {
    vec2 dir = (q - 0.5);
    float a = aberration * 0.006;
    return vec3(texture(scene, q + dir*a).r, texture(scene, q).g, texture(scene, q - dir*a).b);
  }
  return texture(scene, q).rgb;
}
void main(){
  vec2 q = uv;
  if (pixelate > 1.) { vec2 cell = pixelate / res; q = (floor(q / cell) + 0.5) * cell; }
  if (warp > 0.) { q.x += sin(q.y*18. + time*1.7) * 0.004 * warp; q.y += sin(q.x*13. + time*1.3) * 0.003 * warp; }
  if (glitch > 0.) {
    float row = floor(q.y * 48.);
    float n = h(vec2(row, floor(time*14.)));
    float on = step(1. - glitch*0.55, n);
    q.x += (h(vec2(row*3.1, floor(time*21.))) - 0.5) * 0.16 * glitch * on;
    float blk = step(0.985 - glitch*0.06, h(floor(q*vec2(12.,7.)) + floor(time*9.)));
    q += blk * (vec2(h(vec2(time)), h(vec2(time*1.3))) - 0.5) * 0.05 * glitch;
  }
  vec3 c = sampleScene(q);
  if (glitch > 0.) {
    float s = glitch * 0.012;
    c.r = mix(c.r, texture(scene, q + vec2(s,0.)).r, glitch);
    c.b = mix(c.b, texture(scene, q - vec2(s,0.)).b, glitch);
  }
  c += texture(bloomT, q).rgb * bloom;
  if (hasRays > 0.) c += texture(raysT, q).rgb * rays;
  c *= exposure;
  c = c * tint + lift * (1. - c);
  float l = dot(c, vec3(0.2126,0.7152,0.0722));
  c = mix(vec3(l), c, saturation);
  c = (c - 0.5) * contrast + 0.5;
  if (scanlines > 0.) c *= 1. - scanlines * 0.5 * (0.5 + 0.5*sin(uv.y*res.y*3.14159));
  vec2 v = uv - 0.5; v.x *= res.x/res.y;
  c *= 1. - vignette * smoothstep(0.35, 1.05, length(v));
  float g = h(uv*res + fract(time*7.31)*101.) - 0.5;
  c += g * grain;
  c += (h(uv*res*1.37 + 13.) - 0.5) / 255.; // titreşimli yuvarlama: bant oluşmasın
  c = mix(c, fadeColor, fade);
  o = vec4(clamp(c, 0., 1.), 1.);
}`;

const FS_COPY = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D t; uniform float fade; uniform vec3 fadeColor;
void main(){ o = vec4(mix(texture(t, uv).rgb, fadeColor, fade), 1.); }`;

interface FB { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }

export class Post {
  gl: WebGL2RenderingContext;
  private progs: Record<string, WebGLProgram> = {};
  private sceneTex: WebGLTexture;
  private chain: FB[] = [];
  private raysFB: FB | null = null;
  private brightFB: FB | null = null;
  private w = 0; h = 0;
  private half = false;
  private time = 0;
  private internalFmt: number;

  constructor(public canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 yok');
    this.gl = gl;
    this.half = !!gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    this.internalFmt = this.half ? gl.RGBA16F : gl.RGBA8;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    for (const [k, fs] of Object.entries({ bright: FS_BRIGHT, down: FS_DOWN, up: FS_UP, rays: FS_RAYS, final: FS_FINAL, copy: FS_COPY })) {
      this.progs[k] = this.link(VS, fs);
    }
    this.sceneTex = this.makeTex();
  }

  private link(vs: string, fs: string) {
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    return p;
  }

  private makeTex() {
    const gl = this.gl, t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  private makeFB(w: number, h: number): FB {
    const gl = this.gl;
    const tex = this.makeTex();
    gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFmt, w, h, 0, gl.RGBA, this.half ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fb, tex, w, h };
  }

  resize(w: number, h: number) {
    if (w === this.w && h === this.h) return;
    const gl = this.gl;
    for (const f of this.chain) { gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.tex); }
    if (this.raysFB) { gl.deleteFramebuffer(this.raysFB.fb); gl.deleteTexture(this.raysFB.tex); }
    if (this.brightFB) { gl.deleteFramebuffer(this.brightFB.fb); gl.deleteTexture(this.brightFB.tex); }
    this.w = w; this.h = h;
    this.canvas.width = w; this.canvas.height = h;
    this.chain = [];
    let cw = Math.max(1, w >> 1), ch = Math.max(1, h >> 1);
    this.brightFB = this.makeFB(cw, ch);
    for (let i = 0; i < 6; i++) {
      cw = Math.max(1, cw >> 1); ch = Math.max(1, ch >> 1);
      this.chain.push(this.makeFB(cw, ch));
    }
    this.raysFB = this.makeFB(Math.max(1, w >> 2), Math.max(1, h >> 2));
  }

  private use(name: string) { const p = this.progs[name]; this.gl.useProgram(p); return p; }
  private u(p: WebGLProgram, n: string) { return this.gl.getUniformLocation(p, n); }
  private draw(target: FB | null) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    gl.viewport(0, 0, target ? target.w : this.w, target ? target.h : this.h);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  private bindTex(unit: number, tex: WebGLTexture) { const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); }

  render(src: HTMLCanvasElement, P: PostParams, dt: number) {
    const gl = this.gl;
    this.time += dt;
    this.resize(src.width, src.height);
    this.bindTex(0, this.sceneTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.disable(gl.BLEND);

    if (!P.enabled) {
      const p = this.use('copy');
      gl.uniform1i(this.u(p, 't'), 0); gl.uniform1f(this.u(p, 'fade'), P.fade); gl.uniform3fv(this.u(p, 'fadeColor'), P.fadeColor);
      this.draw(null);
      return;
    }

    // parlak geçiş
    let p = this.use('bright');
    this.bindTex(0, this.sceneTex);
    gl.uniform1i(this.u(p, 't'), 0); gl.uniform1f(this.u(p, 'th'), P.bloomThreshold);
    gl.uniform2f(this.u(p, 'px'), 1 / this.w, 1 / this.h);
    this.draw(this.brightFB);
    // aşağı
    p = this.use('down');
    let prev = this.brightFB!;
    for (const f of this.chain) {
      this.bindTex(0, prev.tex); gl.uniform1i(this.u(p, 't'), 0); gl.uniform2f(this.u(p, 'px'), 1 / prev.w, 1 / prev.h);
      this.draw(f); prev = f;
    }
    // yukarı (eklemeli)
    p = this.use('up');
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = this.chain.length - 1; i > 0; i--) {
      const s = this.chain[i], d = this.chain[i - 1];
      this.bindTex(0, s.tex); gl.uniform1i(this.u(p, 't'), 0); gl.uniform2f(this.u(p, 'px'), 1 / s.w, 1 / s.h); gl.uniform1f(this.u(p, 'w'), 1);
      this.draw(d);
    }
    gl.disable(gl.BLEND);
    // huzmeler
    if (P.rays > 0) {
      p = this.use('rays');
      this.bindTex(0, this.brightFB!.tex); gl.uniform1i(this.u(p, 't'), 0);
      gl.uniform2f(this.u(p, 'sun'), P.raysX, 1 - P.raysY); gl.uniform1f(this.u(p, 'decay'), P.raysDecay);
      this.draw(this.raysFB);
    }
    // son birleştirme
    p = this.use('final');
    this.bindTex(0, this.sceneTex); this.bindTex(1, this.chain[0].tex); this.bindTex(2, this.raysFB!.tex);
    gl.uniform1i(this.u(p, 'scene'), 0); gl.uniform1i(this.u(p, 'bloomT'), 1); gl.uniform1i(this.u(p, 'raysT'), 2);
    const f1 = (n: string, v: number) => gl.uniform1f(this.u(p, n), v);
    f1('bloom', P.bloom); f1('rays', P.rays); f1('hasRays', P.rays > 0 ? 1 : 0); f1('exposure', P.exposure); f1('contrast', P.contrast);
    f1('saturation', P.saturation); f1('vignette', P.vignette); f1('grain', P.grain); f1('aberration', P.aberration);
    f1('glitch', P.glitch); f1('scanlines', P.scanlines); f1('fade', P.fade); f1('time', this.time); f1('warp', P.warp); f1('pixelate', P.pixelate);
    gl.uniform3fv(this.u(p, 'tint'), P.tint); gl.uniform3fv(this.u(p, 'lift'), P.lift); gl.uniform3fv(this.u(p, 'fadeColor'), P.fadeColor);
    gl.uniform2f(this.u(p, 'res'), this.w, this.h);
    this.draw(null);
  }
}
