/**
 * GESTARIAN · JavaScript Oficial de la Landing Page
 * www.gestarian.com
 */

document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initHeaderScroll();
  initMobileMenu();
  initCalculator();
  initSimulator();
});

/* ==========================================================================
   1. ANIMACIONES DE SCROLL (ESPECIFICACIÓN CRÍTICA DEL USUARIO)
   Tarjetas de versiones con animación en scroll:
   Aparición desde 150px abajo, se pasa 20px al subir (-20px) y luego baja
   a su ubicación final (0px), llegando con fade-in al 70% y terminando al
   100% cuando quedan estáticas.
   ========================================================================== */

function initScrollAnimations() {
  const versionCards = document.querySelectorAll('.version-card');

  if (!versionCards.length) return;

  // Opciones del IntersectionObserver
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -40px 0px',
    threshold: 0.12
  };

  const cardObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Añade la clase que dispara la animación @keyframes versionCardScrollEntrance
        entry.target.classList.add('card-animated');
        // Dejar de observar una vez animada
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  versionCards.forEach((card, index) => {
    cardObserver.observe(card);
  });
}

/* ==========================================================================
   2. HEADER Y NAVEGACIÓN
   ========================================================================== */

function initHeaderScroll() {
  const header = document.getElementById('site-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
      header.style.background = 'rgba(5, 11, 20, 0.95)';
      header.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.6)';
    } else {
      header.classList.remove('scrolled');
      header.style.background = 'rgba(5, 11, 20, 0.82)';
      header.style.boxShadow = 'none';
    }
  }, { passive: true });
}

function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const drawer = document.getElementById('mobile-drawer');

  if (!toggleBtn || !drawer) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
      closeMobileMenu();
    } else {
      drawer.classList.add('open');
      toggleBtn.setAttribute('aria-expanded', 'true');
    }
  });
}

function closeMobileMenu() {
  const drawer = document.getElementById('mobile-drawer');
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  if (drawer) drawer.classList.remove('open');
  if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
}

/* ==========================================================================
   3. SIMULADOR DEL PORTAL DEL CONDUCTOR
   ========================================================================== */

const SIMULATED_VEHICLES = {
  '4521-KRT': {
    model: 'SEAT León 2.0 TDI (2021)',
    statusText: 'Fase 3: Reparación',
    stepperFill: 70,
    amount: '458,50 €',
    items: [
      { text: '1. Pastillas de Freno Brembo Delanteras', price: '145,00 €' },
      { text: '2. Aceite Castrol Edge 5W30 + Filtros', price: '118,50 €' },
      { text: '3. Sustitución Líquido de Frenos DOT 4', price: '55,00 €', highlight: true },
      { text: '4. Mano de Obra Cualificada (2.5h)', price: '140,00 €' }
    ]
  },
  '8812-MNP': {
    model: 'Volkswagen Golf VII 1.6 TDI (2019)',
    statusText: 'Fase 4: Listo para Entrega',
    stepperFill: 100,
    amount: '312,00 €',
    items: [
      { text: '1. Revisión General Pre-ITV Completa', price: '95,00 €' },
      { text: '2. Sustitución Batería Varta Start-Stop AGM', price: '165,00 €' },
      { text: '3. Lavado y Desinfección de Cortesía', price: 'GRATIS', highlight: true },
      { text: '4. Mano de Obra Certificada', price: '52,00 €' }
    ]
  },
  '0194-LVC': {
    model: 'Audi A4 Avant 40 TFSI (2022)',
    statusText: 'Fase 2: Presupuesto Pendiente',
    stepperFill: 40,
    amount: '685,40 €',
    items: [
      { text: '1. Diagnóstico Electrónico OBD-II Completo', price: '60,00 €' },
      { text: '2. Sustitución Amortiguadores Delanteros Bilstein', price: '380,00 €', highlight: true },
      { text: '3. Alineación y Geometría Láser de Dirección', price: '65,00 €' },
      { text: '4. Mano de Obra Especializada (3.2h)', price: '180,40 €' }
    ]
  }
};

function initSimulator() {
  const plateInput = document.getElementById('plate-input-field');
  if (plateInput) {
    plateInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        lookupSimulatedPlate();
      }
    });
  }
}

function setSimulatedPlate(plate) {
  const input = document.getElementById('plate-input-field');
  if (input) input.value = plate;
  lookupSimulatedPlate();
}

