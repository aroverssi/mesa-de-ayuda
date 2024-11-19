// Importar las funciones necesarias desde el SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, increment, setDoc, onSnapshot, query, orderBy, where, limit, startAfter, endBefore, limitToLast, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
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

// Variables para paginación
let lastVisible = null;
let firstVisible = null;

// Manejo de la selección de rol
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("adminLogin")?.addEventListener("click", () => {
        const email = prompt("Ingrese su correo de administrador:");
        const password = prompt("Ingrese su contraseña:");

        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                document.getElementById("roleSelection").style.display = "none";
                document.getElementById("adminInterface").style.display = "block";
                cargarPagina(true, "next");
                cargarEstadisticas();
                calcularKpiMensual();
            })
            .catch((error) => {
                console.error("Error de autenticación:", error);
                alert("Credenciales incorrectas. Por favor, intente de nuevo.");
            });
    });

    document.getElementById("userLogin")?.addEventListener("click", () => {
        document.getElementById("roleSelection").style.display = "none";
        document.getElementById("userInterface").style.display = "block";
        cargarPagina(false, "next");
    });

    document.getElementById("backToUserRoleSelection")?.addEventListener("click", () => {
        document.getElementById("userInterface").style.display = "none";
        document.getElementById("roleSelection").style.display = "block";
    });

    document.getElementById("backToAdminRoleSelection")?.addEventListener("click", () => {
        document.getElementById("adminInterface").style.display = "none";
        document.getElementById("roleSelection").style.display = "block";
        auth.signOut();
    });

    document.getElementById("nextPageUser")?.addEventListener("click", () => cargarPagina(false, "next"));
    document.getElementById("prevPageUser")?.addEventListener("click", () => cargarPagina(false, "prev"));
    document.getElementById("nextPageAdmin")?.addEventListener("click", () => cargarPagina(true, "next"));
    document.getElementById("prevPageAdmin")?.addEventListener("click", () => cargarPagina(true, "prev"));

    document.getElementById("userFilterApply")?.addEventListener("click", () => {
        lastVisible = null;
        firstVisible = null;
        cargarPagina(false, "next");
    });

    document.getElementById("adminFilterApply")?.addEventListener("click", () => {
        lastVisible = null;
        firstVisible = null;
        cargarPagina(true, "next");
    });
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

// Función de envío de ticket
document.getElementById("ticketForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const usuario = document.getElementById("usuario").value;
    const company = document.getElementById("company").value;
    const email = document.getElementById("email").value;
    const descripcion = document.getElementById("descripcion").value;
    const teamviewerId = document.getElementById("teamviewer_id").value || "";
    const password = document.getElementById("password").value || "";

    const consecutivo = await obtenerConsecutivo();

    try {
        await addDoc(collection(db, "tickets"), {
            usuario,
            company,
            email,
            descripcion,
            teamviewerId,
            password,
            estado: "pendiente",
            fechaApertura: new Date(),
            fechaCierre: null,
            consecutivo,
            comentarios: ""
        });
        alert(`Ticket enviado con éxito. Su número de ticket es: ${consecutivo}`);
        document.getElementById("ticketForm").reset();
    } catch (error) {
        console.error("Error al enviar el ticket: ", error);
    }
});

// Cargar estadísticas del administrador
function cargarEstadisticas() {
    const statsList = document.getElementById("adminStats");
    let totalTickets = 0,
        totalCerrados = 0,
        sumaResolucion = 0;

    onSnapshot(collection(db, "tickets"), (snapshot) => {
        totalTickets = snapshot.size;
        totalCerrados = 0;
        sumaResolucion = 0;

        snapshot.forEach((doc) => {
            const ticket = doc.data();
            if (ticket.estado === "cerrado") {
                totalCerrados++;
                const tiempoResolucion =
                    (ticket.fechaCierre.seconds - ticket.fechaApertura.seconds) / 3600;
                sumaResolucion += tiempoResolucion;
            }
        });

        const promedioResolucion = totalCerrados
            ? (sumaResolucion / totalCerrados).toFixed(2)
            : "N/A";
        statsList.innerHTML = `
            <li>Total de Tickets: ${totalTickets}</li>
            <li>Tickets Abiertos: ${totalTickets - totalCerrados}</li>
            <li>Tickets Cerrados: ${totalCerrados}</li>
            <li>Promedio de Resolución (en horas): ${promedioResolucion}</li>
        `;
    });
}

// Exportar funciones globales para acceso desde el HTML
window.actualizarTicket = actualizarTicket;
window.cargarPagina = cargarPagina;


