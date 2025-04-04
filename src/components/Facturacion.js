import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Swal from "sweetalert2";
import "../styles/Facturacion.css";
import axios from "axios";  // Asegúrate de importar axios

const logo = "/logoweb.jpg";

function Facturacion() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState(null);
  const [facturaData, setFacturaData] = useState({
    nombre: "",
    rfc: "",
    direccion: "",
    usoCfdi: "",
  });
  const [productos, setProductos] = useState([]);
  const [totalCompra, setTotalCompra] = useState(0);
  const [facturaGenerada, setFacturaGenerada] = useState(false);

  const { tipo, id_venta, total } = location.state || {};
  const iva = (totalCompra * 0.16).toFixed(2);
  const subtotal = (totalCompra - iva).toFixed(2);

  const opcionesCFDI = [
    { codigo: "G01", descripcion: "Adquisición de mercancías" },
    { codigo: "G02", descripcion: "Devoluciones, descuentos o bonificaciones" },
    { codigo: "G03", descripcion: "Gastos en general" },
    { codigo: "I01", descripcion: "Construcciones" },
    { codigo: "P01", descripcion: "Por definir" },
  ];

  // Obtener la URL base de la API
  const apiUrl = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession"));
    if (session?.userId) setUserId(session.userId);

    const token = localStorage.getItem("token");

    if (token) {
      // Cambié `api.get` por `axios.get`
      axios.get(`${apiUrl}/perfil`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          setFacturaData((prev) => ({
            ...prev,
            nombre: res.data.razon_social || "",
            rfc: res.data.rfc || "",
            direccion: res.data.direccion || "",
          }));
        })
        .catch((err) => {
          console.error("❌ Error al cargar datos del usuario:", err);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo cargar la información del perfil.",
          });
        });
    }

    if (tipo === "venta" && id_venta) {
      setTotalCompra(total);
      // Cambié `api.get` por `axios.get`
      axios.get(`${apiUrl}/detalle-venta/${id_venta}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => setProductos(res.data))
        .catch((err) => {
          console.error("Error al traer detalle:", err);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo obtener el detalle de la venta.",
          });
        });
    } else {
      setTotalCompra(total);
      // Cambié `api.get` por `axios.get`
      axios.get(`${apiUrl}/ultima-venta`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.data.productos) setProductos(res.data.productos);
        })
        .catch((err) => {
          console.error("Error al obtener última venta:", err);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo obtener la última venta.",
          });
        });
    }
  }, [location.state]);

  const handleChange = (e) => {
    setFacturaData({ ...facturaData, [e.target.name]: e.target.value });
  };

  const enviarFactura = async () => {
    const { nombre, rfc, direccion, usoCfdi } = facturaData;

    if (!nombre.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Razón Social requerida",
        text: "Por favor, ingresa la razón social del cliente.",
      });
      return;
    }

    if (!rfc || !direccion || !usoCfdi) {
      Swal.fire({
        icon: "warning",
        title: "Campos incompletos",
        text: "Por favor, llena todos los campos para generar la factura.",
      });
      return;
    }

    try {
      // Cambié `api.get` por `axios.post` para enviar los datos de la factura
      const response = await axios.post(
        `${apiUrl}/generar-factura`,
        {
          Id_usuario: userId,
          Nombre: nombre.trim(),
          RFC: rfc,
          Direccion: direccion,
          Total: totalCompra,
          Id_venta: id_venta || null,
          razon_social: nombre.trim(),
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = response.data;

      if (!response.status === 200) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.error || "No se pudo generar la factura.",
        });
        return;
      }

      if (data.productos) {
        setProductos(data.productos);
        setFacturaGenerada(true);
        generarPDF(data.productos);

        Swal.fire({
          icon: "success",
          title: "Factura generada",
          text: "La factura se ha generado y descargado correctamente.",
          timer: 2500,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
      Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con el servidor.",
      });
    }
  };

  const generarPDF = (productosGenerados) => {
    const doc = new jsPDF();
    const fechaEmision = new Date().toLocaleDateString();
    const folioFactura = id_venta ? `FCT-${String(id_venta).padStart(6, '0')}` : "FCT-NUEVA";

    doc.addImage(logo, "JPEG", 80, 10, 50, 30);
    doc.setFontSize(16);
    doc.text("BIKERLIGHT", 105, 50, null, null, "center");
    doc.setFontSize(10);
    doc.text("RFC: BKL456789123", 105, 57, null, null, "center");
    doc.text("Dirección fiscal: Calle Seguridad 123, CDMX", 105, 62, null, null, "center");

    doc.setFontSize(11);
    doc.text(`No. Factura: ${folioFactura}`, 15, 75);
    doc.text(`Fecha de emisión: ${fechaEmision}`, 15, 82);
    doc.text(`Uso del CFDI: ${facturaData.usoCfdi}`, 15, 89);

    doc.setFontSize(12);
    doc.text("Factura a nombre de:", 15, 100);
    doc.text(`Cliente: ${facturaData.nombre}`, 15, 107);
    doc.text(`RFC: ${facturaData.rfc}`, 15, 114);
    doc.text(`Dirección: ${facturaData.direccion}`, 15, 121);

    const columnas = ["Producto", "Descripción", "Cantidad", "Total"];
    const filas = productosGenerados.map((prod) => [
      prod.nombre || prod.Modelo || "Producto",
      prod.descripcion || "Sin descripción",
      prod.cantidad || prod.Cantidad || 1,
      `$${((prod.precio_unitario || prod.Precio) * (prod.cantidad || prod.Cantidad || 1)).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 130,
      head: [columnas],
      body: filas,
      theme: "grid",
    });

    const yFinal = doc.previousAutoTable?.finalY || 150;
    const labelX = 140;
    const marginTop = 15;

    if (yFinal + 30 > 280) {
      doc.addPage();
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Subtotal: $${subtotal}`, labelX, 30);
      doc.text(`IVA (16%): $${iva}`, labelX, 37);
      doc.setFont("helvetica", "bold");
      doc.text(`Total: $${totalCompra}`, labelX, 44);
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(labelX - 2, yFinal + 5, 60, 20, 'F');
      doc.setFontSize(11);
      doc.text(`Subtotal: $${subtotal}`, labelX, yFinal + marginTop);
      doc.text(`IVA (16%): $${iva}`, labelX, yFinal + marginTop + 7);
      doc.setFont("helvetica", "bold");
      doc.text(`Total: $${totalCompra}`, labelX, yFinal + marginTop + 14);
    }

    const nombrePDF = `factura_${facturaData.rfc}_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(nombrePDF);
  };

  const volverInicio = () => navigate("/home");

  return (
    <div className="facturacion-container">
      <h2>Facturación</h2>
      <p>Total de la compra: <strong>${totalCompra}</strong></p>

      {!facturaGenerada ? (
        <form className="factura-form">
          <label>Razón Social:</label>
          <input
            type="text"
            name="nombre"
            value={facturaData.nombre}
            onChange={handleChange}
            required
          />

          <label>RFC:</label>
          <input
            type="text"
            name="rfc"
            value={facturaData.rfc}
            onChange={handleChange}
            required
          />

          <label>Dirección:</label>
          <input
            type="text"
            name="direccion"
            value={facturaData.direccion}
            onChange={handleChange}
            required
          />

          <label>Uso del CFDI:</label>
          <select name="usoCfdi" value={facturaData.usoCfdi} onChange={handleChange} required>
            <option value="">-- Selecciona una opción --</option>
            {opcionesCFDI.map((op) => (
              <option key={op.codigo} value={op.codigo}>
                {op.codigo} – {op.descripcion}
              </option>
            ))}
          </select>

          <button type="button" className="enviar-factura" onClick={enviarFactura}>
            Generar Factura
          </button>
          <button type="button" className="cancelar" onClick={volverInicio}>
            Cancelar
          </button>
        </form>
      ) : (
        <div className="factura-confirmacion">
          <h3>✅ Factura generada correctamente.</h3>
          <p>El PDF ha sido descargado automáticamente.</p>
          <button className="volver-home" onClick={volverInicio}>
            Volver al Inicio
          </button>
        </div>
      )}
    </div>
  );
}

export default Facturacion;