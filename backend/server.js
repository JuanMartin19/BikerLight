require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const jwt = require("jsonwebtoken");
const fs = require("fs");

const app = express();
app.use(cors({
  origin: [
    "https://mi-backend-se76.onrender.com",
    "https://frontend-nine-dusky-89.vercel.app"
  ],
  credentials: true
}));
app.use(express.json());

// Conexión a la base de datos
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function verifyToken(req, res, next) {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

  if (!token) {
    return res.status(403).json({ error: "Token requerido" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido" });
    }
    req.userId = decoded.userId; // Adjuntamos el userId al request
    next();
  });
}

// Sirve los archivos estáticos de la carpeta 'build' de React
app.use(express.static(path.join(__dirname, 'client/build')));

// Ruta comodín para manejar todas las rutas no definidas
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

// Prueba de conexión a la base de datos
db.getConnection()
  .then(() => {
    console.log("✅ Conectado a la base de datos");
    const PORT = process.env.PORT || 3000;
    console.log("🛠️ Puerto asignado por Render:", PORT);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error al conectar con la base de datos:", err);
  });

module.exports.verifyToken = verifyToken;

// Ruta de prueba para verificar que el servidor está funcionando
app.get("/", (req, res) => {
  res.send("Servidor funcionando");
});

// 🔹 Importar rutas (ya funciona porque verifyToken ya está definido)
const adminRoutes = require("./routes/admin");
app.use("/admin", adminRoutes);

// Middleware para servir archivos estáticos desde /uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configuración de almacenamiento con multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads"); // 👈 Carpeta donde se guardarán
  },
  filename: (req, file, cb) => {
    const nombreFinal = Date.now() + "-" + file.originalname;
    cb(null, nombreFinal);
  }
});

const upload = multer({ storage });

