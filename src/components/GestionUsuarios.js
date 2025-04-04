import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/GestionUsuarios.css";
import Swal from "sweetalert2";
import axios from "axios";

const GestionClientes = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [nuevoAdmin, setNuevoAdmin] = useState({
    nombre: "",
    correo: "",
    contraseña: ""
  });

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // Obtener la URL base de la API
  const apiUrl = process.env.REACT_APP_API_URL;

  const fetchUsuarios = async () => {
    try {
      const res = await api.get(`${apiUrl}/admin/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsuarios(data);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo obtener la lista de usuarios.",
      });
    }
  };

  const cambiarRol = async (id_usuario, nuevoRol) => {
    const rolTexto = nuevoRol === 1 ? "administrador" : "cliente";

    const confirmacion = await Swal.fire({
      title: `¿Cambiar a ${rolTexto}?`,
      text: `El usuario será convertido en ${rolTexto}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, cambiar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#aaa",
    });

    if (!confirmacion.isConfirmed) return;

    try {
      const res = await fetch(`${apiUrl}/admin/usuarios/${id_usuario}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tipo_usuario: nuevoRol }),
      });

      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Rol actualizado",
          text: `El usuario ahora es ${rolTexto}.`,
        });
        fetchUsuarios();
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.error || "No se pudo cambiar el rol.",
        });
      }
    } catch (error) {
      console.error("Error al cambiar rol:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ocurrió un error al cambiar el rol.",
      });
    }
  };

  const registrarAdmin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.get(`${apiUrl}/admin/registrar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(nuevoAdmin),
      });

      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Administrador registrado",
          text: "El nuevo admin fue creado correctamente.",
        });
        setNuevoAdmin({ nombre: "", correo: "", contraseña: "" });
        fetchUsuarios();
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.error || "No se pudo registrar el administrador.",
        });
      }
    } catch (error) {
      console.error("Error al registrar admin:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ocurrió un error al registrar el administrador.",
      });
    }
  };

  const handleChange = (e) => {
    setNuevoAdmin({ ...nuevoAdmin, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  return (
    <div className="gestion-usuarios">
      <h2>👥 Gestión de Usuarios</h2>

      {/* 🔹 Formulario para registrar un nuevo admin */}
      <div className="formulario-admin">
        <h3>➕ Registrar Nuevo Administrador</h3>
        <form onSubmit={registrarAdmin}>
          <input
            type="text"
            name="nombre"
            placeholder="Nombre"
            value={nuevoAdmin.nombre}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="correo"
            placeholder="Correo"
            value={nuevoAdmin.correo}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="contraseña"
            placeholder="Contraseña"
            value={nuevoAdmin.contraseña}
            onChange={handleChange}
            required
          />
          <button type="submit">Registrar Admin</button>
        </form>
      </div>

      <h3>📋 Lista de Usuarios</h3>

      {/* 🔹 Botón para volver al dashboard */}
      <button
        className="volver-dashboard"
        onClick={() => navigate("/admin")}
      >
        ⬅️ Volver al Dashboard
      </button>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(usuarios) && usuarios.map((u) => (
            <tr key={u.id_usuario}>
              <td>{u.id_usuario}</td>
              <td>{u.nombre}</td>
              <td>{u.email}</td>
              <td>{u.tipo_usuario === 1 ? "Admin" : "Cliente"}</td>
              <td>
                {u.tipo_usuario === 0 ? (
                  <button onClick={() => cambiarRol(u.id_usuario, 1)}>Hacer Admin</button>
                ) : (
                  <button onClick={() => cambiarRol(u.id_usuario, 0)}>Hacer Cliente</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GestionClientes;