import React, { useState, useEffect } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "../styles/Suscripcion.css";

const logo = "/logoweb.jpg";

function Suscripcion() {
  const navigate = useNavigate();
  const [duracionSeleccionada, setDuracionSeleccionada] = useState(null);
  const [token, setToken] = useState("");
  const [suscripcionActiva, setSuscripcionActiva] = useState(null);
  const [opcionesSuscripcion, setOpcionesSuscripcion] = useState([]);

  const apiUrl = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);

      api.get(`${apiUrl}/suscripciones`, {
        headers: {
          Authorization: `Bearer ${savedToken}`,
          "Content-Type": "application/json",
        },
      })
        .then((res) => res.json())
        .then((data) => setOpcionesSuscripcion(data))
        .catch((err) =>
          console.error("❌ Error al obtener suscripciones:", err)
        );

      api.get(`${apiUrl}/suscripcion-activa`, {
        headers: {
          Authorization: `Bearer ${savedToken}`,
          "Content-Type": "application/json",
        },
      })
        .then((res) => res.json())
        .then((data) => setSuscripcionActiva(data))
        .catch((err) =>
          console.error("❌ Error al consultar suscripción activa:", err)
        );
    }
  }, []);

  const pagarSuscripcion = async () => {
    if (!duracionSeleccionada) return;

    try {
      const response = await api.get(`${apiUrl}/comprar-suscripcion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tipo: duracionSeleccionada.nombre.includes("Anual")
            ? "ANUAL"
            : "MENSUAL",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Swal.fire("Error", data.error || "Error al registrar la suscripción.", "error");
        return;
      }

      await Swal.fire({
        icon: "success",
        title: "¡Suscripción exitosa!",
        text: "Tu compra fue registrada correctamente.",
        confirmButtonColor: "#28a745",
        confirmButtonText: "Aceptar",
      });

      navigate("/facturacion", {
        state: {
          total: Number(duracionSeleccionada.precio),
          tipo: "suscripcion",
        },
      });

    } catch (error) {
      console.error("Error:", error);
      Swal.fire("Error", "Error de conexión.", "error");
    }
  };

  return (
    <div className="suscripcion-container">
      <header className="suscripcion-header">
        <img src={logo} alt="Bike Light Logo" className="suscripcion-logo" />
        <h2>Plan de Suscripción</h2>
      </header>

      <div className="suscripcion-content">
        {suscripcionActiva && suscripcionActiva.activa ? (
          <div className="mensaje-suscripcion-activa">
            <h3>Ya tienes una suscripción activa</h3>
            <p>
              🕒 Tipo: <strong>{suscripcionActiva.tipo}</strong>
            </p>
            <p>
              📅 Expira en:{" "}
              <strong>{suscripcionActiva.dias_restantes} días</strong>
            </p>
          </div>
        ) : (
          <>
            <p>Selecciona un plan:</p>
            <div className="suscripcion-tabla">
              <table>
                <thead>
                  <tr>
                    <th>Duración</th>
                    <th>Precio</th>
                    <th>Método de Pago</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <select
                        value={duracionSeleccionada?.id_producto || ""}
                        onChange={(e) => {
                          const selected = opcionesSuscripcion.find(
                            (op) => op.id_producto === parseInt(e.target.value)
                          );
                          setDuracionSeleccionada(selected);
                        }}
                      >
                        <option value="">Selecciona duración</option>
                        {opcionesSuscripcion.map((op) => (
                          <option key={op.id_producto} value={op.id_producto}>
                            {op.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <p>
                        ${duracionSeleccionada && duracionSeleccionada.precio
                          ? Number(duracionSeleccionada.precio).toFixed(2)
                          : "0.00"}
                      </p>
                    </td>
                    <td>
                      {duracionSeleccionada && (
                        <>
                          <button
                            className="pago-btn"
                            onClick={pagarSuscripcion}
                          >
                            Pagar Directo
                          </button>
                          <div className="paypal">
                            <PayPalScriptProvider
                              options={{
                                "client-id":
                                  "AXRrxLa_QuAUX-_OQIcyHtTY4ZshASDQ0P_9SINsx9qLiAFXb6-KdHSEdSi5SGLuUKnjRfg4yDbQ0CC2",
                              }}
                            >
                              <PayPalButtons
                                createOrder={(data, actions) => {
                                  return actions.order.create({
                                    purchase_units: [
                                      {
                                        amount: {
                                          value: duracionSeleccionada.precio
                                            ? Number(duracionSeleccionada.precio).toFixed(2)
                                            : "0.00",
                                        },
                                      },
                                    ],
                                  });
                                }}
                                onApprove={(data, actions) => {
                                  return actions.order
                                    .capture()
                                    .then(() => {
                                      pagarSuscripcion();
                                    });
                                }}
                              />
                            </PayPalScriptProvider>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button className="volver-btn" onClick={() => navigate("/home")}>
            Volver al Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default Suscripcion;