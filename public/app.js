// Importar las funciones necesarias desde el SDK de Firebase
import { 
    initializeApp 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    getDoc, 
    updateDoc, 
    increment, 
    setDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    where, 
    limit, 
    startAfter, 
    endBefore, 
    limitToLast, 
    getDocs, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { 
    getAuth, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

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
    const ticketFiltro = document.getElementById(isAdmin ? "adminFilterTicket" : "userFilterTicket")?.value || "";

    let consulta = collection(db, "tickets");
    const filtros = [];

    if (estadoFiltro) filtros.push(where("estado", "==", estadoFiltro));
    if (companyFiltro) filtros.push(where("company", "==", companyFiltro));
    if (fechaInicioFiltro) filtros.push(where("fechaApertura", ">=", new Date(fechaInicioFiltro)));
    if (fechaFinalFiltro) filtros.push(where("fechaApertura", "<=", new Date(fechaFinalFiltro)));
    if (ticketFiltro) filtros.push(where("consecutivo", "==", parseInt(ticketFiltro)));

    // Orden cronológico por defecto
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
        <td>${ticket.teamviewerId || "N/A"}</td>
        <td>${ticket.password || "N/A"}</td>
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
        <td>
            <button class="btn btn-sm btn-danger mt-2" onclick="eliminarTicket('${doc.id}')">Eliminar</button>
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

// obtener consecutivo
async function obtenerConsecutivo() {
    const consecutivoRef = doc(db, "config", "consecutivoTicket");
    try {
        const docSnap = await getDoc(consecutivoRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const nuevoConsecutivo = data.consecutivo + 1;

            console.log("Consecutivo actual:", data.consecutivo);
            console.log("Nuevo consecutivo actualizado:", nuevoConsecutivo);

            // Incrementar el valor del consecutivo en Firestore
            await updateDoc(consecutivoRef, { consecutivo: nuevoConsecutivo });

            return nuevoConsecutivo;
        } else {
            console.log("El documento consecutivoTicket no existe. Inicializando...");
            // Si no existe, inicializar el consecutivo en Firestore
            await setDoc(consecutivoRef, { consecutivo: 1 });
            return 1;
        }
    } catch (error) {
        console.error("Error al obtener el consecutivo:", error);
        throw error;
    }
}

// Manejo de la selección de rol
document.addEventListener("DOMContentLoaded", () => {
    // Configurar el mes y año actuales como valores predeterminados
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1; // getMonth() devuelve 0-11
    const anioActual = fechaActual.getFullYear();
    document.getElementById("kpiMes").value = mesActual.toString();
    document.getElementById("kpiAnio").value = anioActual.toString();


    // Login para administrador
    document.getElementById("adminLogin")?.addEventListener("click", async () => {
        const email = prompt("Ingrese su correo de administrador:");
        const password = prompt("Ingrese su contraseña:");

        try {
            await signInWithEmailAndPassword(auth, email, password);
            document.getElementById("roleSelection").style.display = "none";
            document.getElementById("adminInterface").style.display = "block";

            lastVisible = null;
            firstVisible = null;
            await cargarPagina(true, "next");
            cargarEstadisticas(); // Llamar la función para cargar estadísticas
            
            // Asegurarse de que hay valores seleccionados antes de calcular el KPI
            if (document.getElementById("kpiMes").value && document.getElementById("kpiAnio").value && document.getElementById("kpiCompany").value) {
                calcularKpiMensual();  // Calcular el KPI solo si se seleccionan mes, año y compañía
            }
        } catch (error) {
            console.error("Error de autenticación:", error);
            alert("Credenciales incorrectas. Intente nuevamente.");
        }
    });


    // Acceso para usuario
    document.getElementById("userLogin")?.addEventListener("click", () => {
        document.getElementById("roleSelection").style.display = "none";
        document.getElementById("userInterface").style.display = "block";

        lastVisible = null;
        firstVisible = null;
        cargarPagina(false, "next");
    });

    // Botón para regresar desde usuario
    document.getElementById("backToUserRoleSelection")?.addEventListener("click", () => {
        document.getElementById("userInterface").style.display = "none";
        document.getElementById("roleSelection").style.display = "block";
    });

    // Botón para regresar desde administrador
    document.getElementById("backToAdminRoleSelection")?.addEventListener("click", () => {
        document.getElementById("adminInterface").style.display = "none";
        document.getElementById("roleSelection").style.display = "block";
    });

    // Manejador para el envío de tickets por el usuario
    document.getElementById("ticketForm")?.addEventListener("submit", async (event) => {
        event.preventDefault(); // Evitar recargar la página

        // Obtener valores del formulario
        const usuario = document.getElementById("usuario").value.trim();
        const company = document.getElementById("company").value;
        const email = document.getElementById("email").value.trim();
        const descripcion = document.getElementById("descripcion").value.trim();
        const teamviewerId = document.getElementById("teamviewer_id").value.trim();
        const password = document.getElementById("password").value.trim();

        console.log("Datos del formulario:", { usuario, company, email, descripcion });

        // Validar campos obligatorios
        if (!usuario || !company || !email || !descripcion) {
            alert("Por favor, complete todos los campos obligatorios: Nombre, Compañía, Correo Electrónico y Descripción.");
            return;
        }

        try {
            // Validar formato del correo electrónico
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert("Por favor, ingrese un correo electrónico válido.");
                return;
            }

            console.log("Validación de correo pasada.");

            // Obtener el consecutivo del ticket
            const consecutivo = await obtenerConsecutivo();
            console.log("Consecutivo obtenido:", consecutivo);

            // Crear un ticket en Firestore
            const nuevoTicket = await addDoc(collection(db, "tickets"), {
                consecutivo,
                usuario,
                company,
                email,
                descripcion,
                teamviewerId: teamviewerId || null,
                password: password || null,
                estado: "pendiente",
                fechaApertura: new Date(),
            });

            console.log("Ticket creado con éxito:", nuevoTicket.id);

            alert(`¡Ticket enviado con éxito! Número de Ticket: ${consecutivo}`);

            // Restablecer formulario después del envío
            document.getElementById("ticketForm").reset();
        } catch (error) {
            console.error("Error al enviar el ticket:", error);

            if (error.code === "permission-denied") {
                alert("No tiene permiso para enviar tickets. Por favor, contacte al administrador.");
            } else {
                alert("Hubo un problema al enviar el ticket. Inténtelo de nuevo más tarde.");
            }
        }
    });

    // Cerrar sesión del administrador
    auth.signOut();

    // Configuración de eventos para la paginación
    document.getElementById("nextPageUser")?.addEventListener("click", () => cargarPagina(false, "next"));
    document.getElementById("prevPageUser")?.addEventListener("click", () => cargarPagina(false, "prev"));
    document.getElementById("nextPageAdmin")?.addEventListener("click", () => cargarPagina(true, "next"));
    document.getElementById("prevPageAdmin")?.addEventListener("click", () => cargarPagina(true, "prev"));

    // Aplicar filtros para usuario y administrador
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

    // Borrar filtros para usuario y administrador
    document.getElementById("userFilterClear")?.addEventListener("click", () => {
        limpiarFiltrosUsuario();
    });

    document.getElementById("adminFilterClear")?.addEventListener("click", () => {
        limpiarFiltrosAdmin();
    });

    // Descargar el KPI en PDF
    document.getElementById("downloadKpiPdf")?.addEventListener("click", descargarKpiPdf);
});

// Función para limpiar filtros del administrador
function limpiarFiltrosAdmin() {
    document.getElementById("adminFilterStatus").value = "";
    document.getElementById("adminFilterCompany").value = "";
    document.getElementById("adminFilterStartDate").value = "";
    document.getElementById("adminFilterEndDate").value = "";
    document.getElementById("adminFilterTicket").value = "";
    lastVisible = null;
    firstVisible = null;
    cargarPagina(true, "next"); // Recargar sin filtros
}

// Función para limpiar filtros del usuario
function limpiarFiltrosUsuario() {
    document.getElementById("userFilterStatus").value = "";
    document.getElementById("userFilterCompany").value = "";
    document.getElementById("userFilterStartDate").value = "";
    document.getElementById("userFilterEndDate").value = "";
    document.getElementById("userFilterTicket").value = "";
    lastVisible = null;
    firstVisible = null;
    cargarPagina(false, "next"); // Recargar sin filtros
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

// función eliminarTicket
async function eliminarTicket(ticketId) {
    try {
        const confirmacion = confirm("¿Estás seguro de que deseas eliminar este ticket?");
        if (!confirmacion) return;

        // Eliminar el documento del ticket en la base de datos
        await deleteDoc(doc(db, "tickets", ticketId));

        alert("Ticket eliminado con éxito.");
        cargarPagina(true, "next"); // Recargar la tabla
    } catch (error) {
        console.error("Error al eliminar el ticket: ", error);
        alert("Hubo un problema al intentar eliminar el ticket.");
    }
}

// Función para cargar estadísticas del administrador
function cargarEstadisticas() {
    const statsList = document.getElementById("adminStats");
    if (!statsList) {
        console.error("El elemento adminStats no se encuentra en el DOM.");
        return;
    }

    let totalTickets = 0,
        totalCerrados = 0,
        sumaResolucion = 0;

    // Consultamos los tickets en tiempo real
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

// Función para calcular y mostrar el KPI mensual
function calcularKpiMensual() {
    const kpiTotal = document.getElementById("kpiTotal");
    const kpiCerrados = document.getElementById("kpiCerrados");
    const kpiPromedioResolucion = document.getElementById("kpiPromedioResolucion");
    const kpiPorcentajeCerrados = document.getElementById("kpiPorcentajeCerrados");

    const mesSeleccionado = parseInt(document.getElementById("kpiMes")?.value);
    const anioSeleccionado = parseInt(document.getElementById("kpiAnio")?.value);
    const companiaSeleccionada = document.getElementById("kpiCompany")?.value;

    // Validar si el mes, año y compañía fueron seleccionados correctamente
    if (isNaN(mesSeleccionado) || isNaN(anioSeleccionado) || !companiaSeleccionada) {
        alert("Por favor selecciona un mes, un año y una compañía válidos.");
        return; // Termina la función si no se seleccionaron valores válidos
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
            where("fechaApertura", "<=", finMes),
            where("company", "==", companiaSeleccionada)
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

            // Asignar los valores calculados a los elementos del KPI
            kpiTotal.textContent = totalTickets;
            kpiCerrados.textContent = ticketsCerrados;
            kpiPromedioResolucion.textContent = promedioResolucion;
            kpiPorcentajeCerrados.textContent = `${porcentajeCerrados}%`;

            if (totalTickets === 0) {
                kpiTotal.textContent = "0";
                kpiCerrados.textContent = "0";
                kpiPromedioResolucion.textContent = "N/A";
                kpiPorcentajeCerrados.textContent = "0%";
            }
        }
    );
}

// Función para descargar el KPI en PDF
async function descargarKpiPdf() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const mesSeleccionado = document.getElementById("kpiMes").value;
    const anioSeleccionado = document.getElementById("kpiAnio").value;
    const companiaSeleccionada = document.getElementById("kpiCompany").value;

    if (!mesSeleccionado || !anioSeleccionado || !companiaSeleccionada) {
        alert("Por favor selecciona un mes, un año y una compañía para el reporte.");
        return;
    }

    const inicioMes = new Date(anioSeleccionado, mesSeleccionado - 1, 1);
    const finMes = new Date(anioSeleccionado, mesSeleccionado, 0);

    const consulta = query(
        collection(db, "tickets"),
        where("fechaApertura", ">=", inicioMes),
        where("fechaApertura", "<=", finMes),
        where("company", "==", companiaSeleccionada)
    );

    const snapshot = await getDocs(consulta);

    pdf.setFontSize(16);
    pdf.text(`Reporte Mensual de Tickets`, 10, 10);
    pdf.setFontSize(12);
    pdf.text(`Mes: ${mesSeleccionado} - Año: ${anioSeleccionado} - Compañía: ${companiaSeleccionada}`, 10, 20);
    pdf.text(`Total de Tickets: ${snapshot.size}`, 10, 30);

    // Agregar las estadísticas al reporte
    let ticketsCerrados = 0;
    let sumaResolucion = 0;
    snapshot.forEach(doc => {
        const ticket = doc.data();
        if (ticket.estado === "cerrado" && ticket.fechaCierre) {
            const tiempoResolucion = (ticket.fechaCierre.seconds - ticket.fechaApertura.seconds) / 3600;
            sumaResolucion += tiempoResolucion;
            ticketsCerrados++;
        }
    });
    const promedioResolucion = ticketsCerrados > 0 ? (sumaResolucion / ticketsCerrados).toFixed(2) : "N/A";
    const porcentajeCerrados = snapshot.size > 0 ? ((ticketsCerrados / snapshot.size) * 100).toFixed(2) : "0";
    pdf.text(`Tickets Cerrados: ${ticketsCerrados}`, 10, 40);
    pdf.text(`Promedio de Resolución (horas): ${promedioResolucion}`, 10, 50);
    pdf.text(`% de Tickets Cerrados: ${porcentajeCerrados}%`, 10, 60);

    let y = 70; // Ajuste la posición inicial para los detalles del ticket

    snapshot.forEach(doc => {
        if (y >= 280) {
            pdf.addPage();
            y = 10;
        }

        const ticket = doc.data();
        pdf.setFontSize(11);
        pdf.text(`Ticket ${ticket.consecutivo} - Usuario: ${ticket.usuario} - Estado: ${ticket.estado}`, 10, y);
        y += 6;
        pdf.text(`Correo: ${ticket.email}`, 10, y);
        y += 6;
        pdf.text(`Fecha de Inicio: ${ticket.fechaApertura.toDate().toLocaleString()}`, 10, y);
        y += 6;
        pdf.text(`Fecha de Resolución: ${ticket.fechaCierre ? ticket.fechaCierre.toDate().toLocaleString() : "Pendiente"}`, 10, y);
        y += 10;
    });

    pdf.save(`Reporte_KPI_${mesSeleccionado}_${anioSeleccionado}_${companiaSeleccionada}.pdf`);
}


function calculateAverageResolutionTime(snapshot) {
    const resolvedTickets = snapshot.docs.filter(doc => doc.data().estado === "cerrado" && doc.data().fechaCierre);
    const totalResolutionTime = resolvedTickets.reduce((total, doc) => {
        const ticket = doc.data();
        const resolutionTime = (ticket.fechaCierre.seconds - ticket.fechaApertura.seconds) / 3600;
        return total + resolutionTime;
    }, 0);
    return (totalResolutionTime / resolvedTickets.length).toFixed(2);
}

function calculateClosurePercentage(snapshot) {
    const totalTickets = snapshot.size;
    const closedTickets = snapshot.docs.filter(doc => doc.data().estado === "cerrado").length;
    return ((closedTickets / totalTickets) * 100).toFixed(2);
}



// Asegurarse de que los eventos de recalcular el KPI cuando cambian los campos de mes, año o compañía sean activos
document.getElementById("kpiMes")?.addEventListener("change", calcularKpiMensual);
document.getElementById("kpiAnio")?.addEventListener("change", calcularKpiMensual);
document.getElementById("kpiCompany")?.addEventListener("change", calcularKpiMensual);

// Exportar funciones globales para acceso desde el HTML
window.actualizarTicket = actualizarTicket;
window.cargarPagina = cargarPagina;
window.descargarKpiPdf = descargarKpiPdf;
window.eliminarTicket = eliminarTicket;


















