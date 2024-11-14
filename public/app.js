// Importar las funciones necesarias desde el SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, increment, setDoc, onSnapshot, query, orderBy, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "mesa-de-ayuda-f5a6a.firebaseapp.com",
    projectId: "mesa-de-ayuda-f5a6a",
    storageBucket: "mesa-de-ayuda-f5a6a.firebasestorage.app",
    messagingSenderId: "912872235241",
    appId: "1:912872235241:web:2fcf8f473413562c931078",
    measurementId: "G-0KBEFHH7P9"
};

// Inicializar Firebase, Firestore y Storage
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Manejo de la selección de rol (sin autenticación)
document.getElementById("adminLogin").addEventListener("click", () => {
    document.getElementById("roleSelection").style.display = "none";
    document.getElementById("adminInterface").style.display = "block";
    mostrarTickets(true);  // Cargar tickets con permisos de admin
    cargarEstadisticas();
});

document.getElementById("userLogin").addEventListener("click", () => {
    document.getElementById("roleSelection").style.display = "none";
    document.getElementById("userInterface").style.display = "block";
    mostrarTickets(false);  // Cargar tickets sin permisos de admin
});

// Botón para regresar a la selección de roles
document.getElementById("backToUserRoleSelection").addEventListener("click", () => {
    document.getElementById("userInterface").style.display = "none";
    document.getElementById("roleSelection").style.display = "block";
});

document.getElementById("backToAdminRoleSelection").addEventListener("click", () => {
    document.getElementById("adminInterface").style.display = "none";
    document.getElementById("roleSelection").style.display = "block";
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
    const imagenFile = document.getElementById("imagen").files[0];

    const consecutivo = await obtenerConsecutivo();

    try {
        let imagenURL = "";
        if (imagenFile) {
            const storageRef = ref(storage, `tickets/${consecutivo}_${imagenFile.name}`);
            await uploadBytes(storageRef, imagenFile);
            imagenURL = await getDownloadURL(storageRef);
        }

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
            imagenURL
        });
        alert(`Ticket enviado con éxito. Su número de ticket es: ${consecutivo}`);
        document.getElementById("ticketForm").reset();
    } catch (error) {
        console.error("Error al enviar el ticket: ", error);
    }
});

// Función para mostrar los tickets con filtros y orden cronológico
function mostrarTickets(isAdmin) {
    const ticketTable = isAdmin ? document.getElementById("ticketTableAdmin").getElementsByTagName("tbody")[0] : document.getElementById("ticketTableUser").getElementsByTagName("tbody")[0];

    // Obtener valores de filtro
    const estadoFiltro = document.getElementById(isAdmin ? "adminFilterStatus" : "userFilterStatus")?.value || "";
    const companyFiltro = document.getElementById(isAdmin ? "adminFilterCompany" : "userFilterCompany")?.value || "";
    const fechaFiltro = document.getElementById(isAdmin ? "adminFilterDate" : "userFilterDate")?.value || "";

    // Construir la consulta de Firestore con los filtros aplicados y ordenar cronológicamente
    let consulta = query(collection(db, "tickets"), orderBy("fechaApertura", "asc"));
    if (estadoFiltro) consulta = query(consulta, where("estado", "==", estadoFiltro));
    if (companyFiltro) consulta = query(consulta, where("company", "==", companyFiltro));
    if (fechaFiltro) consulta = query(consulta, where("fechaApertura", "==", new Date(fechaFiltro)));

    onSnapshot(consulta, (snapshot) => {
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
                ${isAdmin ? `<td><button class="btn btn-sm btn-primary" onclick="cambiarEstado('${doc.id}', '${ticket.estado}')">Cambiar Estado</button></td>` : "<td></td>"}
            `;

            ticketTable.appendChild(row);
        });
    });
}

// Función para cambiar el estado del ticket
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

// Event listeners para aplicar filtros
document.getElementById("userFilterApply")?.addEventListener("click", () => mostrarTickets(false));
document.getElementById("adminFilterApply")?.addEventListener("click", () => mostrarTickets(true));
