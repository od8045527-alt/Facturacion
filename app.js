import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    onAuthStateChanged, 
    signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    onSnapshot, 
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAk-Y2b1BSXLeDIlHVngS7-i1PL10_a6Fw",
    authDomain: "proyecto-ad-3a6c2.firebaseapp.com",
    projectId: "proyecto-ad-3a6c2",
    storageBucket: "proyecto-ad-3a6c2.firebasestorage.app",
    messagingSenderId: "678982957449",
    appId: "1:678982957449:web:8390ef299a760633ee4958",
    measurementId: "G-GZDPT00J58"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

const ADMIN_ACCESS_CODE = 'ELC-ADMIN';

// =========================================================
// 1. ANIMACIÓN DEL PANEL DESLIZANTE & CONTROLES
// =========================================================
const authContainer = document.getElementById('authContainer');
document.getElementById('registerToggleBtn').addEventListener('click', () => {
    authContainer.classList.add('active');
    document.getElementById('loginAlert').classList.add('hidden');
});
document.getElementById('loginToggleBtn').addEventListener('click', () => {
    authContainer.classList.remove('active');
    document.getElementById('regAlert').classList.add('hidden');
});

window.togglePasswordVisibility = (inputId, btn) => {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
};

window.selectRoleCard = (roleValue, clickedBtn) => {
    document.getElementById('regRole').value = roleValue;

    document.querySelectorAll('#roleCardsGroup .role-pill').forEach(btn => {
        btn.classList.remove('active');
    });
    clickedBtn.classList.add('active');

    document.getElementById('brandSelectBox').classList.toggle('hidden', roleValue !== 'MARCA');
    document.getElementById('adminCodeBox').classList.toggle('hidden', roleValue !== 'ADMIN');
};

let currentUser = {
    uid: '',
    email: '',
    display: '',
    role: 'EJECUTIVO',
    brand: 'ALL'
};
let eventsList = [];
let unsubscribeEvents = null;
let selectedEventDocId = null;

// LOS 7 PASOS DE LA GUÍA DEL PROCESO ADMINISTRATIVO – EVENTOS ESTÉE LAUDER
const STEPS_LABELS = {
    1: '1. Recepción y validación',
    2: '2. Elaboración de cotización',
    3: '3. Emisión de factura',
    4: '4. Envío correo autorización',
    5: '5. Vo.Bo. Marca / Supervisor',
    6: '6. Tabla de cargos AMEX',
    7: '7. Revisión final y control'
};

function showLoginAlert(message, isSuccess = false) {
    const alertBox = document.getElementById('loginAlert');
    alertBox.textContent = message;
    alertBox.className = isSuccess
        ? 'text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-2.5 text-left'
        : 'text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-2.5 text-left';
    alertBox.classList.remove('hidden');
}

// =========================================================
// 2. AUTENTICACIÓN (GOOGLE, CORREO/CONTRASEÑA, REGISTRO)
// =========================================================
document.getElementById('btnGoogleLogin').addEventListener('click', async () => {
    const btnGoogle = document.getElementById('btnGoogleLogin');
    document.getElementById('loginAlert').classList.add('hidden');
    btnGoogle.disabled = true;

    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                nombre: user.displayName || user.email.split('@')[0],
                email: user.email,
                rol: 'EJECUTIVO',
                marca: 'ALL',
                creadoEn: new Date().toISOString()
            });
        }
    } catch (error) {
        showLoginAlert(traducirErrorFirebase(error.code), false);
    } finally {
        btnGoogle.disabled = false;
    }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    const btn = document.getElementById('btnLoginSubmit');

    document.getElementById('loginAlert').classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        showLoginAlert(traducirErrorFirebase(error.code), false);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Entrar al Sistema';
    }
});

