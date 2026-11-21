import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    onAuthStateChanged, 
    signOut,
    updateProfile
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

// =========================================================
// 1. ANIMACIÓN PANEL LOGIN / REGISTRO & CONTROLES
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

let currentUser = {
    uid: '',
    email: '',
    display: '',
    role: 'SUPERVISOR' // 'SUPERVISOR', 'EJECUTIVO', 'CONTRATADO'
};
let eventsList = [];
let unsubscribeEvents = null;
let uploadTarget = { docId: null, type: 'TICKET' };

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
                rol: 'SUPERVISOR',
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
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const selectedRole = document.getElementById('regRole').value;
    const alertBox = document.getElementById('regAlert');
    const btn = document.getElementById('btnRegSubmit');

    alertBox.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Registrando...';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(userCredential.user, { displayName: name });
        await setDoc(doc(db, "usuarios", userCredential.user.uid), {
            nombre: name,
            email: email,
            rol: selectedRole,
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
        let userRole = 'SUPERVISOR';
        let userName = user.displayName || user.email;
        try {
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));
            if (userDoc.exists()) {
                userRole = userDoc.data().rol || 'SUPERVISOR';
                userName = userDoc.data().nombre || userName;
            }
        } catch (err) {
            console.warn("Error leyendo perfil:", err);
        }

        currentUser = {
            uid: user.uid,
            email: user.email,
            display: userName,
            role: userRole
        };

        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('appShell').classList.remove('hidden');
        document.getElementById('activeUserLabel').textContent = currentUser.display;

        window.switchProfileScreen(currentUser.role);
        listenFirestoreEvents();
    } else {
        document.getElementById('appShell').classList.add('hidden');
        document.getElementById('authScreen').classList.remove('hidden');
    }
});

window.logout = async () => {
    if (unsubscribeEvents) unsubscribeEvents();
    await signOut(auth);
};

// =========================================================
// 3. CAMBIO ENTRE LAS 3 PANTALLAS DE PERFIL
// =========================================================
window.switchProfileScreen = (role) => {
    document.getElementById('screenSwitcher').value = role;

    const badge = document.getElementById('headerRoleBadge');
    const labels = {
        'SUPERVISOR': 'Supervisor',
        'EJECUTIVO': 'Ejecutivo',
        'CONTRATADO': 'Persona Contratada'
    };
    badge.textContent = labels[role] || role;

    document.getElementById('viewSupervisor').classList.toggle('hidden', role !== 'SUPERVISOR');
    document.getElementById('viewEjecutivo').classList.toggle('hidden', role !== 'EJECUTIVO');
    document.getElementById('viewContratado').classList.toggle('hidden', role !== 'CONTRATADO');

    window.renderAllViews();
};

// =========================================================
// 4. PANTALLA SUPERVISOR: PROGRAMAR EVENTO Y PLANEACIÓN
// =========================================================
document.getElementById('supervisorEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newEv = {
        id: 'ELC-' + Math.floor(100 + Math.random() * 900),
        brand: document.getElementById('supBrand').value,
        store: document.getElementById('supStore').value.trim(),
        dates: document.getElementById('supDates').value.trim(),
        price: Number(document.getElementById('supPrice').value) || 0,
        contractorName: document.getElementById('supContractorName').value.trim(),
        contractorPhone: document.getElementById('supContractorPhone').value.replace(/\D/g, ''),
        planDetails: document.getElementById('supPlanDetails').value.trim(),
        supervisorName: currentUser.display,
        whatsappSent: false,
        ticketRef: '',
        ticketFileName: '',
        ticketFileData: '',
        invoiceRef: '',
        invoiceFileName: '',
        invoiceFileData: '',
        creadoEn: new Date().toISOString()
    };

    await addDoc(collection(db, "eventos_elc"), newEv);
    e.target.reset();
    alert(`Evento ${newEv.id} programado y publicado correctamente.`);
});

window.deleteEvent = async (docId, eventCode) => {
    if (!docId) return;
    if (confirm(`¿Eliminar el evento ${eventCode}?`)) {
        await deleteDoc(doc(db, "eventos_elc", docId));
    }
};

