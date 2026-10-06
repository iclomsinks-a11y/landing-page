/* =========================================================
   GESTARIAN · Datos de planes, modales y autenticación
   (script clásico: expone funciones globales usadas por el HTML
   y por js/universe.js)
   ========================================================= */

// --- SUPABASE & CONSTANTS ---
const SUPABASE_URL = 'https://qjeqvgbsathhxikwdcco.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZXF2Z2JzYXRoaHhpa3dkY2NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2OTI2NDAsImV4cCI6MjEwNDI2ODY0MH0.sHdOYpsU1WgEhZkZkmSyZBENy0_lJyPJf8FDlb8wkHE';

let supabaseClient = null;
if (window.supabase && typeof window.supabase.createClient === 'function') {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('[Supabase] Error al inicializar cliente:', e);
  }
}

const PLAN_URLS = {
  quick: 'https://quick-gestarian.web.app',
  lite: 'https://lite-gestarian.web.app',
  pro: 'https://pro-gestarian.web.app',
  enterprise: 'https://enterprise-gestarian.web.app'
};

/* ---------- Datos de planes (fuente única para universo, grid y modales) ---------- */
const PLANS = {
  lite: {
    id: 'lite',
    name: 'Lite',
    tagline: 'El más básico',
    price: 'Gratis',
    period: 'para siempre',
    short: 'Gratis para siempre',
    limit: 'Guardado local en tu dispositivo',
    color: '#7c93ff',
    inherits: null,
    features: [
      'Confección de documentos.',
      'Envío por WhatsApp y Email.',
      'Impresión directa.',
      'Sin base de datos: guardado local en el dispositivo.',
      'Guardado documental interanual gratis.',
      'Asistencia total documental.'
    ],
    extras: [
      { label: 'Guardar más de 1 año', price: '19 €/año' }
    ],
    notes: [],
    summary: ['Confección de documentos', 'Envío por WhatsApp y Email', 'Impresión directa', 'Guardado local en el dispositivo']
  },
  quick: {
    id: 'quick',
    name: 'Quick',
    tagline: 'El siguiente paso',
    price: 'Gratis',
    period: '+ extras opcionales',
    short: 'Gratis + extras',
    limit: 'Solo facturas',
    color: '#38bdf8',
    inherits: 'Lite',
    features: [
      'Base de datos de clientes y proveedores.',
      'Facturas en un solo click.',
      'OCR para facturas recibidas (opcional · gratis sin OCR).'
    ],
    extras: [
      { label: 'Guardado de más de 1 año', price: '19 €/año' },
      { label: 'OCR de facturas recibidas', price: '+9,90 €/año' },
      { label: 'Rastreo automático de facturas por email + aviso en tiempo real', price: '+9,90 €/año' }
    ],
    notes: ['Solo facturas, NO presupuestos.'],
    summary: ['Todo lo de Lite', 'BD de clientes y proveedores', 'Facturas en un solo click', 'OCR opcional (+9,90 €/año)']
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'El profesional',
    price: '59 €',
    period: '/ año',
    short: '59 €/año',
    limit: 'Hasta 50 empleados',
    color: '#a855f7',
    inherits: 'Quick',
    features: [
      'Gestión de presupuestos.',
      'Portal de clientes (Área de Clientes con acceso por invitación).',
      'IA integrada para gestionar.',
      'Avisos de obligaciones fiscales.',
      'Generación y envío automático de informes a gestoría, previa confirmación.',
      'Agenda.',
      'Experiencia audiovisual: seguimiento visual con imágenes de la evolución del vehículo.'
    ],
    extras: [],
    notes: [],
    media: { src: 'assets/vehiculo-evolucion.jpg', alt: 'Seguimiento visual de la evolución de la reparación de un vehículo', captions: ['Recepción', 'En proceso', 'Entregado'] },
    satellites: [
      { title: 'Potencia', chip: 'IA · OCR', items: ['IA', 'OCR', 'BD ilimitada', 'Hasta 50 usuarios'] },
      { title: 'Experiencia', chip: 'Audiovisual', items: ['Experiencia Audiovisual', 'Portal de Cliente', 'Informes', 'Gestoría'], desc: 'Seguimiento visual con imágenes de la evolución del vehículo.', img: 'assets/vehiculo-evolucion.jpg' }
    ],
    summary: ['Todo lo de Quick', 'Presupuestos y Agenda', 'IA integrada + avisos fiscales', 'Portal de clientes e informes a gestoría']
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'El máximo',
    price: '299 €',
    period: '/ año',
    short: '299 €/año',
    limit: 'Hasta 100 empleados · más: consultar',
    color: '#6366f1',
    inherits: 'Pro',
    status: 'Próximamente',
    features: [
      'Interconexión de empresas (red empresarial).',
      'Vinculación directa con la AEAT mediante certificación digital (evita gestoría).',
      'Órdenes de trabajo y pedidos entre empresas de la red.',
      'Cobertura total integrada (derivación de clientes por agenda).'
    ],
    extras: [],
    notes: ['Aún no operativa: disponible próximamente. Para más de 100 empleados, consulta condiciones.'],
    satellites: [
      { title: 'Red', chip: 'Red Empresarial', items: ['Red Empresarial', 'Vinculación AEAT', 'Certificación digital', 'Evita gestoría'] },
      { title: 'Cobertura', chip: 'Cobertura Total', items: ['Cobertura Total', 'Derivación de clientes por agenda', 'Hasta 100 empleados'] }
    ],
    summary: ['Todo lo de Pro', 'Red empresarial interconectada', 'Vinculación AEAT (evita gestoría)', 'Cobertura total · hasta 100 empleados']
  }
};
window.GESTARIAN_PLANS = PLANS;

