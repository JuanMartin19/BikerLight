import axios from "axios";

// Almacenar la URL base para evitar múltiples solicitudes
let baseURL = null;

// Función para obtener la URL base del backend
const getBackendUrl = async () => {
    if (!baseURL) {
      try {
        const response = await axios.get("https://bikerlight-backend.onrender.com/api/url");
        baseURL = response.data.apiUrl;
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
      const base = await getBackendUrl(); 
      if (base) {
        return axios.get(`${base}${endpoint}`, options);
      } else {
        console.error("Base URL no disponible");
      }
    },
  
    post: async (endpoint, data, options = {}) => {
      const base = await getBackendUrl();
      if (base) {
        return axios.post(`${base}${endpoint}`, data, options);
      } else {
        console.error("Base URL no disponible");
      }
    },
  
    delete: async (endpoint, options = {}) => {
      const base = await getBackendUrl();
      if (base) {
        return axios.delete(`${base}${endpoint}`, options);
      } else {
        console.error("Base URL no disponible");
      }
    },
  };  

export default api;