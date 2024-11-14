// Importar las funciones necesarias desde el SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, increment, setDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSy...", // Completa el apiKey
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

// Manejo de la selección de rol y autenticación de administrador
document.getElementById("adminLogin").addEventListener("click", () => {
    const adminEmail = prompt("Ingrese el correo electrónico del administrador:");
    const adminPassword = prompt("Ingrese la contraseña:");

    signInWithEmailAndPassword(auth, adminEmail, adminPassword)
        .then(async (userCredential) => {
            const uid = userCredential.user.uid;

            // Verificar si el usuario es admin en Firestore
            const roleDoc = await getDoc(doc(db, "roles", uid));
            if (roleDoc.exists() && roleDoc.data().role === "admin") {
                document.getElementById("roleSelection").style.display = "none";
                document.getElementById("adminInterface").style.display = "block";
                mostrarTickets(true); // Mostrar tickets con permisos de admin
                cargarEstadisticas();
            } else {
                alert("No tienes permisos de administrador.");
                auth.signOut(); // Cerrar sesión si no es admin
            }
        })
        .catch((error) => {
            console.error("Error en la autenticación de administrador: ", error);
            alert("Error en la autenticación. Verifique sus credenciales.");
        });
});

document.getElementById("userLogin").addEventListener("click", () => {
    document.getElementById("roleSelection").style.display = "none";
    document.getElementById("userInterface").style.display = "block";
    mostrarTickets(false); // Mostrar tickets para usuarios normales
});

// Función para mostrar los tickets
function mostrarTickets(isAdmin) {
    const ticketsRef = collection(db, "tickets");
    const ticketTable = document.getElementById("ticketTable").getElementsByTagName("tbody")[0];

    onSnapshot(query(ticketsRef, orderBy("fechaApertura", "asc")), (snapshot) => {
        ticketTable.innerHTML = "";

        snapshot.forEach((doc) => {
            const ticket = doc.data();
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${ticket.consecutivo}</td>
                <td>${ticket.usuario}</td>
                <td>${ticket.company}</td>
                <td>${ticket.descripcion}</td>
                <td>${ticket.estado}</td>
                <td>${ticket.fechaApertura ? new Date(ticket.fechaApertura.seconds * 1000).toLocaleString() : ""}</td>
                <td>${ticket.estado === "cerrado" ? new Date(ticket.fechaCierre.seconds * 1000).toLocaleString() : "En progreso"}</td>
                ${isAdmin ? `<td><button class="btn btn-sm btn-primary" onclick="cambiarEstado('${doc.id}', '${ticket.estado}')">Cambiar Estado</button></td>` : ""}
            `;

            ticketTable.appendChild(row);
        });
    });
}

// Función para cambiar el estado del ticket (solo disponible para el administrador)
async function cambiarEstado(ticketId, estadoActual) {
    const nuevoEstado = estadoActual === "pendiente" ? "cerrado" : "pendiente";
    const fechaCierre = nuevoEstado === "cerrado" ? new Date() : null;

    try {
        await updateDoc(doc(db, "tickets", ticketId), {
            estado: nuevoEstado,
            fechaCierre: fechaCierre,
        });
        alert(`El estado del ticket ha sido actualizado a: ${nuevoEstado}`);
    } catch (error) {
        console.error("Error al cambiar el estado del ticket: ", error);
    }
}

// Función para cargar estadísticas (solo para el administrador)
function cargarEstadisticas() {
    const statsList = document.getElementById("adminStats");
    let totalTickets = 0, totalCerrados = 0, sumaResolucion = 0;

    onSnapshot(collection(db, "tickets"), (snapshot) => {
        totalTickets = snapshot.size;
        totalCerrados = 0;
        sumaResolucion = 0;

        snapshot.forEach((doc) => {
            const ticket = doc.data();
            if (ticket.estado === "cerrado") {
                totalCerrados++;
                const tiempoResolucion = (ticket.fechaCierre.seconds - ticket.fechaApertura.seconds) / 3600;
                sumaResolucion += tiempoResolucion;
            }
        });

        const promedioResolucion = totalCerrados ? (sumaResolucion / totalCerrados).toFixed(2) : "N/A";
        statsList.innerHTML = `
            <li>Total de Tickets: ${totalTickets}</li>
            <li>Tickets Abiertos: ${totalTickets - totalCerrados}</li>
            <li>Tickets Cerrados: ${totalCerrados}</li>
            <li>Promedio de Resolución (en horas): ${promedioResolucion}</li>
        `;
    });
}
