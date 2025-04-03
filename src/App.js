import React from "react"; 
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./routes/PrivateRoute";
import AdminRoute from "./routes/AdminRoute";

import Login from "./components/Login";
import Home from "./components/Home";
import Carrito from "./components/Carrito";
import Suscripcion from "./components/Suscripcion";
import Facturacion from "./components/Facturacion";
import GestionClientes from "./components/GestionUsuarios";
import Reportes from "./components/Reportes";
import GestionProductos from "./components/GestionProductos";
import Historial from "./components/Historial";
import AdminDashboard from "./components/AdminDashboard";

import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = "799338717366-eeuog3ep910664rgt981k04d9iq9630g.apps.googleusercontent.com";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router> {/* 🔁 Router primero */}
        <AuthProvider> {/* ✅ Ahora SÍ está dentro del Router */}
          <Routes>
            <Route path="/" element={<Login />} />

            {/* ✅ Rutas protegidas para Clientes */}
            <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
            <Route path="/carrito" element={<PrivateRoute><Carrito /></PrivateRoute>} />
            <Route path="/suscripcion" element={<PrivateRoute><Suscripcion /></PrivateRoute>} />
            <Route path="/facturacion" element={<PrivateRoute><Facturacion /></PrivateRoute>} />
            <Route path="/historial" element={<PrivateRoute><Historial /></PrivateRoute>} />

            {/* ✅ Rutas protegidas para Administradores */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/usuarios" element={<AdminRoute><GestionClientes /></AdminRoute>} />
            <Route path="/admin/reportes" element={<AdminRoute><Reportes /></AdminRoute>} />
            <Route path="/admin/productos" element={<AdminRoute><GestionProductos /></AdminRoute>} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AuthProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;