function lookupSimulatedPlate() {
  const input = document.getElementById('plate-input-field');
  if (!input) return;

  const rawVal = input.value.trim().toUpperCase();
  const data = SIMULATED_VEHICLES[rawVal] || {
    model: 'Vehículo Personalizado (' + rawVal + ')',
    statusText: 'Fase 3: Reparación en Proceso',
    stepperFill: 65,
    amount: '389,00 €',
    items: [
      { text: '1. Mantenimiento Periódico Oficial', price: '190,00 €' },
      { text: '2. Filtro Habitáculo Antialérgico', price: '39,00 €' },
      { text: '3. Mano de Obra y Puntos de Control', price: '160,00 €' }
    ]
  };

  // Actualizar pantalla del móvil simulado
  const plateBadge = document.getElementById('sim-vehicle-plate');
  const modelText = document.getElementById('sim-vehicle-model');
  const statusPill = document.getElementById('sim-status-pill');
  const stepperFill = document.getElementById('sim-stepper-fill');
  const budgetAmount = document.getElementById('sim-budget-amount');
  const itemsContainer = document.getElementById('sim-budget-items');
  const btnApprove = document.getElementById('btn-approve-sim');
  const btnText = document.getElementById('btn-approve-text');

  if (plateBadge) plateBadge.textContent = rawVal || '4521-KRT';
  if (modelText) modelText.textContent = data.model;
  if (statusPill) statusPill.textContent = data.statusText;
  if (stepperFill) stepperFill.style.width = data.stepperFill + '%';
  if (budgetAmount) budgetAmount.textContent = data.amount;

  if (btnApprove) {
    btnApprove.classList.remove('approved');
    btnApprove.disabled = false;
  }
  if (btnText) btnText.textContent = '✓ Aceptar Presupuesto en 1 Clic';

  if (itemsContainer) {
    itemsContainer.innerHTML = '';
    data.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'budget-row' + (item.highlight ? ' highlight-row' : '');
      row.innerHTML = `<span>${item.text}</span><strong>${item.price}</strong>`;
      itemsContainer.appendChild(row);
    });
  }

  showToast('Vehículo Sincronizado', `Mostrando datos en vivo para la matrícula ${rawVal}`, '🚗');
}

function approveSimulatedBudget() {
  const btn = document.getElementById('btn-approve-sim');
  const btnText = document.getElementById('btn-approve-text');
  const statusPill = document.getElementById('sim-status-pill');
  const hint = document.getElementById('sim-approval-hint');

  if (!btn || btn.classList.contains('approved')) return;

  btn.classList.add('approved');
  btn.disabled = true;
  if (btnText) btnText.textContent = '✓ ¡Presupuesto Aprobado con Éxito!';
  if (statusPill) {
    statusPill.textContent = 'Presupuesto Aprobado';
    statusPill.style.background = 'rgba(16, 185, 129, 0.2)';
    statusPill.style.color = '#34D399';
    statusPill.style.borderColor = '#10B981';
  }
  if (hint) hint.textContent = 'Notificación inmediata enviada a los operarios de DM CAR.';

  showToast('Presupuesto Aprobado', 'Firma digital registrada. Los recambios han sido autorizados.', '✓');
}

/* ==========================================================================
   4. CALCULADORA DE RENTABILIDAD & AHORRO (ROI)
   ========================================================================== */

function initCalculator() {
  updateCalculations();
}

function updateCalculations() {
  const carsInput = document.getElementById('slider-cars');
  const ticketInput = document.getElementById('slider-ticket');

  if (!carsInput || !ticketInput) return;

  const cars = parseInt(carsInput.value, 10);
  const ticket = parseInt(ticketInput.value, 10);

  // Actualizar textos de los deslizadores
  const carsDisplay = document.getElementById('val-cars-display');
  const ticketDisplay = document.getElementById('val-ticket-display');
  if (carsDisplay) carsDisplay.textContent = `${cars} coches`;
  if (ticketDisplay) ticketDisplay.textContent = `${ticket} €`;

  // Cálculos Automotrices:
  // 1. Aumento en facturación: en promedio el 22% de coches aceptan ampliaciones de averías detectadas
  //    (aprox. un ticket adicional del 32% del ticket medio) gracias a ver la foto en el móvil.
  const extraAcceptanceRate = 0.22;
  const extraTicketFactor = 0.32;
  const monthlyExtraRevenue = Math.round(cars * extraAcceptanceRate * (ticket * extraTicketFactor));

  // 2. Horas ahorradas: 3.5 minutos ahorrados por cada llamada evitada (2 llamadas por reparación de media)
  const minutesSavedPerCar = 7; // minutos totales por coche
  const totalMinutesSaved = cars * minutesSavedPerCar;
  const hoursSaved = Math.round(totalMinutesSaved / 60);

  // 3. ROI respecto al coste medio de licencia (79€/mes plan Pro)
  const softwareCost = 79;
  const roiMultiplier = Math.max(1, Math.round(monthlyExtraRevenue / softwareCost));

  // Actualizar displays en vivo
  const resRevenue = document.getElementById('res-extra-revenue');
  const resHours = document.getElementById('res-hours-saved');
  const resRoi = document.getElementById('res-roi-mult');

  if (resRevenue) resRevenue.textContent = `+${monthlyExtraRevenue.toLocaleString('es-ES')} €`;
  if (resHours) resHours.textContent = `${hoursSaved} hrs/mes`;
  if (resRoi) resRoi.textContent = `${roiMultiplier}x`;
}

