import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSy...8zDW95o",
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
const auth = getAuth(app);

// Verificar el estado de autenticación y mostrar la interfaz correspondiente
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const uid = user.uid;
        const roleDoc = await getDoc(doc(db, "roles", uid));

        if (roleDoc.exists()) {
            const userRole = roleDoc.data().role;
            if (userRole === "admin") {
                document.getElementById("adminInterface").style.display = "block";
                mostrarTickets(); // Cargar los tickets para el administrador
                cargarEstadisticas(); // Cargar estadísticas para el administrador
            } else {
                document.getElementById("userInterface").style.display = "block";
            }
        } else {
            console.log("El documento de rol no existe para el usuario.");
        }
    } else {
        console.log("No hay usuario autenticado.");
        // Redirigir al usuario a la pantalla de inicio de sesión si no está autenticado
        document.getElementById("loginForm").style.display = "block";
    }
});
