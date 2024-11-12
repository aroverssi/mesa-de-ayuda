// Importar las funciones necesarias desde el SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, increment, setDoc, onSnapshot, query, orderBy, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Rol de usuario de ejemplo; en producción, obtén este valor de Firebase Authentication
const userRole = "admin"; // Cambia a "user" para probar la vista de usuario

// Mostrar la interfaz correspondiente según el rol
if (userRole === "admin") {
    document.getElementById("adminInterface").style.display = "block";
    mostrarTickets();
    cargarEstadisticas();
} else {
    document.getElementById("userInterface").style.display = "block";
}

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

// Funcionalidad de envío de ticket
document.getElementById("ticketForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const usuario = document.getElementById("usuario").value;
    const company = document.getElementById("company").value;
    const email = document.getElementById("email").value;
    const descripcion = document.getElementById("descripcion").value;
    const teamviewer_id = document.getElementById("teamviewer_id").value;
    const password = document.getElementById("password").value;
    const imagenFile = document.getElementById("imagen").files[0];

    if (!company) {
        alert("Por favor, selecciona una compañía.");
        return;
    }

    try {
        const consecutivo = await obtenerConsecutivo();
        let imagenURL = "";

        // Subir imagen si está disponible
        if (imagenFile) {
            const storageRef = ref(getStorage(app), `tickets/${consecutivo}_${imagenFile.name}`);
            await uploadBytes(storageRef, imagenFile);
            imagenURL = await getDownloadURL(storageRef);
        }

        // Agregar el ticket a la colección "tickets" en Firestore con fecha de apertura
        await addDoc(collection(db, "tickets"), {
            usuario,
            company,
            email,
            descripcion,
            teamviewer_id,
            password,
            estado: "pendiente",
            fechaApertura: new Date(),
            fechaCierre: null, // Inicialmente null
            consecutivo,
            imagenURL
        });

        alert(`Ticket enviado con éxito. Su número de ticket es: ${consecutivo}`);
        document.getElementById("ticketForm").reset();
    } catch (error) {
        console.error("Error al enviar el ticket: ", error);
    }
});

// Función para mostrar tickets en el tablero
function mostrarTickets() {
    const ticketsRef = collection(db, "tickets");
    const ticketTable = document.getElementById("ticketTable").getElementsByTagName("tbody")[0];
    const statusFilter = document.getElementById("statusFilter").value;
    const dateFilter = document.getElementById("dateFilter").value;
    const companyFilter = document.getElementById("companyFilter").value;

    let q = query(ticketsRef, orderBy("fechaApertura", "asc"));

    if (statusFilter) q = query(q, where("estado", "==", statusFilter));
    if (companyFilter) q = query(q, where("company", "==", companyFilter));
    if (dateFilter) {
        const startDate = new Date(dateFilter);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        q = query(q, where("fechaApertura", ">=", startDate), where("fechaApertura", "<", endDate));
    }

    onSnapshot(q, (snapshot) => {
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
                <td>${ticket.estado === "cerrado" && ticket.fechaCierre ? new Date(ticket.fechaCierre.seconds * 1000).toLocaleString() : "En progreso"}</td>
                ${userRole === "admin" ? `<td><button class="btn btn-sm btn-primary" onclick="cambiarEstado('${doc.id}', '${ticket.estado}')">Cambiar Estado</button></td>` : ""}
            `;

            ticketTable.appendChild(row);
        });
    });
}

// Función para cambiar el estado del ticket (para el administrador)
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

// Función para cargar estadísticas en el panel del administrador
function cargarEstadisticas() {
    const statsList = document.getElementById("adminStats");
    let totalTickets = 0;
    let totalCerrados = 0;
    let sumaResolucion = 0;

    const q = query(collection(db, "tickets"));
    onSnapshot(q, (snapshot) => {
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

// Llamar a mostrarTickets inicialmente y al presionar el botón de refrescar
mostrarTickets();