document.getElementById('forgotPassBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginUser').value.trim();
    if (!email) {
        showLoginAlert('Escribe tu correo electrónico arriba y vuelve a presionar "¿Olvidaste tu contraseña?".', false);
        document.getElementById('loginUser').focus();
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showLoginAlert(`Te enviamos un enlace a ${email} para restablecer tu contraseña (revisa también Spam).`, true);
    } catch (error) {
        showLoginAlert(traducirErrorFirebase(error.code), false);
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const selectedRole = document.getElementById('regRole').value;
    const selectedBrand = selectedRole === 'MARCA' ? document.getElementById('regBrand').value : 'ALL';
    const adminCode = document.getElementById('regAdminCode').value.trim();
    const alertBox = document.getElementById('regAlert');
    const btn = document.getElementById('btnRegSubmit');

    alertBox.classList.add('hidden');

    if (selectedRole === 'ADMIN' && adminCode !== ADMIN_ACCESS_CODE) {
        alertBox.textContent = 'Código de Administrador incorrecto. Usa ELC-ADMIN.';
        alertBox.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Registrando...';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "usuarios", userCredential.user.uid), {
            email: email,
            rol: selectedRole,
            marca: selectedBrand,
            creadoEn: new Date().toISOString()
        });
    } catch (error) {
        alertBox.textContent = traducirErrorFirebase(error.code);
        alertBox.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Registrar y Entrar';
    }
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        let userRole = 'EJECUTIVO';
        let userBrand = 'ALL';
        try {
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));
            if (userDoc.exists()) {
                userRole = userDoc.data().rol || 'EJECUTIVO';
                userBrand = userDoc.data().marca || 'ALL';
            }
        } catch (err) {
            console.warn("Error leyendo perfil:", err);
        }

        currentUser = {
            uid: user.uid,
            email: user.email,
            display: user.displayName || user.email,
            role: userRole,
            brand: userBrand
        };

        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('dashboardScreen').classList.remove('hidden');
        document.getElementById('activeUserLabel').textContent = currentUser.display;

        const roleBadge = document.getElementById('roleBadge');
        const adminViewSwitch = document.getElementById('adminViewSwitch');
        const roleSelector = document.getElementById('roleSelector');

        if (currentUser.role === 'ADMIN') {
            roleBadge.textContent = 'Administrador';
            adminViewSwitch.classList.remove('hidden');
            roleSelector.value = 'ADMIN';
        } else if (currentUser.role === 'MARCA') {
            roleBadge.textContent = `Marca: ${currentUser.brand}`;
            adminViewSwitch.classList.add('hidden');
            roleSelector.value = 'MARCA';
            if (currentUser.brand !== 'ALL') {
                document.getElementById('filterBrand').value = currentUser.brand;
            }
        } else {
            roleBadge.textContent = 'Ejecutivo';
            adminViewSwitch.classList.add('hidden');
            roleSelector.value = 'EJECUTIVO';
        }

        listenFirestoreEvents();
    } else {
        document.getElementById('dashboardScreen').classList.add('hidden');
        document.getElementById('authScreen').classList.remove('hidden');
    }
});

window.logout = async () => {
    if (unsubscribeEvents) unsubscribeEvents();
    await signOut(auth);
};

// =========================================================
// 3. REGISTRO DE NUEVO EVENTO (PASO 1 + CÁLCULO IVA)
// =========================================================
window.openNewEventModal = () => {
    document.getElementById('newEventModal').classList.remove('hidden');
    window.calculateTaxPreview();
};
window.closeNewEventModal = () => document.getElementById('newEventModal').classList.add('hidden');

window.toggleEventCount = () => {
    const type = document.getElementById('evType').value;
    const countInput = document.getElementById('evCount');
    if (type === 'Evento Único') {
        countInput.value = 1;
    } else if (Number(countInput.value) < 2) {
        countInput.value = 2;
    }
};

