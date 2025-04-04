import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/GestionProductos.css";
import Swal from "sweetalert2";
import axios from "axios";  // Asegúrate de importar axios

const GestionProductos = () => {
  const [productos, setProductos] = useState([]);
  const [formData, setFormData] = useState({
    id_producto: null,
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
    categoria: "",
    imagen: "",
  });
  const [modoEdicion, setModoEdicion] = useState(false);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // Obtener la URL base de la API
  const apiUrl = process.env.REACT_APP_API_URL;

  const fetchProductos = async () => {
    try {
      const res = await api.get(`${apiUrl}/admin/productos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setProductos(data);
    } catch (error) {
      console.error("Error al obtener productos:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar los productos.",
      });
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = modoEdicion
      ? `${apiUrl}/admin/productos/${formData.id_producto}`
      : `${apiUrl}/admin/productos`;
    const method = modoEdicion ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "¡Éxito!",
          text: data.message,
        });
        resetForm();
        fetchProductos();
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.error || "No se pudo guardar el producto.",
        });
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ocurrió un error al guardar el producto.",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      id_producto: null,
      nombre: "",
      descripcion: "",
      precio: "",
      stock: "",
      categoria: "",
      imagen: "",
    });
    setModoEdicion(false);
  };

  const handleEditar = (producto) => {
    setFormData(producto);
    setModoEdicion(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEliminar = async (id) => {
    const result = await Swal.fire({
      title: "¿Eliminar producto?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e74c3c",
      cancelButtonColor: "#aaa",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${apiUrl}/admin/productos/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Eliminado",
          text: data.message,
        });
        fetchProductos();
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.error || "No se pudo eliminar el producto.",
        });
      }
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error al eliminar producto.",
      });
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    const formDataFile = new FormData();
    formDataFile.append("imagen", file);

    try {
      const res = await api.get(`${apiUrl}/admin/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataFile,
      });

      const data = await res.json();
      if (res.ok) {
        setFormData((prev) => ({ ...prev, imagen: data.url }));
        Swal.fire({
          icon: "success",
          title: "Imagen subida",
          text: "La imagen se subió correctamente.",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.error,
        });
      }
    } catch (error) {
      console.error("Error al subir imagen:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo subir la imagen.",
      });
    }
  };

  return (
    <div className="gestion-productos">
      <h2>📦 {modoEdicion ? "Editar Producto" : "Agregar Producto"}</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="nombre"
          placeholder="Nombre del producto"
          value={formData.nombre}
          onChange={handleChange}
          required
        />
        <textarea
          name="descripcion"
          placeholder="Descripción"
          value={formData.descripcion}
          onChange={handleChange}
        />
        <input
          type="number"
          name="precio"
          placeholder="Precio"
          value={formData.precio}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="stock"
          placeholder="Stock"
          value={formData.stock}
          onChange={handleChange}
          required
        />
        <select
          name="categoria"
          value={formData.categoria}
          onChange={handleChange}
          required
        >
          <option value="">Selecciona una categoría</option>
          <option value="CHAQUETA INTELIGENTE">CHAQUETA INTELIGENTE</option>
          <option value="ACCESORIOS">ACCESORIOS</option>
        </select>

        <label>Subir Imagen:</label>
        <input type="file" accept="image/*" onChange={handleUpload} required={!modoEdicion} />

        {formData.imagen && (
          <div className="preview">
            <img src={`${apiUrl}${formData.imagen}`} alt="preview" width="120" />
          </div>
        )}

        <button type="submit">
          {modoEdicion ? "Guardar Cambios" : "Agregar Producto"}
        </button>
        {modoEdicion && <button type="button" onClick={resetForm}>Cancelar</button>}
      </form>

      <h3>📋 Lista de Productos</h3>
      <button className="volver-dashboard" onClick={() => navigate("/admin")}>
        ⬅️ Volver al Dashboard
      </button>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Categoría</th>
            <th>Imagen</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr key={p.id_producto}>
              <td>{p.id_producto}</td>
              <td>{p.nombre}</td>
              <td>${p.precio}</td>
              <td>{p.stock}</td>
              <td>{p.categoria}</td>
              <td>
                {p.imagen && (
                  <img
                    src={`${apiUrl}${p.imagen}`}
                    alt={p.nombre}
                    width="70"
                  />
                )}
              </td>
              <td>
                <button onClick={() => handleEditar(p)}>✏️</button>
                <button onClick={() => handleEliminar(p.id_producto)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GestionProductos;