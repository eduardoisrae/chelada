const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const config = require('./config');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Configurar la conexión a PostgreSQL con mejor manejo de errores
const pool = new Pool(config.db);

// Mejor manejo de la conexión inicial
const initializeDatabase = async () => {
    try {
        const client = await pool.connect();
        console.log('Conexión exitosa con la base de datos');
        client.release();
    } catch (err) {
        console.error('Error al conectar con la base de datos:', err);
    }
};

initializeDatabase();

// Middleware para verificar el estado de la conexión
app.use(async (req, res, next) => {
    try {
        const client = await pool.connect();
        client.release();
        next();
    } catch (err) {
        console.error('Error de conexión:', err);
        res.status(500).json({ message: 'Error de conexión con la base de datos' });
    }
});

// Tus rutas existentes comienzan aquí
app.post('/register', async (req, res) => {
    console.log('Datos recibidos:', req.body);

    const { nombre, contrasena } = req.body;
    
    if (!nombre || !contrasena) {
        return res.status(400).json({ 
            message: 'Nombre y contraseña son requeridos' 
        });
    }

    try {
        const userCheck = await pool.query(
            'SELECT * FROM usuarios WHERE nombre = $1',
            [nombre]
        );

        if (userCheck.rows.length > 0) {
            return res.status(400).json({ 
                message: 'El usuario ya existe' 
            });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

        const result = await pool.query(
            'INSERT INTO usuarios (nombre, contrasena) VALUES ($1, $2) RETURNING id_usuario',  
            [nombre, hashedPassword]
        );

        res.status(201).json({ 
            message: 'Usuario registrado exitosamente',
            userId: result.rows[0].id 
        });

    } catch (error) {
        console.error('Error detallado:', error); 
        res.status(500).json({ 
            message: 'Error al registrar el usuario',
            error: error.message 
        });
    }
});

app.post('/login', async (req, res) => {
    const { nombre, contrasena } = req.body;

    console.log('Datos recibidos:', req.body);

    if (!nombre || !contrasena) {
        return res.status(400).json({ message: 'Nombre y contraseña son requeridos' });
    }

    if (['ale', 'oscar', 'eduardo'].includes(nombre) && contrasena === 'enchiladamir') {
        return res.status(200).json({
            success: true,
            message: 'Inicio de sesión exitoso, redirigiendo a manager...',
            redirect: 'manager.html'
        });
    }

    try {
        const userCheck = await pool.query('SELECT * FROM usuarios WHERE nombre = $1', [nombre]);

        if (userCheck.rows.length === 0) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }

        const user = userCheck.rows[0];

        const match = await bcrypt.compare(contrasena, user.contrasena);
        if (!match) {
            return res.status(400).json({ message: 'Contraseña incorrecta' });
        }

        res.status(200).json({
            success: true,
            message: 'Inicio de sesión exitoso',
            redirect: 'sesion.html'
        });
    } catch (error) {
        console.error('Error al verificar el login:', error);
        res.status(500).json({ message: 'Error al iniciar sesión' });
    }
});

app.post('/send-message', async (req, res) => {
    const { correo, contenido_correo } = req.body;

    if (!correo || !contenido_correo) {
        return res.status(400).json({
            message: 'El correo y el mensaje son requeridos'
        });
    }

    try {
        const result = await pool.query(
            'INSERT INTO mensajes (correo, contenido_correo) VALUES ($1, $2) RETURNING id_mensaje',
            [correo, contenido_correo]
        );

        res.status(201).json({
            message: 'Mensaje enviado exitosamente',
            mensajeId: result.rows[0].id_mensaje
        });
    } catch (error) {
        console.error('Error al enviar el mensaje:', error);
        res.status(500).json({
            message: 'Error al enviar el mensaje',
            error: error.message
        });
    }
});

app.post('/confirmar-pedido', async (req, res) => {
    const { id_usuario, total, nombre, direccion, telefono, pedido } = req.body;

    if (!id_usuario || !total || !nombre || !direccion || !telefono || !pedido) {
        return res.status(400).json({ success: false, message: 'Faltan datos en el pedido' });
    }

    try {
        const totalLimpio = parseFloat(total.toString().replace(/[^0-9.]/g, ''));
        if (isNaN(totalLimpio)) {
            return res.status(400).json({ success: false, message: 'El total es inválido' });
        }

        const result = await pool.query(
            'INSERT INTO ordenes (id_usuario, total, nombre, direccion, telefono, pedido) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_orden',
            [id_usuario, totalLimpio, nombre, direccion, telefono, pedido]
        );

        res.status(200).json({ success: true, message: 'Pedido confirmado correctamente' });
    } catch (error) {
        console.error('Error al guardar el pedido:', error);
        res.status(500).json({ success: false, message: 'Hubo un error al confirmar el pedido' });
    }
});

app.get('/obtener-ordenes', async (req, res) => {
    try {
        const query = 'SELECT id_orden, nombre, direccion, telefono, pedido, total FROM ordenes;';
        const result = await pool.query(query);

        res.status(200).json({
            success: true,
            orders: result.rows,
        });
    } catch (error) {
        console.error('Error al obtener las órdenes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las órdenes.',
        });
    }
});

app.delete('/eliminar-orden', async (req, res) => {
    try {
        const { id_orden } = req.body;
        if (!id_orden) {
            return res.status(400).json({ success: false, message: 'El ID de la orden es obligatorio.' });
        }

        const query = 'DELETE FROM ordenes WHERE id_orden = $1;';
        await pool.query(query, [id_orden]);

        res.status(200).json({ success: true, message: 'Orden eliminada con éxito.' });
    } catch (error) {
        console.error('Error al eliminar la orden:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar la orden.' });
    }
});

app.get('/obtener-mensajes', async (req, res) => {
    try {
        const query = 'SELECT correo, contenido_correo FROM mensajes;';
        const result = await pool.query(query);

        console.log(result.rows);

        res.status(200).json({
            success: true,
            mensajes: result.rows,
        });
    } catch (error) {
        console.error('Error al obtener los mensajes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los mensajes.',
        });
    }
});

// Manejo de errores general
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor'
    });
});

// Configuración del puerto para Render
const PORT = process.env.PORT || 3003;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

// Keep-alive para evitar timeouts
setInterval(() => {
    pool.query('SELECT 1')
        .catch(err => console.error('Error en keep-alive:', err));
}, 60000);

// Manejo graceful de cierre
process.on('SIGTERM', () => {
    console.log('SIGTERM recibido. Cerrando servidor...');
    server.close(() => {
        pool.end(() => {
            console.log('Conexiones de base de datos cerradas');
            process.exit(0);
        });
    });
});
