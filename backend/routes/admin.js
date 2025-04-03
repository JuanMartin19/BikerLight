const admin = require("firebase-admin");
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../server");

// Inicializar Firebase Admin SDK solo una vez
const serviceAccount = require("../bikerlight-dd3e6-firebase-adminsdk-fbsvc-2cb7f2c29e.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://bikerlight-dd3e6-default-rtdb.firebaseio.com",
  });
}

// 🔹 Ruta IoT general (todos ven los mismos datos)
router.get("/reporte-iot", verifyToken, async (req, res) => {
  try {
    const ref = admin.database().ref("datosIoT"); // <-- ya no usa id_usuario
    const snapshot = await ref.once("value");
    const data = snapshot.val();

    if (!data || typeof data !== "object") {
      return res.status(404).json({ error: "No hay registros IoT disponibles." });
    }

    // Si los datos están como una sola entrada fija (no por timestamp)
    const distancia = data?.distancia?.valor || 0;
    const luz = data?.luz?.valor || 0;

    const aceleracion = {
      x: data?.mpu?.aceleracion_x || 0,
      y: data?.mpu?.aceleracion_y || 0,
      z: data?.mpu?.aceleracion_z || 0,
    };

    const giroscopio = {
      x: data?.mpu?.giroscopio_x || 0,
      y: data?.mpu?.giroscopio_y || 0,
      z: data?.mpu?.giroscopio_z || 0,
    };

    const tiempoSegundos = 30;
    const tiempoMinutos = tiempoSegundos / 60;
    const velocidad_kph = (distancia / tiempoSegundos) * 3.6;

    res.json({
      distancia_recorrida: distancia,
      tiempo_uso: tiempoMinutos.toFixed(2),
      velocidad_estimada: velocidad_kph.toFixed(2),
      luz,
      aceleracion,
      giroscopio
    });
  } catch (error) {
    console.error("🔥 Error en /reporte-iot:", error);
    res.status(500).json({ error: "Error al obtener datos IoT del servidor." });
  }
});

// 🔹 Ruta general IoT para admin (no requiere token si es solo para pruebas)
router.get("/admin/reporte-iot-unico", async (req, res) => {
  try {
    const ref = admin.database().ref("datosIoT");
    const snapshot = await ref.once("value");
    const data = snapshot.val();

    if (!data || typeof data !== "object") {
      return res.status(404).json({ error: "No hay datos disponibles en datosIoT." });
    }

    const distancia = data?.distancia?.valor || 0;
    const luz = data?.luz?.valor || 0;

    const aceleracion = {
      x: data?.mpu?.aceleracion_x || 0,
      y: data?.mpu?.aceleracion_y || 0,
      z: data?.mpu?.aceleracion_z || 0,
    };

    const giroscopio = {
      x: data?.mpu?.giroscopio_x || 0,
      y: data?.mpu?.giroscopio_y || 0,
      z: data?.mpu?.giroscopio_z || 0,
    };

    const tiempoSegundos = 30;
    const tiempoMinutos = tiempoSegundos / 60;
    const velocidad_kph = (distancia / tiempoSegundos) * 3.6;

    res.json({
      distancia_recorrida: distancia,
      tiempo_uso: tiempoMinutos.toFixed(2),
      velocidad_estimada: velocidad_kph.toFixed(2),
      luz,
      aceleracion,
      giroscopio
    });
  } catch (error) {
    console.error("🔥 Error en /admin/reporte-iot-unico:", error);
    res.status(500).json({ error: "Error al obtener el reporte IoT único." });
  }
});

// Ruta de prueba para verificar funcionamiento
router.get("/admin/test", (req, res) => {
  res.json({ message: "✅ Admin routes funcionando correctamente." });
});

module.exports = router;