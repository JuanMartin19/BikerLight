import axios from "axios";

// Almacenar la URL base para evitar múltiples solicitudes
let baseURL = null;

// Función para obtener la URL base del backend
const getBackendUrl = async () => {
  if (!baseURL) {  // Solo obtenemos la URL si aún no está almacenada
    try {
      const response = await axios.get("https://bikerlight-backend.onrender.com/api/url");
      baseURL = response.data.apiUrl; // Guardamos la URL obtenida
    } catch (error) {
      console.error("Error obteniendo la URL del backend:", error);
      baseURL = null;
    }
  }
  return baseURL;
};

// Crear un objeto api que usará la URL obtenida
const api = {
  get: async (endpoint, options = {}) => {
    const base = await getBackendUrl(); // Obtener la URL dinámica del backend
    if (base) {
      return fetch(`${base}${endpoint}`, { ...options, method: "GET" });
    } else {
      console.error("Base URL no disponible");
    }
  },

  post: async (endpoint, data, options = {}) => {
    const base = await getBackendUrl();
    if (base) {
      return fetch(`${base}${endpoint}`, {
        ...options,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        body: JSON.stringify(data),
      });
    } else {
      console.error("Base URL no disponible");
    }
  },

  delete: async (endpoint, options = {}) => {
    const base = await getBackendUrl();
    if (base) {
      return fetch(`${base}${endpoint}`, { ...options, method: "DELETE" });
    } else {
      console.error("Base URL no disponible");
    }
  },
};

export default api;