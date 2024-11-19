





const config = {
    db: {
        host: 'dpg-cstbsfi3esus739ucuc0-a.oregon-postgres.render.com',
        user: 'mir_8hw2_user',
        password: '1wLd6OGwnQMpgUofTODwlNEbtIlBkQUX',
        database: 'mir_8hw2',
        port: 5432,
        ssl: {
            rejectUnauthorized: false,
            sslmode: 'require'
        },
        connectionTimeoutMillis: 5000, // Timeout de conexión
        idleTimeoutMillis: 30000      // Timeout de inactividad
    }
};

module.exports = config;
