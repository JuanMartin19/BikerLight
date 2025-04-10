import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCoy2cgOJKF3Ldcd_TYFziOlC1z2NK3Xac",
  authDomain: "bikerlight-dd3e6.firebaseapp.com",
  databaseURL: "https://bikerlight-dd3e6-default-rtdb.firebaseio.com",
  projectId: "bikerlight-dd3e6",
  storageBucket: "bikerlight-dd3e6.firebasestorage.app",
  messagingSenderId: "544162522737",
  appId: "1:544162522737:web:8c038c82009bb650661dd0",
  measurementId: "G-RB63K1Y9TN"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, get };