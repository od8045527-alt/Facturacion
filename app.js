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
    orderBy,
    limit
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
// 1. SISTEMA DE NOTIFICACIONES TOAST & MODALES MEJORADOS
// =========================================================
window.showToast = (title, message, type = 'info') => {
    const container = document.getElementById('toastContainer');
    const styles = {
        success: { icon: 'fa-circle-check', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        warning: { icon: 'fa-triangle-exclamation', color: 'text-amber-600', bg: 'bg-amber-50' },
        error: { icon: 'fa-circle-xmark', color: 'text-red-600', bg: 'bg-red-50' },
        info: { icon: 'fa-bell', color: 'text-blue-600', bg: 'bg-blue-50' }
    };
    const st = styles[type] || styles.info;

    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.innerHTML = `
        <div class="w-8 h-8 rounded-xl ${st.bg} ${st.color} flex items-center justify-center shrink-0 text-sm">
            <i class="fa-solid ${st.icon}"></i>
        </div>
        <div class="flex-1 min-w-0">
            <h4 class="text-xs font-bold text-slate-900">${title}</h4>
            <p class="text-[11px] text-slate-500 leading-snug mt-0.5">${message}</p>
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600 text-xs">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 4500);
};

let confirmCallback = null;
window.openConfirmModal = (title, text, onConfirm) => {
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalText').textContent = text;
    confirmCallback = onConfirm;
    document.getElementById('confirmModal').classList.remove('hidden');
};
window.closeConfirmModal = () => {
    document.getElementById('confirmModal').classList.add('hidden');
    confirmCallback = null;
};
document.getElementById('confirmModalAcceptBtn').addEventListener('click', async () => {
    if (confirmCallback) await confirmCallback();
    window.closeConfirmModal();
});

// =========================================================
// 2. ANIMACIÓN PANEL LOGIN / REGISTRO & CONTROLES
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
    role: 'SUPERVISOR'
};
let eventsList = [];
let notificationsList = [];
let unsubscribeEvents = null;
let unsubscribeNotifs = null;
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
// 3. AUTENTICACIÓN (GOOGLE, CORREO/CONTRASEÑA, REGISTRO)
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
        listenNotifications();
    } else {
        document.getElementById('appShell').classList.add('hidden');
        document.getElementById('authScreen').classList.remove('hidden');
    }
});

window.logout = async () => {
    if (unsubscribeEvents) unsubscribeEvents();
    if (unsubscribeNotifs) unsubscribeNotifs();
    await signOut(auth);
};

// =========================================================
// 4. CENTRO DE NOTIFICACIONES EN TIEMPO REAL
// =========================================================
async function pushSystemNotification(title, message, targetRole) {
    await addDoc(collection(db, "notificaciones_elc"), {
        title,
        message,
        targetRole,
        author: currentUser.display,
        read: false,
        creadoEn: new Date().toISOString()
    });
}

function listenNotifications() {
    if (unsubscribeNotifs) unsubscribeNotifs();
    const q = query(collection(db, "notificaciones_elc"), orderBy("creadoEn", "desc"), limit(20));
    unsubscribeNotifs = onSnapshot(q, (snapshot) => {
        notificationsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderNotifications();
    });
}

function renderNotifications() {
    const unread = notificationsList.filter(n => !n.read);
    const badge = document.getElementById('notifBadge');
    if (unread.length > 0) {
        badge.textContent = unread.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    const listEl = document.getElementById('notifList');
    if (notificationsList.length === 0) {
        listEl.innerHTML = `<div class="p-6 text-center text-slate-400">Sin notificaciones recientes.</div>`;
        return;
    }

    listEl.innerHTML = notificationsList.map(n => `
        <div class="p-3.5 ${n.read ? 'bg-white' : 'bg-blue-50/70'} hover:bg-slate-50 transition">
            <div class="flex justify-between items-start gap-2">
                <span class="font-bold text-slate-900">${n.title}</span>
                ${!n.read ? '<span class="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1"></span>' : ''}
            </div>
            <p class="text-[11px] text-slate-600 mt-0.5">${n.message}</p>
            <span class="text-[10px] text-slate-400 block mt-1">Por ${n.author || 'Sistema'} • ${new Date(n.creadoEn).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
    `).join('');
}

window.toggleNotifPanel = () => {
    document.getElementById('notifDropdown').classList.toggle('hidden');
};

window.markAllNotificationsRead = async () => {
    const unread = notificationsList.filter(n => !n.read);
    for (const item of unread) {
        await updateDoc(doc(db, "notificaciones_elc", item.id), { read: true });
    }
};

// =========================================================
// 5. CAMBIO ENTRE LAS 3 PANTALLAS DE PERFIL
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
// 6. PANTALLA SUPERVISOR: PROGRAMAR EVENTO Y PLANEACIÓN
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
        tickets: [],
        invoices: [],
        creadoEn: new Date().toISOString()
    };

    await addDoc(collection(db, "eventos_elc"), newEv);
    await pushSystemNotification(
        `Nueva Planeación ${newEv.id}`,
        `${newEv.brand} en ${newEv.store} (${newEv.dates}) asignado a ${newEv.contractorName}.`,
        'EJECUTIVO'
    );

    e.target.reset();
    window.showToast('Planeación Publicada', `Evento ${newEv.id} creado y notificado al equipo.`, 'success');
});

window.deleteEvent = (docId, eventCode) => {
    window.openConfirmModal(
        `Eliminar evento ${eventCode}`,
        'Se borrará la planeación, tickets y facturas asociadas a este folio.',
        async () => {
            await deleteDoc(doc(db, "eventos_elc", docId));
            window.showToast('Evento Eliminado', `El folio ${eventCode} fue eliminado.`, 'warning');
        }
    );
};

// =========================================================
// 7. ENVÍO WHATSAPP DESDE PANTALLA EJECUTIVO
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

Por favor ingresa al portal para confirmar y subir todos tus *tickets* al finalizar para generar las facturas.`;

    await updateDoc(doc(db, "eventos_elc", docId), { whatsappSent: true });
    window.showToast('WhatsApp Preparado', `Abriendo chat con ${ev.contractorName}...`, 'success');

    const waUrl = phoneWithCountry
        ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
};

// =========================================================
// 8. CARGA, DESCARGA Y ELIMINACIÓN DE MÚLTIPLES TICKETS Y FACTURAS
// =========================================================
function getEventTickets(ev) {
    if (Array.isArray(ev.tickets)) return ev.tickets;
    if (ev.ticketRef) {
        return [{ id: 'legacy-t', ref: ev.ticketRef, fileName: ev.ticketFileName, fileData: ev.ticketFileData }];
    }
    return [];
}

function getEventInvoices(ev) {
    if (Array.isArray(ev.invoices)) return ev.invoices;
    if (ev.invoiceRef) {
        return [{ id: 'legacy-i', ref: ev.invoiceRef, fileName: ev.invoiceFileName, fileData: ev.invoiceFileData }];
    }
    return [];
}

window.openUploadModal = (docId, type) => {
    uploadTarget = { docId, type };
    document.getElementById('uploadModalTitle').textContent =
        type === 'TICKET' ? 'Subir Tickets de Compra' : 'Subir Facturas Generadas';
    document.getElementById('uploadModalSubtitle').textContent =
        type === 'TICKET'
            ? 'Puedes adjuntar uno o varios tickets a la vez'
            : 'Puedes adjuntar una o varias facturas (PDF, XML o Imagen)';
    document.getElementById('uploadRefInput').placeholder =
        type === 'TICKET' ? 'Ej. Tickets Costco / Comida / Materiales' : 'Ej. Factura F-2026-014';

    document.getElementById('uploadForm').reset();
    document.getElementById('selectedFilesCount').textContent = 'Ningún archivo seleccionado aún';
    document.getElementById('uploadModal').classList.remove('hidden');
};

window.closeUploadModal = () => {
    document.getElementById('uploadModal').classList.add('hidden');
    uploadTarget = { docId: null, type: 'TICKET' };
};

window.updateSelectedFilesPreview = (input) => {
    const count = input.files ? input.files.length : 0;
    const label = document.getElementById('selectedFilesCount');
    if (count === 0) {
        label.textContent = 'Ningún archivo seleccionado aún';
    } else if (count === 1) {
        label.textContent = `1 archivo listo: ${input.files[0].name}`;
    } else {
        label.textContent = `${count} archivos seleccionados listos para subir`;
    }
};

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!uploadTarget.docId) return;

    const ev = eventsList.find(item => item.docId === uploadTarget.docId);
    if (!ev) return;

    const refText = document.getElementById('uploadRefInput').value.trim();
    const files = Array.from(document.getElementById('uploadFileInput').files || []);
    const btn = document.getElementById('btnConfirmUpload');

    if (files.length === 0) return;

    for (const f of files) {
        if (f.size > 700 * 1024) {
            window.showToast('Archivo muy pesado', `"${f.name}" supera los 700 KB. Comprímelo antes de subir.`, 'error');
            return;
        }
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Subiendo...</span>';

    try {
        const newItems = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const base64Data = await readFileAsBase64(file);
            newItems.push({
                id: Date.now() + '-' + i,
                ref: files.length > 1 ? `${refText} (${i + 1})` : refText,
                fileName: file.name,
                fileData: base64Data,
                uploadedBy: currentUser.display,
                uploadedAt: new Date().toISOString()
            });
        }

        const eventRef = doc(db, "eventos_elc", uploadTarget.docId);
        if (uploadTarget.type === 'TICKET') {
            const currentTickets = getEventTickets(ev);
            await updateDoc(eventRef, { tickets: [...currentTickets, ...newItems] });
            await pushSystemNotification(
                `Tickets Subidos (${ev.id})`,
                `${currentUser.display} cargó ${newItems.length} ticket(s) para ${ev.brand} - ${ev.store}.`,
                'EJECUTIVO'
            );
            window.showToast('Tickets Guardados', `Se agregaron ${newItems.length} ticket(s) correctamente.`, 'success');
        } else {
            const currentInvoices = getEventInvoices(ev);
            await updateDoc(eventRef, { invoices: [...currentInvoices, ...newItems] });
            await pushSystemNotification(
                `Facturas Disponibles (${ev.id})`,
                `${currentUser.display} subió ${newItems.length} factura(s) para ${ev.brand} - ${ev.store}.`,
                'SUPERVISOR'
            );
            window.showToast('Facturas Guardadas', `Se agregaron ${newItems.length} factura(s) para descarga.`, 'success');
        }

        window.closeUploadModal();
    } catch (err) {
        console.error(err);
        window.showToast('Error al subir', 'No se pudieron guardar los archivos. Intenta con archivos más ligeros.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-upload"></i><span>Agregar Archivos</span>';
    }
});

