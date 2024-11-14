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

// Función para mostrar los tickets con filtros y orden cronológico
function mostrarTickets(isAdmin) {
    const ticketTable = isAdmin ? document.getElementById("ticketTableAdmin").getElementsByTagName("tbody")[0] : document.getElementById("ticketTableUser").getElementsByTagName("tbody")[0];
    
    // Obtener valores de filtro
    const estadoFiltro = document.getElementById(isAdmin ? "adminFilterStatus" : "userFilterStatus")?.value || "";
    const companyFiltro = document.getElementById(isAdmin ? "adminFilterCompany" : "userFilterCompany")?.value || "";
    const fechaFiltro = document.getElementById(isAdmin ? "adminFilterDate" : "userFilterDate")?.value || "";

    // Construir la consulta de Firestore con filtros dinámicos
    let consulta = collection(db, "tickets");
    let filtros = [];

    // Agregar filtros según los valores seleccionados
    if (estadoFiltro) filtros.push(where("estado", "==", estadoFiltro));
    if (companyFiltro) filtros.push(where("company", "==", companyFiltro));
    if (fechaFiltro) {
        const fechaInicio = new Date(fechaFiltro);
        const fechaFin = new Date(fechaFiltro);
        fechaFin.setDate(fechaFin.getDate() + 1); // Para incluir todo el día seleccionado
        filtros.push(where("fechaApertura", ">=", fechaInicio));
        filtros.push(where("fechaApertura", "<", fechaFin));
    }

    // Agregar el orden cronológico a la consulta
    filtros.push(orderBy("fechaApertura", "asc"));

    // Ejecutar la consulta con los filtros aplicados
    const consultaFinal = query(consulta, ...filtros);
    onSnapshot(consultaFinal, (snapshot) => {
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
                ${
                    isAdmin 
                    ? `<td>
                          <select id="estadoSelect_${doc.id}">
                              <option value="pendiente" ${ticket.estado === "pendiente" ? "selected" : ""}>Pendiente</option>
                              <option value="en proceso" ${ticket.estado === "en proceso" ? "selected" : ""}>En Proceso</option>
                              <option value="cerrado" ${ticket.estado === "cerrado" ? "selected" : ""}>Cerrado</option>
                          </select>
                          <button class="btn btn-sm btn-primary mt-2" onclick="ejecutarCambioEstado('${doc.id}')">Ejecutar</button>
                       </td>` 
                    : "<td></td>"
                }
            `;

            ticketTable.appendChild(row);
        });
    });
}

// Función para ejecutar el cambio de estado en Firebase y enviar notificación
async function ejecutarCambioEstado(ticketId) {
    const nuevoEstado = document.getElementById(`estadoSelect_${ticketId}`).value;
    const fechaCierre = nuevoEstado === "cerrado" ? new Date() : null;

    try {
        await updateDoc(doc(db, "tickets", ticketId), {
            estado: nuevoEstado,
            fechaCierre: fechaCierre,
        });

        alert(`Estado del ticket actualizado a: ${nuevoEstado}`);
        
        // Llamada a la función de notificación por correo
        enviarNotificacionCorreo(ticketId, nuevoEstado);

    } catch (error) {
        console.error("Error al cambiar el estado del ticket: ", error);
    }
}

// Función para enviar notificación por correo
async function enviarNotificacionCorreo(ticketId, nuevoEstado) {
    console.log(`Enviando correo de notificación para ticket ${ticketId} con estado ${nuevoEstado}`);
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

// Exportar funciones globales para acceso desde el HTML
window.ejecutarCambioEstado = ejecutarCambioEstado;
