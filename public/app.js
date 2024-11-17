// Reagregar la función cargarEstadisticas
function cargarEstadisticas() {
    const statsList = document.getElementById("adminStats");
    let totalTickets = 0,
        totalCerrados = 0,
        sumaResolucion = 0;

    onSnapshot(collection(db, "tickets"), (snapshot) => {
        totalTickets = snapshot.size;
        totalCerrados = 0;
        sumaResolucion = 0;

        snapshot.forEach((doc) => {
            const ticket = doc.data();
            if (ticket.estado === "cerrado") {
                totalCerrados++;
                const tiempoResolucion =
                    (ticket.fechaCierre.seconds - ticket.fechaApertura.seconds) / 3600;
                sumaResolucion += tiempoResolucion;
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
    });
}

// Ajustar la función mostrarTickets
function mostrarTickets(isAdmin) {
    const ticketTable = isAdmin
        ? document.getElementById("ticketTableAdmin").getElementsByTagName("tbody")[0]
        : document.getElementById("ticketTableUser").getElementsByTagName("tbody")[0];

    const estadoFiltro = document.getElementById(isAdmin ? "adminFilterStatus" : "userFilterStatus").value || "";
    const companyFiltro = document.getElementById(isAdmin ? "adminFilterCompany" : "userFilterCompany").value || "";
    const fechaFiltro = document.getElementById(isAdmin ? "adminFilterDate" : "userFilterDate").value || "";

    let consulta = collection(db, "tickets");
    const filtros = [];

    if (estadoFiltro) filtros.push(where("estado", "==", estadoFiltro));
    if (companyFiltro) filtros.push(where("company", "==", companyFiltro));
    if (fechaFiltro) filtros.push(where("fechaApertura", ">=", new Date(fechaFiltro)));

    consulta = query(consulta, ...filtros, orderBy("fechaApertura", "asc"));

    ticketTable.innerHTML = `
        <tr>
            <td colspan="${isAdmin ? 11 : 6}" class="text-center">Cargando tickets...</td>
        </tr>
    `;

    onSnapshot(consulta, (snapshot) => {
        ticketTable.innerHTML = "";
        snapshot.forEach((doc) => {
            const ticket = doc.data();
            const row = document.createElement("tr");

            row.innerHTML = isAdmin
                ? `
                    <td>${ticket.consecutivo}</td>
                    <td>${ticket.usuario}</td>
                    <td>${ticket.company}</td>
                    <td>${ticket.descripcion}</td>
                    <td>${ticket.teamviewerId}</td>
                    <td>${ticket.password}</td>
                    <td>${ticket.estado}</td>
                    <td>${ticket.fechaApertura ? new Date(ticket.fechaApertura.seconds * 1000).toLocaleString() : ""}</td>
                    <td>${ticket.estado === "cerrado" ? new Date(ticket.fechaCierre.seconds * 1000).toLocaleString() : "Pendiente"}</td>
                    <td>${ticket.comentarios || "Sin comentarios"}</td>
                    <td>
                        <select id="estadoSelect_${doc.id}">
                            <option value="pendiente" ${ticket.estado === "pendiente" ? "selected" : ""}>Pendiente</option>
                            <option value="en proceso" ${ticket.estado === "en proceso" ? "selected" : ""}>En Proceso</option>
                            <option value="cerrado" ${ticket.estado === "cerrado" ? "selected" : ""}>Cerrado</option>
                        </select>
                        <button class="btn btn-sm btn-primary mt-2" onclick="actualizarTicket('${doc.id}')">Actualizar</button>
                    </td>
                `
                : `
                    <td>${ticket.consecutivo}</td>
                    <td>${ticket.usuario}</td>
                    <td>${ticket.company}</td>
                    <td>${ticket.descripcion}</td>
                    <td>${ticket.estado}</td>
                    <td>${ticket.comentarios || "Sin comentarios"}</td>
                `;

            ticketTable.appendChild(row);
        });
    });
}

// Exportar funciones globales
window.cargarEstadisticas = cargarEstadisticas;
window.mostrarTickets = mostrarTickets;
