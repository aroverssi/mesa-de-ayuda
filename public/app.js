// Importar las funciones necesarias desde el SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, updateDoc, addDoc, onSnapshot, query, orderBy, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSy...",
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

// Función para verificar el rol del usuario actual
async function verificarRolAdmin(uid) {
    console.log("Verificando rol de usuario:", uid); // Depuración
    const docRef = doc(db, "roles", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() && docSnap.data().role === "admin";
}

// Función para iniciar sesión como administrador
async function iniciarSesion(email, password) {
    try {
        console.log("Intentando iniciar sesión para:", email); // Depuración
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const esAdmin = await verificarRolAdmin(user.uid);

        if (esAdmin) {
            console.log("Usuario autenticado como administrador");
            document.getElementById("roleSelection").style.display = "none";
            document.getElementById("adminInterface").style.display = "block";
            mostrarTickets(true);
            cargarEstadisticas();
        } else {
            console.log("Usuario no tiene rol de administrador");
            alert("No tienes permiso para acceder a esta sección.");
            await auth.signOut(); // Cerrar sesión si no es admin
        }
    } catch (error) {
        console.error("Error de inicio de sesión:", error.message); // Depuración
        alert("Error de inicio de sesión: " + error.message);
    }
}

// Manejo de la selección de rol
document.getElementById("adminLogin").addEventListener("click", () => {
    const email = prompt("Ingresa tu correo de administrador:");
    const password = prompt("Ingresa tu contraseña:");
    iniciarSesion(email, password);
});

document.getElementById("userLogin").addEventListener("click", () => {
    document.getElementById("roleSelection").style.display = "none";
    document.getElementById("userInterface").style.display = "block";
    mostrarTickets(false);
});

// Enviar ticket sin redirigir al usuario
document.getElementById("ticketForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
        const usuario = document.getElementById("usuario").value;
        const company = document.getElementById("company").value;
        const email = document.getElementById("email").value;
        const descripcion = document.getElementById("descripcion").value;
        const teamviewer_id = document.getElementById("teamviewer_id").value;
        const password = document.getElementById("password").value;
        const imagen = document.getElementById("imagen").files[0];

        // Subir imagen si está disponible
        let imagenUrl = "";
        if (imagen) {
            const storageRef = ref(storage, `imagenes/${imagen.name}`);
            await uploadBytes(storageRef, imagen);
            imagenUrl = await getDownloadURL(storageRef);
        }

        // Obtener el consecutivo y actualizar
        const configRef = doc(db, "config", "ticketCounter");
        await updateDoc(configRef, { count: increment(1) });
        const configSnap = await getDoc(configRef);
        const consecutivo = configSnap.data().count;

        // Crear un nuevo ticket en Firestore
        await addDoc(collection(db, "tickets"), {
            consecutivo,
            usuario,
            company,
            email,
            descripcion,
            teamviewer_id,
            password,
            imagenUrl,
            estado: "pendiente",
            fechaApertura: new Date()
        });

        alert("Ticket enviado correctamente.");
    } catch (error) {
        console.error("Error al enviar el ticket:", error);
    }
});

// Botones para regresar a la selección de roles
document.getElementById("backToUserRoleSelection").addEventListener("click", () => {
    document.getElementById("userInterface").style.display = "none";
    document.getElementById("roleSelection").style.display = "block";
});

document.getElementById("backToAdminRoleSelection").addEventListener("click", () => {
    document.getElementById("adminInterface").style.display = "none";
    document.getElementById("roleSelection").style.display = "block";
});

// Función para mostrar los tickets con filtros y orden cronológico
function mostrarTickets(isAdmin) {
    const ticketTable = isAdmin ? document.getElementById("ticketTableAdmin").getElementsByTagName("tbody")[0] : document.getElementById("ticketTableUser").getElementsByTagName("tbody")[0];
    
    // Obtener valores de filtro
    const estadoFiltro = document.getElementById(isAdmin ? "adminFilterStatus" : "userFilterStatus")?.value || "";
    const companyFiltro = document.getElementById(isAdmin ? "adminFilterCompany" : "userFilterCompany")?.value || "";
    const fechaFiltro = document.getElementById(isAdmin ? "adminFilterDate" : "userFilterDate")?.value || "";

    // Construir la consulta de Firestore con los filtros aplicados
    let consulta = collection(db, "tickets");
    const filtros = [];

    if (estadoFiltro) filtros.push(where("estado", "==", estadoFiltro));
    if (companyFiltro) filtros.push(where("company", "==", companyFiltro));
    if (fechaFiltro) filtros.push(where("fechaApertura", ">=", new Date(fechaFiltro)));

    // Añadir la ordenación por fecha de apertura
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
                ${
                    isAdmin 
                    ? `<td>
                          <select id="estadoSelect_${doc.id}">
                              <option value="pendiente" ${ticket.estado === "pendiente" ? "selected" : ""}>Pendiente</option>
                              <option value="en proceso" ${ticket.estado === "en proceso" ? "selected" : ""}>En Proceso</option>
                              <option value="cerrado" ${ticket.estado === "cerrado" ? "selected" : ""}>Cerrado</option>
                          </select>
                          <button class="btn btn-sm btn-primary mt-2" onclick="ejecutarCambioEstado('${doc.id}')">Ejecutar</button>
                       </td>` 
                    : "<td></td>"
                }
            `;

            ticketTable.appendChild(row);
        });
    });
}

// Exportar funciones globales para acceso desde el HTML
window.ejecutarCambioEstado = ejecutarCambioEstado;
