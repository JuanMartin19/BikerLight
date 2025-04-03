import { Navigate } from "react-router-dom"; 
import { useAuth } from "../context/AuthContext";

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user || !user.token) return <Navigate to="/" />;
  if (user.tipo_usuario !== 1) return <Navigate to="/home" />;

  return children;
};

export default AdminRoute;