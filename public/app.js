// Importar las funciones necesarias desde el SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, increment, setDoc, onSnapshot, query, orderBy, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSy...",  // Asegúrate de completar el apiKey 
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

// Función para mostrar los tickets con el menú de cambio de estado
function mostrarTickets(isAdmin) {
    const ticketTable = isAdmin ? document.getElementById("ticketTableAdmin").getElementsByTagName("tbody")[0] : document.getElementById("ticketTableUser").getElementsByTagName("tbody")[0];
    
    onSnapshot(collection(db, "tickets"), (snapshot) => {
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
        // Actualizar el estado en Firestore
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
    // Aquí va el código para enviar el correo
    // Opcional: Puedes utilizar Firebase Functions para manejar esta lógica en el servidor.
    console.log(`Enviando correo de notificación para ticket ${ticketId} con estado ${nuevoEstado}`);
}

// Event listeners para aplicar filtros
document.getElementById("userFilterApply")?.addEventListener("click", () => mostrarTickets(false));
document.getElementById("adminFilterApply")?.addEventListener("click", () => mostrarTickets(true));

// Resto de funciones y lógica aquí (sin cambios significativos)
