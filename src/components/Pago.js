import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "../styles/Pago.css";

function Pago() {
  const navigate = useNavigate();
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState("");

  // Obtener URL base desde las variables de entorno
  const apiUrl = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const carritoGuardado = JSON.parse(localStorage.getItem("carrito")) || [];
    setCarrito(carritoGuardado);
  }, []);

  const calcularTotal = () => {
    return carrito.reduce((total, item) => total + item.Precio * (item.Cantidad || 1), 0).toFixed(2);
  };

  const realizarPago = () => {
    if (!metodoPago) {
      alert("Por favor, selecciona un método de pago.");
      return;
    }

    alert(`Procesando pago con ${metodoPago}...`);

    // Llamada a la API para procesar el pago con fetch
    fetch(`${apiUrl}/procesar-pago`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ productos: carrito, metodoPago }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error);
        }
        alert("✅ Pago exitoso. Gracias por tu compra.");
        localStorage.removeItem("carrito"); // Limpiar carrito después del pago
        navigate("/home");
      })
      .catch((err) => {
        console.error("Error al procesar el pago:", err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo procesar el pago.",
        });
      });
  };

  return (
    <div className="pago-container">
      <h2>Finalizar Compra</h2>
      <div className="pago-resumen">
        <h3>Resumen del Pedido</h3>
        <p>Total a Pagar: <strong>${calcularTotal()}</strong></p>

        <h3>Método de Pago</h3>
        <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
          <option value="">Seleccione un método</option>
          <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
          <option value="PayPal">PayPal</option>
        </select>
        
        <button className="pago-button" onClick={realizarPago}>
          Pagar Ahora
        </button>
        <button className="volver-button" onClick={() => navigate("/carrito")}>
          Volver al Carrito
        </button>
      </div>
    </div>
  );
}

export default Pago;