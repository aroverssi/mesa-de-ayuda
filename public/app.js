// Importar las funciones necesarias desde el SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, increment, setDoc, onSnapshot, query, orderBy, where, limit, startAfter } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
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

// Manejo de la selección de rol
document.getElementById("adminLogin").addEventListener("click", () => {
    const email = prompt("Ingrese su correo de administrador:");
    const password = prompt("Ingrese su contraseña:");

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            document.getElementById("roleSelection").style.display = "none";
            document.getElementById("adminInterface").style.display = "block";
            mostrarTickets(true);
            cargarEstadisticas();
            calcularKpiMensual();
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

// Variables para paginación
let lastVisible = null;
const pageSize = 10;

// Función para mostrar tickets con filtros y paginación
function mostrarTickets(isAdmin) {
    const ticketTable = isAdmin ? document.getElementById("ticketTableAdmin").getElementsByTagName("tbody")[0] : document.getElementById("ticketTableUser").getElementsByTagName("tbody")[0];
    const estadoFiltro = document.getElementById(isAdmin ? "adminFilterStatus" : "userFilterStatus")?.value || "";
    const companyFiltro = document.getElementById(isAdmin ? "adminFilterCompany" : "userFilterCompany")?.value || "";
    const emailFiltro = document.getElementById("emailFilter")?.value || "";
    const fechaInicioFiltro = document.getElementById(isAdmin ? "adminFilterStartDate" : "userFilterStartDate")?.value || "";
    const fechaFinalFiltro = document.getElementById(isAdmin ? "adminFilterEndDate" : "userFilterEndDate")?.value || "";

    let consulta = collection(db, "tickets");
    const filtros = [];

    if (estadoFiltro) filtros.push(where("estado", "==", estadoFiltro));
    if (companyFiltro) filtros.push(where("company", "==", companyFiltro));
    if (emailFiltro) filtros.push(where("email", "==", emailFiltro));
    if (fechaInicioFiltro) filtros.push(where("fechaApertura", ">=", new Date(fechaInicioFiltro)));
    if (fechaFinalFiltro) filtros.push(where("fechaApertura", "<=", new Date(fechaFinalFiltro)));

    consulta = query(consulta, ...filtros, orderBy("fechaApertura", "asc"), limit(pageSize));

    if (lastVisible) {
        consulta = query(consulta, startAfter(lastVisible));
    }

    ticketTable.innerHTML = `<tr><td colspan="${isAdmin ? 12 : 7}" class="text-center">Cargando tickets...</td></tr>`;

    onSnapshot(consulta, (snapshot) => {
        ticketTable.innerHTML = "";
        if (!snapshot.empty) {
            lastVisible = snapshot.docs[snapshot.docs.length - 1];
        }
        snapshot.forEach((doc) => {
            const ticket = doc.data();
            const row = document.createElement("tr");

            row.innerHTML = isAdmin
                ? `
                    <td>${ticket.consecutivo}</td>
                    <td>${ticket.usuario}</td>
                    <td>${ticket.company}</td>
                    <td>${ticket.email}</td>
                    <td>${ticket.descripcion}</td>
                    <td>${ticket.teamviewerId}</td>
                    <td>${ticket.password}</td>
                    <td>${ticket.estado}</td>
                    <td>${new Date(ticket.fechaApertura.seconds * 1000).toLocaleString()}</td>
                    <td>${ticket.fechaCierre ? new Date(ticket.fechaCierre.seconds * 1000).toLocaleString() : "En progreso"}</td>
                    <td>${ticket.comentarios || "Sin comentarios"}</td>
                    <td>
                        <select id="estadoSelect_${doc.id}">
                            <option value="pendiente" ${ticket.estado === "pendiente" ? "selected" : ""}>Pendiente</option>
                            <option value="en proceso" ${ticket.estado === "en proceso" ? "selected" : ""}>En Proceso</option>
                            <option value="cerrado" ${ticket.estado === "cerrado" ? "selected" : ""}>Cerrado</option>
                        </select>
                        <input type="text" id="comentarios_${doc.id}" value="${ticket.comentarios || ""}" placeholder="Agregar comentario">
                        <button class="btn btn-sm btn-primary mt-2" onclick="actualizarTicket('${doc.id}')">Actualizar</button>
                    </td>
                `
                : `
                    <td>${ticket.consecutivo}</td>
                    <td>${ticket.usuario}</td>
                    <td>${ticket.company}</td>
                    <td>${ticket.email}</td>
                    <td>${ticket.descripcion}</td>
                    <td>${ticket.estado}</td>
                    <td>${ticket.comentarios || "Sin comentarios"}</td>
                `;

            ticketTable.appendChild(row);
        });
    });
}

// Función para limpiar filtros
document.getElementById("clearFilters").addEventListener("click", () => {
    document.getElementById("userFilterStatus").value = "";
    document.getElementById("userFilterCompany").value = "";
    document.getElementById("emailFilter").value = "";
    mostrarTickets(false);
});

// Actualizar KPI con mes y año
function calcularKpiMensual() {
    const kpiTotal = document.getElementById("kpiTotal");
    const kpiCerrados = document.getElementById("kpiCerrados");
    const kpiPromedioResolucion = document.getElementById("kpiPromedioResolucion");
    const kpiPorcentajeCerrados = document.getElementById("kpiPorcentajeCerrados");
    const kpiMes = document.getElementById("kpiMes");

    let totalTickets = 0;
    let ticketsCerrados = 0;
    let sumaResolucion = 0;

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    onSnapshot(query(collection(db, "tickets"), where("fechaApertura", ">=", inicioMes)), (snapshot) => {
        totalTickets = snapshot.size;
        ticketsCerrados = 0;
        sumaResolucion = 0;

        snapshot.forEach((doc) => {
            const ticket = doc.data();
            if (ticket.estado === "cerrado" && ticket.fechaCierre) {
                ticketsCerrados++;
                const tiempoResolucion = 
                    (ticket.fechaCierre.seconds - ticket.fechaApertura.seconds) / 3600;
                sumaResolucion += tiempoResolucion;
            }
        });

        const promedioResolucion = ticketsCerrados ? (sumaResolucion / ticketsCerrados).toFixed(2) : "N/A";
        const porcentajeCerrados = totalTickets
            ? ((ticketsCerrados / totalTickets) * 100).toFixed(2)
            : "0";

        const mesActual = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(inicioMes);

        kpiTotal.textContent = totalTickets;
        kpiCerrados.textContent = ticketsCerrados;
        kpiPromedioResolucion.textContent = promedioResolucion;
        kpiPorcentajeCerrados.textContent = `${porcentajeCerrados}%`;
        kpiMes.textContent = mesActual;

        if (totalTickets === 0) {
            kpiTotal.textContent = "0";
            kpiCerrados.textContent = "0";
            kpiPromedioResolucion.textContent = "N/A";
            kpiPorcentajeCerrados.textContent = "0%";
        }
    });
}

// Función para descargar KPI con mes y año
document.getElementById("downloadKpiPdf").addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const mesActual = document.getElementById("kpiMes").textContent;
    const totalTickets = document.getElementById("kpiTotal").textContent;
    const ticketsCerrados = document.getElementById("kpiCerrados").textContent;
    const promedioResolucion = document.getElementById("kpiPromedioResolucion").textContent;
    const porcentajeCerrados = document.getElementById("kpiPorcentajeCerrados").textContent;

    doc.setFont("helvetica", "bold");
    doc.text(`KPI Mensual de Tickets (${mesActual})`, 10, 10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total de Tickets: ${totalTickets}`, 10, 20);
    doc.text(`Tickets Cerrados: ${ticketsCerrados}`, 10, 30);
    doc.text(`Promedio de Resolución (horas): ${promedioResolucion}`, 10, 40);
    doc.text(`% de Tickets Cerrados: ${porcentajeCerrados}`, 10, 50);

    doc.save("kpi_mensual.pdf");
    alert("El KPI mensual se ha descargado correctamente.");
});

// Exportar funciones globales para acceso desde el HTML
window.actualizarTicket = actualizarTicket;

