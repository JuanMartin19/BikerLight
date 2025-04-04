import axios from "axios";

// Función para obtener la URL base del backend
const getBackendUrl = async () => {
  try {
    const response = await axios.get("https://bikerlight-backend.onrender.com/api/url");
    return response.data.apiUrl; // Devuelve la URL configurada en el backend
  } catch (error) {
    console.error("Error obteniendo la URL del backend:", error);
    return null;
  }
};

const api = {
  get: async (endpoint, options = {}) => {
    const baseURL = await getBackendUrl();
    if (baseURL) {
      return fetch(`${baseURL}${endpoint}`, { ...options, method: "GET" });
    } else {
      console.error("Base URL no disponible");
    }
  },
  post: async (endpoint, data, options = {}) => {
    const baseURL = await getBackendUrl();
    if (baseURL) {
      return fetch(`${baseURL}${endpoint}`, {
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
    const baseURL = await getBackendUrl();
    if (baseURL) {
      return fetch(`${baseURL}${endpoint}`, { ...options, method: "DELETE" });
    } else {
      console.error("Base URL no disponible");
    }
  },
};

export default api;
