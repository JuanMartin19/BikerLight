// src/components/AdminDashboard.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "../styles/AdminDashboard.css";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [agotados, setAgotados] = useState([]);

  useEffect(() => {
    if (!user || user.tipo_usuario !== 1) {
      navigate("/login");
      return;
    }

    const token = localStorage.getItem("token");

    // Verificar productos con stock agotado
    fetch("http://localhost:5000/admin/alertas-stock", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.agotados && data.agotados.length > 0) {
          setAgotados(data.agotados);

          Swal.fire({
            icon: "warning",
            title: "⚠️ Stock Agotado",
            html: `
              <p>Hay <strong>${data.agotados.length}</strong> producto(s) sin stock:</p>
              <ul style="text-align: left;">
                ${data.agotados
                  .map((prod) => `<li><strong>${prod.nombre}</strong> (ID: ${prod.id_producto})</li>`)
                  .join("")}
              </ul>
            `,
            confirmButtonColor: "#e74c3c",
            confirmButtonText: "Entendido",
          });
        }
      })
      .catch((err) => {
        console.error("❌ Error al obtener alertas de stock:", err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo verificar el stock.",
        });
      });
  }, [user, navigate]);

  const cerrarSesion = () => {
    Swal.fire({
      title: "¿Cerrar sesión?",
      text: "¿Estás seguro de que deseas salir del panel de administrador?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, cerrar sesión",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e74c3c",
      cancelButtonColor: "#aaa",
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
      }
    });
  };

  return (
    <div className="admin-dashboard">
      <h1>🛠️ Panel de Administración</h1>
      <p className="subtitulo">Bienvenido administrador, gestiona los módulos disponibles.</p>

      {agotados.length > 0 && (
        <div className="alerta-stock">
          ⚠️ Hay {agotados.length} producto(s) con stock agotado.
          <ul>
            {agotados.map((prod) => (
              <li key={prod.id_producto}>
                <strong>{prod.nombre}</strong> (ID: {prod.id_producto})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="admin-buttons">
        <button onClick={() => navigate("/admin/productos")}>
          📦 Gestionar Productos
        </button>
        <button onClick={() => navigate("/admin/usuarios")}>
          👤 Gestionar Usuarios
        </button>
        <button onClick={() => navigate("/admin/reportes")}>
          📊 Ver Reportes
        </button>
      </div>

      <button className="logout-btn" onClick={cerrarSesion}>
        🔓 Cerrar Sesión
      </button>
    </div>
  );
};

export default AdminDashboard;