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

// Inicializar eventos cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    // Manejo de roles
    document.getElementById("adminLogin")?.addEventListener("click", loginAdmin);
    document.getElementById("userLogin")?.addEventListener("click", () => toggleView("user"));
    document.getElementById("backToUserRoleSelection")?.addEventListener("click", () => toggleView("role"));
    document.getElementById("backToAdminRoleSelection")?.addEventListener("click", () => {
        toggleView("role");
        auth.signOut();
    });

    // Eventos de paginación
    document.getElementById("nextPageUser")?.addEventListener("click", () => cargarPagina(false, "next"));
    document.getElementById("prevPageUser")?.addEventListener("click", () => cargarPagina(false, "prev"));
    document.getElementById("nextPageAdmin")?.addEventListener("click", () => cargarPagina(true, "next"));
    document.getElementById("prevPageAdmin")?.addEventListener("click", () => cargarPagina(true, "prev"));

    // Filtros
    document.getElementById("userFilterApply")?.addEventListener("click", () => aplicarFiltros(false));
    document.getElementById("adminFilterApply")?.addEventListener("click", () => aplicarFiltros(true));

    // Descarga de KPI
    document.getElementById("downloadKpiPdf")?.addEventListener("click", descargarKpiPdf);

    // Enviar ticket
    document.getElementById("ticketForm")?.addEventListener("submit", enviarTicket);
});

// Función para cambiar vistas (role, user, admin)
function toggleView(view) {
    const views = {
        role: () => {
            document.getElementById("roleSelection").style.display = "block";
            document.getElementById("userInterface").style.display = "none";
            document.getElementById("adminInterface").style.display = "none";
        },
        user: () => {
            document.getElementById("roleSelection").style.display = "none";
            document.getElementById("userInterface").style.display = "block";
        },
        admin: () => {
            document.getElementById("roleSelection").style.display = "none";
            document.getElementById("adminInterface").style.display = "block";
        }
    };
    views[view]?.();
}

// Función de login para administrador
function loginAdmin() {
    const email = prompt("Ingrese su correo de administrador:");
    const password = prompt("Ingrese su contraseña:");

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            toggleView("admin");
            cargarPagina(true, "next");
            cargarEstadisticas();
            calcularKpiMensual();
        })
        .catch((error) => {
            console.error("Error de autenticación:", error);
            alert("Credenciales incorrectas. Por favor, intente de nuevo.");
        });
}

// Función para enviar ticket
async function enviarTicket(e) {
    e.preventDefault();
    const formData = {
        usuario: document.getElementById("usuario").value,
        company: document.getElementById("company").value,
        email: document.getElementById("email").value,
        descripcion: document.getElementById("descripcion").value,
        teamviewerId: document.getElementById("teamviewer_id").value || "",
        password: document.getElementById("password").value || "",
        estado: "pendiente",
        fechaApertura: new Date(),
        fechaCierre: null,
        comentarios: ""
    };

    try {
        const consecutivo = await obtenerConsecutivo();
        formData.consecutivo = consecutivo;

        await addDoc(collection(db, "tickets"), formData);
        alert(`Ticket enviado con éxito. Su número de ticket es: ${consecutivo}`);
        document.getElementById("ticketForm").reset();
    } catch (error) {
        console.error("Error al enviar el ticket: ", error);
    }
}

// Función para obtener consecutivo de ticket
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

// Función para cargar tickets con filtros y paginación
async function cargarPagina(isAdmin, direction = "next") {
    const ticketTable = document.getElementById(isAdmin ? "ticketTableAdmin" : "ticketTableUser").getElementsByTagName("tbody")[0];
    ticketTable.innerHTML = `<tr><td colspan="${isAdmin ? 12 : 7}" class="text-center">Cargando...</td></tr>`;

    const filtros = obtenerFiltros(isAdmin);
    let consulta = query(collection(db, "tickets"), ...filtros, orderBy("fechaApertura", "asc"), limit(10));

    if (direction === "next" && lastVisible) consulta = query(consulta, startAfter(lastVisible));
    if (direction === "prev" && firstVisible) consulta = query(consulta, endBefore(firstVisible), limitToLast(10));

    try {
        const snapshot = await getDocs(consulta);

        if (!snapshot.empty) {
            lastVisible = snapshot.docs[snapshot.docs.length - 1];
            firstVisible = snapshot.docs[0];
            actualizarTablaTickets(snapshot, ticketTable, isAdmin);
        } else {
            ticketTable.innerHTML = `<tr><td colspan="${isAdmin ? 12 : 7}" class="text-center">No hay más tickets en esta dirección.</td></tr>`;
        }
    } catch (error) {
        console.error("Error al cargar la página:", error);
    }
}