window.downloadArrayFile = (docId, type, itemId) => {
    const ev = eventsList.find(item => item.docId === docId);
    if (!ev) return;

    const list = type === 'TICKET' ? getEventTickets(ev) : getEventInvoices(ev);
    const item = list.find(x => x.id === itemId);
    if (!item || !item.fileData) {
        window.showToast('Sin archivo', 'No se encontró el archivo adjunto.', 'warning');
        return;
    }

    const link = document.createElement('a');
    link.href = item.fileData;
    link.download = item.fileName || `${type}_${ev.id}`;
    link.click();
};

window.removeArrayFile = (docId, type, itemId) => {
    const ev = eventsList.find(item => item.docId === docId);
    if (!ev) return;

    window.openConfirmModal(
        `Eliminar ${type === 'TICKET' ? 'Ticket' : 'Factura'}`,
        '¿Deseas quitar este archivo del expediente?',
        async () => {
            const eventRef = doc(db, "eventos_elc", docId);
            if (type === 'TICKET') {
                const updated = getEventTickets(ev).filter(x => x.id !== itemId);
                await updateDoc(eventRef, { tickets: updated, ticketRef: '' });
            } else {
                const updated = getEventInvoices(ev).filter(x => x.id !== itemId);
                await updateDoc(eventRef, { invoices: updated, invoiceRef: '' });
            }
            window.showToast('Archivo Eliminado', 'Se actualizó la lista de documentos.', 'info');
        }
    );
};

