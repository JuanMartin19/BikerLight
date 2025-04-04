import React, { useEffect, useState, useRef } from "react"; 
import { useNavigate } from "react-router-dom"; 
import Chart from "chart.js/auto"; 
import jsPDF from "jspdf"; 
import autoTable from "jspdf-autotable"; 
import Swal from "sweetalert2"; 
import "../styles/Reportes.css"; 
import axios from 'axios'; 
import { database, ref, get } from "../firebase.js";

const Reportes = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const [reportes, setReportes] = useState(null);
  const [chart, setChart] = useState(null);
  const [reporteSeleccionado, setReporteSeleccionado] = useState("");
  const intervalRef = useRef(null);

  const apiUrl = process.env.REACT_APP_API_URL;

  const destruirGrafico = () => {
    if (chart) {
      chart.destroy();
      setChart(null);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    const cargarDatosIoT = async () => {
      if (reporteSeleccionado === "iotUnico") {
        destruirGrafico();

        try {
          const iotRef = ref(database, 'datosIoT');
          const snapshot = await get(iotRef);

          if (snapshot.exists()) {
            const data = snapshot.val();
            setReportes(prev => ({ ...prev, iotUnico: data }));  // Guardamos los datos en el estado

            const ctx = document.getElementById("graficoUnico");

            const config = {
              type: "bar",
              data: {
                labels: [
                  "Distancia (mm)", "Tiempo (min)", "Velocidad (km/h)", "Luz (lux)",
                  "Aceleración X", "Aceleración Y", "Aceleración Z",
                  "Giroscopio X", "Giroscopio Y", "Giroscopio Z"
                ],
                datasets: [
                  {
                    label: "Datos de la Chaqueta IoT",
                    data: [
                      Number(data.distancia_recorrida),
                      Number(data.tiempo_uso),
                      Number(data.velocidad_estimada),
                      Number(data.luz),
                      Number(data.aceleracion.x),
                      Number(data.aceleracion.y),
                      Number(data.aceleracion.z),
                      Number(data.giroscopio.x),
                      Number(data.giroscopio.y),
                      Number(data.giroscopio.z)
                    ],
                    backgroundColor: [
                      "#36a2eb", "#ffcd56", "#ff6384", "#4bc0c0",
                      "#8e44ad", "#2ecc71", "#e74c3c",
                      "#2980b9", "#f1c40f", "#e67e22"
                    ]
                  }
                ]
              }
            };

            const nuevaGrafica = new Chart(ctx, config);
            setChart(nuevaGrafica);
          } else {
            console.log("No hay datos disponibles en Firebase");
            Swal.fire("Error", "No se pudo obtener el reporte IoT único.", "error");
          }
        } catch (error) {
          console.error("❌ Error cargando reporte IoT único desde Firebase:", error);
          Swal.fire("Error", "No se pudo cargar el reporte IoT único.", "error");
        }
      }
    };

    cargarDatosIoT();
    return () => destruirGrafico();
  }, [reporteSeleccionado]);

  const Reportes = () => {
    const [datosIoT, setDatosIoT] = useState(null);
    
    useEffect(() => {
      const obtenerDatosIoT = async () => {
        try {
          const iotRef = ref(database, "datosIoT"); // Dirección de tu nodo en Firebase
          const snapshot = await get(iotRef);
  
          if (snapshot.exists()) {
            const data = snapshot.val();
            setDatosIoT(data);  // Guarda los datos en el estado
          } else {
            console.log("No hay datos disponibles.");
          }
        } catch (error) {
          console.error("Error al obtener los datos de Firebase:", error);
        }
      };
  
      obtenerDatosIoT();
    }, []);
  
    return (
      <div>
        <h2>Reporte de Datos IoT</h2>
        {datosIoT ? (
          <pre>{JSON.stringify(datosIoT, null, 2)}</pre>
        ) : (
          <p>Cargando datos...</p>
        )}
      </div>
    );
  };

  // Cargar los reportes desde el backend
  useEffect(() => {
    const cargarReportes = async () => {
      try {
        const res = await axios.get(`${apiUrl}/admin/reportes-detallados`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) {
          setReportes(res.data);
        } else {
          Swal.fire("Error", "No se encontraron datos para los reportes.", "info");
        }
      } catch (error) {
        Swal.fire("Error", "No se pudo obtener la información de los reportes.", "error");
      }
    };

    cargarReportes();
  }, [token]);

  // Generar el gráfico de acuerdo con el reporte seleccionado
  useEffect(() => {
    destruirGrafico();
    if (!reporteSeleccionado) return;

    const generarGrafico = async () => {
      const ctx = document.getElementById("graficoUnico");
      let config;

      switch (reporteSeleccionado) {
        case "top":
          if (!reportes?.topProductos) return;
          config = {
            type: "bar",
            data: {
              labels: reportes.topProductos.map(p => p.nombre),
              datasets: [{
                label: "Unidades Vendidas",
                data: reportes.topProductos.map(p => p.total_vendidos),
                backgroundColor: "#ff9f40"
              }]
            }
          };
          break;

        case "categoria":
          if (!reportes?.porCategoria) return;
          config = {
            type: "pie",
            data: {
              labels: reportes.porCategoria.map(c => c.categoria || "Sin categoría"),
              datasets: [{
                label: "Productos Vendidos",
                data: reportes.porCategoria.map(c => c.total_vendidos),
                backgroundColor: ["#4bc0c0", "#ffcd56", "#36a2eb", "#ff6384"]
              }]
            }
          };
          break;

        case "porDia":
          if (!reportes?.porDia) return;
          config = {
            type: "line",
            data: {
              labels: reportes.porDia.map(d => d.fecha),
              datasets: [{
                label: "Total por Día",
                data: reportes.porDia.map(d => d.total_dia),
                backgroundColor: "rgba(75,192,192,0.4)",
                borderColor: "#36a2eb",
                fill: true
              }]
            }
          };
          break;

        case "suscripciones":
          if (!reportes?.suscripciones) return;
          config = {
            type: "doughnut",
            data: {
              labels: reportes.suscripciones.map(s => s.tipo),
              datasets: [{
                label: "Suscripciones",
                data: reportes.suscripciones.map(s => s.cantidad),
                backgroundColor: ["#36a2eb", "#ff6384"]
              }]
            }
          };
          break;

        case "iotUnico":
          // Aquí cargamos el reporte IoT
          if (!reportes?.iotUnico) return;
          config = {
            type: "bar",
            data: {
              labels: [
                "Distancia (mm)", "Tiempo (min)", "Velocidad (km/h)", "Luz (lux)",
                "Aceleración X", "Aceleración Y", "Aceleración Z",
                "Giroscopio X", "Giroscopio Y", "Giroscopio Z"
              ],
              datasets: [
                {
                  label: "Datos de la Chaqueta IoT",
                  data: [
                    Number(reportes.iotUnico.distancia_recorrida),
                    Number(reportes.iotUnico.tiempo_uso),
                    Number(reportes.iotUnico.velocidad_estimada),
                    Number(reportes.iotUnico.luz),
                    Number(reportes.iotUnico.aceleracion.x),
                    Number(reportes.iotUnico.aceleracion.y),
                    Number(reportes.iotUnico.aceleracion.z),
                    Number(reportes.iotUnico.giroscopio.x),
                    Number(reportes.iotUnico.giroscopio.y),
                    Number(reportes.iotUnico.giroscopio.z)
                  ],
                  backgroundColor: [
                    "#36a2eb", "#ffcd56", "#ff6384", "#4bc0c0",
                    "#8e44ad", "#2ecc71", "#e74c3c",
                    "#2980b9", "#f1c40f", "#e67e22"
                  ]
                }
              ]
            }
          };
          break;

        default:
          return;
      }

      const nuevaGrafica = new Chart(ctx, config);
      setChart(nuevaGrafica);
    };

    generarGrafico();
    return () => destruirGrafico();
  }, [reporteSeleccionado, reportes]);

  // Descargar el reporte en PDF
  const descargarPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte: " + reporteSeleccionado.toUpperCase(), 14, 15);

    if (!reportes || !reporteSeleccionado) {
      Swal.fire("Atención", "No hay datos para exportar.", "info");
      return;
    }

    let body = [];
    let head = [];

    switch (reporteSeleccionado) {
      case "top":
        head = [["Producto", "Unidades Vendidas"]];
        body = reportes.topProductos.map(p => [p.nombre, p.total_vendidos]);
        break;
      case "iotUnico":
        head = [["Dato", "Valor"]];
        body = [
          ["Distancia (mm)", reportes.iotUnico.distancia_recorrida],
          ["Tiempo (min)", reportes.iotUnico.tiempo_uso],
          ["Velocidad (km/h)", reportes.iotUnico.velocidad_estimada],
          ["Luz (lux)", reportes.iotUnico.luz],
          ["Aceleración X", reportes.iotUnico.aceleracion.x],
          ["Aceleración Y", reportes.iotUnico.aceleracion.y],
          ["Aceleración Z", reportes.iotUnico.aceleracion.z],
          ["Giroscopio X", reportes.iotUnico.giroscopio.x],
          ["Giroscopio Y", reportes.iotUnico.giroscopio.y],
          ["Giroscopio Z", reportes.iotUnico.giroscopio.z]
        ];
        break;
      default:
        return;
    }

    autoTable(doc, {
      startY: 25,
      head: head,
      body: body,
    });

    doc.save(`Reporte_${reporteSeleccionado}.pdf`);
  };

  return (
    <div className="reportes-container">
      <h2>📊 Generador de Reportes</h2>

      <div className="reporte-select">
        <label htmlFor="tipo">Selecciona el tipo de reporte:</label>
        <select
          id="tipo"
          value={reporteSeleccionado}
          onChange={(e) => setReporteSeleccionado(e.target.value)}
        >
          <option value="">-- Selecciona --</option>
          <option value="top">🔥 Top 5 Productos</option>
          <option value="categoria">🎯 Productos por Categoría</option>
          <option value="porDia">📅 Ventas por Día</option>
          <option value="suscripciones">👥 Suscripciones</option>
          <option value="duracionSuscripciones">🕒 Duración Promedio de Suscripciones</option>
          <option value="chaquetasVendidas">🧥 Ventas por modelo de Chaqueta</option>
          <option value="iotUnico">📡 Datos Generales de Chaqueta IoT</option>
          <option value="rutas">🗺️ Rutas Recorridas</option>
        </select>
      </div>

      {reporteSeleccionado && (
        <div className="grafica-box">
          <canvas id="graficoUnico"></canvas>
          <button onClick={descargarPDF}>📥 Descargar PDF</button>
        </div>
      )}

      <button className="volver-dashboard" onClick={() => navigate("/admin")}>
        ⬅️ Volver al Dashboard
      </button>
    </div>
  );
};

export default Reportes;