import { createContext, useContext, useEffect, useState } from "react";
import api from '../components/api';

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

  const logout = async () => {
    const token = localStorage.getItem("token");
    try {
      if (token) {
        await api.get("/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      }
    } catch (error) {
      console.error("Error al cerrar sesión en el backend:", error);
    }
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);