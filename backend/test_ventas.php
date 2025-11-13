<?php
require_once 'db_connect.php';

// Verificar conexión
$conn = getDbConnection();
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}
echo "✅ Conexión exitosa<br>";

// Verificar tablas
$tables = ['Sales', 'SaleDetails', 'Products'];
foreach ($tables as $table) {
    $result = $conn->query("SHOW TABLES LIKE '$table'");
    if ($result->num_rows > 0) {
        echo "✅ Tabla $table existe<br>";
    } else {
        echo "❌ Tabla $table NO existe<br>";
    }
}

// Verificar estructura de SaleDetails
$result = $conn->query("DESCRIBE SaleDetails");
echo "<br>Estructura de SaleDetails:<br>";
while ($row = $result->fetch_assoc()) {
    echo "{$row['Field']} - {$row['Type']}<br>";
}

$conn->close();
?>