const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
const ARROW_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';

let selectedPlan = 'pro';

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  renderPlansGrid();
  checkUserSession();
  handleUrlQueryParams();
  initHeaderScroll();
  initHeroAnimation();
});

function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  const onScroll = () => header && header.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initHeroAnimation() {
  if (!window.gsap) return;
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('.hero-badge', { y: 20, opacity: 0, duration: 0.7 })
    .from('.hero h1', { y: 40, opacity: 0, duration: 0.9 }, '-=0.4')
    .from('.hero-sub', { y: 30, opacity: 0, duration: 0.8 }, '-=0.55')
    .from('.hero-actions .btn', { y: 20, opacity: 0, duration: 0.6, stagger: 0.12 }, '-=0.5')
    .from('.scroll-cue', { opacity: 0, duration: 0.8 }, '-=0.2');

  if (window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray('.plan-card').forEach((card, i) => {
      gsap.from(card, {
        y: 50, opacity: 0, duration: 0.8, delay: i * 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: card, start: 'top 90%' }
      });
    });
  }
}

/* ---------- Grid resumen (accesible / fallback sin WebGL) ---------- */
function renderPlansGrid() {
  const grid = document.getElementById('plans-grid');
  if (!grid) return;
  grid.innerHTML = Object.values(PLANS).map(p => `
    <article class="plan-card" style="--pc:${p.color}" id="plan-card-${p.id}">
      ${p.status ? `<span class="soon">${p.status}</span>` : ''}
      <div class="orb"></div>
      <h3>${p.name}</h3>
      <div class="tagline">${p.tagline}</div>
      <div class="price">${p.price} <small>${p.period}</small></div>
      <ul>${p.summary.map(s => `<li>${s}</li>`).join('')}</ul>
      <div class="actions">
        <button class="btn btn-sm ${p.id === 'pro' ? 'btn-primary' : ''}" id="grid-access-${p.id}" onclick="handlePlanAccess('${p.id}')">${p.id === 'enterprise' ? 'Consultar' : 'Acceder'}</button>
        <button class="btn btn-sm" id="grid-details-${p.id}" onclick="openPlanDetails('${p.id}')" style="background:transparent">Ver detalles</button>
      </div>
    </article>
  `).join('');
}

/* ---------- Sesión ---------- */
function checkUserSession() {
  const savedSession = localStorage.getItem('gestarian_user_session');
  if (savedSession) {
    try {
      showUserLoggedInUI(JSON.parse(savedSession));
    } catch (e) {
      console.error('Error leyendo sesión local:', e);
    }
  } else if (supabaseClient) {
    supabaseClient.auth.getSession().then(({ data }) => {
      if (data && data.session && data.session.user) {
        const user = { email: data.session.user.email, id: data.session.user.id };
        localStorage.setItem('gestarian_user_session', JSON.stringify(user));
        showUserLoggedInUI(user);
      }
    });
  }
}