// =========================================================
// 5. ENVÍO WHATSAPP DESDE PANTALLA EJECUTIVO
// =========================================================
window.sendWhatsAppPlan = async (docId) => {
    const ev = eventsList.find(item => item.docId === docId);
    if (!ev) return;

    const cleanPhone = (ev.contractorPhone || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? '52' + cleanPhone : cleanPhone;

    const message = 
`Hola *${ev.contractorName}*, te comparto la planeación aprobada para tu evento de *Estée Lauder Companies*:

📌 *Folio:* ${ev.id}
🏷️ *Marca:* ${ev.brand}
🏬 *Tienda:* ${ev.store}
📅 *Fechas:* ${ev.dates}
💰 *Presupuesto Autorizado:* $${Number(ev.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN

📋 *Planeación y Precios:*
${ev.planDetails}

Por favor ingresa al portal para confirmar y subir tus *tickets* al finalizar para generar la factura.`;

    await updateDoc(doc(db, "eventos_elc", docId), { whatsappSent: true });

    const waUrl = phoneWithCountry
        ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
};

// =========================================================
// 6. CARGA Y DESCARGA DE TICKETS Y FACTURAS
// =========================================================
window.openUploadModal = (docId, type) => {
    uploadTarget = { docId, type };
    document.getElementById('uploadModalTitle').textContent =
        type === 'TICKET' ? 'Subir Ticket de Compra' : 'Subir Factura Generada';
    document.getElementById('uploadModalDesc').textContent =
        type === 'TICKET'
            ? 'Adjunta la foto o PDF del ticket para que el Ejecutivo elabore la factura.'
            : 'Adjunta la factura (PDF/XML/Imagen) para que quede lista para descarga.';
    document.getElementById('uploadRefInput').placeholder =
        type === 'TICKET' ? 'Ej. Ticket #9021' : 'Ej. Factura F-2026-014';

    document.getElementById('uploadForm').reset();
    document.getElementById('uploadModal').classList.remove('hidden');
};

window.closeUploadModal = () => {
    document.getElementById('uploadModal').classList.add('hidden');
    uploadTarget = { docId: null, type: 'TICKET' };
};

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!uploadTarget.docId) return;

    const refText = document.getElementById('uploadRefInput').value.trim();
    const fileInput = document.getElementById('uploadFileInput');
    const file = fileInput.files[0];
    const btn = document.getElementById('btnConfirmUpload');

    if (!file) return;
    if (file.size > 750 * 1024) {
        alert('El archivo pesa más de 750 KB. Por favor sube una imagen más ligera o PDF comprimido.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Subiendo...';

    const reader = new FileReader();
    reader.onload = async (event) => {
        const base64Data = event.target.result;
        const updatePayload = uploadTarget.type === 'TICKET'
            ? {
                ticketRef: refText,
                ticketFileName: file.name,
                ticketFileData: base64Data
            }
            : {
                invoiceRef: refText,
                invoiceFileName: file.name,
                invoiceFileData: base64Data
            };

        await updateDoc(doc(db, "eventos_elc", uploadTarget.docId), updatePayload);
        btn.disabled = false;
        btn.textContent = 'Subir y Guardar';
        window.closeUploadModal();
    };
    reader.readAsDataURL(file);
});

