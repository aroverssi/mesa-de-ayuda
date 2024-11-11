// Importar las funciones necesarias desde el SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, increment, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
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
    const compania = document.getElementById("compania").value;
    const email = document.getElementById("email").value;
    const descripcion = document.getElementById("descripcion").value;
    const teamviewer_id = document.getElementById("teamviewer_id").value;
    const password = document.getElementById("password").value;
    const imagenFile = document.getElementById("imagen").files[0];

    try {
        const consecutivo = await obtenerConsecutivo();
        let imagenURL = "";
  import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Función para cargar los tickets en el tablero en tiempo real
const db = getFirestore();
const ticketCollection = collection(db, "tickets");

function loadTickets() {
    onSnapshot(ticketCollection, (snapshot) => {
        const ticketTableBody = document.getElementById("ticketTable").getElementsByTagName("tbody")[0];
        ticketTableBody.innerHTML = ""; // Limpiar la tabla antes de recargar

        snapshot.forEach((doc) => {
            const ticket = doc.data();
            const row = ticketTableBody.insertRow();

            row.insertCell(0).textContent = ticket.consecutivo;
            row.insertCell(1).textContent = ticket.usuario;
            row.insertCell(2).textContent = ticket.company;
            row.insertCell(3).textContent = ticket.descripcion;
            row.insertCell(4).textContent = ticket.estado;
            row.insertCell(5).textContent = new Date(ticket.timestamp.seconds * 1000).toLocaleString();
        });
    });
}

loadTickets();
      

        // Subir imagen si está disponible
        if (imagenFile) {
            const storageRef = ref(getStorage(app), `tickets/${consecutivo}_${imagenFile.name}`);
            await uploadBytes(storageRef, imagenFile);
            imagenURL = await getDownloadURL(storageRef);
        }

        // Agregar el ticket a la colección "tickets" en Firestore
        await addDoc(collection(db, "tickets"), {
            usuario,
            compania,
            email,
            descripcion,
            teamviewer_id,
            password,
            estado: "pendiente",
            timestamp: new Date(),
            consecutivo,
            imagenURL
        });

        alert(`Ticket enviado con éxito. Su número de ticket es: ${consecutivo}`);
        document.getElementById("ticketForm").reset();
    } catch (error) {
        console.error("Error al enviar el ticket: ", error);
    }
});
