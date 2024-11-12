// Importar las funciones necesarias desde el SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, increment, setDoc, onSnapshot, query, orderBy, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Función para iniciar sesión y verificar el rol
function login(email, password) {
    signInWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;
            const roleDoc = await getDoc(doc(db, "roles", user.uid));
            const userRole = roleDoc.exists() ? roleDoc.data().role : "user";

            if (userRole === "admin") {
                document.getElementById("adminInterface").style.display = "block";
                mostrarTickets();
                cargarEstadisticas();
            } else {
                document.getElementById("userInterface").style.display = "block";
            }
        })
        .catch((error) => {
            console.error("Error al iniciar sesión:", error);
            alert("Error en la autenticación. Verifique sus credenciales.");
        });
}

// Verificar si el usuario está autenticado al cargar la página
onAuthStateChanged(auth, (user) => {
    if (user) {
        login(user.email, user.password);  // Llama la función login para verificar el rol
    } else {
        document.getElementById("loginForm").style.display = "block"; // Muestra formulario de login
    }
});

// Función para manejar el envío del formulario de inicio de sesión
document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("emailLogin").value;
    const password = document.getElementById("passwordLogin").value;
    login(email, password);
});

// Función para mostrar los tickets y otras funciones (mantén las funciones actuales de tu código)

