// Importar las funciones necesarias desde el SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, increment, setDoc, onSnapshot, query, orderBy, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
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

// Inicializar Firebase, Firestore, Storage y Auth
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Manejo de la selección de rol
document.getElementById("adminLogin").addEventListener("click", () => {
    const email = prompt("Ingrese su correo de administrador:");
    const password = prompt("Ingrese su contraseña:");

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            document.getElementById("roleSelection").style.display = "none";
            document.getElementById("adminInterface").style.display = "block";
            mostrarTickets(true);
            cargarEstadisticas();
        })
        .catch((error) => {
            console.error("Error de autenticación:", error);
            alert("Credenciales incorrectas. Por favor, intente de nuevo.");
        });
});

document.getElementById("userLogin").addEventListener("click", () => {
    document.getElementById("roleSelection").style.display = "none";
    document.getElementById("userInterface").style.display = "block";
    mostrarTickets(false);
});

// Botón para regresar a la selección de roles
document.getElementById("backToUserRoleSelection").addEventListener("click", () => {
    document.getElementById("userInterface").style.display = "none";
    document.getElementById("roleSelection").style.display = "block";
});

document.getElementById("backToAdminRoleSelection").addEventListener("click", () => {
    document.getElementById("adminInterface").style.display = "none";
    document.getElementById("roleSelection").style.display = "block";
    auth.signOut();
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
    const telefono = document.getElementById("telefono").value || "";
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
            telefono,
            estado: "pendiente",
            fechaApertura: new Date(),
            fechaCierre: null,
            consecutivo,
            imagenURL,
            comentarios: ""
        });

        enviarNotificacionCorreo(email, usuario, descripcion, teamviewerId, password, telefono);

        alert(`Ticket enviado con éxito. Su número de ticket es: ${consecutivo}`);
        document.getElementById("ticketForm").reset();
    } catch (error) {
        console.error("Error al enviar el ticket: ", error);
    }
});

// Función para enviar notificación por correo con nuevos campos
async function enviarNotificacionCorreo(email, usuario, descripcion, teamviewerId, password, telefono) {
    console.log(`Enviando correo a: ${email}`);
    console.log(`Nombre: ${usuario}`);
    console.log(`Descripción: ${descripcion}`);
    console.log(`TeamViewer ID: ${teamviewerId}, Contraseña: ${password}`);
    console.log(`Teléfono/Extensión: ${telefono}`);
}

// Función para mostrar los tickets con filtros y orden cronológico
function mostrarTickets(isAdmin) {
    const ticketTable = isAdmin ? document.getElementById("ticketTableAdmin").getElementsByTagName("tbody")[0] : document.getElementById("ticketTableUser").getElementsByTagName("tbody")[0];

    const estadoFiltro = document.getElementById(isAdmin ? "adminFilterStatus" : "userFilterStatus")?.value || "";
    const companyFiltro = document.getElementById(isAdmin ? "adminFilterCompany" : "userFilterCompany")?.value || "";
    const fechaFiltro = document.getElementById(isAdmin ? "adminFilterDate" : "userFilterDate")?.value || "";

    let consulta = collection(db, "tickets");
    const filtros = [];

    if (estadoFiltro) filtros.push(where("estado", "==", estadoFiltro));
    if (companyFiltro) filtros.push(where("company", "==", companyFiltro));
    if (fechaFiltro) filtros.push(where("fechaApertura", ">=", new Date(fechaFiltro)));

    filtros.push(orderBy("fechaApertura", "asc"));
    consulta = query(consulta, ...filtros);

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
                <td>${ticket.comentarios || "Sin comentarios"}</td>
                ${
                    isAdmin 
                    ? `<td>
                          <select id="estadoSelect_${doc.id}">
                              <option value="pendiente" ${ticket.estado === "pendiente" ? "selected" : ""}>Pendiente</option>
                              <option value="en proceso" ${ticket.estado === "en proceso" ? "selected" : ""}>En Proceso</option>
                              <option value="cerrado" ${ticket.estado === "cerrado" ? "selected" : ""}>Cerrado</option>
                          </select>
                          <input type="text" id="comentarios_${doc.id}" value="${ticket.comentarios || ""}" placeholder="Agregar comentario">
                          <button class="btn btn-sm btn-primary mt-2" onclick="actualizarTicket('${doc.id}')">Actualizar</button>
                       </td>` 
                    : ""
                }
            `;

            ticketTable.appendChild(row);
        });
    });
}

// Función para actualizar el estado y los comentarios en Firebase
async function actualizarTicket(ticketId) {
    const nuevoEstado = document.getElementById(`estadoSelect_${ticketId}`).value;
    const nuevoComentario = document.getElementById(`comentarios_${ticketId}`).value;
    const fechaCierre = nuevoEstado === "cerrado" ? new Date() : null;

    try {
        await updateDoc(doc(db, "tickets", ticketId), {
            estado: nuevoEstado,
            comentarios: nuevoComentario,
            fechaCierre: fechaCierre,
        });

        alert(`Ticket actualizado con éxito.`);
    } catch (error) {
        console.error("Error al actualizar el ticket: ", error);
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

// Exportar funciones globales para acceso desde el HTML
window.actualizarTicket = actualizarTicket;