function showUserLoggedInUI(user) {
  const userBadge = document.getElementById('user-badge');
  const loginBtn = document.getElementById('btn-login-trigger');
  const emailDisplay = document.getElementById('user-email-display');
  const avatarDisplay = document.getElementById('user-avatar');

  if (userBadge && loginBtn) {
    userBadge.style.display = 'inline-flex';
    loginBtn.style.display = 'none';
    if (emailDisplay) emailDisplay.textContent = user.email || 'Usuario';
    if (avatarDisplay) avatarDisplay.textContent = (user.email || 'U').charAt(0).toUpperCase();
  }
}

function logoutUser() {
  localStorage.removeItem('gestarian_user_session');
  if (supabaseClient) supabaseClient.auth.signOut();
  window.location.reload();
}

// Deep-linking via query params (e.g. ?plan=pro or ?action=register&plan=lite)
function handleUrlQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const planParam = urlParams.get('plan');
  const actionParam = urlParams.get('action');

  if (planParam && PLAN_URLS[planParam.toLowerCase()]) {
    selectedPlan = planParam.toLowerCase();
  }
  if (actionParam === 'register') openAuthModal('register', selectedPlan);
  else if (actionParam === 'login') openAuthModal('login', selectedPlan);
}

// --- MAIN ACCEDER LOGIC ---
// - Logged in → acceso directo a la versión.
// - No registrado → formulario de registro fiscal.
function handlePlanAccess(plan) {
  selectedPlan = plan || 'pro';
  closeAllModals();
  const savedSession = localStorage.getItem('gestarian_user_session');

  if (savedSession && selectedPlan !== 'enterprise') {
    window.location.href = PLAN_URLS[selectedPlan] || PLAN_URLS.pro;
  } else {
    openAuthModal('register', selectedPlan);
  }
}

/* ---------- Modales genéricos ---------- */
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('active');
  document.body.classList.add('modal-open');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
  if (!document.querySelector('.modal-overlay.active')) document.body.classList.remove('modal-open');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  document.body.classList.remove('modal-open');
}

window.addEventListener('click', (e) => {
  if (e.target.classList && e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const open = document.querySelectorAll('.modal-overlay.active');
    if (open.length) closeModal(open[open.length - 1].id);
  }
});

/* ---------- Tarjeta de detalles de planeta ---------- */
function openPlanDetails(planId) {
  const p = PLANS[planId] || PLANS.pro;
  selectedPlan = p.id;
  const c = document.getElementById('details-content');
  const container = document.getElementById('details-container');
  container.style.setProperty('--mc', p.color);

  const sats = p.satellites ? `
    <div class="pd-section-title">Satélites del planeta</div>
    <div class="pd-sats">
      ${p.satellites.map(s => `<div class="pd-sat"><strong>${s.title}</strong>${s.items.join(' + ')}</div>`).join('')}
    </div>` : '';

  const extras = p.extras.length ? `
    <div class="pd-section-title">Extras opcionales</div>
    <div class="pd-extras">${p.extras.map(x => `<div class="pd-extra"><span>${x.label}</span><b>${x.price}</b></div>`).join('')}</div>` : '';

  const media = p.media ? `
    <div class="pd-media">
      <img src="${p.media.src}" alt="${p.media.alt}" loading="lazy">
      <div class="captions">${p.media.captions.map(t => `<span>${t}</span>`).join('')}</div>
    </div>` : '';

  const isEnt = p.id === 'enterprise';

  c.innerHTML = `
    <div class="pd-head">
      <div class="pd-orb"></div>
      <div>
        <div class="pd-eyebrow">Planeta · ${p.tagline}</div>
        <h2 class="pd-title" id="details-title">GESTARIAN ${p.name}</h2>
      </div>
    </div>
    ${p.status ? `<div class="pd-status">● ${p.status} · Consultar</div>` : ''}
    <div class="pd-price-row">
      <span class="pd-price">${p.price}</span>
      <span class="pd-period">${p.period}</span>
      <span class="pd-limit">${p.limit}</span>
    </div>
    ${p.inherits ? `<div class="pd-inherit">Todo lo de <strong>${p.inherits}</strong>, más:</div>` : '<div class="pd-section-title" style="margin-top:0">Incluye</div>'}
    <ul class="pd-list">${p.features.map(f => `<li>${CHECK_SVG}<span>${f}</span></li>`).join('')}</ul>
    ${media}
    ${extras}
    ${sats}
    ${p.notes.map(n => `<div class="pd-note">${n}</div>`).join('')}
    <div class="pd-actions">
      <button class="btn ${isEnt ? 'btn-gold' : 'btn-primary'}" id="btn-details-access" onclick="handlePlanAccess('${p.id}')">
        <span>${isEnt ? 'Consultar · Próximamente' : 'Acceder a ' + p.name}</span>${ARROW_SVG}
      </button>
    </div>
  `;
  openModal('modal-details');
  container.scrollTop = 0;
}

