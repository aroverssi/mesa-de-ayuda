// Importar las funciones necesarias desde el SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, increment, setDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

// Función para mostrar tickets en el tablero en orden cronológico
function mostrarTickets() {
    const ticketsRef = collection(db, "tickets");
    const ticketTable = document.getElementById("ticketTable").getElementsByTagName("tbody")[0];

    // Consulta para obtener los tickets ordenados por fechaApertura en orden ascendente
    const q = query(ticketsRef, orderBy("fechaApertura", "asc"));

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
                <td>${ticket.fechaCierre ? new Date(ticket.fechaCierre.seconds * 1000).toLocaleString() : "En progreso"}</td>
            `;

            ticketTable.appendChild(row);
        });
    });
}

// Llamar a la función para mostrar los tickets en el tablero
mostrarTickets();
