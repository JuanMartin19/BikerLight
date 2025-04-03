const bcrypt = require("bcryptjs");

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10); // Generar el "salt" de seguridad
  const hashedPassword = await bcrypt.hash(password, salt); // Hashear la contraseña
  console.log("Contraseña hasheada:", hashedPassword);
}

// ✅ Escribe la contraseña que quieres convertir
hashPassword("samarripa11");