function openSunInfo() {
  openModal('modal-sun');
}

/* ---------- Auth modal ---------- */
function openAuthModal(mode = 'register', plan = selectedPlan) {
  selectedPlan = plan;
  const planNameDisplay = document.getElementById('auth-plan-name');
  if (planNameDisplay) {
    const p = PLANS[selectedPlan];
    planNameDisplay.textContent = selectedPlan.toUpperCase();
    planNameDisplay.style.color = p ? p.color : '';
  }
  hideAlerts();
  switchAuthTab(mode);
  openModal('modal-auth');
}

function switchAuthTab(tab) {
  const regTab = document.getElementById('tab-register');
  const loginTab = document.getElementById('tab-login');
  const regForm = document.getElementById('form-register');
  const loginForm = document.getElementById('form-login');
  hideAlerts();
  const isReg = tab === 'register';
  regTab.classList.toggle('active', isReg);
  loginTab.classList.toggle('active', !isReg);
  regForm.style.display = isReg ? 'block' : 'none';
  loginForm.style.display = isReg ? 'none' : 'block';
}

function hideAlerts() {
  ['auth-error', 'auth-success'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function showError(msg) {
  const errBox = document.getElementById('auth-error');
  if (errBox) { errBox.textContent = msg; errBox.style.display = 'block'; }
}

function setBtnText(btn, text, disabled) {
  if (!btn) return;
  btn.disabled = disabled;
  btn.querySelector('span').textContent = text;
}

// Registro fiscal
async function handleRegisterSubmit(e) {
  e.preventDefault();
  hideAlerts();

  const submitBtn = document.getElementById('btn-submit-reg');
  const razonSocial = document.getElementById('reg-razon').value.trim();
  const nif = document.getElementById('reg-nif').value.trim();
  const telefono = document.getElementById('reg-telefono').value.trim();
  const direccion = document.getElementById('reg-direccion').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  if (!razonSocial || !nif || !telefono || !direccion || !email || !password) {
    showError('Por favor, rellene todos los campos obligatorios (*).');
    return;
  }

  setBtnText(submitBtn, 'Registrando...', true);

  const userData = { razonSocial, nif, telefono, direccion, email, plan: selectedPlan, registeredAt: new Date().toISOString() };

  try {
    let authUserId = null;

    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { data: userData } });

      if (error) {
        console.warn('[Supabase Auth Warning]:', error.message);
        if (error.message.includes('already registered')) {
          showError('Este email ya está registrado. Por favor, cambia a la pestaña "Iniciar Sesión".');
          setBtnText(submitBtn, 'Completar Registro y Entrar', false);
          return;
        }
      } else if (data && data.user) {
        authUserId = data.user.id;
      }

      try {
        await supabaseClient.from('gestarian_usuarios').upsert({
          id: authUserId,
          email,
          razon_social: razonSocial,
          nif_cif: nif,
          telefono,
          direccion,
          plan_contratado: selectedPlan,
          updated_at: new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn('[Supabase DB Table warning]:', dbErr);
      }
    }

    const sessionObj = { email, razonSocial, nif, telefono, plan: selectedPlan, id: authUserId || ('user_' + Date.now()) };
    localStorage.setItem('gestarian_user_session', JSON.stringify(sessionObj));

    await triggerPostRegistrationBackend(sessionObj);

    closeModal('modal-auth');
    showRegistrationSuccessModal(sessionObj);
  } catch (err) {
    console.error('Error durante el registro:', err);
    showError('Ocurrió un inconveniente al completar el registro. Inténtelo de nuevo.');
  } finally {
    setBtnText(submitBtn, 'Completar Registro y Entrar', false);
  }
}

// Login
async function handleLoginSubmit(e) {
  e.preventDefault();
  hideAlerts();

  const submitBtn = document.getElementById('btn-submit-login');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showError('Por favor, ingresa tu email y contraseña.');
    return;
  }

  setBtnText(submitBtn, 'Iniciando sesión...', true);

  try {
    const loggedInUser = { email, plan: selectedPlan };

    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        showError('Credenciales incorrectas o usuario no encontrado: ' + error.message);
        setBtnText(submitBtn, 'Iniciar Sesión y Entrar', false);
        return;
      }
      if (data && data.user) loggedInUser.id = data.user.id;
    }

    localStorage.setItem('gestarian_user_session', JSON.stringify(loggedInUser));
    showUserLoggedInUI(loggedInUser);
    closeModal('modal-auth');
    window.location.href = PLAN_URLS[selectedPlan] || PLAN_URLS.pro;
  } catch (err) {
    console.error('Error iniciando sesión:', err);
    showError('Error al iniciar sesión. Compruebe sus datos.');
  } finally {
    setBtnText(submitBtn, 'Iniciar Sesión y Entrar', false);
  }
}