window.exportExcelGeneral = () => {
    if (eventsList.length === 0) {
        window.showToast('Tabla vacía', 'No hay eventos registrados para exportar.', 'warning');
        return;
    }
    const headers = ['Folio', 'Marca', 'Tienda', 'Fechas', 'Precio_MXN', 'Contratado', 'Telefono', 'Planeacion', 'Cant_Tickets', 'Cant_Facturas'];
    const rows = eventsList.map(ev => [
        ev.id,
        ev.brand,
        `"${(ev.store || '').replace(/"/g, '""')}"`,
        `"${(ev.dates || '').replace(/"/g, '""')}"`,
        Number(ev.price || 0).toFixed(2),
        `"${(ev.contractorName || '').replace(/"/g, '""')}"`,
        ev.contractorPhone || '',
        `"${(ev.planDetails || '').replace(/"/g, '""')}"`,
        getEventTickets(ev).length,
        getEventInvoices(ev).length
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
// 9. SINCRONIZACIÓN FIRESTORE Y RENDER DE LAS 3 PANTALLAS
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

    const totalTickets = list.reduce((acc, e) => acc + getEventTickets(e).length, 0);
    const totalInvoices = list.reduce((acc, e) => acc + getEventInvoices(e).length, 0);
    const totalBudget = list.reduce((acc, e) => acc + (Number(e.price) || 0), 0);

    document.getElementById('supKpiTotal').textContent = list.length;
    document.getElementById('supKpiTickets').textContent = totalTickets;
    document.getElementById('supKpiFacturados').textContent = totalInvoices;
    document.getElementById('supKpiBudget').textContent = '$' + totalBudget.toLocaleString('es-MX');

    const tbody = document.getElementById('supEventsTable');
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">No hay eventos programados aún.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(ev => {
        const tickets = getEventTickets(ev);
        const invoices = getEventInvoices(ev);

        return `
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
                        <span class="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                            <i class="fa-solid fa-receipt mr-1"></i>${tickets.length} Ticket(s)
                        </span>
                    </div>
                    <div class="flex flex-wrap gap-1">
                        ${invoices.length > 0
                            ? invoices.map(inv => `<button type="button" onclick="downloadArrayFile('${ev.docId}', 'FACTURA', '${inv.id}')" class="text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"><i class="fa-solid fa-download mr-1"></i>${inv.ref}</button>`).join('')
                            : `<span class="text-[10px] text-slate-400">Sin facturas</span>`}
                    </div>
                </td>
                <td class="py-3.5 px-3 text-right">
                    <button type="button" onclick="deleteEvent('${ev.docId}', '${ev.id}')" class="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-500 text-red-500 hover:text-white inline-flex items-center justify-center transition">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// RENDER 2: EJECUTIVO (MÚLTIPLES TICKETS Y MÚLTIPLES FACTURAS)
function renderEjecutivoView() {
    const brandFilter = document.getElementById('ejFilterBrand').value;
    const list = eventsList.filter(e => brandFilter === 'ALL' || e.brand === brandFilter);
    const grid = document.getElementById('ejecutivoEventsGrid');

    if (list.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-10 text-center text-xs text-slate-400">No hay eventos en planeación para esta marca.</div>`;
        return;
    }

    grid.innerHTML = list.map(ev => {
        const tickets = getEventTickets(ev);
        const invoices = getEventInvoices(ev);

        return `
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
                    <button type="button" onclick="sendWhatsAppPlan('${ev.docId}')" class="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition">
                        <i class="fa-brands fa-whatsapp text-sm"></i>
                        <span>Enviar Planeación</span>
                    </button>
                </div>

                <!-- LISTADO DE MÚLTIPLES TICKETS Y MÚLTIPLES FACTURAS -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <!-- Columna Tickets -->
                    <div class="p-3 rounded-2xl bg-amber-50/70 border border-amber-100 space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-bold text-amber-900"><i class="fa-solid fa-receipt mr-1"></i>Tickets (${tickets.length})</span>
                        </div>
                        <div class="space-y-1.5 max-h-28 overflow-y-auto">
                            ${tickets.length > 0
                                ? tickets.map(t => `
                                    <div class="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-amber-200/70 text-[11px]">
                                        <span class="font-semibold text-amber-900 truncate pr-1" title="${t.fileName}">${t.ref}</span>
                                        <button type="button" onclick="downloadArrayFile('${ev.docId}', 'TICKET', '${t.id}')" class="px-2 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shrink-0">
                                            <i class="fa-solid fa-download"></i>
                                        </button>
                                    </div>
                                `).join('')
                                : `<p class="text-[11px] text-amber-700/70 italic">Sin tickets subidos aún</p>`}
                        </div>
                    </div>

                    <!-- Columna Facturas -->
                    <div class="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-bold text-blue-900"><i class="fa-solid fa-file-invoice-dollar mr-1"></i>Facturas (${invoices.length})</span>
                            <button type="button" onclick="openUploadModal('${ev.docId}', 'FACTURA')" class="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition">
                                + Subir
                            </button>
                        </div>
                        <div class="space-y-1.5 max-h-28 overflow-y-auto">
                            ${invoices.length > 0
                                ? invoices.map(inv => `
                                    <div class="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-blue-200/70 text-[11px]">
                                        <span class="font-semibold text-blue-900 truncate pr-1" title="${inv.fileName}">${inv.ref}</span>
                                        <div class="flex items-center gap-1 shrink-0">
                                            <button type="button" onclick="downloadArrayFile('${ev.docId}', 'FACTURA', '${inv.id}')" class="px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold" title="Descargar">
                                                <i class="fa-solid fa-download"></i>
                                            </button>
                                            <button type="button" onclick="removeArrayFile('${ev.docId}', 'FACTURA', '${inv.id}')" class="px-1.5 py-0.5 rounded-lg bg-red-50 hover:bg-red-500 text-red-500 hover:text-white text-[10px]" title="Quitar">
                                                <i class="fa-solid fa-xmark"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join('')
                                : `<p class="text-[11px] text-blue-700/70 italic">Sin facturas cargadas</p>`}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// RENDER 3: PERSONA CONTRATADA (MÚLTIPLES TICKETS)
function renderContratadoView() {
    const brandFilter = document.getElementById('conFilterBrand').value;
    const list = eventsList.filter(e => brandFilter === 'ALL' || e.brand === brandFilter);
    const grid = document.getElementById('contratadoEventsGrid');

    if (list.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-10 text-center text-xs text-slate-400">No hay eventos asignados por el momento.</div>`;
        return;
    }

    grid.innerHTML = list.map(ev => {
        const tickets = getEventTickets(ev);

        return `
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

                <!-- LISTA DE TICKETS SUBIDOS + BOTÓN AGREGAR MÁS TICKETS -->
                <div class="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-slate-800"><i class="fa-solid fa-receipt text-blue-600 mr-1.5"></i>Tickets Cargados (${tickets.length})</span>
                        <button type="button" onclick="openUploadModal('${ev.docId}', 'TICKET')" class="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold shadow-sm transition flex items-center gap-1.5">
                            <i class="fa-solid fa-plus"></i>
                            <span>Agregar Tickets</span>
                        </button>
                    </div>

                    ${tickets.length > 0
                        ? `<div class="space-y-1.5 max-h-32 overflow-y-auto">
                            ${tickets.map(t => `
                                <div class="flex items-center justify-between bg-emerald-50/70 border border-emerald-200 px-3 py-2 rounded-xl text-xs">
                                    <div class="truncate pr-2">
                                        <span class="font-bold text-emerald-900">${t.ref}</span>
                                        <span class="text-[10px] text-emerald-700 block truncate">${t.fileName}</span>
                                    </div>
                                    <button type="button" onclick="removeArrayFile('${ev.docId}', 'TICKET', '${t.id}')" class="w-7 h-7 rounded-lg bg-white hover:bg-red-500 text-red-500 hover:text-white border border-emerald-200 flex items-center justify-center shrink-0 transition" title="Eliminar ticket">
                                        <i class="fa-solid fa-trash-can text-[11px]"></i>
                                    </button>
                                </div>
                            `).join('')}
                           </div>`
                        : `<p class="text-[11px] text-slate-400 text-center py-2">Aún no has subido tickets para este evento.</p>`}
                </div>
            </div>
        `;
    }).join('');
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
