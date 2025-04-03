import React, { useState, useEffect } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "../styles/Carrito.css";

const logo = "/logoweb.jpg";

function Carrito() {
  const navigate = useNavigate();
  const [carrito, setCarrito] = useState([]);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState("");
  const [compraExitosa, setCompraExitosa] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession"));
    if (session?.userId) {
      setUserId(session.userId);
    }

    if (!token) return;

    fetch("http://localhost:5000/carrito", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => setCarrito(data))
      .catch((err) => {
        console.error("Error al cargar carrito:", err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo cargar el carrito.",
        });
      });
  }, []);

  const actualizarCantidad = async (idProducto, nuevaCantidad) => {
    if (nuevaCantidad <= 0) return;

    try {
      const res = await fetch("http://localhost:5000/carrito", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id_producto: idProducto, cantidad: nuevaCantidad }),
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire({
          icon: "error",
          title: "Stock insuficiente",
          text: data.error || "No se pudo actualizar la cantidad.",
        });
        return;
      }

      setCarrito(carrito.map(item =>
        item.id === idProducto ? { ...item, Cantidad: nuevaCantidad } : item
      ));
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error del servidor",
        text: "Error al actualizar cantidad.",
      });
    }
  };

  const eliminarProducto = async (idProducto) => {
    try {
      await fetch(`http://localhost:5000/carrito/${idProducto}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setCarrito(carrito.filter(item => item.id !== idProducto));

      Swal.fire({
        icon: "success",
        title: "Producto eliminado",
        text: "El producto ha sido eliminado del carrito.",
        timer: 1500,
        showConfirmButton: false
      });

    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo eliminar el producto.",
      });
    }
  };

  const calcularTotal = () => {
    return carrito.reduce((total, item) => total + (item.Precio * item.Cantidad), 0).toFixed(2);
  };

  const procesarPago = async () => {
    setError("");
    const session = JSON.parse(localStorage.getItem("userSession"));
    const userId = session?.userId;

    if (!userId) {
      Swal.fire({
        icon: "warning",
        title: "Atención",
        text: "Debes iniciar sesión para pagar.",
      });
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/procesar-pago", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ productos: carrito }),
      });

      const data = await response.json();

      if (!response.ok) {
        Swal.fire({
          icon: "error",
          title: "Error al pagar",
          text: data.error || "No se pudo procesar el pago.",
        });
        return;
      }

      localStorage.removeItem(`carrito_${userId}`);
      setCarrito([]);
      setCompraExitosa(true);

      Swal.fire({
        icon: "success",
        title: "Compra exitosa",
        text: "Redirigiendo a facturación...",
        timer: 2000,
        showConfirmButton: false,
      });

      navigate("/facturacion", { state: { total: calcularTotal() } });

    } catch (error) {
      console.error("Error en la conexión:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error de conexión con el servidor.",
      });
    }
  };

  const solicitarFactura = () => {
    navigate("/facturacion", {
      state: { total: calcularTotal(), productos: carrito },
    });
  };

  const seguirComprando = () => {
    navigate("/home");
  };

  return (
    <div className="carrito-container">
      <header className="carrito-header">
        <img src={logo} alt="Bike Light Logo" className="carrito-logo" />
        <h2>Carrito de Compras</h2>
      </header>

      <div className="carrito-grid">
        {carrito.length === 0 ? (
          <p className="carrito-vacio">Tu carrito está vacío.</p>
        ) : (
          carrito.map((producto) => (
            <div key={producto.id} className="carrito-card">
              <img
                src={`http://localhost:5000${producto.Imagen}`}
                alt={producto.Modelo}
                className="carrito-producto-imagen"
              />
              <div className="carrito-producto-info">
                <h3>{producto.Modelo}</h3>
                <p>Precio: ${producto.Precio}</p>
                <p>Stock disponible: <strong>{producto.Stock}</strong></p>
                <p>Cantidad:
                  <input
                    type="number"
                    value={producto.Cantidad}
                    onChange={(e) => actualizarCantidad(producto.id, parseInt(e.target.value))}
                    min="1"
                    max={producto.Stock}
                    className="cantidad-input"
                  />
                </p>
                <button className="eliminar-button" onClick={() => eliminarProducto(producto.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="carrito-resumen">
        <h3>Resumen del Pedido</h3>
        <p>Total del Pedido: <strong>${calcularTotal()}</strong></p>
        {error && <p className="error">{error}</p>}

        {!compraExitosa ? (
          <>
            <button className="pagar-button" onClick={procesarPago}>Pagar Ahora</button>

            <div className="paypal-container">
              <PayPalScriptProvider options={{ "client-id": "AXRrxLa_QuAUX-_OQIcyHtTY4ZshASDQ0P_9SINsx9qLiAFXb6-KdHSEdSi5SGLuUKnjRfg4yDbQ0CC2" }}>
                {carrito.length > 0 ? (
                  <PayPalButtons
                    createOrder={(data, actions) => {
                      return actions.order.create({
                        purchase_units: [{ amount: { value: calcularTotal() } }],
                      });
                    }}
                    onApprove={async (data, actions) => {
                      try {
                        const details = await actions.order.capture();
                        console.log("💵 Pago capturado:", details);
                        await procesarPago();
                      } catch (err) {
                        console.error("❌ Error al capturar pago:", err);
                        Swal.fire({
                          icon: "error",
                          title: "Error con PayPal",
                          text: "No se pudo completar el pago.",
                        });
                      }
                    }}
                    onError={(err) => {
                      console.error("❌ Error en PayPal:", err);
                      Swal.fire({
                        icon: "error",
                        title: "PayPal",
                        text: "Hubo un problema al procesar el pago.",
                      });
                    }}
                  />
                ) : (
                  <p>Agrega productos al carrito para ver opciones de pago.</p>
                )}
              </PayPalScriptProvider>
            </div>

            <button className="seguir-button" onClick={seguirComprando}>Seguir Comprando</button>
          </>
        ) : (
          <div className="opciones-post-pago">
            <h3>¿Qué deseas hacer?</h3>
            <button className="facturar-button" onClick={solicitarFactura}>Solicitar Factura</button>
            <button className="seguir-button" onClick={seguirComprando}>Regresar al Home</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Carrito;