// Email + WhatsApp post-registro
async function triggerPostRegistrationBackend(user) {
  const planName = (user.plan || 'pro').toUpperCase();
  const dashUrl = PLAN_URLS[user.plan] || PLAN_URLS.pro;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; background-color: #0a0e17; color: #f8fafc; padding: 30px; border-radius: 12px;">
      <h1 style="color: #a855f7; margin-bottom: 10px;">¡Bienvenido a GESTARIAN, ${user.razonSocial || 'Cliente'}!</h1>
      <p style="font-size: 16px; color: #cbd5e1; line-height: 1.5;">
        Tu registro en el plan <strong>GESTARIAN ${planName}</strong> se ha completado con éxito.
      </p>
      <div style="background-color: #111827; border: 1px solid #1f2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #38bdf8; margin-top: 0;">Resumen de Registro Fiscal:</h3>
        <p style="margin: 5px 0;"><strong>Razón Social:</strong> ${user.razonSocial}</p>
        <p style="margin: 5px 0;"><strong>NIF/CIF:</strong> ${user.nif}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
        <p style="margin: 5px 0;"><strong>Teléfono:</strong> ${user.telefono}</p>
      </div>
      <p style="font-size: 15px; color: #cbd5e1;">Haz clic a continuación para acceder a tu panel de gestión:</p>
      <a href="${dashUrl}" style="display: inline-block; background: #a855f7; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-bottom: 25px;">Acceder a mi Dashboard (${planName})</a>
      <hr style="border: 0; border-top: 1px solid #1f2937; margin: 20px 0;">
      <p style="font-size: 14px; color: #94a3b8;">Toda tu gestión documental, con acceso inmediato en tiempo real, en tu bolsillo.</p>
    </div>
  `;

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.functions.invoke('send-communication', {
        body: { recipient: user.email, subject: `¡Bienvenido a GESTARIAN ${planName}!`, content: emailHtml }
      });
      console.log('[Backend Email Notification Response]:', data, error);
    } catch (e) {
      console.warn('Incapaz de invocar Edge Function directamente:', e);
    }
  }

  if (user.telefono) {
    const cleanPhone = user.telefono.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Hola ${user.razonSocial}, ¡bienvenido a GESTARIAN ${planName}! Tu cuenta está lista. Accede a tu panel aquí: ${dashUrl}`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  }
}

function showRegistrationSuccessModal(user) {
  const planDisplay = document.getElementById('success-plan-display');
  const p = PLANS[user.plan];
  if (planDisplay) {
    planDisplay.innerHTML = `Plan Activado: <strong style="color:${p ? p.color : '#a855f7'}">GESTARIAN ${user.plan.toUpperCase()}</strong>`;
  }
  showUserLoggedInUI(user);
  openModal('modal-success-dash');
}

function redirectToDashboard() {
  window.location.href = PLAN_URLS[selectedPlan] || PLAN_URLS.pro;
}