/* ==========================================================================
   5. CONMUTADOR DE PRECIOS (MENSUAL / ANUAL)
   ========================================================================== */

let isAnnualPricing = false;

function togglePricingPeriod() {
  isAnnualPricing = !isAnnualPricing;
  const switchBtn = document.getElementById('pricing-switch');
  const priceElements = document.querySelectorAll('.price-val');
  const billedNotes = document.querySelectorAll('.price-billed-note');
  const lblMonthly = document.getElementById('lbl-monthly');
  const lblAnnual = document.getElementById('lbl-annual');

  if (switchBtn) {
    if (isAnnualPricing) {
      switchBtn.classList.add('active');
    } else {
      switchBtn.classList.remove('active');
    }
  }

  if (lblMonthly && lblAnnual) {
    if (isAnnualPricing) {
      lblMonthly.style.color = 'var(--text-dim)';
      lblAnnual.style.color = '#FFFFFF';
    } else {
      lblMonthly.style.color = '#FFFFFF';
      lblAnnual.style.color = 'var(--text-dim)';
    }
  }

  priceElements.forEach(el => {
    const val = isAnnualPricing ? el.getAttribute('data-annual') : el.getAttribute('data-monthly');
    if (val) {
      el.style.opacity = '0';
      setTimeout(() => {
        el.textContent = `${val}€`;
        el.style.opacity = '1';
      }, 150);
    }
  });

  billedNotes.forEach(note => {
    const annualNote = note.getAttribute('data-annual-note');
    if (isAnnualPricing && annualNote) {
      note.textContent = annualNote;
    } else {
      note.textContent = 'Sin permanencia · Facturado mes a mes';
    }
  });

  showToast('Periodo Actualizado', isAnnualPricing ? 'Precios con 20% de descuento anual aplicados' : 'Precios de facturación mensual', '🏷️');
}

/* ==========================================================================
   6. MODAL DE SOLICITUD DE DEMO & LEAD
   ========================================================================== */

function openDemoModal(planName = '') {
  const modal = document.getElementById('demo-modal');
  const leadForm = document.getElementById('demo-lead-form');
  const successScreen = document.getElementById('modal-success-screen');
  const modalTitle = document.getElementById('modal-title');

  if (!modal) return;

  if (leadForm) leadForm.classList.remove('hidden');
  if (successScreen) successScreen.classList.add('hidden');

  if (modalTitle) {
    if (planName === 'starter') {
      modalTitle.textContent = 'Prueba Gratis: Plan Taller Básico';
    } else if (planName === 'pro') {
      modalTitle.textContent = 'Prueba Gratis: Plan Gestarian Pro (15 días)';
    } else if (planName === 'enterprise') {
      modalTitle.textContent = 'Consultoría y Demo: Plan Redes y Flotas';
    } else {
      modalTitle.textContent = 'Solicita tu Demostración de GESTARIAN';
    }
  }

  modal.showModal();
}

function closeDemoModal() {
  const modal = document.getElementById('demo-modal');
  if (modal) modal.close();
}

function handleLeadSubmit(event) {
  event.preventDefault();
  const nameInput = document.getElementById('lead-name');
  const workshopInput = document.getElementById('lead-workshop');
  const form = document.getElementById('demo-lead-form');
  const success = document.getElementById('modal-success-screen');

  const name = nameInput ? nameInput.value : 'Estimado profesional';
  const workshop = workshopInput ? workshopInput.value : 'su taller';

  if (form) form.classList.add('hidden');
  if (success) success.classList.remove('hidden');

  showToast('¡Solicitud Confirmada!', `Hola ${name}, hemos preparado la demo para ${workshop}.`, '✓');
}

function openMetisModal() {
  openDemoModal('pro');
  showToast('METIS AI', 'El asistente IA está incluido en el Plan Gestarian Pro.', '⚡');
}

/* ==========================================================================
   7. TOAST FLOTANTE DE NOTIFICACIÓN
   ========================================================================== */

let toastTimeout = null;

function showToast(title, message, icon = '✓') {
  const toast = document.getElementById('toast-notification');
  const tTitle = document.getElementById('toast-title');
  const tMsg = document.getElementById('toast-msg');
  const tIcon = document.getElementById('toast-icon');

  if (!toast) return;

  if (tTitle) tTitle.textContent = title;
  if (tMsg) tMsg.textContent = message;
  if (tIcon) tIcon.textContent = icon;

  toast.classList.remove('hidden');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 4200);
}
