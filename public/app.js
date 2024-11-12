// Importar las funciones necesarias desde el SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, increment, setDoc, onSnapshot, query, orderBy, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
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

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Función para verificar el rol del usuario
async function checkUserRole(email) {
    const userDocRef = doc(db, "users", email); // Supongamos que el ID de documento es el email del usuario
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        return userDoc.data().role; // Devuelve el rol, ya sea "admin" o "user"
    } else {
        console.error("El usuario no existe en la base de datos.");
        return null;
    }
}

// Mostrar la interfaz dependiendo del rol
async function displayInterface(email) {
    const role = await checkUserRole(email);

    if (role === "admin") {
        document.getElementById("adminInterface").style.display = "block";
        document.getElementById("userInterface").style.display = "none";
        mostrarTickets(true); // Mostrar interfaz completa para administrador
    } else if (role === "user") {
        document.getElementById("adminInterface").style.display = "none";
        document.getElementById("userInterface").style.display = "block";
        mostrarTickets(false); // Mostrar solo tickets para el usuario
    } else {
        console.error("No se pudo determinar el rol del usuario.");
    }
}

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

// Funcionalidad de envío de ticket
document.getElementById("ticketForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const usuario = document.getElementById("usuario").value;
    const company = document.getElementById("company").value;
    const email = document.getElementById("email").value;
    const descripcion = document.getElementById("descripcion").value;
    const teamviewer_id = document.getElementById("teamviewer_id").value;
    const password = document.getElementById("password").value;
    const imagenFile = document.getElementById("imagen").files[0];

    if (!company) {
        alert("Por favor, selecciona una compañía.");
        return;
    }

    try {
        const consecutivo = await obtenerConsecutivo();
        let imagenURL = "";

        // Subir imagen si está disponible
        if (imagenFile) {
            const storageRef = ref(getStorage(app), `tickets/${consecutivo}_${imagenFile.name}`);
            await uploadBytes(storageRef, imagenFile);
            imagenURL = await getDownloadURL(storageRef);
        }

        // Agregar el ticket a la colección "tickets" en Firestore con fecha de apertura
        await addDoc(collection(db, "tickets"), {
            usuario,
            company,
            email,
            descripcion,
            teamviewer_id,
            password,
            estado: "pendiente",
            fechaApertura: new Date(),
            fechaCierre: null, // Inicialmente null
            consecutivo,
            imagenURL
        });

        alert(`Ticket enviado con éxito. Su número de ticket es: ${consecutivo}`);
        document.getElementById("ticketForm").reset();
    } catch (error) {
        console.error("Error al enviar el ticket: ", error);
    }
});

// Actualizar la función mostrarTickets para soportar los filtros y la interfaz del administrador
function mostrarTickets(isAdmin) {
    const ticketsRef = collection(db, "tickets");
    const ticketTable = document.getElementById("ticketTable").getElementsByTagName("tbody")[0];
    const statusFilter = document.getElementById("statusFilter").value;
    const dateFilter = document.getElementById("dateFilter").value;
    const companyFilter = document.getElementById("companyFilter").value;

    let q = query(ticketsRef, orderBy("fechaApertura", "asc"));

    // Aplicar filtros dinámicamente
    if (statusFilter) q = query(q, where("estado", "==", statusFilter));
    if (companyFilter) q = query(q, where("company", "==", companyFilter));
    if (dateFilter) {
        const startDate = new Date(dateFilter);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        q = query(q, where("fechaApertura", ">=", startDate), where("fechaApertura", "<", endDate));
    }

    // Escuchar los cambios en la colección de tickets y mostrar en orden
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
                <td>${ticket.estado === "cerrado" && ticket.fechaCierre ? new Date(ticket.fechaCierre.seconds * 1000).toLocaleString() : "En progreso"}</td>
            `;

            // Solo el administrador puede ver el botón de cambiar estado
            if (isAdmin && ticket.estado !== "cerrado") {
                const btn = document.createElement("button");
                btn.textContent = "Cerrar Ticket";
                btn.addEventListener("click", () => cerrarTicket(doc.id));
                const cell = document.createElement("td");
                cell.appendChild(btn);
                row.appendChild(cell);
            }

            ticketTable.appendChild(row);
        });
    });
}

// Función para cerrar un ticket (para administrador)
async function cerrarTicket(ticketId) {
    const ticketRef = doc(db, "tickets", ticketId);
    await updateDoc(ticketRef, {
        estado: "cerrado",
        fechaCierre: new Date()
    });
}

// Inicializar la visualización
document.addEventListener("DOMContentLoaded", () => {
    const userEmail = "correo_del_usuario"; // Asigna el correo del usuario autenticado
    displayInterface(userEmail);
});

