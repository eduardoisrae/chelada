<?php
// Configuración de la base de datos
$host = "localhost";
$dbname = "mirp";
$username = "mico";
$password = "mico12";

// Habilitar CORS para desarrollo
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Manejar la solicitud OPTIONS para CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Verificar que sea una solicitud POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

try {
    // Obtener y decodificar los datos JSON enviados
    $datos = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($datos['name']) || !isset($datos['password'])) {
        throw new Exception('Faltan datos requeridos');
    }

    $nombre = trim($datos['name']);
    $password = trim($datos['password']);

    // Validaciones básicas
    if (empty($nombre) || empty($password)) {
        throw new Exception('Todos los campos son obligatorios');
    }

    if (strlen($password) < 6) {
        throw new Exception('La contraseña debe tener al menos 6 caracteres');
    }

    // Conexión a la base de datos usando PDO
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Verificar si el usuario ya existe
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM usuarios WHERE nombre = ?");
    $stmt->execute([$nombre]);
    if ($stmt->fetchColumn() > 0) {
        throw new Exception('El nombre de usuario ya está registrado');
    }

    // Hash de la contraseña
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // Insertar nuevo usuario
    $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, contrasena) VALUES (?, ?)");
    $stmt->execute([$nombre, $passwordHash]);

    echo json_encode([
        'success' => true,
        'message' => 'Usuario registrado exitosamente'
    ]);

} catch (PDOException $e) {
    error_log("Error de base de datos: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al conectar con la base de datos'
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>