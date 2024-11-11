const mysql = require('mysql2/promise'); // Usar promesas
const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors'); // Importar cors

require('dotenv').config();

const app = express();
app.use(cors());

const result = require('dotenv').config({ path: './server.env' });

if (result.error) {
  console.log('Error cargando el archivo .env:', result.error);
} else {
  console.log('Archivo .env cargado correctamente');
}


// Middleware para parsear el cuerpo de las solicitudes
app.use(bodyParser.json()); // Parsear datos en formato JSON
app.use(bodyParser.urlencoded({ extended: true })); // Parsear datos desde formularios

// Configurar la conexión a MySQL con promesas
const db = mysql.createPool({
  host: process.env.DB_HOST,     // Debería ser 'localhost' si estás en local
  user: process.env.DB_USER,     // Tu nombre de usuario de MySQL
  password: process.env.DB_PASSWORD, // Tu contraseña de MySQL
  port: 3306,                    // Puerto por defecto de MySQL
  database: process.env.DB_NAME  // Nombre de la base de datos
});


// Verificar la conexión a la base de datos
db.getConnection()
  .then(connection => {
    console.log("Conexión a MySQL establecida.");
    connection.release();
  })
  .catch(error => {
    console.error("Ha ocurrido un error en la conexión:", error);
  });

// Middleware de autenticación para proteger rutas
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado, token no proporcionado' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido' });
    }
    req.user = decoded;
    next();
  });
};

// Middleware de validación de datos para el registro
const validateRegisterData = (req, res, next) => {
  const { nombre, apellido, email, contraseña } = req.body;

  if (!nombre || !apellido || !email || !contraseña) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'El formato del correo electrónico no es válido' });
  }

  next();
};

// Ruta de registro
app.post('/register', validateRegisterData, async (req, res) => {
  const { nombre, apellido, email, contraseña } = req.body;

  try {
    // Comprobar si el email ya está registrado
    const [results] = await db.query('SELECT * FROM Usuario WHERE email = ?', [email]);

    if (results.length > 0) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(contraseña, 10);

    // Insertar el usuario en la base de datos
    await db.query(
      'INSERT INTO Usuario (nombre, apellido, email, contraseña) VALUES (?, ?, ?, ?)',
      [nombre, apellido, email, hashedPassword]
    );

    res.status(201).json({ message: 'Usuario registrado con éxito' });
  } catch (err) {
    res.status(500).json({ message: 'Error en el servidor', error: err });
  }
});

// Ruta de login
app.post('/login', async (req, res) => {
  const { email, contraseña } = req.body;

  try {
    const [results] = await db.query('SELECT * FROM Usuario WHERE email = ?', [email]);

    if (results.length === 0) {
      return res.status(401).json({ message: 'Email o contraseña incorrectos' });
    }

    const user = results[0];

    // Comparar contraseña
    const match = await bcrypt.compare(contraseña, user.contraseña);
    if (!match) {
      return res.status(401).json({ message: 'Email o contraseña incorrectos' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { usuario_id: user.usuario_id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ message: 'Inicio de sesión exitoso', token });
  } catch (err) {
    res.status(500).json({ message: 'Error en el servidor', error: err });
  }
});

// Ruta protegida de ejemplo
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Acceso permitido', data: req.user });
});

// Configurar el servidor para escuchar en el puerto 3000
app.listen(3000, () => {
  console.log('Servidor Express en el puerto 3000');
});
