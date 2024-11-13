// Función para mostrar los tickets en el tablero
function mostrarTickets() {
    const ticketsRef = collection(db, "tickets");
    const ticketTable = document.getElementById("ticketTable").getElementsByTagName("tbody")[0];

    // Consulta todos los tickets ordenados por fecha
    const q = query(ticketsRef, orderBy("fechaApertura", "asc"));

    // Escuchar cambios en tiempo real en la colección de tickets
    onSnapshot(q, (snapshot) => {
        ticketTable.innerHTML = ""; // Limpiar la tabla antes de llenarla con los datos

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
                <td>${ticket.fechaCierre ? new Date(ticket.fechaCierre.seconds * 1000).toLocaleString() : "En progreso"}</td>
                <td><button class="btn btn-sm btn-primary" onclick="cambiarEstado('${doc.id}', '${ticket.estado}')">Cambiar Estado</button></td>
            `;

            ticketTable.appendChild(row);
        });
    });
}