window.calculateTaxPreview = () => {
    const subtotal = Number(document.getElementById('evSubtotal').value) || 0;
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    document.getElementById('previewIva').textContent = '$' + iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('previewTotal').textContent = '$' + total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

document.getElementById('newEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const subtotal = Number(document.getElementById('evSubtotal').value) || 0;
    const iva = Number((subtotal * 0.16).toFixed(2));
    const total = Number((subtotal + iva).toFixed(2));
    const count = Number(document.getElementById('evCount').value) || 1;
    const eventType = count > 1 ? 'Varios Eventos' : 'Evento Único';

    const newEv = {
        id: 'ELC-' + Math.floor(100 + Math.random() * 900),
        brand: document.getElementById('evBrand').value,
        dates: document.getElementById('evDates').value.trim(),
        store: document.getElementById('evStore').value.trim(),
        service: document.getElementById('evService').value.trim(),
        eventType: eventType,
        eventCount: count,
        subtotal: subtotal,
        iva: iva,
        total: total,
        quoteRef: '',
        invoiceRef: '',
        breakdown: '',
        approvedByBrand: false,
        approvedByName: '',
        checklist: [false, false, false, false, false, false],
        executive: currentUser.display,
        ownerEmail: currentUser.email,
        step: 1,
        creadoEn: new Date().toISOString()
    };

    await addDoc(collection(db, "eventos_elc"), newEv);
    e.target.reset();
    window.closeNewEventModal();
});

