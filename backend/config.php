<?php
// Configuración de la base de datos de Hostinger
define('DB_SERVER', 'localhost');
define('DB_USERNAME', 'u179371012_optica');
define('DB_PASSWORD', 'Optica2025@');
define('DB_NAME', 'u179371012_optica');

// URL base para CORS (IMPORTANTE para peticiones AJAX desde HTML)
// En producción, debe ser la URL de tu dominio (ej: 'https://opticflow.com')
define('FRONTEND_URL', '*'); 

// Set Headers para CORS y JSON
header("Access-Control-Allow-Origin: " . FRONTEND_URL);
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
?>