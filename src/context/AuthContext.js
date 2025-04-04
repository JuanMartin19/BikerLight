import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";  // Asegúrate de importar axios
import Swal from "sweetalert2"; // Asegúrate de importar Swal

const apiUrl = process.env.REACT_APP_API_URL;  // Define apiUrl, si no está definido ya

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // 🧠 Importante

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession"));
    if (session?.token && session?.userId !== undefined && session?.tipo_usuario !== undefined) {
      setUser({
        token: session.token,
        userId: session.userId,
        tipo_usuario: session.tipo_usuario
      });
    } else {
      setUser(null);
    }
    setLoading(false); // ✅ Ya terminó de verificar
  }, []);

  const login = (token, userId, tipo_usuario) => {
    const sessionData = { token, userId, tipo_usuario };
    localStorage.setItem("token", token);
    localStorage.setItem("userSession", JSON.stringify(sessionData));
    setUser(sessionData);
  };

  // Función de logout
  const logout = async () => {
    try {
      // Llamar al endpoint de logout en el backend
      const token = localStorage.getItem("token");
      await axios.post(
        `${apiUrl}/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Limpiar los datos de sesión
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      Swal.fire({
        icon: "success",
        title: "Sesión cerrada",
        text: "Has cerrado sesión correctamente.",
      });
    } catch (error) {
      console.error("❌ Error al cerrar sesión:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cerrar sesión.",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);