// =========================================================
// 4. MODAL DE GESTIÓN DE EXPEDIENTE (PASOS 2 A 7 + Vo.Bo.)
// =========================================================
window.openManageModal = (docId) => {
    const ev = eventsList.find(item => item.docId === docId);
    if (!ev) return;
    selectedEventDocId = docId;

    document.getElementById('mBadge').textContent = `${ev.id} • ${ev.brand}`;
    document.getElementById('mTitle').textContent = `${ev.store} (${ev.eventType}: ${ev.eventCount})`;
    document.getElementById('mSubtitle').textContent = `Fechas: ${ev.dates || 'N/D'} • Servicio: ${ev.service || 'N/D'} • Total: $${Number(ev.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

    document.getElementById('mQuoteRef').value = ev.quoteRef || '';
    document.getElementById('mInvoiceRef').value = ev.invoiceRef || '';
    document.getElementById('mBreakdown').value = ev.breakdown || `${ev.eventCount} evento(s) en ${ev.store} - $${Number(ev.subtotal).toLocaleString('es-MX')} + IVA`;

    document.getElementById('mEmailDraft').value = 
`Asunto: Solicitud de Autorización Eventos ${ev.brand} - ${ev.id} (${ev.dates})

Estimado Supervisor / Gerente de Marca (${ev.brand}),

Por medio del presente solicito su revisión y visto bueno para la siguiente facturación de eventos realizados:
- Modalidad y Cantidad: ${ev.eventType} (${ev.eventCount} evento/s)
- Tienda(s): ${ev.store}
- Fechas y Servicio: ${ev.dates} | ${ev.service}
- Cotización Ref.: ${ev.quoteRef || '[Pendiente]'} | Factura Ref.: ${ev.invoiceRef || '[Pendiente]'}
- Subtotal: $${Number(ev.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
- IVA (16%): $${Number(ev.iva).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
- Total Final: $${Number(ev.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN

Se adjunta cotización, factura y soporte documental para su autorización e integración a Cargos AMEX.
Saludos cordiales,
${ev.executive}`;

    const approvalStatus = document.getElementById('mApprovalStatus');
    const approvalActions = document.getElementById('mApprovalActions');
    const activeRole = getActiveViewRole();

    if (ev.approvedByBrand) {
        approvalStatus.innerHTML = `<span class="text-emerald-700 font-semibold"><i class="fa-solid fa-circle-check mr-1"></i>Autorizado por ${ev.approvedByName || 'Marca/Supervisor'}</span>`;
        approvalActions.innerHTML = (activeRole === 'ADMIN' || activeRole === 'MARCA')
            ? `<button type="button" onclick="toggleBrandApproval(false)" class="text-[11px] px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100">Revocar Vo.Bo.</button>`
            : '';
    } else {
        approvalStatus.textContent = 'Pendiente de confirmación de Marca o Supervisor';
        approvalActions.innerHTML = (activeRole === 'ADMIN' || activeRole === 'MARCA')
            ? `<button type="button" onclick="toggleBrandApproval(true)" class="text-[11px] font-bold px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow transition"><i class="fa-solid fa-check mr-1"></i>Dar Visto Bueno (Vo.Bo.)</button>`
            : `<span class="text-[11px] italic text-amber-700">Requiere perfil Marca / Admin para validar</span>`;
    }

    const checks = ev.checklist || [false, false, false, false, false, false];
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`chk${i}`).checked = Boolean(checks[i - 1]);
    }

    const advanceBtn = document.getElementById('btnAdvanceModalStep');
    if (ev.step >= 7) {
        advanceBtn.textContent = 'Expediente en Paso 7 (Final)';
        advanceBtn.disabled = true;
        advanceBtn.classList.add('opacity-50');
    } else {
        advanceBtn.textContent = `Guardar y Avanzar a Paso ${ev.step + 1} →`;
        advanceBtn.disabled = false;
        advanceBtn.classList.remove('opacity-50');
    }

    document.getElementById('manageModal').classList.remove('hidden');
};

window.closeManageModal = () => {
    document.getElementById('manageModal').classList.add('hidden');
    selectedEventDocId = null;
};

window.copyEmailTemplate = () => {
    const textarea = document.getElementById('mEmailDraft');
    textarea.select();
    navigator.clipboard.writeText(textarea.value);
    alert('Correo de autorización copiado al portapapeles.');
};

window.toggleBrandApproval = async (approve) => {
    if (!selectedEventDocId) return;
    const ev = eventsList.find(item => item.docId === selectedEventDocId);
    const nextStep = approve && ev.step < 6 ? 6 : ev.step;

    await updateDoc(doc(db, "eventos_elc", selectedEventDocId), {
        approvedByBrand: approve,
        approvedByName: approve ? currentUser.display : '',
        step: nextStep
    });
    window.openManageModal(selectedEventDocId);
};

window.saveManageChanges = async (advanceStep) => {
    if (!selectedEventDocId) return;
    const ev = eventsList.find(item => item.docId === selectedEventDocId);
    if (!ev) return;

    const checklist = [];
    for (let i = 1; i <= 6; i++) {
        checklist.push(document.getElementById(`chk${i}`).checked);
    }

    let nextStep = ev.step;
    if (advanceStep && ev.step < 7) {
        nextStep = ev.step + 1;
    }

    await updateDoc(doc(db, "eventos_elc", selectedEventDocId), {
        quoteRef: document.getElementById('mQuoteRef').value.trim(),
        invoiceRef: document.getElementById('mInvoiceRef').value.trim(),
        breakdown: document.getElementById('mBreakdown').value.trim(),
        checklist: checklist,
        step: nextStep
    });

    window.closeManageModal();
};

window.deleteEvent = async (docId, eventCode) => {
    if (!docId) return;
    if (confirm(`¿Eliminar definitivamente el registro ${eventCode}?`)) {
        await deleteDoc(doc(db, "eventos_elc", docId));
    }
};

// =========================================================
// 5. EXPORTACIÓN TABLA DE CARGOS AMEX (PASO 6 DEL DOCUMENTO)
// =========================================================
window.exportCargosAmex = () => {
    const filtered = getFilteredEvents();
    if (filtered.length === 0) {
        alert('No hay eventos visibles en el filtro actual para generar la tabla de Cargos AMEX.');
        return;
    }

    const headers = [
        'Folio',
        'Gerente_Marca',
        'Fechas_Evento',
        'Tienda',
        'Servicio',
        'Modalidad',
        'Cantidad_Eventos',
        'Cotizacion_Ref',
        'Factura_Ref',
        'Subtotal_Antes_IVA',
        'IVA_16',
        'Total_Cargo_AMEX',
        'VoBo_Autorizado',
        'Autorizado_Por',
        'Ejecutivo_Responsable',
        'Etapa_Proceso'
    ];

    const rows = filtered.map(ev => [
        ev.id,
        ev.brand,
        `"${(ev.dates || '').replace(/"/g, '""')}"`,
        `"${(ev.store || '').replace(/"/g, '""')}"`,
        `"${(ev.service || '').replace(/"/g, '""')}"`,
        ev.eventType || 'Evento Único',
        ev.eventCount || 1,
        ev.quoteRef || 'Pendiente',
        ev.invoiceRef || 'Pendiente',
        Number(ev.subtotal || 0).toFixed(2),
        Number(ev.iva || 0).toFixed(2),
        Number(ev.total || 0).toFixed(2),
        ev.approvedByBrand ? 'SI' : 'PENDIENTE',
        `"${(ev.approvedByName || '').replace(/"/g, '""')}"`,
        `"${(ev.executive || '').replace(/"/g, '""')}"`,
        `"${STEPS_LABELS[ev.step] || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const brandTag = document.getElementById('filterBrand').value.replace(/\s+/g, '_');
    link.href = url;
    link.download = `Cargos_AMEX_${brandTag}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

// =========================================================
// 6. SINCRONIZACIÓN FIRESTORE Y RENDERIZADO
// =========================================================
function listenFirestoreEvents() {
    if (unsubscribeEvents) unsubscribeEvents();
    const q = query(collection(db, "eventos_elc"), orderBy("creadoEn", "desc"));
    unsubscribeEvents = onSnapshot(q, (snapshot) => {
        eventsList = snapshot.docs.map(d => ({
            docId: d.id,
            ...d.data()
        }));
        window.renderApp();
    });
}

function getActiveViewRole() {
    if (currentUser.role === 'ADMIN') {
        return document.getElementById('roleSelector').value;
    }
    return currentUser.role;
}

function getFilteredEvents() {
    const activeRole = getActiveViewRole();
    const selectedBrand = document.getElementById('filterBrand').value;
    const selectedStep = document.getElementById('filterStep').value;

    return eventsList.filter(ev => {
        if (activeRole === 'EJECUTIVO') {
            if (ev.ownerEmail !== currentUser.email && ev.executive !== currentUser.display) return false;
        } else if (activeRole === 'MARCA' && currentUser.brand !== 'ALL') {
            if (ev.brand !== currentUser.brand) return false;
        }

        if (selectedBrand !== 'ALL' && ev.brand !== selectedBrand) return false;
        if (selectedStep !== 'ALL' && String(ev.step) !== selectedStep) return false;
        return true;
    });
}

window.renderApp = () => {
    const activeRole = getActiveViewRole();
    const filtered = getFilteredEvents();

    document.getElementById('tableTitle').textContent =
        activeRole === 'ADMIN' ? 'Control Global del Proceso ELC (Administrador)' :
        activeRole === 'MARCA' ? `Validación de Marca (${currentUser.brand !== 'ALL' ? currentUser.brand : 'Todas'})` :
        'Mis Eventos Registrados (Ejecutivo)';

    document.getElementById('kpiTotal').textContent = filtered.reduce((acc, e) => acc + (Number(e.eventCount) || 1), 0);
    document.getElementById('kpiFacturacion').textContent = filtered.filter(e => [2, 3, 4].includes(e.step)).length;
    document.getElementById('kpiVobo').textContent = filtered.filter(e => !e.approvedByBrand).length;
    document.getElementById('kpiAmex').textContent = filtered.filter(e => e.step >= 6).length;

    const totalWithTax = filtered.reduce((acc, e) => acc + (Number(e.total) || Number(e.amount) || 0), 0);
    document.getElementById('kpiBudget').textContent = '$' + totalWithTax.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const tbody = document.getElementById('eventsTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">No hay eventos registrados en esta vista. Haz clic en <b>Registrar Evento</b> para iniciar.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((ev) => {
        const sub = Number(ev.subtotal || ev.amount || 0);
        const iva = Number(ev.iva || sub * 0.16);
        const tot = Number(ev.total || sub + iva);

        const voboBadge = ev.approvedByBrand
            ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1"><i class="fa-solid fa-check-circle"></i> Vo.Bo. OK</span>`
            : `<span class="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mt-1"><i class="fa-solid fa-clock"></i> Sin Vo.Bo.</span>`;

        const deleteBtn = activeRole === 'ADMIN'
            ? `<button onclick="deleteEvent('${ev.docId}', '${ev.id}')" title="Eliminar" class="ml-1.5 w-8 h-8 rounded-xl bg-red-50 hover:bg-red-500 text-red-500 hover:text-white inline-flex items-center justify-center transition"><i class="fa-solid fa-trash-can text-xs"></i></button>`
            : '';

        return `
            <tr class="hover:bg-slate-50 transition">
                <td class="py-3.5 px-3">
                    <span class="font-bold text-slate-900 block">${ev.id}</span>
                    <span class="text-[11px] text-blue-600 font-semibold">${ev.brand}</span>
                    <span class="block text-[10px] text-slate-400 mt-0.5">${ev.executive || ''}</span>
                </td>
                <td class="py-3.5 px-3">
                    <span class="font-semibold text-slate-800 block">${ev.store}</span>
                    <span class="text-[11px] text-slate-500">${ev.dates || 'Sin fecha'} • ${ev.service || 'Evento'}</span>
                </td>
                <td class="py-3.5 px-3">
                    <span class="font-semibold text-slate-700 block">${ev.eventType || 'Evento Único'}</span>
                    <span class="text-[11px] text-slate-400">${ev.eventCount || 1} evento(s)</span>
                </td>
                <td class="py-3.5 px-3">
                    <span class="font-bold text-slate-900 block">$${tot.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    <span class="text-[10px] text-slate-400">Sub: $${sub.toLocaleString('es-MX')} + IVA: $${iva.toLocaleString('es-MX')}</span>
                </td>
                <td class="py-3.5 px-3 text-[11px]">
                    <span class="block text-slate-600">Cot: <b>${ev.quoteRef || '—'}</b></span>
                    <span class="block text-slate-600">Fac: <b>${ev.invoiceRef || '—'}</b></span>
                </td>
                <td class="py-3.5 px-3">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                        ${STEPS_LABELS[ev.step] || 'Paso ' + ev.step}
                    </span>
                    <div>${voboBadge}</div>
                </td>
                <td class="py-3.5 px-3 text-right whitespace-nowrap">
                    <button onclick="openManageModal('${ev.docId}')" class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-[11px] font-semibold transition">
                        <i class="fa-solid fa-folder-open mr-1"></i>Gestionar
                    </button>${deleteBtn}
                </td>
            </tr>
        `;
    }).join('');
};

function traducirErrorFirebase(code) {
    switch (code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Correo o contraseña incorrectos.';
        case 'auth/invalid-email':
            return 'El formato del correo electrónico no es válido.';
        case 'auth/email-already-in-use':
            return 'Este correo ya está registrado.';
        case 'auth/weak-password':
            return 'La contraseña debe tener al menos 6 caracteres.';
        case 'auth/popup-closed-by-user':
            return 'Se cerró la ventana de Google antes de completar el acceso.';
        case 'auth/unauthorized-domain':
            return 'Dominio no autorizado. Agrégalo en Firebase Console > Authentication > Settings.';
        default:
            return 'Error de autenticación (' + code + ').';
    }
}