// Funciones auxiliares
function obtenerFiltros(isAdmin) {
    const estadoFiltro = document.getElementById(isAdmin ? "adminFilterStatus" : "userFilterStatus")?.value || "";
    const companyFiltro = document.getElementById(isAdmin ? "adminFilterCompany" : "userFilterCompany")?.value || "";
    const filtros = [];

    if (estadoFiltro) filtros.push(where("estado", "==", estadoFiltro));
    if (companyFiltro) filtros.push(where("company", "==", companyFiltro));

    return filtros;
}

function actualizarTablaTickets(snapshot, table, isAdmin) {
    table.innerHTML = "";
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
            ${isAdmin ? `<td>${ticket.comentarios || "Sin comentarios"}</td>` : ""}
        `;
        table.appendChild(row);
    });
}

// Función para calcular KPI mensual
function calcularKpiMensual() {
    const kpiTotal = document.getElementById("kpiTotal");
    const kpiCerrados = document.getElementById("kpiCerrados");
    const kpiPromedioResolucion = document.getElementById("kpiPromedioResolucion");
    const kpiPorcentajeCerrados = document.getElementById("kpiPorcentajeCerrados");

    let totalTickets = 0;
    let ticketsCerrados = 0;
    let sumaResolucion = 0;

    const mesSeleccionado = document.getElementById("kpiMes")?.value || new Date().getMonth() + 1;
    const anioSeleccionado = document.getElementById("kpiAnio")?.value || new Date().getFullYear();

    const inicioMes = new Date(anioSeleccionado, mesSeleccionado - 1, 1);
    const finMes = new Date(anioSeleccionado, mesSeleccionado, 0);

    onSnapshot(
        query(
            collection(db, "tickets"),
            where("fechaApertura", ">=", inicioMes),
            where("fechaApertura", "<=", finMes)
        ),
        (snapshot) => {
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

            const promedioResolucion = ticketsCerrados
                ? (sumaResolucion / ticketsCerrados).toFixed(2)
                : "N/A";
            const porcentajeCerrados = totalTickets
                ? ((ticketsCerrados / totalTickets) * 100).toFixed(2)
                : "0";

            kpiTotal.textContent = totalTickets;
            kpiCerrados.textContent = ticketsCerrados;
            kpiPromedioResolucion.textContent = promedioResolucion;
            kpiPorcentajeCerrados.textContent = `${porcentajeCerrados}%`;
        }
    );
}

// Función para descargar el KPI en PDF
function descargarKpiPdf() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    // Obtener los valores del KPI desde el DOM
    const totalTickets = document.getElementById("kpiTotal")?.textContent || "N/A";
    const ticketsCerrados = document.getElementById("kpiCerrados")?.textContent || "N/A";
    const promedioResolucion = document.getElementById("kpiPromedioResolucion")?.textContent || "N/A";
    const porcentajeCerrados = document.getElementById("kpiPorcentajeCerrados")?.textContent || "N/A";

    const mesSeleccionado = document.getElementById("kpiMes")?.value || "Mes no seleccionado";
    const anioSeleccionado = document.getElementById("kpiAnio")?.value || "Año no seleccionado";

    pdf.text(`Reporte KPI - ${mesSeleccionado} ${anioSeleccionado}`, 10, 10);
    pdf.text(`Total de Tickets: ${totalTickets}`, 10, 20);
    pdf.text(`Tickets Cerrados: ${ticketsCerrados}`, 10, 30);
    pdf.text(`Promedio de Resolución (horas): ${promedioResolucion}`, 10, 40);
    pdf.text(`% de Tickets Cerrados: ${porcentajeCerrados}`, 10, 50);

    pdf.save(`KPI_${mesSeleccionado}_${anioSeleccionado}.pdf`);
}

// Exportar funciones globales
window.enviarTicket = enviarTicket;
window.cargarPagina = cargarPagina;
window.descargarKpiPdf = descargarKpiPdf;
