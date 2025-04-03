import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null; // ⏳ Mientras carga, no muestres nada

  if (!user || !user.token) return <Navigate to="/" />;

  if (user.tipo_usuario !== 0) return <Navigate to="/admin" />;

  return children;
};

export default PrivateRoute;