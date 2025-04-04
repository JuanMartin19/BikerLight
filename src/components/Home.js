import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";
import "../styles/Home.css";
import axios from "axios";

const logo = "/logoweb.jpg";

// 🔍 Leer cookie por nombre
function leerCookie(nombre) {
  const cookies = document.cookie.split("; ");
  const cookie = cookies.find(row => row.startsWith(nombre + "="));
  return cookie ? cookie.split("=")[1] : null;
}

function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [chaquetas, setChaquetas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.REACT_APP_API_URL;

  // ✅ Verificar estado de suscripción y mostrar alerta bonita con Swal
  useEffect(() => {
    const verificarSuscripcion = async () => {
      try {
        // Reemplazado `api.get` por `axios.get`
        const res = await axios.get(`${apiUrl}/suscripcion-estado`, {
          headers: {
            Authorization: `Bearer ${user?.token}`,
            "Content-Type": "application/json",
          },
        });

        if (res.status !== 200) throw new Error("Error al verificar suscripción");

        const data = res.data;

        const idGuardado = localStorage.getItem("userId");
        const hoy = new Date().toISOString().split("T")[0];
        const clave = `suscripcionAlerta-${idGuardado}`;
        const ultima = leerCookie(clave);

        if (data.mensaje && idGuardado && ultima !== hoy) {
          Swal.fire({
            title: "¡Atención!",
            text: data.mensaje,
            icon: "info",
            confirmButtonText: "Aceptar",
            confirmButtonColor: "#3085d6",
            background: "#1e1e2f",
            color: "#fff"
          });

          // 🕒 Guardar cookie válida solo para hoy
          document.cookie = `${clave}=${hoy}; path=/; expires=${new Date(
            new Date().setHours(23, 59, 59, 999)
          ).toUTCString()}`;
        }
      } catch (error) {
        console.error("❌ Error al verificar suscripción:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo verificar tu suscripción",
        });
      }
    };

    if (user?.token) {
      verificarSuscripcion();
    }
  }, [user]);

  // 🔐 Verificar si el usuario está autenticado y obtener productos
  useEffect(() => {
    if (!user) {
      Swal.fire({
        icon: "warning",
        title: "Sesión requerida",
        text: "Debes iniciar sesión para acceder al catálogo.",
        confirmButtonColor: "#3085d6",
      }).then(() => {
        navigate("/login");
      });
      return;
    }

    if (user?.userId || user?.id_usuario) {
      const id = user.userId || user.id_usuario;
      localStorage.setItem("userId", id);
    }

    // Reemplazado `api.get` por `axios.get`
    axios.get(`${apiUrl}/chaquetas`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        setChaquetas(res.data); // Usamos `res.data` en lugar de `res.json()`
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al obtener chaquetas:", err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar las chaquetas.",
        });
        setLoading(false);
      });
  }, [user, navigate, logout]);

  // 🛒 Cargar carrito
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Reemplazado `api.get` por `axios.get`
    axios.get(`${apiUrl}/carrito`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        setCarrito(res.data);
      })
      .catch((err) => {
        console.error("Error al cargar carrito:", err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo cargar el carrito.",
        });
      });
  }, []);

  // ➕ Agregar producto al carrito
  const agregarAlCarrito = async (producto) => {
    try {
      // Reemplazado `api.get` por `axios.get`
      const response = await axios.post(`${apiUrl}/carrito`, 
        { id_producto: producto.id, cantidad: 1 },
        { headers: { Authorization: `Bearer ${user?.token}`, "Content-Type": "application/json" } }
      );

      if (response.status !== 200) {
        Swal.fire({
          icon: "error",
          title: "Stock insuficiente",
          text: response.data.error || "No se pudo agregar al carrito.",
        });
        return;
      }

      Swal.fire({
        icon: "success",
        title: "Producto agregado",
        text: response.data.message,
        timer: 1800,
        showConfirmButton: false,
      });

    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error del servidor",
        text: "No se pudo conectar con el servidor.",
      });
    }
  };

  const handleLogout = async () => {
    try {
      // Llamada al método de logout del contexto
      await logout();  // El logout aquí es el que proviene del contexto de AuthContext
      navigate("/login");  // Redirigir a login después de cerrar sesión
    } catch (err) {
      console.error("Error cerrando sesión:", err);
    }
  }; 

  return (
    <div className="home-container">
      <div className="home-header">
        <div className="home-header-left">
          <img src={logo} alt="Bike Light Logo" className="home-logo" />
          <h2>Catálogo de Chaquetas</h2>
        </div>
        <div className="home-header-right">
          <button className="product-button cart-button" onClick={() => navigate("/carrito")}>
            Ver Carrito ({carrito.length})
          </button>
          <button className="product-button suscripcion-button" onClick={() => navigate("/suscripcion")}>
            Suscribirme
          </button>
          <button className="product-button logout-button" onClick={handleLogout}>
            Cerrar Sesión
          </button>
          <button className="product-button historial-button" onClick={() => navigate("/historial")}>
            Perfil de usuario
          </button>
        </div>
      </div>

      {loading ? (
        <p>Cargando productos...</p>
      ) : (
        <div className="product-container">
          {chaquetas.length > 0 ? (
            chaquetas.map((chaqueta) => (
              <div key={chaqueta.id} className="product-card">
                <img
                  src={`${apiUrl}${chaqueta.Imagen}`}
                  alt={chaqueta.Modelo}
                  className="product-image"
                />
                <div className="product-info">
                  <h3 className="product-title">{chaqueta.Modelo}</h3>
                  <p className="product-price">Precio: ${chaqueta.Precio}</p>
                  <button className="product-button" onClick={() => agregarAlCarrito(chaqueta)}>
                    Agregar al Carrito
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>No hay chaquetas disponibles.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default Home;