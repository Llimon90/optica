<?php
require_once 'config.php';

// Función para establecer la conexión a la base de datos
function getDbConnection() {
    $conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

    // Verificar conexión
    if ($conn->connect_error) {
        // En producción: No mostrar el error directamente al usuario, solo en logs
        http_response_code(500);
        die(json_encode(array("message" => "Error de conexión: " . $conn->connect_error)));
    }
    
    // Configurar charset
    $conn->set_charset("utf8mb4");
    
    return $conn;
}

// Función para manejar las respuestas JSON
function sendJsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}
?>