/* =========================================================
   El Universo GESTARIAN · Three.js
   - Sol: tarjeta dorada (billboard, no gira) con shader de calor
   - 4 planetas orbitando + 4 satélites que les siguen en su traslación
   - Interacción: arrastrar = girar, hover = primer plano,
     click Sol = al frente + pausa + scroll zoom, click planeta = tarjeta
   ========================================================= */
import * as THREE from 'three';

THREE.ColorManagement.enabled = false;

const PLANS = window.GESTARIAN_PLANS || {};
const section = document.getElementById('universo');
const canvas = document.getElementById('universe-canvas');
const overlay = document.getElementById('u-overlay');
const sunPanel = document.getElementById('sun-panel');

const isTouch = window.matchMedia('(hover: none)').matches;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

if (!section || !canvas) {
  // nada que hacer
} else if (!webglAvailable()) {
  section.classList.add('no-webgl');
} else {
  try { initUniverse(); } catch (err) {
    console.error('[Universo] Error inicializando WebGL:', err);
    section.classList.add('no-webgl');
  }
}

/* ---------------------------------------------------------
   Helpers
   --------------------------------------------------------- */
const tween = (target, vars) => {
  if (window.gsap) return window.gsap.to(target, vars);
  const { duration, delay, ease, onComplete, ...props } = vars;
  Object.assign(target, props);
  if (onComplete) onComplete();
  return null;
};
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);

const GLSL_NOISE = /* glsl */`
  float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x), u.y); }
  float fbm(vec2 p){ float v=0.0; float a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p=p*2.02+vec2(1.7,9.2); a*=0.5; } return v; }
  float sdRoundBox(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }
`;

