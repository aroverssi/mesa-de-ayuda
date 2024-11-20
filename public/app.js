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
const mesSelect = document.getElementById("kpiMes");
const anioSelect = document.getElementById("kpiAnio");

if (mesSelect && anioSelect) {
    mesSelect.addEventListener("change", calcularKpiMensual);
    anioSelect.addEventListener("change", calcularKpiMensual);
}


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

    document.getElementById("kpiMes").addEventListener("change", calcularKpiMensual);
    document.getElementById("kpiAnio").addEventListener("change", calcularKpiMensual);

    document.getElementById("downloadKpiPdf").addEventListener("click", descargarKpiPdf);
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

// Función para cargar tickets con filtros y paginación
async function cargarPagina(isAdmin, direction = "next") {
    const ticketTable = isAdmin
        ? document.getElementById("ticketTableAdmin").getElementsByTagName("tbody")[0]
        : document.getElementById("ticketTableUser").getElementsByTagName("tbody")[0];

    ticketTable.innerHTML = `<tr><td colspan="${isAdmin ? 12 : 7}" class="text-center">Cargando...</td></tr>`;

    const estadoFiltro = document.getElementById(isAdmin ? "adminFilterStatus" : "userFilterStatus")?.value || "";
    const companyFiltro = document.getElementById(isAdmin ? "adminFilterCompany" : "userFilterCompany")?.value || "";
    const fechaInicioFiltro = document.getElementById(isAdmin ? "adminFilterStartDate" : "userFilterStartDate")?.value || "";
    const fechaFinalFiltro = document.getElementById(isAdmin ? "adminFilterEndDate" : "userFilterEndDate")?.value || "";

    let consulta = collection(db, "tickets");
    const filtros = [];

    if (estadoFiltro) filtros.push(where("estado", "==", estadoFiltro));
    if (companyFiltro) filtros.push(where("company", "==", companyFiltro));
    if (fechaInicioFiltro) filtros.push(where("fechaApertura", ">=", new Date(fechaInicioFiltro)));
    if (fechaFinalFiltro) filtros.push(where("fechaApertura", "<=", new Date(fechaFinalFiltro)));

    consulta = query(consulta, ...filtros, orderBy("fechaApertura", "asc"));

    try {
        if (direction === "next" && lastVisible) {
            consulta = query(consulta, startAfter(lastVisible), limit(10));
        } else if (direction === "prev" && firstVisible) {
            consulta = query(consulta, endBefore(firstVisible), limitToLast(10));
        } else {
            consulta = query(consulta, limit(10));
        }

        const snapshot = await getDocs(consulta);

        if (!snapshot.empty) {
            lastVisible = snapshot.docs[snapshot.docs.length - 1];
            firstVisible = snapshot.docs[0];

            ticketTable.innerHTML = "";
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

            document.getElementById(isAdmin ? "nextPageAdmin" : "nextPageUser").disabled = snapshot.docs.length < 10;
            document.getElementById(isAdmin ? "prevPageAdmin" : "prevPageUser").disabled = direction === "prev" && !firstVisible;
        } else {
            ticketTable.innerHTML = `<tr><td colspan="${isAdmin ? 12 : 7}" class="text-center">No hay más tickets en esta dirección.</td></tr>`;
            lastVisible = null;
            firstVisible = null;
        }
    } catch (error) {
        console.error("Error al cargar la página:", error);
    }
}

// Función para actualizar ticket
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