window.downloadStoredFile = (docId, type) => {
    const ev = eventsList.find(item => item.docId === docId);
    if (!ev) return;

    const dataUrl = type === 'TICKET' ? ev.ticketFileData : ev.invoiceFileData;
    const fileName = type === 'TICKET' ? (ev.ticketFileName || `Ticket_${ev.id}`) : (ev.invoiceFileName || `Factura_${ev.id}`);

    if (!dataUrl) {
        alert('No hay archivo adjunto disponible para descargar.');
        return;
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    link.click();
};

window.exportExcelGeneral = () => {
    if (eventsList.length === 0) {
        alert('No hay eventos registrados para exportar.');
        return;
    }
    const headers = ['Folio', 'Marca', 'Tienda', 'Fechas', 'Precio_MXN', 'Contratado', 'Telefono', 'Planeacion', 'Ticket_Ref', 'Factura_Ref'];
    const rows = eventsList.map(ev => [
        ev.id,
        ev.brand,
        `"${(ev.store || '').replace(/"/g, '""')}"`,
        `"${(ev.dates || '').replace(/"/g, '""')}"`,
        Number(ev.price || 0).toFixed(2),
        `"${(ev.contractorName || '').replace(/"/g, '""')}"`,
        ev.contractorPhone || '',
        `"${(ev.planDetails || '').replace(/"/g, '""')}"`,
        ev.ticketRef || 'Pendiente',
        ev.invoiceRef || 'Pendiente'
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Planeacion_Eventos_ELC_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// =========================================================
// 7. SINCRONIZACIÓN FIRESTORE Y RENDER DE LAS 3 PANTALLAS
// =========================================================
function listenFirestoreEvents() {
    if (unsubscribeEvents) unsubscribeEvents();
    const q = query(collection(db, "eventos_elc"), orderBy("creadoEn", "desc"));
    unsubscribeEvents = onSnapshot(q, (snapshot) => {
        eventsList = snapshot.docs.map(d => ({
            docId: d.id,
            ...d.data()
        }));
        window.renderAllViews();
    });
}

window.renderAllViews = () => {
    renderSupervisorView();
    renderEjecutivoView();
    renderContratadoView();
};

// RENDER 1: SUPERVISOR
function renderSupervisorView() {
    const brandFilter = document.getElementById('supFilterBrand').value;
    const list = eventsList.filter(e => brandFilter === 'ALL' || e.brand === brandFilter);

    document.getElementById('supKpiTotal').textContent = list.length;
    document.getElementById('supKpiTickets').textContent = list.filter(e => Boolean(e.ticketRef)).length;
    document.getElementById('supKpiFacturados').textContent = list.filter(e => Boolean(e.invoiceRef)).length;
    const totalBudget = list.reduce((acc, e) => acc + (Number(e.price) || 0), 0);
    document.getElementById('supKpiBudget').textContent = '$' + totalBudget.toLocaleString('es-MX');

    const tbody = document.getElementById('supEventsTable');
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">No hay eventos programados aún.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(ev => `
        <tr class="hover:bg-slate-50 transition">
            <td class="py-3.5 px-3">
                <span class="font-bold text-slate-900 block">${ev.id}</span>
                <span class="text-[11px] font-semibold text-blue-600">${ev.brand}</span>
            </td>
            <td class="py-3.5 px-3">
                <span class="font-semibold text-slate-800 block">${ev.store}</span>
                <span class="text-[11px] text-slate-400">${ev.dates}</span>
            </td>
            <td class="py-3.5 px-3">
                <span class="font-medium text-slate-700 block">${ev.contractorName}</span>
                <span class="text-[11px] text-slate-400">${ev.contractorPhone}</span>
            </td>
            <td class="py-3.5 px-3 font-bold text-slate-900">$${Number(ev.price).toLocaleString('es-MX')}</td>
            <td class="py-3.5 px-3 space-y-1">
                <div>
                    ${ev.ticketRef
                        ? `<span class="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full"><i class="fa-solid fa-receipt mr-1"></i>Ticket: ${ev.ticketRef}</span>`
                        : `<span class="text-[10px] text-slate-400">Sin ticket</span>`}
                </div>
                <div>
                    ${ev.invoiceRef
                        ? `<button onclick="downloadStoredFile('${ev.docId}', 'FACTURA')" class="text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"><i class="fa-solid fa-download mr-1"></i>Factura: ${ev.invoiceRef}</button>`
                        : `<span class="text-[10px] text-slate-400">Sin factura</span>`}
                </div>
            </td>
            <td class="py-3.5 px-3 text-right">
                <button onclick="deleteEvent('${ev.docId}', '${ev.id}')" class="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-500 text-red-500 hover:text-white inline-flex items-center justify-center transition">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// RENDER 2: EJECUTIVO
function renderEjecutivoView() {
    const brandFilter = document.getElementById('ejFilterBrand').value;
    const list = eventsList.filter(e => brandFilter === 'ALL' || e.brand === brandFilter);
    const grid = document.getElementById('ejecutivoEventsGrid');

    if (list.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-10 text-center text-xs text-slate-400">No hay eventos en planeación para esta marca.</div>`;
        return;
    }

    grid.innerHTML = list.map(ev => `
        <div class="border border-slate-200 rounded-3xl p-5 bg-slate-50/50 hover:bg-white hover:shadow-md transition space-y-3">
            <div class="flex justify-between items-start">
                <div>
                    <span class="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">${ev.id} • ${ev.brand}</span>
                    <h4 class="text-base font-bold text-slate-900 mt-1">${ev.store}</h4>
                    <p class="text-xs text-slate-500"><i class="fa-regular fa-calendar mr-1"></i>${ev.dates} • Presupuesto: <strong class="text-slate-900">$${Number(ev.price).toLocaleString('es-MX')}</strong></p>
                </div>
                ${ev.whatsappSent
                    ? `<span class="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full"><i class="fa-brands fa-whatsapp mr-1"></i>Enviado</span>`
                    : `<span class="text-[10px] font-semibold bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full">Pendiente WA</span>`}
            </div>

            <div class="bg-white p-3 rounded-2xl border border-slate-100 text-xs text-slate-600">
                <span class="font-bold text-slate-800 block mb-0.5">Planeación del Supervisor:</span>
                ${ev.planDetails}
            </div>

            <div class="flex items-center justify-between text-xs bg-white px-3.5 py-2.5 rounded-2xl border border-slate-100">
                <div>
                    <span class="text-slate-400 block text-[10px]">Persona Contratada</span>
                    <span class="font-bold text-slate-800">${ev.contractorName}</span> <span class="text-slate-400">(${ev.contractorPhone})</span>
                </div>
                <button onclick="sendWhatsAppPlan('${ev.docId}')" class="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition">
                    <i class="fa-brands fa-whatsapp text-sm"></i>
                    <span>Enviar Planeación</span>
                </button>
            </div>

            <!-- SECCIÓN TICKETS RECIBIDOS Y SUBIDA DE FACTURA -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div class="p-3 rounded-2xl bg-amber-50/70 border border-amber-100 flex flex-col justify-between">
                    <span class="text-[11px] font-bold text-amber-900"><i class="fa-solid fa-receipt mr-1"></i>Ticket del Contratado</span>
                    ${ev.ticketRef
                        ? `<div class="mt-2 flex items-center justify-between gap-1">
                             <span class="text-[11px] font-semibold text-amber-800 truncate">${ev.ticketRef}</span>
                             <button onclick="downloadStoredFile('${ev.docId}', 'TICKET')" class="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold"><i class="fa-solid fa-download mr-1"></i>Descargar</button>
                           </div>`
                        : `<span class="text-[11px] text-amber-700/70 mt-1 italic">Aún no sube ticket</span>`}
                </div>

                <div class="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 flex flex-col justify-between">
                    <span class="text-[11px] font-bold text-blue-900"><i class="fa-solid fa-file-invoice-dollar mr-1"></i>Factura para Descarga</span>
                    ${ev.invoiceRef
                        ? `<div class="mt-2 flex items-center justify-between gap-1">
                             <span class="text-[11px] font-semibold text-blue-800 truncate">${ev.invoiceRef}</span>
                             <div class="flex gap-1">
                                 <button onclick="downloadStoredFile('${ev.docId}', 'FACTURA')" class="px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold" title="Descargar Factura"><i class="fa-solid fa-download"></i></button>
                                 <button onclick="openUploadModal('${ev.docId}', 'FACTURA')" class="px-2 py-1 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-bold" title="Reemplazar"><i class="fa-solid fa-pen"></i></button>
                             </div>
                           </div>`
                        : `<button onclick="openUploadModal('${ev.docId}', 'FACTURA')" class="mt-2 w-full py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition">
                             <i class="fa-solid fa-upload mr-1"></i>Subir Factura
                           </button>`}
                </div>
            </div>
        </div>
    `).join('');
}

// RENDER 3: PERSONA CONTRATADA
function renderContratadoView() {
    const brandFilter = document.getElementById('conFilterBrand').value;
    const list = eventsList.filter(e => brandFilter === 'ALL' || e.brand === brandFilter);
    const grid = document.getElementById('contratadoEventsGrid');

    if (list.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-10 text-center text-xs text-slate-400">No hay eventos asignados por el momento.</div>`;
        return;
    }

    grid.innerHTML = list.map(ev => `
        <div class="border border-slate-200 rounded-3xl p-5 bg-slate-50/50 hover:bg-white hover:shadow-md transition space-y-3">
            <div class="flex justify-between items-start">
                <div>
                    <span class="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">${ev.brand} • ${ev.id}</span>
                    <h4 class="text-base font-bold text-slate-900 mt-1">${ev.store}</h4>
                    <p class="text-xs text-slate-500"><i class="fa-regular fa-calendar mr-1"></i>${ev.dates}</p>
                </div>
                <div class="text-right">
                    <span class="text-[10px] text-slate-400 block">Asignado a</span>
                    <span class="text-xs font-bold text-slate-800">${ev.contractorName}</span>
                </div>
            </div>

            <div class="bg-white p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1">
                <div class="flex justify-between">
                    <span class="font-bold text-slate-800">Indicaciones del Evento:</span>
                    <span class="font-bold text-blue-700">Monto: $${Number(ev.price).toLocaleString('es-MX')}</span>
                </div>
                <p>${ev.planDetails}</p>
            </div>

            <div class="pt-1">
                ${ev.ticketRef
                    ? `<div class="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                         <div class="text-xs text-emerald-800">
                             <i class="fa-solid fa-circle-check mr-1.5"></i>Ticket cargado: <strong>${ev.ticketRef}</strong> (${ev.ticketFileName})
                         </div>
                         <button onclick="openUploadModal('${ev.docId}', 'TICKET')" class="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100 transition">
                             Cambiar Ticket
                         </button>
                       </div>`
                    : `<button onclick="openUploadModal('${ev.docId}', 'TICKET')" class="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition flex items-center justify-center gap-2">
                         <i class="fa-solid fa-camera"></i>
                         <span>Subir Ticket para Facturación</span>
                       </button>`}
            </div>
        </div>
    `).join('');
}

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
