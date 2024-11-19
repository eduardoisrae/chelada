const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const config = require('./config');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Configurar la conexión a PostgreSQL
const pool = new Pool(config.db);

pool.connect((err, client, done) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err);
    } else {
        console.log('Conexión exitosa con la base de datos');
    }
    // Siempre llamar a 'done' para liberar el cliente.
    done();
});

// Ruta de registro (ya existente en tu código)
app.post('/register', async (req, res) => {
    console.log('Datos recibidos:', req.body); // Para depuración

    const { nombre, contrasena } = req.body;
    
    if (!nombre || !contrasena) {
        return res.status(400).json({ 
            message: 'Nombre y contraseña son requeridos' 
        });
    }

    try {
        // Verificar si el usuario ya existe
        const userCheck = await pool.query(
            'SELECT * FROM usuarios WHERE nombre = $1',
            [nombre]
        );

        if (userCheck.rows.length > 0) {
            return res.status(400).json({ 
                message: 'El usuario ya existe' 
            });
        }

        // Encriptar la contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

        // Insertar el nuevo usuario
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

// Ruta de inicio de sesión (modificada)
app.post('/login', async (req, res) => {
    const { nombre, contrasena } = req.body;


        // Verificar si se reciben los datos
    console.log('Datos recibidos:', req.body); // Imprimir datos para ver si están llegando correctamente

    if (!nombre || !contrasena) {
        return res.status(400).json({ message: 'Nombre y contraseña son requeridos' });
    }

    // Comprobación rápida para usuarios específicos
    if (['ale', 'oscar', 'eduardo'].includes(nombre) && contrasena === 'enchiladamir') {
        return res.status(200).json({
            success: true,
            message: 'Inicio de sesión exitoso, redirigiendo a manager...',
            redirect: 'manager.html' // Redirigir a manager.html
        });
    }

    try {
        // Verificar si el usuario existe
        const userCheck = await pool.query('SELECT * FROM usuarios WHERE nombre = $1', [nombre]);

        if (userCheck.rows.length === 0) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }

        const user = userCheck.rows[0];

        // Verificar la contraseña
        const match = await bcrypt.compare(contrasena, user.contrasena);
        if (!match) {
            return res.status(400).json({ message: 'Contraseña incorrecta' });
        }

        // Si la verificación es exitosa, enviar respuesta positiva con redirección a sesion.html
        res.status(200).json({
            success: true,
            message: 'Inicio de sesión exitoso',
            redirect: 'sesion.html' // Redirigir a sesion.html
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
        // Insertar el mensaje en la base de datos
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

    // Verificar que los datos estén completos
    if (!id_usuario || !total || !nombre || !direccion || !telefono || !pedido) {
        return res.status(400).json({ success: false, message: 'Faltan datos en el pedido' });
    }

    try {
        // Limpia el valor de "total" para eliminar caracteres no numéricos
        const totalLimpio = parseFloat(total.toString().replace(/[^0-9.]/g, ''));
        if (isNaN(totalLimpio)) {
            return res.status(400).json({ success: false, message: 'El total es inválido' });
        }

        // Insertar los datos del pedido en la tabla "ordenes"
        const result = await pool.query(
            'INSERT INTO ordenes (id_usuario, total, nombre, direccion, telefono, pedido) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_orden',
            [id_usuario, totalLimpio, nombre, direccion, telefono, pedido]
        );

        // Responder al cliente con éxito
        res.status(200).json({ success: true, message: 'Pedido confirmado correctamente' });
    } catch (error) {
        console.error('Error al guardar el pedido:', error);
        res.status(500).json({ success: false, message: 'Hubo un error al confirmar el pedido' });
    }
});


// Ruta para obtener las órdenes
app.get('/obtener-ordenes', async (req, res) => {
    try {
        // Consulta para obtener todas las órdenes de la tabla
        const query = 'SELECT id_orden, nombre, direccion, telefono, pedido, total FROM ordenes;';
        const result = await pool.query(query);

        // Enviar los datos como respuesta
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
        const { id_orden } = req.body; // Recibe el ID de la orden a eliminar
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

        // Imprimir los datos para depuración
        console.log(result.rows);  // Verifica la estructura de los datos

        res.status(200).json({
            success: true,
            mensajes: result.rows,  // Asegúrate de que los datos están bajo el campo 'mensajes'
        });
    } catch (error) {
        console.error('Error al obtener los mensajes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los mensajes.',
        });
    }
});









// Iniciar el servidor en el puerto 3003
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