// Endpoint para enviar la URL del backend
app.get('/api/url', (req, res) => {
  res.json({ apiUrl: 'https://mi-backend-se76.onrender.com' });
});


  // Registro manual de usuarios normales
  app.post("/register", async (req, res) => {
    const { nombre, correo, contraseña } = req.body;

    try {
      const [existe] = await db.query("SELECT * FROM usuarios WHERE email = ?", [correo]);

      if (existe.length > 0) {
        return res.status(400).json({ error: "El correo ya está registrado." });
      }

      const hashedPassword = await bcrypt.hash(contraseña, 10);

      await db.query(`
        INSERT INTO usuarios (nombre, email, password, tipo_usuario, rfc, razon_social, direccion)
        VALUES (?, ?, ?, 0, '', '', '')
      `, [nombre, correo, hashedPassword]);

      res.json({ message: "✅ Usuario registrado correctamente." });
    } catch (error) {
      console.error("❌ Error en registro manual:", error);
      res.status(500).json({ error: "Error al registrar el usuario." });
    }
  });

  //registro con google
  app.post("/register/google", async (req, res) => {
    const { email, name } = req.body;

    try {
      const [rows] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email]);

      if (rows.length > 0) {
        return res.status(400).json({ error: "Ya estás registrado. Inicia sesión con Google." });
      }

      const hashed = await bcrypt.hash(Date.now().toString(), 10);
      const prefixedPassword = "google_" + hashed;

      const [result] = await db.query(`
        INSERT INTO usuarios (nombre, email, password, tipo_usuario, rfc, razon_social, direccion)
        VALUES (?, ?, ?, 0, '', '', '')
      `, [name, email, prefixedPassword]);

      res.json({ message: "✅ Cuenta registrada correctamente. Ahora puedes iniciar sesión con Google." });

    } catch (error) {
      console.error("❌ Error al registrar con Google:", error);
      res.status(500).json({ error: "Error al registrar cuenta con Google" });
    }
  });

  // Ruta para subir imagen
  app.post("/auth/google", async (req, res) => {
    const { email } = req.body;

    try {
      const [rows] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email]);
      if (rows.length === 0) {
        return res.status(403).json({
          error: "Esta cuenta no está registrada. Por favor, regístrate primero con Google."
        });
      }

      const usuario = rows[0];
      if (!usuario.password.startsWith("google_")) {
        return res.status(403).json({
          error: "Este correo ya está registrado manualmente. Usa el inicio de sesión normal."
        });
      }

      if (usuario.session_token) {
        try {
          jwt.verify(usuario.session_token, process.env.JWT_SECRET);
          return res.status(403).json({ error: "Ya tienes una sesión activa en otro dispositivo." });
        } catch (err) { /* permitimos si expiró */ }
      }

      const token = jwt.sign(
        { userId: usuario.id_usuario, email: usuario.email },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
      );

      await db.query("UPDATE usuarios SET session_token = ? WHERE id_usuario = ?", [token, usuario.id_usuario]);

      // 🔍 Verificar suscripción
      await db.query("CALL verificar_suscripcion_usuario(?, @acceso);", [usuario.id_usuario]);
      const [[{ acceso }]] = await db.query("SELECT @acceso AS acceso;");
      const mensajeSuscripcion = acceso === 0
        ? "⚠️ Tu suscripción ha expirado. Renuévala para seguir disfrutando de los beneficios."
        : null;

      res.json({
        token,
        user: {
          id_usuario: usuario.id_usuario,
          nombre: usuario.nombre,
          email: usuario.email,
          tipo_usuario: usuario.tipo_usuario
        },
        suscripcion: mensajeSuscripcion
      });

    } catch (error) {
      console.error("❌ Error al iniciar sesión con Google:", error);
      res.status(500).json({ error: "Error al iniciar sesión con Google" });
    }
  });

  // INICIO DE SESIÓN
  app.post('/login', async (req, res) => {
    const { correo, contraseña } = req.body;

    try {
      const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [correo]);
      if (users.length === 0) {
        return res.status(401).json({ error: "Correo o contraseña incorrectos." });
      }

      const usuario = users[0];
      const isValidPassword = await bcrypt.compare(contraseña, usuario.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Correo o contraseña incorrectos." });
      }

      if (usuario.session_token) {
        return res.status(403).json({ error: "Ya tienes una sesión activa en otro dispositivo." });
      }

      const token = jwt.sign({ userId: usuario.id_usuario }, process.env.JWT_SECRET, { expiresIn: '1h' });
      await db.query('UPDATE usuarios SET session_token = ? WHERE id_usuario = ?', [token, usuario.id_usuario]);

      // 🔍 Verificar suscripción
      await db.query("CALL verificar_suscripcion_usuario(?, @acceso);", [usuario.id_usuario]);
      const [[{ acceso }]] = await db.query("SELECT @acceso AS acceso;");
      const mensajeSuscripcion = acceso === 0
        ? "⚠️ Tu suscripción ha expirado. Renuévala para seguir disfrutando de los beneficios."
        : null;

      res.json({
        message: "Inicio de sesión exitoso.",
        userId: usuario.id_usuario,
        tipo_usuario: usuario.tipo_usuario,
        token,
        suscripcion: mensajeSuscripcion
      });

    } catch (error) {
      console.error("❌ Error en login:", error);
      res.status(500).json({ error: "Error en el servidor." });
    }
  });

  // 🔹 CERRAR SESIÓN
  app.post('/logout', verifyToken, async (req, res) => {
    try {
      await db.query('UPDATE usuarios SET session_token = NULL WHERE id_usuario = ?', [req.userId]);
      res.json({ message: "Sesión cerrada exitosamente." });
    } catch (error) {
      console.error("❌ Error en logout:", error);
      res.status(500).json({ error: "Error en el servidor." });
    }
  });

  // 🔹 Ruta perfil extendida
  app.get('/perfil', verifyToken, async (req, res) => {
      try {
        const [usuario] = await db.query(`
          SELECT id_usuario, nombre, email, rfc, razon_social, direccion
          FROM usuarios WHERE id_usuario = ?
        `, [req.userId]);
    
        if (usuario.length === 0) return res.status(404).json({ error: "Usuario no encontrado." });
    
        res.json(usuario[0]);
      } catch (error) {
        console.error("❌ Error en perfil:", error);
        res.status(500).json({ error: "Error en el servidor." });
      }
    });  

  // 🔹 OBTENER CHAQUETAS DESDE LA BD
  app.get('/chaquetas', verifyToken, async (req, res) => {
      try {
          const [chaquetas] = await db.query(
              'SELECT id_producto AS id, nombre AS Modelo, descripcion, precio AS Precio, imagen AS Imagen FROM productos WHERE categoria = "CHAQUETA INTELIGENTE" AND stock > 0'
          );

          res.json(chaquetas);
      } catch (error) {
          console.error("❌ Error al obtener chaquetas:", error);
          res.status(500).json({ error: "Error al obtener productos." });
      }
  });

  // 🔹 Obtener carrito del usuario
  app.get('/carrito', verifyToken, async (req, res) => {
    try {
      const [carrito] = await db.query(
        `SELECT 
          id, 
          Modelo, 
          Precio, 
          Stock,
          Imagen,
          Cantidad, 
          Subtotal
        FROM vista_carrito_usuario
        WHERE id_usuario = ?`,
        [req.userId]
      );

      res.json(carrito);
    } catch (error) {
      console.error("❌ Error al obtener carrito desde vista:", error);
      res.status(500).json({ error: "Error al obtener carrito." });
    }
  });

  // 🔹 Agregar producto al carrito
  app.post('/carrito', verifyToken, async (req, res) => {
    const { id_producto, cantidad } = req.body;

    try {
      const [existe] = await db.query(
        `SELECT * FROM carrito WHERE id_usuario = ? AND id_producto = ?`,
        [req.userId, id_producto]
      );

      if (existe.length > 0) {
        await db.query(
          `UPDATE carrito SET cantidad = cantidad + ? WHERE id_usuario = ? AND id_producto = ?`,
          [cantidad, req.userId, id_producto]
        );
      } else {
        await db.query(
          `INSERT INTO carrito (id_usuario, id_producto, cantidad) VALUES (?, ?, ?)`,
          [req.userId, id_producto, cantidad]
        );
      }

      res.json({ message: "Producto agregado al carrito." });

    } catch (error) {
      console.error("❌ Error al agregar al carrito:", error.message);

      // Captura el error lanzado por el trigger
      if (error.code === 'ER_SIGNAL_EXCEPTION') {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Error al agregar producto al carrito." });
    }
  });

  // 🔹 Eliminar producto del carrito
  app.delete('/carrito/:id_producto', verifyToken, async (req, res) => {
      const { id_producto } = req.params;

      try {
          await db.query(`
              DELETE FROM carrito WHERE id_usuario = ? AND id_producto = ?
          `, [req.userId, id_producto]);

          res.json({ message: "Producto eliminado del carrito." });
      } catch (error) {
          console.error("❌ Error al eliminar producto:", error);
          res.status(500).json({ error: "Error al eliminar producto." });
      }
  });

  // 🔹 Actualizar cantidad de un producto en el carrito
  app.put('/carrito', verifyToken, async (req, res) => {
    const { id_producto, cantidad } = req.body;

    try {
        await db.query(`
            UPDATE carrito SET cantidad = ? WHERE id_usuario = ? AND id_producto = ?
        `, [cantidad, req.userId, id_producto]);

        res.json({ message: "Cantidad actualizada." });
    } catch (error) {
        console.error("❌ Error al actualizar cantidad:", error);
        res.status(500).json({ error: "Error al actualizar cantidad." });
    }
  });

  // 🔹 Procesar pago y registrar venta con detalles
  app.post('/procesar-pago', verifyToken, async (req, res) => {
    const { productos } = req.body;
    const userId = req.userId;

    const connection = await db.getConnection();
    try {
      // 1. Iniciar la transacción
      await connection.beginTransaction();

      // 2. Validar stock para cada producto
      for (const item of productos) {
        const [rows] = await connection.query(
          'SELECT stock FROM productos WHERE id_producto = ?',
          [item.id]
        );

        if (rows.length === 0) {
          throw new Error(`Producto no encontrado (ID ${item.id})`);
        }

        const stockDisponible = rows[0].stock;
        if (item.Cantidad > stockDisponible) {
          throw new Error(`❌ Stock insuficiente para el producto ${item.Modelo}`);
        }
      }

      // 3. Calcular total
      const total = productos.reduce((sum, item) => sum + (item.Precio * item.Cantidad), 0);

      // 4. Insertar en ventas
      const [ventaResult] = await connection.query(
        'INSERT INTO ventas (id_usuario, total) VALUES (?, ?)',
        [userId, total]
      );
      const idVenta = ventaResult.insertId;

      // 5. Insertar en detalle_ventas y actualizar stock
      for (const item of productos) {
        await connection.query(
          'INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
          [idVenta, item.id, item.Cantidad, item.Precio]
        );

        await connection.query(
          'UPDATE productos SET stock = stock - ? WHERE id_producto = ?',
          [item.Cantidad, item.id]
        );
      }

      // 6. Vaciar el carrito
      await connection.query('DELETE FROM carrito WHERE id_usuario = ?', [userId]);

      // 7. Confirmar la transacción
      await connection.commit();
      connection.release();

      res.json({ message: '✅ Compra realizada correctamente.', idVenta });

    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('❌ Error en transacción de compra:', error);
      res.status(500).json({ error: "Transacción cancelada: " + error.message });
    }
  });

  // 🔹 Obtener productos tipo suscripción
  app.get('/suscripciones', verifyToken, async (req, res) => {
      try {
          const [suscripciones] = await db.query(`
              SELECT id_producto, nombre, descripcion, precio
              FROM productos
              WHERE (categoria IS NULL OR categoria = 'ACCESORIOS')
              AND nombre LIKE 'Suscripción%'
          `);

          res.json(suscripciones);
      } catch (error) {
          console.error("❌ Error al obtener suscripciones:", error);
          res.status(500).json({ error: "Error al obtener suscripciones." });
      }
  });

  // 🔹 Generar factura (para productos o suscripciones)
  app.get('/ultima-venta-suscripcion', verifyToken, async (req, res) => {
      try {
        // Buscar última venta del usuario
        const [ventas] = await db.query(
          'SELECT id_venta FROM ventas WHERE id_usuario = ? ORDER BY id_venta DESC LIMIT 1',
          [req.userId]
        );
    
        if (ventas.length === 0) {
          return res.status(404).json({ error: "No hay ventas." });
        }
    
        const idVenta = ventas[0].id_venta;
    
        // Buscar detalle de esa venta
        const [productos] = await db.query(`
          SELECT p.nombre AS Modelo, p.descripcion, dv.cantidad, dv.precio_unitario
          FROM detalle_ventas dv
          JOIN productos p ON dv.id_producto = p.id_producto
          WHERE dv.id_venta = ?
        `, [idVenta]);
    
        res.json({ productos });
      } catch (error) {
        console.error("❌ Error al consultar venta de suscripción:", error);
        res.status(500).json({ error: "Error en el servidor." });
      }
    });
    
  // Nueva ruta
  app.get("/ultima-venta", verifyToken, async (req, res) => {
      try {
        const [[ultimaVenta]] = await db.query(
          `SELECT id_venta FROM ventas WHERE id_usuario = ? ORDER BY fecha_venta DESC LIMIT 1`,
          [req.userId]
        );
    
        if (!ultimaVenta) return res.json({ productos: [] });
    
        const [productos] = await db.query(
          `SELECT p.nombre AS Modelo, p.descripcion, dv.cantidad, dv.precio_unitario
          FROM detalle_ventas dv
          JOIN productos p ON dv.id_producto = p.id_producto
          WHERE dv.id_venta = ?`,
          [ultimaVenta.id_venta]
        );      
    
        res.json({ productos });
      } catch (error) {
        console.error("❌ Error al obtener la última venta:", error);
        res.status(500).json({ error: "Error al obtener la última venta." });
      }
  });

  // 🔹 Comprar suscripción (registrar como venta real en detalle_ventas)
  app.post('/comprar-suscripcion', verifyToken, async (req, res) => {
      const { tipo } = req.body;
      const id_usuario = req.userId;

      if (!tipo || !["MENSUAL", "ANUAL"].includes(tipo)) {
          return res.status(400).json({ error: "Tipo de suscripción inválido." });
      }

      const fecha_inicio = new Date();
      let fecha_fin;
      let monto;
      let idProductoSuscripcion;

      if (tipo === "MENSUAL") {
          fecha_fin = new Date();
          fecha_fin.setMonth(fecha_inicio.getMonth() + 1);
          monto = 179.99;
          idProductoSuscripcion = 5;
      } else {
          fecha_fin = new Date();
          fecha_fin.setFullYear(fecha_inicio.getFullYear() + 1);
          monto = 899.99;
          idProductoSuscripcion = 6;
      }

      try {
          // 1. Insertar en tabla suscripciones
          await db.query(
              'INSERT INTO suscripciones (id_usuario, tipo, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?)',
              [id_usuario, tipo, fecha_inicio, fecha_fin]
          );

          // 2. Insertar en tabla ventas
          const [ventaResult] = await db.query(
              'INSERT INTO ventas (id_usuario, total) VALUES (?, ?)',
              [id_usuario, monto]
          );
          const idVenta = ventaResult.insertId;

          // 3. Insertar en detalle_ventas usando el ID del producto real
          await db.query(
              'INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
              [idVenta, idProductoSuscripcion, 1, monto]
          );

          res.json({ message: "✅ Suscripción registrada y venta generada correctamente." });

      } catch (error) {
          console.error("❌ Error al registrar suscripción:", error);
          res.status(500).json({ error: "Error en el servidor." });
      }
  });

  // 🔹 Obtener suscripción activa
  app.get('/suscripcion-activa', verifyToken, async (req, res) => {
      try {
        const [result] = await db.query(`
          SELECT tipo, fecha_fin 
          FROM suscripciones 
          WHERE id_usuario = ? 
          ORDER BY fecha_fin DESC 
          LIMIT 1
        `, [req.userId]);
    
        if (result.length === 0) {
          return res.json({ activa: false });
        }
    
        const { tipo, fecha_fin } = result[0];
        const hoy = new Date();
        const fin = new Date(fecha_fin);
        const dias_restantes = Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
    
        if (dias_restantes <= 0) {
          return res.json({ activa: false });
        }
    
        res.json({
          activa: true,
          tipo,
          dias_restantes
        });
      } catch (error) {
        console.error("❌ Error al verificar suscripción:", error);
        res.status(500).json({ error: "Error al consultar suscripción activa." });
      }
    });
    
    app.get("/historial-compras", verifyToken, async (req, res) => {
      try {
        const [ventas] = await db.query(
          "SELECT id_venta, fecha_venta, total FROM ventas WHERE id_usuario = ? ORDER BY fecha_venta DESC",
          [req.userId]
        );
    
        res.json(ventas);
      } catch (error) {
        console.error("❌ Error al obtener historial:", error);
        res.status(500).json({ error: "Error al obtener historial de compras." });
      }
  });

  // ✅ Ruta nueva para obtener los productos de una venta específica
  app.get("/detalle-venta/:id_venta", verifyToken, async (req, res) => {
      const { id_venta } = req.params;
    
      try {
        const [detalles] = await db.query(`
          SELECT dv.id_detalle, p.nombre, p.descripcion, dv.cantidad, dv.precio_unitario
          FROM detalle_ventas dv
          JOIN productos p ON dv.id_producto = p.id_producto
          WHERE dv.id_venta = ?
        `, [id_venta]);
    
        res.json(detalles);
      } catch (error) {
        console.error("❌ Error al obtener detalle de venta:", error);
        res.status(500).json({ error: "Error al obtener detalle de venta." });
      }
  });

  // 🔹 Generar factura (crear PDF, actualizar datos, etc)
  app.post("/generar-factura", verifyToken, async (req, res) => {
    const { Id_usuario, Nombre, RFC, Direccion, Total, Id_venta, razon_social } = req.body;

    try {
      // Puedes guardar los datos del usuario (opcional)
      await db.query(
        `UPDATE usuarios SET nombre = ?, rfc = ?, direccion = ?, razon_social = ? WHERE id_usuario = ?`,
        [ Nombre, RFC, Direccion, razon_social || "", Id_usuario ]
      );    

      let productos = [];

      if (Id_venta) {
        // Obtener productos de esa venta
        const [rows] = await db.query(`
          SELECT p.nombre, p.descripcion, dv.cantidad, dv.precio_unitario
          FROM detalle_ventas dv
          JOIN productos p ON dv.id_producto = p.id_producto
          WHERE dv.id_venta = ?`, [Id_venta]
        );

        productos = rows;
      } else {
        // Obtener última venta (por si no se pasó el ID)
        const [[venta]] = await db.query(`
          SELECT id_venta FROM ventas 
          WHERE id_usuario = ? 
          ORDER BY fecha_venta DESC LIMIT 1`, [Id_usuario]
        );

        if (!venta) {
          return res.status(404).json({ error: "No se encontró la venta para generar la factura." });
        }

        const [rows] = await db.query(`
          SELECT p.nombre, p.descripcion, dv.cantidad, dv.precio_unitario
          FROM detalle_ventas dv
          JOIN productos p ON dv.id_producto = p.id_producto
          WHERE dv.id_venta = ?`, [venta.id_venta]
        );

        productos = rows;
      }

      return res.json({ message: "✅ Factura lista", productos });

    } catch (error) {
      console.error("❌ Error al generar factura:", error);
      res.status(500).json({ error: "Error al generar factura" });
    }
  });

  //admin
  //Gestion De Productos
  app.get("/admin/productos", verifyToken, async (req, res) => {
      try {
        const [productos] = await db.query("SELECT * FROM productos");
        res.json(productos);
      } catch (error) {
        console.error("❌ Error al obtener productos:", error);
        res.status(500).json({ error: "Error al obtener productos" });
      }
  });

  app.post("/admin/productos", verifyToken, async (req, res) => {
      const { nombre, descripcion, precio, stock, imagen, categoria } = req.body;
    
      try {
        await db.query(`
          INSERT INTO productos (nombre, descripcion, precio, stock, imagen, categoria)
          VALUES (?, ?, ?, ?, ?, ?)`,
          [nombre, descripcion, precio, stock, imagen, categoria]
        );
    
        res.json({ message: "✅ Producto agregado correctamente." });
      } catch (error) {
        console.error("❌ Error al agregar producto:", error);
        res.status(500).json({ error: "Error al agregar producto" });
      }
  });
    
  app.put("/admin/productos/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { nombre, descripcion, precio, stock, imagen, categoria } = req.body;
    
      try {
        await db.query(`
          UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ?, imagen = ?, categoria = ?
          WHERE id_producto = ?`,
          [nombre, descripcion, precio, stock, imagen, categoria, id]
        );
    
        res.json({ message: "✅ Producto actualizado correctamente." });
      } catch (error) {
        console.error("❌ Error al editar producto:", error);
        res.status(500).json({ error: "Error al editar producto" });
      }
  });
    
    app.delete("/admin/productos/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
    
      try {
        await db.query("DELETE FROM productos WHERE id_producto = ?", [id]);
        res.json({ message: "🗑️ Producto eliminado correctamente." });
      } catch (error) {
        console.error("❌ Error al eliminar producto:", error);
        res.status(500).json({ error: "Error al eliminar producto" });
      }
  });

  // Obtener todos los usuarios
  app.get("/admin/usuarios", verifyToken, async (req, res) => {
      try {
        const [adminCheck] = await db.query("SELECT tipo_usuario FROM usuarios WHERE id_usuario = ?", [req.userId]);
        if (!adminCheck.length || adminCheck[0].tipo_usuario !== 1) {
          return res.status(403).json({ error: "Acceso denegado. Solo administradores." });
        }
    
        const [usuarios] = await db.query("SELECT id_usuario, nombre, email, tipo_usuario FROM usuarios");
        res.json(usuarios);
      } catch (error) {
        console.error("❌ Error al obtener usuarios:", error);
        res.status(500).json({ error: "Error al obtener usuarios." });
      }
  });
    
    // Cambiar el tipo de usuario
    app.put("/admin/usuarios/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { tipo_usuario } = req.body;
    
      try {
        const [adminCheck] = await db.query("SELECT tipo_usuario FROM usuarios WHERE id_usuario = ?", [req.userId]);
        if (!adminCheck.length || adminCheck[0].tipo_usuario !== 1) {
          return res.status(403).json({ error: "Solo un admin puede cambiar roles." });
        }
    
        await db.query("UPDATE usuarios SET tipo_usuario = ? WHERE id_usuario = ?", [tipo_usuario, id]);
        res.json({ message: "✅ Rol actualizado correctamente." });
      } catch (error) {
        console.error("❌ Error al actualizar rol:", error);
        res.status(500).json({ error: "Error al actualizar rol." });
      }
  });

  app.post("/admin/registrar", verifyToken, async (req, res) => {
      const { nombre, correo, contraseña } = req.body;
    
      try {
        const [existe] = await db.query("SELECT * FROM usuarios WHERE email = ?", [correo]);
        if (existe.length > 0) {
          return res.status(400).json({ error: "El correo ya está registrado." });
        }
    
        const hashed = await bcrypt.hash(contraseña, 10);
    
        await db.query(
          `INSERT INTO usuarios (nombre, email, password, tipo_usuario) VALUES (?, ?, ?, 1)`,
          [nombre, correo, hashed]
        );
    
        res.json({ message: "✅ Admin registrado correctamente." });
    
      } catch (error) {
        console.error("❌ Error al registrar admin:", error);
        res.status(500).json({ error: "Error en el servidor." });
      }
  });

  app.get("/admin/reportes-detallados", verifyToken, async (req, res) => {
    try {
      const [porCategoria] = await db.query(`
        SELECT p.categoria, SUM(dv.cantidad) AS total_vendidos
        FROM detalle_ventas dv
        JOIN productos p ON dv.id_producto = p.id_producto
        GROUP BY p.categoria;
      `);

      const [suscripciones] = await db.query(`
        SELECT tipo, COUNT(*) AS cantidad
        FROM suscripciones
        GROUP BY tipo;
      `);

      const [porDia] = await db.query(`
        SELECT DATE(fecha_venta) AS fecha, SUM(total) AS total_dia
        FROM ventas
        GROUP BY DATE(fecha_venta)
        ORDER BY fecha ASC;
      `);

      const [topProductos] = await db.query(`
        SELECT p.nombre, SUM(dv.cantidad) AS total_vendidos
        FROM detalle_ventas dv
        JOIN productos p ON dv.id_producto = p.id_producto
        GROUP BY p.nombre
        ORDER BY total_vendidos DESC
        LIMIT 5;
      `);

      const [duracionSuscripciones] = await db.query(`
        SELECT 
          tipo,
          COUNT(*) AS total_suscripciones,
          AVG(DATEDIFF(fecha_fin, fecha_inicio)) AS duracion_promedio
        FROM suscripciones
        GROUP BY tipo
        ORDER BY duracion_promedio DESC;
      `);

      const [chaquetasVendidas] = await db.query(`
        SELECT p.nombre, SUM(dv.cantidad) AS total_vendidos
        FROM detalle_ventas dv
        JOIN productos p ON dv.id_producto = p.id_producto
        WHERE p.categoria = 'CHAQUETA INTELIGENTE'
        GROUP BY p.id_producto
        ORDER BY total_vendidos DESC;
      `);

      const [rutasRecorridas] = await db.query(`
        SELECT u.nombre, SUM(r.distancia_km) AS distancia_total, SUM(r.tiempo_segundos) AS tiempo_total
        FROM rutas r
        JOIN usuarios u ON r.id_usuario = u.id_usuario
        GROUP BY u.id_usuario;
      `);

      const [rutasPorUsuario] = await db.query(`
        SELECT u.nombre, 
               SUM(r.distancia_km) AS distancia_total, 
               SUM(r.tiempo_segundos) AS tiempo_total
        FROM rutas r
        JOIN usuarios u ON u.id_usuario = r.id_usuario
        GROUP BY u.id_usuario;
      `);

      res.json({
        porCategoria,
        suscripciones,
        porDia,
        topProductos,
        duracionSuscripciones,
        chaquetasVendidas,
        rutas: rutasRecorridas,
        rutasPorUsuario: rutasPorUsuario
      });

    } catch (error) {
      console.error("❌ Error en reportes detallados:", error);
      res.status(500).json({ error: "Error al obtener reportes." });
    }
  });

  app.put('/perfil/actualizar', verifyToken, async (req, res) => {
    const { nombre, rfc, razon_social, direccion } = req.body;

    try {
      await db.query(
        `UPDATE usuarios SET nombre = ?, rfc = ?, razon_social = ?, direccion = ? WHERE id_usuario = ?`,
        [nombre, rfc, razon_social, direccion, req.userId]
      );

      const [updated] = await db.query(
        `SELECT id_usuario, nombre, email, rfc, razon_social, direccion FROM usuarios WHERE id_usuario = ?`,
        [req.userId]
      );

      res.json(updated[0]);
    } catch (error) {
      console.error("❌ Error al actualizar perfil:", error);
      res.status(500).json({ error: "Error al actualizar perfil." });
    }
  });

  // Crear carpeta si no existe
  const uploadDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  // Ruta para subir imagen
  app.post("/admin/upload", verifyToken, upload.single("imagen"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No se subió ninguna imagen." });
    }
  
    // Devuelve solo la ruta para guardar en la BD
    const ruta = `/uploads/${req.file.filename}`;
    res.json({ url: ruta });
  });

  app.get("/admin/alertas-stock", verifyToken, async (req, res) => {
    try {
      // Validar que sea admin
      const [[usuario]] = await db.query("SELECT tipo_usuario FROM usuarios WHERE id_usuario = ?", [req.userId]);
      if (usuario.tipo_usuario !== 1) {
        return res.status(403).json({ error: "Solo administradores." });
      }

      // Buscar productos con stock agotado
      const [agotados] = await db.query(`
        SELECT id_producto, nombre, stock 
        FROM productos 
        WHERE stock = 0
      `);

      res.json({ agotados });

    } catch (error) {
      console.error("❌ Error al obtener alertas de stock:", error);
      res.status(500).json({ error: "Error al obtener alertas de stock." });
    }
  });

  // 🔹 Endpoint para verificar estado de suscripción y si ha comprado chaqueta
  app.get("/suscripcion-estado", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token requerido" });
    }

    const token = authHeader.split(" ")[1];
    let userId;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch (error) {
      return res.status(403).json({ error: "Token inválido" });
    }

    try {
      // 🔍 Buscar la suscripción activa
      const [subs] = await db.query(
        "SELECT fecha_fin FROM suscripciones WHERE id_usuario = ? ORDER BY fecha_fin DESC LIMIT 1",
        [userId]
      );

      let tieneSuscripcionActiva = false;
      let mensaje = "";

      if (subs.length > 0) {
        const fechaFin = new Date(subs[0].fecha_fin);
        const hoy = new Date();
        if (fechaFin >= hoy) {
          tieneSuscripcionActiva = true;
        }
      }

      // 🔍 Verificar si ya compró una chaqueta (categoría CHAQUETA INTELIGENTE)
      const [comprasChaquetas] = await db.query(
        `SELECT dv.* FROM detalle_ventas dv
        JOIN ventas v ON dv.id_venta = v.id_venta
        JOIN productos p ON dv.id_producto = p.id_producto
        WHERE v.id_usuario = ? AND p.categoria = 'CHAQUETA INTELIGENTE'`,
        [userId]
      );

      const haCompradoChaqueta = comprasChaquetas.length > 0;

      // 🧠 Mensaje más preciso
      if (!haCompradoChaqueta) {
        mensaje = "Te recomendamos adquirir tu primera chaqueta inteligente para comenzar a usar la app.";
      } else {
        if (subs.length === 0) {
          mensaje = "Activa tu primera suscripción para disfrutar de las funciones premium.";
        } else if (!tieneSuscripcionActiva) {
          mensaje = "Tu suscripción ha expirado. Por favor, renuévala para seguir disfrutando de las funciones premium.";
        }
      }

      res.json({
        tieneSuscripcionActiva,
        haCompradoChaqueta,
        mensaje
      });

    } catch (error) {
      console.error("❌ Error al verificar suscripción:", error);
      res.status(500).json({ error: "Error del servidor al verificar la suscripción" });
    }
  });
