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

let currentUser = {
    uid: '',
    email: '',
    display: '',
    role: 'SUPERVISOR' // 'SUPERVISOR', 'EJECUTIVO', 'CONTRATADO'
};
let eventsList = [];
let unsubscribeEvents = null;
let activeEventIdForModal = null;

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
        document.getElementById('dashboardScreen').classList.remove('hidden');
        document.getElementById('activeUserLabel').textContent = currentUser.display;
        document.getElementById('viewSwitcher').value = currentUser.role;

        window.switchProfileView();
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
// 3. CAMBIO DE PANTALLA SEGÚN PERFIL (3 PANTALLAS DISTINTAS)
// =========================================================
window.switchProfileView = () => {
    const activeView = document.getElementById('viewSwitcher').value;
    const badge = document.getElementById('roleBadge');
    const subtitle = document.getElementById('headerSubtitle');

    document.getElementById('screenSupervisor').classList.add('hidden');
    document.getElementById('screenEjecutivo').classList.add('hidden');
    document.getElementById('screenContratado').classList.add('hidden');

    if (activeView === 'SUPERVISOR') {
        badge.textContent = 'Perfil: Supervisor';
        subtitle.textContent = 'Planeación de Eventos, Precios y Descarga de Facturas';
        document.getElementById('screenSupervisor').classList.remove('hidden');
    } else if (activeView === 'EJECUTIVO') {
        badge.textContent = 'Perfil: Ejecutivo';
        subtitle.textContent = 'Verificación, WhatsApp y Facturación';
        document.getElementById('screenEjecutivo').classList.remove('hidden');
    } else {
        badge.textContent = 'Perfil: Persona Contratada';
        subtitle.textContent = 'Consulta de Eventos y Carga de Tickets';
        document.getElementById('screenContratado').classList.remove('hidden');
    }

    window.renderApp();
};

