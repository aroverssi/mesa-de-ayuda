// Importar las funciones necesarias desde el SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, increment, setDoc, onSnapshot, query, orderBy, where, limit } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCEy2BMfHoUk6-BPom5b7f-HThC8zDW95o",
    authDomain: "mesa-de-ayuda-f5a6a.firebaseapp.com",
    projectId: "mesa-de-ayuda-f5a6a",
    storageBucket: "mesa-de-ayuda-f5a6a.firebasestorage.app",
    messagingSenderId: "912872235241",
    appId: "1:912872235241:web:2fcf8f473413562c931078",
    measurementId: "G-0KBEFHH7P9"
};

// Inicializar Firebase, Firestore y Auth
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Manejo de roles
document.getElementById("adminLogin").addEventListener("click", () => {
    const email = prompt("Ingrese su correo de administrador:");
    const password = prompt("Ingrese su contraseña:");

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            document.getElementById("roleSelection").style.display = "none";
            document.getElementById("adminInterface").style.display = "block";
            mostrarTickets(true);
            cargarEstadisticas();
        })
        .catch((error) => {
            alert("Credenciales incorrectas. Intente de nuevo.");
            console.error("Error de autenticación:", error);
        });
});

document.getElementById("userLogin").addEventListener("click", () => {
    document.getElementById("roleSelection").style.display = "none";
    document.getElementById("userInterface").style.display = "block";
    mostrarTickets(false);
});

// Función para obtener el número de ticket consecutivo
async function obtenerConsecutivo() {
    const docRef = doc(db, "config", "consecutivoTicket");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const currentConsecutivo = docSnap.data().consecutivo;
        await updateDoc(docRef, { consecutivo: increment(1) });
        return currentConsecutivo + 1;
    } else {
        await setDoc(docRef, { consecutivo: 1 });
        return 1;
    }
}

// Función para enviar ticket
document.getElementById("ticketForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const usuario = document.getElementById("usuario").value;
    const company = document.getElementById("company").value;
    const email = document.getElementById("email").value;
    const descripcion = document.getElementById("descripcion").value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Por favor, introduzca un correo electrónico válido.");
        return;
    }

    const consecutivo = await obtenerConsecutivo();
    try {
        await addDoc(collection(db, "tickets"), {
            usuario,
            company,
            email,
            descripcion,
            estado: "pendiente",
            fechaApertura: new Date(),
            fechaCierre: null,
            consecutivo,
            comentarios: ""
        });
        alert(`Ticket enviado con éxito. Número: ${consecutivo}`);
        document.getElementById("ticketForm").reset();
    } catch (error) {
        console.error("Error al enviar el ticket: ", error);
    }
});

// Mostrar tickets en tablas
function mostrarTickets(isAdmin) {
    const ticketTable = isAdmin ? "ticketTableAdmin" : "ticketTableUser";
    const estadoFiltro = isAdmin ? "adminFilterStatus" : "userFilterStatus";
    const companyFiltro = isAdmin ? "adminFilterCompany" : "userFilterCompany";

    let consulta = query(collection(db, "tickets"), orderBy("fechaApertura", "asc"));
    const filtroEstado = document.getElementById(estadoFiltro).value;
    const filtroCompañía = document.getElementById(companyFiltro).value;

    if (filtroEstado) consulta = query(consulta, where("estado", "==", filtroEstado));
    if (filtroCompañía) consulta = query(consulta, where("company", "==", filtroCompañía));

    const tableBody = document.getElementById(ticketTable).getElementsByTagName("tbody")[0];
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center">Cargando...</td></tr>`;

    onSnapshot(consulta, (snapshot) => {
        tableBody.innerHTML = "";
        snapshot.forEach((doc) => {
            const ticket = doc.data();
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${ticket.consecutivo}</td>
                <td>${ticket.usuario}</td>
                <td>${ticket.company}</td>
                <td>${ticket.email}</td>
                <td>${ticket.descripcion}</td>
                <td>${ticket.estado}</td>
                <td>${ticket.comentarios || "Sin comentarios"}</td>
            `;
            tableBody.appendChild(row);
        });
    });
}

// Exportar funciones globales
window.mostrarTickets = mostrarTickets;
