import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import Swal from "sweetalert2";
import "../styles/Historial.css";
import { AuthContext } from "../context/AuthContext";

function Historial() {
  const [ventas, setVentas] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [editando, setEditando] = useState(false);
  const [perfilEditado, setPerfilEditado] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const ventasPorPagina = 10;
  const navigate = useNavigate();
  const intervalRef = useRef(null);
  const iotInterval = useRef(null);
  const chartRef = useRef(null);
  const chartCanvasRef = useRef(null);
  const [hayDatosIot, setHayDatosIot] = useState(false);

  const token = localStorage.getItem("token");

  const cargarVentas = async () => {
    try {
      const res = await fetch("http://localhost:5000/historial-compras", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const arrayVentas = Array.isArray(data) ? data : data.ventas || [];
      setVentas(arrayVentas);
    } catch (err) {
      console.error("Error al obtener historial:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo obtener el historial de compras.",
      });
    }
  };

  const cargarPerfil = async () => {
    try {
      const res = await fetch("http://localhost:5000/perfil", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPerfil(data);
      setPerfilEditado(data);
    } catch (err) {
      console.error("Error al obtener perfil:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo obtener el perfil del usuario.",
      });
    }
  };

  const generarGraficoIoT = async () => {
    try {
      const res = await fetch(`http://localhost:5000/reporte-iot`, {
        headers: { Authorization: `Bearer ${token}` },
      });        

      const iot = await res.json();

      const ctx = chartCanvasRef.current?.getContext("2d");

      if (!iot || !iot.distancia_recorrida || !ctx) {
        setHayDatosIot(false); // <-- Asegura que se muestre el mensaje
        return Swal.fire("Sin datos", "No hay datos IoT disponibles.", "info");
      }
      
      setHayDatosIot(true);      

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      chartRef.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: [
            "Distancia (mm)",
            "Tiempo (min)",
            "Velocidad (km/h)",
            "Luz (lux)",
            "Aceleración X",
            "Aceleración Y",
            "Aceleración Z",
            "Giroscopio X",
            "Giroscopio Y",
            "Giroscopio Z"
          ],
          datasets: [
            {
              label: "Datos IoT del Usuario",
              data: [
                Number(iot.distancia_recorrida),
                Number(iot.tiempo_uso),
                Number(iot.velocidad_estimada),
                Number(iot.luz),
                Number(iot.aceleracion.x),
                Number(iot.aceleracion.y),
                Number(iot.aceleracion.z),
                Number(iot.giroscopio.x),
                Number(iot.giroscopio.y),
                Number(iot.giroscopio.z),
              ],
              backgroundColor: [
                "#36a2eb", "#ffcd56", "#ff6384", "#4bc0c0",
                "#8e44ad", "#2ecc71", "#e74c3c",
                "#2980b9", "#f1c40f", "#e67e22"
              ]
            }
          ]
        }
      });
    } catch (error) {
      console.error("❌ Error al generar gráfica IoT:", error);
      Swal.fire("Error", "No se pudo cargar el gráfico IoT.", "error");
    }
  };

  const actualizarGraficoIoT = async () => {
    try {
      if (!perfil?.id_usuario) return;
  
      const res = await fetch(`http://localhost:5000/reporte-iot`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      const iot = await res.json();
  
      if (chartRef.current && chartRef.current.data?.datasets?.[0]) {
        chartRef.current.data.datasets[0].data = [
          Number(iot.distancia_recorrida),
          Number(iot.tiempo_uso),
          Number(iot.velocidad_estimada),
          Number(iot.luz),
          Number(iot.aceleracion.x),
          Number(iot.aceleracion.y),
          Number(iot.aceleracion.z),
          Number(iot.giroscopio.x),
          Number(iot.giroscopio.y),
          Number(iot.giroscopio.z)
        ];
        chartRef.current.update();
      }
    } catch (error) {
      console.error("Error al actualizar gráfica IoT:", error);
    }
  };  

  useEffect(() => {
    cargarPerfil();
    cargarVentas();
    generarGraficoIoT();
  }, []);
  
  useEffect(() => {
    if (perfil?.id_usuario) {
      generarGraficoIoT();
  
      intervalRef.current = setInterval(() => {
        cargarVentas();
      }, 1000);
  
      iotInterval.current = setInterval(() => {
        actualizarGraficoIoT();
      }, 1000);
    }
  
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(iotInterval.current);
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [perfil]);  

  const irAFactura = (venta) => {
    navigate("/facturacion", {
      state: {
        total: venta.total,
        tipo: "venta",
        id_venta: venta.id_venta,
      },
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPerfilEditado((prev) => ({ ...prev, [name]: value }));
  };

  const guardarCambios = async () => {
    try {
      const res = await fetch("http://localhost:5000/perfil/actualizar", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(perfilEditado),
      });

      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Perfil actualizado",
          text: "Tu información se guardó correctamente.",
          timer: 2000,
          showConfirmButton: false,
        });
        setPerfil(data);
        setEditando(false);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error al actualizar",
          text: data.error || "No se pudo actualizar el perfil.",
        });
      }
    } catch (error) {
      console.error("❌ Error al guardar perfil:", error);
      Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con el servidor.",
      });
    }
  };

  return (
    <div className="historial-container">
      <div className="historial-header">
        <button className="btn-regresar" onClick={() => navigate("/home")}>
          ⬅ Regresar al Inicio
        </button>
      </div>

      {/* PERFIL */}
      <div className="usuario-box">
        <h3>👤 Perfil del Usuario</h3>
        <table className="tabla-usuario">
          <tbody>
            <tr>
              <td><strong>Nombre:</strong></td>
              <td>
                <input name="nombre" value={perfilEditado.nombre || ""} disabled={!editando} onChange={handleInputChange} />
              </td>
              <td><strong>RFC:</strong></td>
              <td>
                <input name="rfc" value={perfilEditado.rfc || ""} disabled={!editando} onChange={handleInputChange} />
              </td>
            </tr>
            <tr>
              <td><strong>Razón Social:</strong></td>
              <td colSpan={3}>
                <input name="razon_social" value={perfilEditado.razon_social || ""} disabled={!editando} onChange={handleInputChange} />
              </td>
            </tr>
            <tr>
              <td><strong>Dirección:</strong></td>
              <td colSpan={3}>
                <input name="direccion" value={perfilEditado.direccion || ""} disabled={!editando} onChange={handleInputChange} />
              </td>
            </tr>
            <tr>
              <td><strong>Correo:</strong></td>
              <td colSpan={3}>
                <input value={perfil?.email || ""} disabled />
              </td>
            </tr>
          </tbody>
        </table>

        {!editando ? (
          <button onClick={() => setEditando(true)}>Editar Perfil</button>
        ) : (
          <button onClick={guardarCambios}>Guardar Cambios</button>
        )}
      </div>

      {/* HISTORIAL DE COMPRAS */}
      <div className="historial-box">
        <h3>📦 Historial de Compras</h3>

        {Array.isArray(ventas) && ventas.length === 0 ? (
          <p className="mensaje-vacio">No tienes compras registradas aún.</p>
        ) : (
          <>
            <table className="historial-tabla">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ventas
                  .slice((currentPage - 1) * ventasPorPagina, currentPage * ventasPorPagina)
                  .map((venta) => (
                    <tr key={venta.id_venta}>
                      <td>{venta.id_venta}</td>
                      <td>{new Date(venta.fecha_venta).toLocaleDateString()}</td>
                      <td>${parseFloat(venta.total).toFixed(2)}</td>
                      <td>
                        <button className="btn-factura" onClick={() => irAFactura(venta)}>Facturar</button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>

            {/* PAGINACIÓN */}
            <div className="paginacion">
              {Array.from({ length: Math.ceil(ventas.length / ventasPorPagina) }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={currentPage === i + 1 ? "pagina-activa" : ""}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {/* GRÁFICA IOT */}
      <div className="grafica-iot-box">
      <h3>📈 Tu Chaqueta Personal en Tiempo Real</h3>
        <canvas ref={chartCanvasRef} width="400" height="200"></canvas>

        {!hayDatosIot && (
          <div className="mensaje-sin-grafico">
            <p style={{ color: "#999", textAlign: "center", marginTop: "20px" }}>
              🔌 Tu chaqueta aún no ha enviado datos.<br />
              Si ya tienes una, asegúrate de que esté conectada correctamente.<br />
              Si es tu primera vez aquí, visita el catálogo para adquirirla.
            </p>
            <div style={{ textAlign: "center", marginTop: "10px" }}>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Historial;