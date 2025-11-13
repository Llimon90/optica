<?php
require_once 'db_connect.php';

$conn = getDbConnection();

// Verificar usuarios
$result = $conn->query("SELECT COUNT(*) as count FROM Users");
$userCount = $result->fetch_assoc()['count'];
echo "Usuarios en sistema: " . $userCount . "<br>";

if ($userCount == 0) {
    echo "❌ NO hay usuarios. Ejecuta el script SQL para crear uno.<br>";
} else {
    echo "✅ Hay usuarios en el sistema.<br>";
    
    // Mostrar usuarios
    $users = $conn->query("SELECT id, email, first_name, last_name FROM Users");
    while ($user = $users->fetch_assoc()) {
        echo " - Usuario ID: {$user['id']}, Nombre: {$user['first_name']} {$user['last_name']}, Email: {$user['email']}<br>";
    }
}

// Verificar productos
$result = $conn->query("SELECT COUNT(*) as count FROM Products");
echo "Productos en inventario: " . $result->fetch_assoc()['count'] . "<br>";

$conn->close();
?>