// =========================================================
// 4. UTILIDAD PARA LEER Y COMPRIMIR ARCHIVOS (TICKETS / FACTURAS)
// =========================================================
function fileToCompressedDataUrl(file) {
    return new Promise((resolve, reject) => {
        if (!file) return reject('No se seleccionó archivo.');

        // Si es PDF, validar que no exceda ~700KB para Firestore
        if (file.type === 'application/pdf') {
            if (file.size > 750 * 1024) {
                return reject('El archivo PDF es demasiado pesado (máx. 750 KB).');
            }
            const reader = new FileReader();
            reader.onload = () => resolve({ dataUrl: reader.result, fileName: file.name, fileType: file.type });
            reader.onerror = reject;
            reader.readAsDataURL(file);
            return;
        }

        // Si es imagen, comprimir automáticamente a JPEG ligero para guardar rápido
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxWidth = 1000;
                const scale = img.width > maxWidth ? maxWidth / img.width : 1;
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedUrl = canvas.toDataURL('image/jpeg', 0.72);
                resolve({ dataUrl: compressedUrl, fileName: file.name, fileType: 'image/jpeg' });
            };
            img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

window.downloadStoredFile = (dataUrl, fileName) => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName || 'documento_elc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// =========================================================
// 5. ACCIONES SUPERVISOR: PROGRAMAR EVENTO Y PRECIOS
// =========================================================
window.openPlanModal = () => {
    document.getElementById('planModal').classList.remove('hidden');
    window.calcPlanPreview();
};
window.closePlanModal = () => document.getElementById('planModal').classList.add('hidden');

window.calcPlanPreview = () => {
    const sub = Number(document.getElementById('plSubtotal').value) || 0;
    const iva = sub * 0.16;
    const tot = sub + iva;
    document.getElementById('plPreviewIva').textContent = '$' + iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('plPreviewTotal').textContent = '$' + tot.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

document.getElementById('planForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const sub = Number(document.getElementById('plSubtotal').value) || 0;
    const iva = Number((sub * 0.16).toFixed(2));
    const tot = Number((sub + iva).toFixed(2));

    const newEv = {
        id: 'ELC-' + Math.floor(100 + Math.random() * 900),
        brand: document.getElementById('plBrand').value,
        dates: document.getElementById('plDates').value.trim(),
        store: document.getElementById('plStore').value.trim(),
        service: document.getElementById('plService').value.trim(),
        contractorName: document.getElementById('plContractorName').value.trim(),
        contractorPhone: document.getElementById('plContractorPhone').value.replace(/\D/g, ''),
        eventCount: Number(document.getElementById('plCount').value) || 1,
        subtotal: sub,
        iva: iva,
        total: tot,
        supervisorName: currentUser.display,
        whatsappSent: false,
        // Datos Ticket (subidos por Contratado)
        ticketUploaded: false,
        ticketAmount: 0,
        ticketNotes: '',
        ticketFileData: '',
        ticketFileName: '',
        // Datos Factura (subidos por Ejecutivo para descarga del Supervisor)
        invoiceUploaded: false,
        invoiceFolio: '',
        invoiceFileData: '',
        invoiceFileName: '',
        creadoEn: new Date().toISOString()
    };

    await addDoc(collection(db, "eventos_elc"), newEv);
    e.target.reset();
    window.closePlanModal();
});

window.deleteEvent = async (docId, eventCode) => {
    if (!docId) return;
    if (confirm(`¿Eliminar el evento ${eventCode}?`)) {
        await deleteDoc(doc(db, "eventos_elc", docId));
    }
};

// =========================================================
// 6. ACCIONES EJECUTIVO: WHATSAPP Y SUBIR FACTURA
// =========================================================
window.sendWhatsAppToContractor = async (docId) => {
    const ev = eventsList.find(item => item.docId === docId);
    if (!ev) return;

    const cleanPhone = (ev.contractorPhone || '').replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;

    const message = 
`¡Hola ${ev.contractorName}! Te comparto la planeación confirmada para tu evento de *${ev.brand}*:

• *Folio:* ${ev.id}
• *Fecha(s):* ${ev.dates}
• *Tienda:* ${ev.store}
• *Actividad:* ${ev.service}
• *Cantidad:* ${ev.eventCount} evento(s)
• *Presupuesto Autorizado:* $${Number(ev.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN (IVA incluido)

Por favor ingresa al portal para confirmar y subir tus tickets de compra en cuanto los tengas para poder generar la factura. ¡Gracias!`;

    if (docId) {
        await updateDoc(doc(db, "eventos_elc", docId), { whatsappSent: true });
    }

    const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
};

window.openInvoiceModal = (docId) => {
    const ev = eventsList.find(item => item.docId === docId);
    if (!ev) return;
    activeEventIdForModal = docId;
    document.getElementById('invModalSub').textContent = `${ev.id} • ${ev.brand} • ${ev.store}`;
    document.getElementById('invFolioInput').value = ev.invoiceFolio || '';
    document.getElementById('invoiceModal').classList.remove('hidden');
};
window.closeInvoiceModal = () => {
    document.getElementById('invoiceModal').classList.add('hidden');
    activeEventIdForModal = null;
};

document.getElementById('invoiceUploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeEventIdForModal) return;
    const file = document.getElementById('invFileInput').files[0];
    const folio = document.getElementById('invFolioInput').value.trim();
    const btn = document.getElementById('btnSaveInvoice');

    btn.disabled = true;
    btn.textContent = 'Subiendo factura...';

    try {
        const processed = await fileToCompressedDataUrl(file);
        await updateDoc(doc(db, "eventos_elc", activeEventIdForModal), {
            invoiceUploaded: true,
            invoiceFolio: folio,
            invoiceFileData: processed.dataUrl,
            invoiceFileName: `Factura_${folio}_${processed.fileName}`
        });
        e.target.reset();
        window.closeInvoiceModal();
    } catch (err) {
        alert('Error al subir factura: ' + err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Subir Factura';
    }
});

// =========================================================
// 7. ACCIONES PERSONA CONTRATADA: SUBIR TICKETS
// =========================================================
window.openTicketModal = (docId) => {
    const ev = eventsList.find(item => item.docId === docId);
    if (!ev) return;
    activeEventIdForModal = docId;
    document.getElementById('tktModalSub').textContent = `${ev.id} • ${ev.brand} • ${ev.store}`;
    document.getElementById('tktAmountInput').value = ev.ticketAmount || '';
    document.getElementById('tktNotesInput').value = ev.ticketNotes || '';
    document.getElementById('ticketModal').classList.remove('hidden');
};
window.closeTicketModal = () => {
    document.getElementById('ticketModal').classList.add('hidden');
    activeEventIdForModal = null;
};

document.getElementById('ticketUploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeEventIdForModal) return;
    const file = document.getElementById('tktFileInput').files[0];
    const amount = Number(document.getElementById('tktAmountInput').value) || 0;
    const notes = document.getElementById('tktNotesInput').value.trim();
    const btn = document.getElementById('btnSaveTicket');

    btn.disabled = true;
    btn.textContent = 'Enviando ticket...';

    try {
        const processed = await fileToCompressedDataUrl(file);
        await updateDoc(doc(db, "eventos_elc", activeEventIdForModal), {
            ticketUploaded: true,
            ticketAmount: amount,
            ticketNotes: notes,
            ticketFileData: processed.dataUrl,
            ticketFileName: `Ticket_${processed.fileName}`
        });
        e.target.reset();
        window.closeTicketModal();
    } catch (err) {
        alert('Error al subir ticket: ' + err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar Ticket al Ejecutivo';
    }
});

// =========================================================
// 8. EXPORTACIÓN EXCEL CARGOS AMEX (SUPERVISOR)
// =========================================================
window.exportCargosAmex = () => {
    if (eventsList.length === 0) {
        alert('No hay eventos registrados para exportar.');
        return;
    }

    const headers = [
        'Folio',
        'Marca',
        'Fechas',
        'Tienda',
        'Servicio',
        'Persona_Contratada',
        'Cantidad_Eventos',
        'Subtotal_Planeado',
        'IVA_16',
        'Total_Planeado',
        'Monto_Ticket_Subido',
        'Folio_Factura',
        'Factura_Lista'
    ];

    const rows = eventsList.map(ev => [
        ev.id,
        ev.brand,
        `"${(ev.dates || '').replace(/"/g, '""')}"`,
        `"${(ev.store || '').replace(/"/g, '""')}"`,
        `"${(ev.service || '').replace(/"/g, '""')}"`,
        `"${(ev.contractorName || '').replace(/"/g, '""')}"`,
        ev.eventCount || 1,
        Number(ev.subtotal || 0).toFixed(2),
        Number(ev.iva || 0).toFixed(2),
        Number(ev.total || 0).toFixed(2),
        Number(ev.ticketAmount || 0).toFixed(2),
        ev.invoiceFolio || 'Pendiente',
        ev.invoiceUploaded ? 'SI' : 'NO'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cargos_AMEX_ELC_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

// =========================================================
// 9. SINCRONIZACIÓN FIRESTORE Y RENDERIZADO DE LAS 3 PANTALLAS
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

window.renderApp = () => {
    renderSupervisorView();
    renderEjecutivoView();
    renderContratadoView();
};

// RENDER 1: PANTALLA SUPERVISOR
function renderSupervisorView() {
    document.getElementById('supKpiTotal').textContent = eventsList.length;
    document.getElementById('supKpiTickets').textContent = eventsList.filter(e => e.ticketUploaded).length;
    document.getElementById('supKpiInvoices').textContent = eventsList.filter(e => e.invoiceUploaded).length;

    const totalBudget = eventsList.reduce((acc, e) => acc + (Number(e.total) || 0), 0);
    document.getElementById('supKpiBudget').textContent = '$' + totalBudget.toLocaleString('es-MX', { minimumFractionDigits: 2 });

    const tbody = document.getElementById('supTableBody');
    if (eventsList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">No hay eventos programados. Haz clic en <b>Programar Evento</b> para subir tu planeación.</td></tr>`;
        return;
    }

    tbody.innerHTML = eventsList.map(ev => {
        const statusBadges = `
            <div class="flex flex-col gap-1">
                <span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${ev.ticketUploaded ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}">
                    <i class="fa-solid ${ev.ticketUploaded ? 'fa-check' : 'fa-clock'}"></i> ${ev.ticketUploaded ? 'Ticket Subido' : 'Sin Ticket'}
                </span>
                <span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${ev.invoiceUploaded ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">
                    <i class="fa-solid ${ev.invoiceUploaded ? 'fa-file-circle-check' : 'fa-hourglass-half'}"></i> ${ev.invoiceUploaded ? 'Factura Lista' : 'Factura Pendiente'}
                </span>
            </div>
        `;

        const downloadInvoiceBtn = ev.invoiceUploaded
            ? `<button onclick="downloadStoredFile('${ev.invoiceFileData}', '${ev.invoiceFileName}')" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition inline-flex items-center gap-1.5">
                <i class="fa-solid fa-download"></i> Descargar Factura
               </button>`
            : `<span class="text-[11px] text-slate-400 italic">Esperando Ejecutivo</span>`;

        return `
            <tr class="hover:bg-slate-50 transition">
                <td class="py-3.5 px-3">
                    <span class="font-bold text-slate-900 block">${ev.id}</span>
                    <span class="text-[11px] text-blue-600 font-semibold">${ev.brand}</span>
                </td>
                <td class="py-3.5 px-3">
                    <span class="font-semibold text-slate-800 block">${ev.store}</span>
                    <span class="text-[11px] text-slate-500">${ev.dates} • ${ev.service}</span>
                </td>
                <td class="py-3.5 px-3">
                    <span class="font-medium text-slate-800 block">${ev.contractorName || 'Sin asignar'}</span>
                    <span class="text-[11px] text-slate-400">${ev.contractorPhone || ''}</span>
                </td>
                <td class="py-3.5 px-3">
                    <span class="font-bold text-slate-900 block">$${Number(ev.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    <span class="text-[10px] text-slate-400">Sub: $${Number(ev.subtotal).toLocaleString('es-MX')}</span>
                </td>
                <td class="py-3.5 px-3">${statusBadges}</td>
                <td class="py-3.5 px-3 text-right whitespace-nowrap">
                    ${downloadInvoiceBtn}
                    <button onclick="deleteEvent('${ev.docId}', '${ev.id}')" title="Eliminar" class="ml-1.5 w-8 h-8 rounded-xl bg-red-50 hover:bg-red-500 text-red-500 hover:text-white inline-flex items-center justify-center transition">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// RENDER 2: PANTALLA EJECUTIVO
function renderEjecutivoView() {
    const brandFilter = document.getElementById('ejFilterBrand').value;
    const filtered = eventsList.filter(e => brandFilter === 'ALL' || e.brand === brandFilter);
    const tbody = document.getElementById('ejTableBody');

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">No hay planeaciones cargadas por el Supervisor aún.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(ev => {
        const ticketCol = ev.ticketUploaded
            ? `<div class="space-y-1">
                <span class="text-[11px] font-bold text-blue-700 block">$${Number(ev.ticketAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                <span class="text-[10px] text-slate-500 block">${ev.ticketNotes || 'Ticket cargado'}</span>
                <button onclick="downloadStoredFile('${ev.ticketFileData}', '${ev.ticketFileName}')" class="text-[10px] font-semibold text-blue-600 hover:underline">
                    <i class="fa-solid fa-eye mr-0.5"></i>Ver / Descargar Ticket
                </button>
               </div>`
            : `<span class="text-[11px] text-slate-400 italic">Aún no sube ticket</span>`;

        const invoiceCol = ev.invoiceUploaded
            ? `<span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <i class="fa-solid fa-circle-check"></i> ${ev.invoiceFolio || 'Subida'}
               </span>`
            : `<span class="text-[11px] text-amber-600 font-medium">Pendiente de subir</span>`;

        return `
            <tr class="hover:bg-slate-50 transition">
                <td class="py-3.5 px-3">
                    <span class="font-bold text-slate-900 block">${ev.id}</span>
                    <span class="text-[11px] text-blue-600 font-semibold">${ev.brand}</span>
                </td>
                <td class="py-3.5 px-3">
                    <span class="font-semibold text-slate-800 block">${ev.store} (${ev.dates})</span>
                    <span class="text-[11px] text-slate-500">${ev.service} • Aut: <b>$${Number(ev.total).toLocaleString('es-MX')}</b></span>
                </td>
                <td class="py-3.5 px-3">
                    <span class="font-semibold text-slate-800 block">${ev.contractorName}</span>
                    <button onclick="sendWhatsAppToContractor('${ev.docId}')" class="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10.5px] font-semibold transition">
                        <i class="fa-brands fa-whatsapp text-xs"></i> ${ev.whatsappSent ? 'Reenviar WhatsApp' : 'Enviar WhatsApp'}
                    </button>
                </td>
                <td class="py-3.5 px-3">${ticketCol}</td>
                <td class="py-3.5 px-3">${invoiceCol}</td>
                <td class="py-3.5 px-3 text-right whitespace-nowrap">
                    <button onclick="openInvoiceModal('${ev.docId}')" class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-[11px] font-semibold transition">
                        <i class="fa-solid fa-cloud-arrow-up mr-1"></i>${ev.invoiceUploaded ? 'Actualizar Factura' : 'Subir Factura'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// RENDER 3: PANTALLA PERSONA CONTRATADA
function renderContratadoView() {
    const grid = document.getElementById('contratadoCardsGrid');
    if (eventsList.length === 0) {
        grid.innerHTML = `<div class="col-span-2 py-10 text-center text-xs text-slate-400">No tienes eventos asignados por el momento.</div>`;
        return;
    }

    grid.innerHTML = eventsList.map(ev => `
        <div class="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-md transition flex flex-col justify-between gap-4">
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">${ev.id} • ${ev.brand}</span>
                    <span class="text-[11px] font-semibold ${ev.ticketUploaded ? 'text-emerald-600' : 'text-amber-600'}">
                        <i class="fa-solid ${ev.ticketUploaded ? 'fa-circle-check' : 'fa-clock'} mr-1"></i>
                        ${ev.ticketUploaded ? 'Ticket enviado' : 'Pendiente de ticket'}
                    </span>
                </div>
                <h4 class="text-base font-bold text-slate-900">${ev.store}</h4>
                <p class="text-xs text-slate-500 mt-0.5"><i class="fa-regular fa-calendar mr-1 text-blue-600"></i>${ev.dates} • ${ev.service}</p>
                <div class="mt-3 p-3 rounded-xl bg-white border border-slate-100 text-xs flex justify-between items-center">
                    <span class="text-slate-500">Presupuesto asignado:</span>
                    <span class="font-bold text-slate-900">$${Number(ev.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                </div>
                ${ev.ticketUploaded ? `
                    <div class="mt-2 text-[11px] text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl">
                        <b>Ticket registrado:</b> $${Number(ev.ticketAmount).toLocaleString('es-MX')} — ${ev.ticketNotes}
                    </div>
                ` : ''}
            </div>

            <button onclick="openTicketModal('${ev.docId}')" class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition flex items-center justify-center gap-2">
                <i class="fa-solid fa-camera"></i>
                <span>${ev.ticketUploaded ? 'Subir / Reemplazar Ticket' : 'Subir Foto o PDF de Ticket'}</span>
            </button>
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