// Cargar estadísticas del administrador
function cargarEstadisticas() {
    const statsList = document.getElementById("adminStats");
    if (!statsList) {
        console.error("El elemento adminStats no se encuentra en el DOM.");
        return;
    }

    let totalTickets = 0,
        totalCerrados = 0,
        sumaResolucion = 0;

    onSnapshot(
        collection(db, "tickets"),
        (snapshot) => {
            if (snapshot.empty) {
                statsList.innerHTML = `<li>No hay datos disponibles para mostrar.</li>`;
                return;
            }

            totalTickets = snapshot.size;
            totalCerrados = 0;
            sumaResolucion = 0;

            snapshot.forEach((doc) => {
                const ticket = doc.data();
                if (ticket.estado === "cerrado" && ticket.fechaCierre && ticket.fechaApertura) {
                    const tiempoResolucion =
                        (ticket.fechaCierre.seconds - ticket.fechaApertura.seconds) / 3600;
                    sumaResolucion += tiempoResolucion;
                    totalCerrados++;
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
        },
        (error) => {
            console.error("Error al obtener los tickets:", error);
        }
    );
}
// Cargar estadísticas automáticamente al cambiar tickets
function activarActualizacionEnTiempoReal(isAdmin) {
    const tabla = isAdmin ? "ticketTableAdmin" : "ticketTableUser";
    const ticketTable = document.getElementById(tabla).getElementsByTagName("tbody")[0];

    onSnapshot(collection(db, "tickets"), (snapshot) => {
        ticketTable.innerHTML = "";
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
                    <td>${ticket.estado}</td>
                `
                : `
                    <td>${ticket.consecutivo}</td>
                    <td>${ticket.usuario}</td>
                    <td>${ticket.estado}</td>
                `;
            ticketTable.appendChild(row);
        });
    });
}

// Función para calcular y mostrar el KPI mensual
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

    document.getElementById("kpiMes").addEventListener("change", calcularKpiMensual);
    document.getElementById("kpiAnio").addEventListener("change", calcularKpiMensual);

    document.getElementById("downloadKpiPdf").addEventListener("click", descargarKpiPdf);
});

// Función para calcular y mostrar el KPI mensual
function calcularKpiMensual() {
    const kpiTotal = document.getElementById("kpiTotal");
    const kpiCerrados = document.getElementById("kpiCerrados");
    const kpiPromedioResolucion = document.getElementById("kpiPromedioResolucion");
    const kpiPorcentajeCerrados = document.getElementById("kpiPorcentajeCerrados");

    const mesSeleccionado = parseInt(document.getElementById("kpiMes")?.value);
    const anioSeleccionado = parseInt(document.getElementById("kpiAnio")?.value);

    if (!mesSeleccionado || !anioSeleccionado) {
        console.error("Mes o año no seleccionados correctamente.");
        return;
    }

    const inicioMes = new Date(anioSeleccionado, mesSeleccionado - 1, 1);
    const finMes = new Date(anioSeleccionado, mesSeleccionado, 0);

    let totalTickets = 0;
    let ticketsCerrados = 0;
    let sumaResolucion = 0;

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

    const mesSeleccionado = document.getElementById("kpiMes").value;
    const anioSeleccionado = document.getElementById("kpiAnio").value;

    if (!mesSeleccionado || !anioSeleccionado) {
        alert("Por favor seleccione un mes y un año para generar el reporte.");
        return;
    }

    const totalTickets = document.getElementById("kpiTotal")?.textContent || "N/A";
    const ticketsCerrados = document.getElementById("kpiCerrados")?.textContent || "N/A";
    const promedioResolucion = document.getElementById("kpiPromedioResolucion")?.textContent || "N/A";
    const porcentajeCerrados = document.getElementById("kpiPorcentajeCerrados")?.textContent || "N/A";

    pdf.text(`Reporte KPI - ${mesSeleccionado}/${anioSeleccionado}`, 10, 10);
    pdf.text(`Total de Tickets: ${totalTickets}`, 10, 20);
    pdf.text(`Tickets Cerrados: ${ticketsCerrados}`, 10, 30);
    pdf.text(`Promedio de Resolución (horas): ${promedioResolucion}`, 10, 40);
    pdf.text(`% de Tickets Cerrados: ${porcentajeCerrados}`, 10, 50);

    pdf.save(`KPI_${mesSeleccionado}_${anioSeleccionado}.pdf`);
}

    // Descargar el PDF
    pdf.save(`KPI_${mesSeleccionado}_${anioSeleccionado}.pdf`);
}


    // Obtener los datos del KPI
    const kpiTotal = document.getElementById("kpiTotal").textContent;
    const kpiCerrados = document.getElementById("kpiCerrados").textContent;
    const kpiPromedioResolucion = document.getElementById("kpiPromedioResolucion").textContent;
    const kpiPorcentajeCerrados = document.getElementById("kpiPorcentajeCerrados").textContent;

    // Agregar contenido al PDF
    pdf.setFontSize(16);
    pdf.text("Reporte Mensual de KPI", 10, 10);
    pdf.setFontSize(12);
    pdf.text(`Total de Tickets: ${kpiTotal}`, 10, 30);
    pdf.text(`Tickets Cerrados: ${kpiCerrados}`, 10, 40);
    pdf.text(`Promedio de Resolución (horas): ${kpiPromedioResolucion}`, 10, 50);
    pdf.text(`% de Tickets Cerrados: ${kpiPorcentajeCerrados}`, 10, 60);


// Exportar funciones globales para acceso desde el HTML
window.actualizarTicket = actualizarTicket;
window.cargarPagina = cargarPagina;
window.descargarKpiPdf = descargarKpiPdf;