const GLSL_NOISE3 = /* glsl */`
  float hash3(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float noise3(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash3(i),hash3(i+vec3(1.0,0.0,0.0)),f.x), mix(hash3(i+vec3(0.0,1.0,0.0)),hash3(i+vec3(1.0,1.0,0.0)),f.x),f.y),
               mix(mix(hash3(i+vec3(0.0,0.0,1.0)),hash3(i+vec3(1.0,0.0,1.0)),f.x), mix(hash3(i+vec3(0.0,1.0,1.0)),hash3(i+vec3(1.0,1.0,1.0)),f.x),f.y), f.z); }
  float fbm3(vec3 p){ float v=0.0; float a=0.5; for(int i=0;i<4;i++){ v+=a*noise3(p); p*=2.03; a*=0.5; } return v; }
`;

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  grd.addColorStop(0.6, 'rgba(255,255,255,0.08)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/* ---------------------------------------------------------
   Universo
   --------------------------------------------------------- */
function initUniverse() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  let pixelRatio = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);

  const quality = isTouch ? 'low' : 'high';
  const SEG = quality === 'high' ? 64 : 36;
  const glowTex = makeGlowTexture();

  /* ---------- Estado ---------- */
  const state = {
    time: 0,
    timeScale: reducedMotion ? 0.3 : 1,
    baseTimeScale: reducedMotion ? 0.3 : 1,
    theta: 0.55, phi: 1.1, dist: 26,
    vTheta: 0, vPhi: 0,
    intro: 0,
    hovered: null,
    sunHover: 0,
    sunFocus: false,
    sunPull: 0,
    sunZoom: 1, sunZoomTarget: 1,
    running: true,
    layout: null
  };

  /* ---------- Estrellas ---------- */
  const STAR_COUNT = quality === 'high' ? 2400 : 1000;
  const starGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(STAR_COUNT * 3);
  const sCol = new Float32Array(STAR_COUNT * 3);
  const sSize = new Float32Array(STAR_COUNT);
  const sPhase = new Float32Array(STAR_COUNT);
  const starPalette = [[1, 1, 1], [0.78, 0.82, 1], [0.86, 0.75, 1], [1, 0.9, 0.7], [0.7, 0.9, 1]];
  for (let i = 0; i < STAR_COUNT; i++) {
    const r = 80 + Math.random() * 120;
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    sPos.set([r * s * Math.cos(th), r * u, r * s * Math.sin(th)], i * 3);
    sCol.set(starPalette[(Math.random() * starPalette.length) | 0], i * 3);
    sSize[i] = Math.random() < 0.08 ? 2.4 + Math.random() * 1.6 : 0.8 + Math.random() * 1.2;
    sPhase[i] = Math.random() * Math.PI * 2;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(sPhase, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPR: { value: pixelRatio } },
    vertexShader: /* glsl */`
      attribute float aSize; attribute float aPhase; attribute vec3 color;
      uniform float uTime; uniform float uPR;
      varying vec3 vColor; varying float vTw;
      void main(){
        vColor = color;
        vTw = 0.55 + 0.45 * sin(uTime * (0.8 + fract(aPhase) * 1.6) + aPhase * 6.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPR * (140.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vColor; varying float vTw;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, a * a * vTw);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  /* ---------- Sol (tarjeta dorada) ---------- */
  const CW = 3.4, CH = 4.45;           // tamaño de la tarjeta
  const PW = CW + 2.2, PH = CH + 2.2;  // plano con margen para resplandor/calor
  const sun = new THREE.Group();
  scene.add(sun);

  // Textura de texto (canvas)
  const textCanvas = document.createElement('canvas');
  const textTex = new THREE.CanvasTexture(textCanvas);
  textTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  drawSunText(textCanvas);
  textTex.needsUpdate = true;
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { drawSunText(textCanvas); textTex.needsUpdate = true; });
  }

  const sunMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uTextOpacity: { value: 1 },
      uHover: { value: 0 },
      uHasGold: { value: 0 },
      uText: { value: textTex },
      uGold: { value: null },
      uCard: { value: new THREE.Vector2(CW, CH) },
      uSize: { value: new THREE.Vector2(PW, PH) }
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform float uTextOpacity; uniform float uHover; uniform float uHasGold;
      uniform sampler2D uText; uniform sampler2D uGold; uniform vec2 uCard; uniform vec2 uSize;
      varying vec2 vUv;
      ${GLSL_NOISE}
      void main(){
        float t = uTime;
        vec2 uv = vUv;
        // Distorsión por calor: ondas que suben (aire caliente sobre un capó)
        vec2 hp = uv * vec2(4.0, 6.5) + vec2(0.0, -t * 1.15);
        vec2 d = vec2(fbm(hp), fbm(hp + vec2(5.2, 1.3))) - 0.5;
        vec2 p0 = (uv - 0.5) * uSize;
        float rise = clamp((p0.y + uSize.y * 0.5) / uSize.y, 0.0, 1.0);
        vec2 p = p0 + d * (0.05 + 0.11 * rise);
        float sd = sdRoundBox(p, uCard * 0.5, 0.26);
        float mask = 1.0 - smoothstep(-0.012, 0.012, sd);
        vec2 cuv = p / uCard + 0.5;

        // Cuerpo dorado (gradiente + oro fundido deformado)
        float flow = fbm(cuv * vec2(2.5, 3.5) + vec2(t * 0.05, -t * 0.2));
        float g = clamp(cuv.y * 0.55 + flow * 0.6, 0.0, 1.2);
        vec3 col = mix(vec3(0.66, 0.38, 0.05), vec3(0.99, 0.76, 0.28), smoothstep(0.1, 0.75, g));
        col = mix(col, vec3(1.0, 0.93, 0.68), smoothstep(0.7, 1.1, g) * 0.8);
        if (uHasGold > 0.5) {
          vec3 tex = texture2D(uGold, cuv * 0.85 + d * 0.07 + vec2(t * 0.004, t * 0.012)).rgb;
          col *= 0.6 + 0.65 * tex;
        }
        col = mix(col, vec3(1.0, 0.87, 0.52), 0.24 * (1.0 - smoothstep(0.0, 0.6, length((cuv - 0.5) * vec2(1.0, 0.8)))));
        float band = smoothstep(0.06, 0.0, abs(fract(cuv.x * 0.5 + cuv.y * 0.5 - t * 0.08) - 0.5));
        col += band * vec3(1.0, 0.9, 0.6) * 0.18;
        float border = smoothstep(0.07, 0.0, abs(sd + 0.05));
        col = mix(col, vec3(1.0, 0.96, 0.78), border * 0.7);

        // Texto (levemente afectado por el calor)
        vec4 tx = texture2D(uText, cuv + d * 0.004);
        col = mix(col, tx.rgb, tx.a * uTextOpacity);

        // Resplandor exterior con calima
        float outside = max(sd, 0.0);
        float haze = fbm(vec2(p0.x * 1.2, p0.y * 0.9 - t * 1.4));
        float glow = exp(-outside * 2.4) * (0.55 + 0.6 * haze) * (1.0 + uHover * 0.6);
        vec3 glowCol = mix(vec3(1.0, 0.45, 0.05), vec3(1.0, 0.8, 0.35), exp(-outside * 4.0));
        float edgeFade = smoothstep(0.5, 0.36, max(abs(uv.x - 0.5), abs(uv.y - 0.5)));
        float ga = clamp(glow * edgeFade, 0.0, 1.0) * (1.0 - mask);
        float alpha = max(mask, ga * 0.85);
        vec3 outCol = mix(glowCol, col, mask);
        gl_FragColor = vec4(outCol, alpha);
      }`,
    transparent: true, depthWrite: false
  });
  const sunCard = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), sunMat);
  sun.add(sunCard);

  // Corona (halo aditivo con rayos y calima)
  const coronaMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 }, uCard: { value: new THREE.Vector2(CW, CH) }, uSize: { value: new THREE.Vector2(18, 18) } },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform float uIntensity; uniform vec2 uCard; uniform vec2 uSize;
      varying vec2 vUv;
      ${GLSL_NOISE}
      void main(){
        vec2 p = (vUv - 0.5);
        vec2 w = p * uSize;
        float sd = max(sdRoundBox(w, uCard * 0.5, 0.3), 0.0);
        float ang = atan(p.y, p.x);
        float n = fbm(vec2(ang * 2.5 + 3.0, length(w) * 0.9 - uTime * 0.5));
        float glow = exp(-sd * 0.75) * (0.5 + 0.7 * n);
        float rays = pow(max(0.0, sin(ang * 12.0 + n * 5.0 + uTime * 0.15)), 8.0) * exp(-sd * 0.45) * 0.35;
        vec3 col = mix(vec3(1.0, 0.42, 0.05), vec3(1.0, 0.82, 0.4), exp(-sd * 1.2));
        float a = (glow * 0.42 + rays) * uIntensity * smoothstep(0.5, 0.25, length(p));
        gl_FragColor = vec4(col * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const corona = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), coronaMat);
  corona.position.z = -0.08;
  sun.add(corona);

  const sunHit = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshBasicMaterial({ visible: false }));
  sunHit.userData = { type: 'sun' };
  sun.add(sunHit);

  new THREE.TextureLoader().load('assets/sun-gold.jpg', (tex) => {
    tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
    sunMat.uniforms.uGold.value = tex;
    sunMat.uniforms.uHasGold.value = 1;
  });

  /* ---------- Planetas ---------- */
  const sphereGeo = new THREE.SphereGeometry(1, SEG, SEG);         // geometría compartida (instancing ligero)
  const hitGeo = new THREE.SphereGeometry(1, 10, 10);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });

  const planetVert = /* glsl */`
    varying vec3 vN; varying vec3 vW; varying vec3 vP;
    void main(){
      vP = position;
      vec4 w = modelMatrix * vec4(position, 1.0);
      vW = w.xyz;
      vN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const planetFrag = /* glsl */`
    uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
    uniform float uTime; uniform float uDim; uniform float uFocus; uniform float uSeed; uniform float uBands;
    varying vec3 vN; varying vec3 vW; varying vec3 vP;
    ${GLSL_NOISE3}
    void main(){
      vec3 N = normalize(vN);
      vec3 L = normalize(-vW);
      vec3 V = normalize(cameraPosition - vW);
      vec3 p = normalize(vP);
      float warp = fbm3(p * 2.5 + uSeed + vec3(0.0, 0.0, uTime * 0.05));
      float bands = fbm3(vec3(p.x * 1.2, p.y * uBands + warp * 2.2, p.z * 1.2) + uSeed * 1.7);
      vec3 base = mix(uA, uB, smoothstep(0.25, 0.75, bands));
      base = mix(base, uC, smoothstep(0.62, 0.9, bands) * 0.8);
      float diff = max(dot(N, L), 0.0);
      float wrap = dot(N, L) * 0.5 + 0.5;
      float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
      vec3 col = base * (0.18 + 0.72 * diff + 0.22 * wrap);
      col += uB * fres * (0.8 + 0.7 * uFocus);
      col += uC * pow(fres, 4.0) * 0.5;
      col += vec3(1.0, 0.72, 0.3) * pow(diff, 10.0) * 0.12;
      col = mix(col, col * 0.2 + vec3(0.01, 0.01, 0.03), uDim);
      gl_FragColor = vec4(col, 1.0);
    }`;

  const PLANET_DEFS = [
    { id: 'lite', R: 5.0, size: 0.5, speed: 0.2, angle: 0.4, colors: ['#1d2a63', '#7c93ff', '#d5ddff'], bands: 7, seed: 1.3 },
    { id: 'quick', R: 6.9, size: 0.56, speed: 0.15, angle: 2.3, colors: ['#08324f', '#38bdf8', '#c4f0ff'], bands: 9, seed: 4.1 },
    { id: 'pro', R: 9.2, size: 0.9, speed: 0.105, angle: 4.0, colors: ['#2b0d57', '#a855f7', '#f0dcff'], bands: 6, seed: 7.7, satSize: 0.27 },
    { id: 'enterprise', R: 12.0, size: 1.3, speed: 0.075, angle: 5.5, colors: ['#17125a', '#6366f1', '#cfc6ff'], bands: 5, seed: 2.9, satSize: 0.33, ring: true }
  ];

  const hex = (h) => new THREE.Color(h);
  const lighten = (h, k) => new THREE.Color(h).lerp(new THREE.Color('#ffffff'), k);

  const planets = [];
  const hitTargets = [sunHit];
  const orbitLines = [];

  function makePlanetMaterial(colors, seed, bands) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uA: { value: colors[0] }, uB: { value: colors[1] }, uC: { value: colors[2] },
        uTime: { value: 0 }, uDim: { value: 0 }, uFocus: { value: 0 }, uSeed: { value: seed }, uBands: { value: bands }
      },
      vertexShader: planetVert,
      fragmentShader: planetFrag
    });
  }

  function makeGlowSprite(color, opacity) {
    const m = new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
    return new THREE.Sprite(m);
  }

  PLANET_DEFS.forEach((def) => {
    const plan = PLANS[def.id] || { name: def.id, short: '', tagline: '' };
    const colors = def.colors.map(hex);

    const group = new THREE.Group();
    const mat = makePlanetMaterial(colors, def.seed, def.bands);
    const mesh = new THREE.Mesh(sphereGeo, mat);
    group.add(mesh);

    const glow = makeGlowSprite(colors[1], 0.55);
    glow.scale.setScalar(3.4);
    group.add(glow);

    let ring = null;
    if (def.ring) {
      const ringMat = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: colors[2] }, uDim: { value: 0 }, uInner: { value: 1.45 }, uOuter: { value: 2.35 } },
        vertexShader: /* glsl */`varying float vR; void main(){ vR = length(position.xy); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */`
          uniform vec3 uColor; uniform float uDim; uniform float uInner; uniform float uOuter; varying float vR;
          void main(){
            float t = (vR - uInner) / (uOuter - uInner);
            float b = 0.55 + 0.45 * sin(t * 38.0) * sin(t * 11.0 + 1.0);
            float a = smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.82, t) * b * 0.55 * (1.0 - uDim * 0.8);
            gl_FragColor = vec4(uColor * (0.6 + 0.5 * b), a);
          }`,
        transparent: true, depthWrite: false, side: THREE.DoubleSide
      });
      ring = new THREE.Mesh(new THREE.RingGeometry(1.45, 2.35, 128, 1), ringMat);
      ring.rotation.set(Math.PI / 2.35, 0.25, 0);
      group.add(ring);
    }

    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.scale.setScalar(def.ring ? 1.9 : 1.75);
    group.add(hit);
    scene.add(group);

    // Línea de órbita
    const pts = [];
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
    }
    const orbit = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: colors[1], transparent: true, opacity: 0.16, depthWrite: false })
    );
    scene.add(orbit);
    orbitLines.push({ line: orbit, R: def.R });

    // Etiqueta HTML
    const label = document.createElement('div');
    label.className = 'u-label';
    label.style.setProperty('--lc', def.colors[1]);
    label.innerHTML = `
      <div class="inner">
        <span class="name">${plan.name}</span>
        <span class="meta">${plan.short || ''}</span>
        <div class="more">
          <span class="tag">${plan.tagline}${plan.limit ? ' · ' + plan.limit : ''}</span>
          <span class="cta">${isTouch ? 'Toca de nuevo para abrir su tarjeta' : 'Haz click para abrir su tarjeta'}</span>
        </div>
      </div>`;
    overlay.appendChild(label);

    const planet = {
      id: def.id, def, plan, group, mesh, mat, glow, ring, hit, label,
      angle: def.angle, focus: 0, dim: 0, away: 0,
      orbitPos: new THREE.Vector3(), pos: new THREE.Vector3(), worldRadius: def.size,
      sats: []
    };
    hit.userData = { type: 'planet', planet };
    hitTargets.push(hit);

    // Satélites
    (plan.satellites || []).forEach((s, i) => {
      const sColors = [lighten(def.colors[0], 0.1 + i * 0.08), lighten(def.colors[1], 0.15 + i * 0.12), lighten(def.colors[2], 0.2)];
      const sGroup = new THREE.Group();
      const sMat = makePlanetMaterial(sColors, def.seed + 3.1 * (i + 1), 10 + i * 4);
      const sMesh = new THREE.Mesh(sphereGeo, sMat);
      sGroup.add(sMesh);
      const sGlow = makeGlowSprite(sColors[1], 0.5);
      sGlow.scale.setScalar(3.2);
      sGroup.add(sGlow);
      const sHit = new THREE.Mesh(hitGeo, hitMat);
      sHit.scale.setScalar(2.4);
      sGroup.add(sHit);
      scene.add(sGroup);

      const sLabel = document.createElement('div');
      sLabel.className = 'u-sat';
      sLabel.style.setProperty('--lc', def.colors[1]);
      sLabel.innerHTML = `
        <div class="chip">${s.chip}</div>
        <div class="card">
          <h4>${plan.name} · ${s.title}</h4>
          <div class="chips">${s.items.map(it => `<span>${it}</span>`).join('')}</div>
          ${s.desc ? `<p>${s.desc}</p>` : ''}
          ${s.img ? `<img src="${s.img}" alt="Evolución visual del vehículo" loading="lazy">` : ''}
        </div>`;
      overlay.appendChild(sLabel);

      const sat = {
        index: i, planet, group: sGroup, mesh: sMesh, mat: sMat, glow: sGlow, label: sLabel,
        card: sLabel.querySelector('.card'), cardW: 250, cardH: 120, pos: new THREE.Vector3(), size: def.satSize || 0.28
      };
      sHit.userData = { type: 'sat', planet, sat };
      hitTargets.push(sHit);
      planet.sats.push(sat);
    });

    planets.push(planet);
  });

  /* ---------- Layout responsive ---------- */
  let W = 1, H = 1;
  function measureCards() {
    planets.forEach(p => p.sats.forEach(s => { s.cardW = s.card.offsetWidth || 250; s.cardH = s.card.offsetHeight || 120; }));
  }
  function computeLayout() {
    W = section.clientWidth;
    H = section.clientHeight;
    const aspect = W / H;
    const portrait = aspect < 0.9;
    const L = portrait
      ? { portrait, orbitScale: 0.8, sizeScale: 1.45, sunScale: 1.2, phi: 0.7, fov: 50 }
      : { portrait, orbitScale: 1, sizeScale: 1, sunScale: 1, phi: 1.1, fov: 42 };
    camera.fov = L.fov;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const tanV = Math.tan(THREE.MathUtils.degToRad(L.fov / 2));
    const tanH = tanV * aspect;
    const outer = 12.0 * L.orbitScale + 1.4 * L.sizeScale;
    const dH = (portrait ? outer * 0.9 : outer * 1.06) / tanH;
    const dV = (outer * Math.cos(L.phi) + 1.6) / (tanV * 0.8);
    L.dist = Math.max(dH, dV, 14);
    L.tanV = tanV;
    state.layout = L;
    state.phi = L.phi;
    renderer.setSize(W, H, false);
    measureCards();
  }
  computeLayout();
  window.addEventListener('resize', computeLayout);

  /* ---------- Interacción ---------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pointer = { x: 0, y: 0, inside: false, needsPick: false, down: false, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: 0, t0: 0, type: 'mouse', id: null };
  let unhoverTimer = null;

  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(hitTargets, false);
    if (!hits.length) return null;
    // prioridad: planeta/satélite enfocado > sol > resto
    const focused = hits.find(h => h.object.userData.planet && h.object.userData.planet === state.hovered);
    if (focused) return focused.object.userData;
    const planetHit = hits.find(h => h.object.userData.type !== 'sun');
    const sunH = hits.find(h => h.object.userData.type === 'sun');
    if (planetHit && sunH && sunH.distance < planetHit.distance) return sunH.object.userData;
    return (planetHit || sunH).object.userData;
  }

  function setHover(planet) {
    clearTimeout(unhoverTimer);
    if (state.hovered === planet) return;
    state.hovered = planet;
    section.classList.toggle('has-hover', !!planet);
    tween(state, { timeScale: planet ? state.baseTimeScale * 0.22 : state.baseTimeScale, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
  }
  function scheduleUnhover(delay = 260) {
    clearTimeout(unhoverTimer);
    if (!state.hovered) return;
    unhoverTimer = setTimeout(() => setHover(null), delay);
  }

  function enterSunFocus() {
    if (state.sunFocus) return;
    state.sunFocus = true;
    setHover(null);
    state.sunZoomTarget = 1;
    section.classList.add('sun-focus');
    tween(state, { timeScale: 0, duration: 1.1, ease: 'power2.out', overwrite: 'auto' });
    tween(state, { sunPull: 1, duration: 1.3, ease: 'power3.inOut' });
    tween(sunMat.uniforms.uTextOpacity, { value: 0, duration: 0.6, delay: 0.85 });
    setTimeout(() => { if (state.sunFocus) sunPanel.classList.add('ready'); }, 850);
  }
  function exitSunFocus() {
    if (!state.sunFocus) return;
    state.sunFocus = false;
    sunPanel.classList.remove('ready');
    section.classList.remove('sun-focus');
    tween(sunMat.uniforms.uTextOpacity, { value: 1, duration: 0.4 });
    tween(state, { sunPull: 0, duration: 1.1, ease: 'power3.inOut' });
    tween(state, { timeScale: state.baseTimeScale, duration: 1.4, ease: 'power2.inOut', overwrite: 'auto' });
  }
  window.GestarianUniverse = { enterSunFocus, exitSunFocus };

  document.getElementById('sun-exit')?.addEventListener('click', exitSunFocus);
  document.getElementById('sun-panel-close')?.addEventListener('click', exitSunFocus);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.sunFocus && !document.querySelector('.modal-overlay.active')) exitSunFocus();
  });
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') state.vTheta -= 0.04;
    if (e.key === 'ArrowRight') state.vTheta += 0.04;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); state.sunFocus ? exitSunFocus() : enterSunFocus(); }
  });

  canvas.addEventListener('pointerdown', (e) => {
    pointer.down = true;
    pointer.id = e.pointerId;
    pointer.type = e.pointerType;
    pointer.startX = pointer.lastX = e.clientX;
    pointer.startY = pointer.lastY = e.clientY;
    pointer.moved = 0;
    pointer.t0 = performance.now();
    state.vTheta = 0; state.vPhi = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
  });

  canvas.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.inside = true;
    if (pointer.down && e.pointerId === pointer.id) {
      const dx = e.clientX - pointer.lastX;
      const dy = e.clientY - pointer.lastY;
      pointer.lastX = e.clientX; pointer.lastY = e.clientY;
      pointer.moved += Math.abs(dx) + Math.abs(dy);
      if (pointer.moved > 6) {
        if (state.sunFocus) {
          // arrastre vertical = acercar/alejar el Sol (equivalente táctil del scroll)
          state.sunZoomTarget = clamp(state.sunZoomTarget * Math.exp(-dy * 0.004), 0.55, 1.7);
        } else {
          canvas.classList.add('dragging');
          if (state.hovered) setHover(null);
          state.vTheta = -dx * 0.0055;
          state.vPhi = pointer.type === 'mouse' ? -dy * 0.004 : 0;
          state.theta += state.vTheta;
          state.phi = clamp(state.phi + state.vPhi, 0.45, 1.42);
        }
      }
    } else if (e.pointerType === 'mouse') {
      pointer.needsPick = true;
    }
  });

  function endPointer(e, cancelled) {
    if (!pointer.down || e.pointerId !== pointer.id) return;
    pointer.down = false;
    canvas.classList.remove('dragging');
    const isTap = !cancelled && pointer.moved <= 8 && performance.now() - pointer.t0 < 600;
    if (!isTap) return;
    const hit = pick(e.clientX, e.clientY);
    if (state.sunFocus) {
      if (!hit || hit.type !== 'sun') exitSunFocus();
      return;
    }
    if (!hit) { if (state.hovered) setHover(null); return; }
    if (hit.type === 'sun') { enterSunFocus(); return; }
    const planet = hit.planet;
    if (e.pointerType !== 'mouse' && state.hovered !== planet) { setHover(planet); return; }
    if (typeof window.openPlanDetails === 'function') window.openPlanDetails(planet.id);
  }
  canvas.addEventListener('pointerup', (e) => endPointer(e, false));
  canvas.addEventListener('pointercancel', (e) => endPointer(e, true));
  canvas.addEventListener('pointerleave', (e) => {
    pointer.inside = false;
    if (e.pointerType === 'mouse') { scheduleUnhover(350); state.sunHover = 0; canvas.classList.remove('pointer'); }
  });

  section.addEventListener('wheel', (e) => {
    if (!state.sunFocus) return;
    e.preventDefault();
    state.sunZoomTarget = clamp(state.sunZoomTarget * Math.exp(-e.deltaY * 0.0012), 0.55, 1.7);
  }, { passive: false });

  /* ---------- Visibilidad / rendimiento ---------- */
  let introStarted = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      state.running = en.isIntersecting;
      if (en.isIntersecting && !introStarted) {
        introStarted = true;
        tween(state, { intro: 1, duration: 2.4, ease: 'power3.out' });
      }
    });
  }, { threshold: 0.02 });
  io.observe(section);
  document.addEventListener('visibilitychange', () => { if (document.hidden) state.running = false; else state.running = section.getBoundingClientRect().bottom > 0 && section.getBoundingClientRect().top < window.innerHeight; });

  // Calidad adaptativa: si el rendimiento cae, reducimos resolución y estrellas
  const perf = { frames: 0, acc: 0, step: 0 };
  function adaptQuality(dt) {
    if (perf.step >= 2) return;
    perf.frames++; perf.acc += dt;
    if (perf.frames < 90) return;
    const fps = perf.frames / perf.acc;
    perf.frames = 0; perf.acc = 0;
    if (fps < 42) {
      perf.step++;
      pixelRatio = Math.max(1, pixelRatio * 0.7);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(W, H, false);
      starMat.uniforms.uPR.value = pixelRatio;
      if (perf.step === 2) starGeo.setDrawRange(0, Math.floor(STAR_COUNT * 0.5));
    } else {
      perf.step = 2;
    }
  }

  /* ---------- Bucle principal ---------- */
  const tmpV = new THREE.Vector3();
  const camRight = new THREE.Vector3();
  const camUp = new THREE.Vector3();
  const corner = new THREE.Vector3();

  function toScreen(v) {
    tmpV.copy(v).project(camera);
    return { x: (tmpV.x + 1) * 0.5 * W, y: (1 - tmpV.y) * 0.5 * H, behind: tmpV.z > 1 };
  }
  function pxRadius(r, pos) {
    const d = camera.position.distanceTo(pos);
    return (r * H * 0.5) / (d * state.layout.tanV);
  }

  function tick(dtRaw) {
    if (!state.running) return;
    const dt = Math.min(dtRaw, 0.05);
    adaptQuality(dt);
    const L = state.layout;
    state.time += dt;
    const orbitTime = dt * state.timeScale;

    // Cámara (rotación del universo con inercia)
    if (!pointer.down) {
      state.theta += state.vTheta;
      state.phi = clamp(state.phi + state.vPhi, 0.45, 1.42);
      state.vTheta *= Math.pow(0.04, dt);
      state.vPhi *= Math.pow(0.04, dt);
      if (!state.hovered && !state.sunFocus && !reducedMotion) state.theta += 0.018 * dt;
      // vuelve suavemente a la inclinación por defecto
      if (Math.abs(state.vPhi) < 0.0005) state.phi = damp(state.phi, L.phi, 0.6, dt);
    }
    const introK = smooth(clamp(state.intro, 0, 1));
    const dist = L.dist * (1 + (1 - introK) * 0.7);
    camera.position.set(
      dist * Math.sin(state.phi) * Math.sin(state.theta),
      dist * Math.cos(state.phi),
      dist * Math.sin(state.phi) * Math.cos(state.theta)
    );
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    camUp.setFromMatrixColumn(camera.matrixWorld, 1);

    stars.rotation.y += dt * 0.004;
    starMat.uniforms.uTime.value = state.time;

    // Hover por ratón (pick una vez por frame)
    if (pointer.needsPick && !pointer.down && pointer.inside) {
      pointer.needsPick = false;
      const hit = state.sunFocus ? null : pick(pointer.x, pointer.y);
      if (hit && hit.planet) { setHover(hit.planet); state.sunHover = 0; }
      else {
        state.sunHover = hit && hit.type === 'sun' ? 1 : 0;
        if (state.hovered) scheduleUnhover();
      }
      canvas.classList.toggle('pointer', !!hit && !state.sunFocus);
    }

    // ----- Sol -----
    state.sunZoom = damp(state.sunZoom, state.sunZoomTarget, 6, dt);
    const camDist = camera.position.length();
    const tanV = L.tanV, tanH = tanV * camera.aspect;
    const cardH = CH * L.sunScale, cardW = CW * L.sunScale;
    const fitD = Math.max(cardH / (0.72 * 2 * tanV), cardW / (0.9 * 2 * tanH)) / state.sunZoom;
    const pullK = clamp(1 - fitD / camDist, 0, 0.95) * smooth(clamp(state.sunPull, 0, 1));
    sun.position.copy(camera.position).multiplyScalar(pullK);
    sun.quaternion.copy(camera.quaternion);        // siempre de frente, sin girar sobre sí misma
    const sunScale = L.sunScale * (0.6 + 0.4 * introK) * (1 + state.sunHover * 0.035 * (1 - state.sunPull));
    sun.scale.setScalar(sunScale);
    sunMat.uniforms.uTime.value = state.time;
    sunMat.uniforms.uHover.value = damp(sunMat.uniforms.uHover.value, state.sunHover, 6, dt);
    coronaMat.uniforms.uTime.value = state.time;
    coronaMat.uniforms.uIntensity.value = (1 - state.sunPull * 0.55) * introK;

    // Panel HTML del Sol (sigue el rectángulo proyectado)
    if (state.sunPull > 0.01) {
      corner.set(-CW / 2, CH / 2, 0).applyMatrix4(sun.matrixWorld);
      sun.updateMatrixWorld();
      const tl = toScreen(corner.set(-CW / 2, CH / 2, 0).applyMatrix4(sun.matrixWorld));
      const tr = toScreen(corner.set(CW / 2, CH / 2, 0).applyMatrix4(sun.matrixWorld));
      const scale = Math.hypot(tr.x - tl.x, tr.y - tl.y) / 320;
      sunPanel.style.transform = `translate3d(${tl.x}px, ${tl.y}px, 0) scale(${scale})`;
    }

    // ----- Planetas -----
    const anyHover = state.hovered;
    planets.forEach((p) => {
      const isFocus = anyHover === p && !state.sunFocus;
      if (!isFocus) p.angle += p.def.speed * orbitTime;
      p.focus = damp(p.focus, isFocus ? 1 : 0, 5, dt);
      const dimTarget = state.sunFocus ? 1 : (anyHover && anyHover !== p ? 1 : 0);
      p.dim = damp(p.dim, dimTarget, 5, dt);
      const fE = smooth(clamp(p.focus, 0, 1));

      const R = p.def.R * L.orbitScale;
      p.orbitPos.set(Math.cos(p.angle) * R, 0, Math.sin(p.angle) * R);
      // primer plano: se acerca por la línea de visión (mantiene su posición en pantalla)
      p.pos.copy(p.orbitPos).lerp(camera.position, 0.42 * fE);
      // los demás se alejan
      if (p.dim > 0.001 && !state.sunFocus) {
        tmpV.copy(p.orbitPos).sub(camera.position).normalize().multiplyScalar(2.2 * p.dim);
        p.pos.add(tmpV);
      }
      p.group.position.copy(p.pos);
      const introS = smooth(clamp(state.intro * 1.4 - planets.indexOf(p) * 0.1, 0, 1));
      p.worldRadius = p.def.size * L.sizeScale * (1 + 0.35 * fE) * introS;
      p.group.scale.setScalar(Math.max(p.worldRadius, 0.0001));
      p.mesh.rotation.y += dt * 0.25;
      p.mat.uniforms.uTime.value = state.time;
      p.mat.uniforms.uDim.value = p.dim * 0.85;
      p.mat.uniforms.uFocus.value = fE;
      p.glow.material.opacity = (0.5 + 0.35 * fE) * (1 - p.dim * 0.8);
      if (p.ring) p.ring.material.uniforms.uDim.value = p.dim;

      // Etiqueta
      const s = toScreen(p.pos);
      const rpx = pxRadius(p.worldRadius, p.pos);
      p.label.style.transform = `translate3d(${s.x.toFixed(1)}px, ${(s.y + rpx + 8).toFixed(1)}px, 0)`;
      p.label.style.zIndex = isFocus ? 20 : 10;
      p.label.classList.toggle('focus', isFocus);
      p.label.classList.toggle('dim', dimTarget === 1);
      p.label.classList.toggle('hidden', s.behind || introS < 0.5 || (isFocus && L.portrait && p.sats.length > 0));

      // ----- Satélites: siguen al planeta en su traslación -----
      p.sats.forEach((sat) => {
        const side = L.portrait ? 0 : (sat.index === 0 ? -1 : 1);
        // posición de traslación: detrás del planeta sobre su órbita
        const arc = (p.def.size * L.sizeScale * 2.1 + 0.55 + sat.index * (sat.size * L.sizeScale * 3 + 0.5));
        const a2 = p.angle - arc / R;
        const yOff = (sat.index === 0 ? 0.28 : -0.18) * L.sizeScale;
        const trail = tmpV.set(Math.cos(a2) * R, yOff, Math.sin(a2) * R);
        if (p.dim > 0.001 && !state.sunFocus) {
          trail.add(corner.copy(trail).sub(camera.position).normalize().multiplyScalar(2.2 * p.dim));
        }
        // posición en primer plano: junto al planeta
        const off = p.worldRadius * 1.5 + sat.size * L.sizeScale * 1.6 + 0.35;
        const focusPos = corner.copy(p.pos);
        if (L.portrait) focusPos.addScaledVector(camUp, sat.index === 0 ? off : -off);
        else focusPos.addScaledVector(camRight, side * off).addScaledVector(camUp, 0.35 * off);
        sat.pos.copy(trail).lerp(focusPos, fE);
        sat.group.position.copy(sat.pos);
        // más pequeños durante la traslación, tamaño normal en primer plano
        const sr = sat.size * L.sizeScale * (0.55 + 0.45 * fE) * introS;
        sat.group.scale.setScalar(Math.max(sr, 0.0001));
        sat.mesh.rotation.y += dt * 0.4;
        sat.mat.uniforms.uTime.value = state.time;
        sat.mat.uniforms.uDim.value = p.dim * 0.85;
        sat.mat.uniforms.uFocus.value = fE;
        sat.glow.material.opacity = (0.45 + 0.3 * fE) * (1 - p.dim * 0.8);

        // etiqueta del satélite
        const ss = toScreen(sat.pos);
        const spx = pxRadius(sr, sat.pos);
        sat.label.style.transform = `translate3d(${ss.x.toFixed(1)}px, ${ss.y.toFixed(1)}px, 0)`;
        sat.label.style.zIndex = isFocus ? 30 : 9;
        const chip = sat.label.firstElementChild;
        chip.style.marginTop = `${(spx + 10).toFixed(1)}px`;
        if (isFocus) {
          let cx, cy;
          if (L.portrait) {
            cx = ss.x;
            cy = sat.index === 0 ? ss.y - spx - 12 - sat.cardH / 2 : ss.y + spx + 12 + sat.cardH / 2;
          } else {
            cx = ss.x + side * (sat.cardW / 2 + spx + 16);
            cy = ss.y;
          }
          cx = clamp(cx, sat.cardW / 2 + 10, W - sat.cardW / 2 - 10);
          cy = clamp(cy, sat.cardH / 2 + 70, H - sat.cardH / 2 - 16);
          sat.card.style.left = `${(cx - ss.x).toFixed(1)}px`;
          sat.card.style.top = `${(cy - ss.y).toFixed(1)}px`;
        }
        sat.label.classList.toggle('focus', isFocus);
        sat.label.classList.toggle('dim', dimTarget === 1);
        sat.label.classList.toggle('hidden', ss.behind || introS < 0.5);
      });
    });

    orbitLines.forEach((o, i) => {
      o.line.scale.setScalar(o.R * L.orbitScale);
      o.line.material.opacity = 0.16 * introK * (1 - planets[i].dim * 0.7) + 0.12 * planets[i].focus;
    });

    renderer.render(scene, camera);
  }

  if (window.gsap) {
    window.gsap.ticker.add((time, deltaMs) => tick(deltaMs / 1000));
  } else {
    let last = performance.now();
    const loop = (now) => { tick((now - last) / 1000); last = now; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
}

/* ---------------------------------------------------------
   Texto de la tarjeta del Sol (dibujado en canvas)
   --------------------------------------------------------- */
function drawSunText(c) {
  const W = 1024;
  const H = Math.round(W * 4.45 / 3.4);
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const setSpacing = (v) => { if ('letterSpacing' in ctx) ctx.letterSpacing = v; };

  const eyebrowFont = '800 34px Inter, sans-serif';
  const titleFont = '800 96px Outfit, Inter, sans-serif';
  const pFont = '600 44px Inter, sans-serif';
  ctx.font = titleFont;
  const titleLines = wrapText(ctx, 'Nivel Profesional y Asistencia Completa', 840);
  ctx.font = pFont;
  const pLines = wrapText(ctx, 'Pro y Enterprise: la élite de la gestión. IA que trabaja por ti y la asistencia más completa.', 800);

  const blocks = 40 + 50 + titleLines.length * 104 + 40 + pLines.length * 60 + 56 + 70 + 64 + 112 + 26 + 112;
  let y = (H - blocks) / 2;

  ctx.fillStyle = '#5a3200';
  ctx.font = eyebrowFont;
  setSpacing('9px');
  ctx.fillText('✦ EL SOL DEL UNIVERSO ✦', W / 2, y + 20);
  setSpacing('0px');
  y += 40 + 50;

  ctx.font = titleFont;
  ctx.fillStyle = '#241200';
  titleLines.forEach((l) => { ctx.fillText(l, W / 2, y + 50); y += 104; });
  y += 40;

  ctx.font = pFont;
  ctx.fillStyle = '#3a2000';
  pLines.forEach((l) => { ctx.fillText(l, W / 2, y + 28); y += 60; });
  y += 56;

  // chips Pro / Enterprise
  ctx.font = '800 34px Inter, sans-serif';
  const chips = ['PRO · 59 €/año', 'ENTERPRISE · 299 €/año'];
  const widths = chips.map(t => ctx.measureText(t).width + 56);
  const gap = 24;
  let x = (W - (widths[0] + widths[1] + gap)) / 2;
  chips.forEach((t, i) => {
    roundRect(ctx, x, y, widths[i], 70, 35);
    ctx.fillStyle = 'rgba(42,22,0,0.85)';
    ctx.fill();
    ctx.fillStyle = '#ffe7a3';
    ctx.fillText(t, x + widths[i] / 2, y + 36);
    x += widths[i] + gap;
  });
  y += 70 + 64;

  // botones
  const bw = 820, bx = (W - bw) / 2;
  roundRect(ctx, bx, y, bw, 112, 56);
  ctx.fillStyle = '#241200';
  ctx.fill();
  ctx.fillStyle = '#ffe7a3';
  ctx.font = '700 46px Inter, sans-serif';
  ctx.fillText('Acceder', W / 2, y + 58);
  y += 112 + 26;

  roundRect(ctx, bx, y, bw, 112, 56);
  ctx.fillStyle = 'rgba(42,22,0,0.28)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(42,22,0,0.5)';
  ctx.stroke();
  ctx.fillStyle = '#2a1600';
  ctx.fillText('Más Información', W / 2, y + 58);
}
