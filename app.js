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
// 1. ANIMACIÓN DEL PANEL DESLIZANTE & MOSTRAR CONTRASEÑA
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

let currentUserDisplay = '';
let eventsList = [];
let unsubscribeEvents = null;

const STEPS_LABELS = {
    1: '1. Solicitud / Alta Marca',
    2: '2. Validación SPEI (Ops)',
    3: '3. Dispersión SPEI Realizada',
    4: '4. Ejecución Evento Fin Sem.',
    5: '5. Carga Comprobantes Marca',
    6: '6. Facturación Retailer',
    7: '7. Conciliación AMEX (Finanzas)',
    8: '8. Cierre Contable Completado'
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
// 2. INICIAR SESIÓN CON GOOGLE
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
                creadoEn: new Date().toISOString()
            });
        }
    } catch (error) {
        showLoginAlert(traducirErrorFirebase(error.code), false);
    } finally {
        btnGoogle.disabled = false;
    }
});

// =========================================================
// 3. INICIAR SESIÓN CON CORREO Y CONTRASEÑA
// =========================================================
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

// =========================================================
// 4. OLVIDÉ MI CONTRASEÑA
// =========================================================
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

// =========================================================
// 5. REGISTRO (SOLO CORREO Y CONTRASEÑA)
// =========================================================
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const alertBox = document.getElementById('regAlert');
    const btn = document.getElementById('btnRegSubmit');

    alertBox.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Registrando...';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "usuarios", userCredential.user.uid), {
            email: email,
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

// =========================================================
// 6. DETECTOR DE SESIÓN ACTIVA
// =========================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserDisplay = user.displayName || user.email;
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('dashboardScreen').classList.remove('hidden');
        document.getElementById('activeUserLabel').textContent = currentUserDisplay;
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
// 7. SINCRONIZACIÓN DE EVENTOS EN FIRESTORE
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

window.openNewEventModal = () => document.getElementById('newEventModal').classList.remove('hidden');
window.closeNewEventModal = () => document.getElementById('newEventModal').classList.add('hidden');

document.getElementById('newEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newEv = {
        id: 'ELC-' + Math.floor(100 + Math.random() * 900),
        brand: document.getElementById('evBrand').value,
        store: document.getElementById('evStore').value.trim(),
        executive: currentUserDisplay,
        amount: Number(document.getElementById('evAmount').value),
        step: 1,
        creadoEn: new Date().toISOString()
    };

    await addDoc(collection(db, "eventos_elc"), newEv);
    e.target.reset();
    window.closeNewEventModal();
});

window.advanceStep = async (index) => {
    const ev = eventsList[index];
    if (!ev || ev.step >= 8 || !ev.docId) return;
    await updateDoc(doc(db, "eventos_elc", ev.docId), { step: ev.step + 1 });
};

// =========================================================
// 8. RENDERIZADO DE KPIs Y TABLA
// =========================================================
window.renderApp = () => {
    const selectedBrand = document.getElementById('filterBrand').value;
    const filtered = eventsList.filter(ev => selectedBrand === 'ALL' || ev.brand === selectedBrand);

    document.getElementById('kpiTotal').textContent = filtered.length;
    document.getElementById('kpiSpei').textContent = filtered.filter(e => e.step === 2 || e.step === 3).length;
    document.getElementById('kpiFactura').textContent = filtered.filter(e => e.step === 5 || e.step === 6).length;
    document.getElementById('kpiAmex').textContent = filtered.filter(e => e.step === 7 || e.step === 8).length;
    
    const totalBudget = filtered.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    document.getElementById('kpiBudget').textContent = '$' + totalBudget.toLocaleString('es-MX');

    const tbody = document.getElementById('eventsTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">No hay eventos registrados aún. Haz clic en <b>Nuevo Evento</b> para comenzar.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((ev, idx) => `
        <tr class="hover:bg-slate-50 transition">
            <td class="py-3.5 px-3">
                <span class="font-bold text-slate-900 block">${ev.id}</span>
                <span class="text-[11px] text-blue-600 font-semibold">${ev.brand}</span>
            </td>
            <td class="py-3.5 px-3 font-medium text-slate-700">${ev.store}</td>
            <td class="py-3.5 px-3 text-slate-500">${ev.executive}</td>
            <td class="py-3.5 px-3 font-semibold text-slate-900">$${Number(ev.amount).toLocaleString('es-MX')}</td>
            <td class="py-3.5 px-3">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                    ${STEPS_LABELS[ev.step] || 'Paso ' + ev.step}
                </span>
            </td>
            <td class="py-3.5 px-3 text-right">
                ${ev.step < 8 
                    ? `<button onclick="advanceStep(${idx})" class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-[11px] font-semibold transition">Avanzar Paso →</button>`
                    : `<span class="text-emerald-600 font-bold text-[11px]"><i class="fa-solid fa-circle-check"></i> Cerrado</span>`
                }
            </td>
        </tr>
    `).join('');
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
