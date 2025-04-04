import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Swal from "sweetalert2";
import api from './api';
import "../styles/Reportes.css";

const Reportes = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const [reportes, setReportes] = useState(null);
  const [chart, setChart] = useState(null);
  const [reporteSeleccionado, setReporteSeleccionado] = useState("");
  const intervalRef = useRef(null);

  const cargarReportes = async () => {
    try {
      const res = await api.get("/admin/reportes-detallados", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setReportes(data);
    } catch (error) {
      Swal.fire("Error", "No se pudo obtener la información de los reportes.", "error");
    }
  };

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
    cargarReportes();
  }, []);

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
  
        case "duracionSuscripciones":
          if (!reportes?.duracionSuscripciones) return;
          config = {
            type: "bar",
            data: {
              labels: reportes.duracionSuscripciones.map(s => s.tipo),
              datasets: [{
                label: "Duración Promedio (días)",
                data: reportes.duracionSuscripciones.map(s => s.duracion_promedio),
                backgroundColor: "#8e44ad"
              }]
            }
          };
          break;
  
        case "chaquetasVendidas":
          if (!reportes?.chaquetasVendidas) return;
          config = {
            type: "bar",
            data: {
              labels: reportes.chaquetasVendidas.map(p => p.nombre),
              datasets: [{
                label: "Unidades Vendidas (Chaquetas)",
                data: reportes.chaquetasVendidas.map(p => p.total_vendidos),
                backgroundColor: "#36a2eb"
              }]
            }
          };
          break;
  
        case "rutas":
          if (!reportes?.rutas || reportes.rutas.length === 0) {
            Swal.fire("Sin datos", "No hay rutas registradas para mostrar.", "info");
            return;
          }
          config = {
            type: "bar",
            data: {
              labels: reportes.rutas.map(r => r.nombre_ruta),
              datasets: [{
                label: "Distancia (km)",
                data: reportes.rutas.map(r => r.distancia_km),
                backgroundColor: "#2ecc71"
              }]
            }
          };
          break;
  
        case "iotGeneral":
          // iotGeneral se maneja en un segundo useEffect
          return;
  
        default:
          return;
      }
  
      const nuevaGrafica = new Chart(ctx, config);
      setChart(nuevaGrafica);
    };
  
    generarGrafico();
    return () => destruirGrafico();
  }, [reporteSeleccionado]);  

  useEffect(() => {
    const cargarIoTGeneral = async () => {
      if (reporteSeleccionado === "iotUnico") {
        destruirGrafico();
  
        try {
          const res = await api.get("/admin/reporte-iot-unico");
          const data = await res.json();
  
          // ✅ Guardamos los datos para el PDF
          setReportes(prev => ({ ...prev, iotUnico: data }));
  
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
        } catch (error) {
          console.error("❌ Error cargando reporte IoT único:", error);
          Swal.fire("Error", "No se pudo cargar el reporte IoT único.", "error");
        }
      }
    };
  
    cargarIoTGeneral();
    return () => destruirGrafico();
  }, [reporteSeleccionado]);    

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
      case "categoria":
        head = [["Categoría", "Productos Vendidos"]];
        body = reportes.porCategoria.map(p => [p.categoria, p.total_vendidos]);
        break;
      case "porDia":
        head = [["Fecha", "Total del Día"]];
        body = reportes.porDia.map(p => [p.fecha, `$${p.total_dia.toFixed(2)}`]);
        break;
      case "suscripciones":
        head = [["Tipo", "Cantidad"]];
        body = reportes.suscripciones.map(s => [s.tipo, s.cantidad]);
        break;
      case "duracionSuscripciones":
        head = [["Tipo", "Duración Promedio (días)"]];
        body = reportes.duracionSuscripciones.map(s => [s.tipo, s.duracion_promedio.toFixed(2)]);
        break;
      case "chaquetasVendidas":
        head = [["Modelo", "Unidades Vendidas"]];
        body = reportes.chaquetasVendidas.map(c => [c.nombre, c.total_vendidos]);
        break;
      case "rutas":
        head = [["Ruta", "Distancia (km)", "Duración (segundos)", "Fecha"]];
        body = reportes.rutas.map(r => [r.nombre_ruta, r.distancia_km, r.tiempo_segundos, r.fecha]);
        break;
      case "iotUnico":
          head = [["Dato", "Valor"]];
          body = [
            ["Distancia (mm)", reportes.iotUnico?.distancia_recorrida],
            ["Tiempo (min)", reportes.iotUnico?.tiempo_uso],
            ["Velocidad (km/h)", reportes.iotUnico?.velocidad_estimada],
            ["Luz (lux)", reportes.iotUnico?.luz],
            ["Aceleración X", reportes.iotUnico?.aceleracion?.x],
            ["Aceleración Y", reportes.iotUnico?.aceleracion?.y],
            ["Aceleración Z", reportes.iotUnico?.aceleracion?.z],
            ["Giroscopio X", reportes.iotUnico?.giroscopio?.x],
            ["Giroscopio Y", reportes.iotUnico?.giroscopio?.y],
            ["Giroscopio Z", reportes.iotUnico?.giroscopio?.z]
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

      {reporteSeleccionado === "rutas" && reportes?.rutasPorUsuario?.length > 0 && (
        <div className="tabla-usuarios-rutas">
          <h3>🧑‍🦱 Kilometraje Total por Usuario</h3>
          <table>
            <thead>
              <tr>
                <th>Nombre del Usuario</th>
                <th>Distancia Total (km)</th>
                <th>Tiempo Total (segundos)</th>
              </tr>
            </thead>
            <tbody>
              {reportes.rutasPorUsuario.map((u, index) => (
                <tr key={index}>
                  <td>{u.nombre}</td>
                  <td>{u.distancia_total}</td>
                  <td>{u.tiempo_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button className="volver-dashboard" onClick={() => navigate("/admin")}>
        ⬅️ Volver al Dashboard
      </button>
    </div>
  );
};

export default Reportes;