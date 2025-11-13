<?php
require_once 'db_connect.php';
$conn = getDbConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'POST') {
    // Registrar una nueva venta
    $data = json_decode(file_get_contents("php://input"), true);
    
    // --- 1. Insertar Encabezado de Venta (Sales) ---
    $conn->begin_transaction();
    
    // user_id debe venir de la sesión o ser simulado (ej: 1)
    $userId = 1; 
    $patientId = $data['patient_id'] ?? null; 

    $sqlSale = "INSERT INTO Sales (patient_id, user_id, subtotal, discount_amount, total_net, payment_method) 
                VALUES (?, ?, ?, ?, ?, ?)";
    $stmtSale = $conn->prepare($sqlSale);
    
    // Usar 'i' para int, 'd' para double, 's' para string
    // Si patient_id puede ser NULL, el binding es complejo. Simplificaremos asumiendo 'i' o 's' para NULL.
    // Usamos NULL para el patient_id si no existe.
    $stmtSale->bind_param("idddds", 
        $patientId, $userId, $data['subtotal'], $data['discount_amount'], 
        $data['total_net'], $data['payment_method']
    );

    if (!$stmtSale->execute()) {
        $conn->rollback();
        sendJsonResponse(array("message" => "Error al registrar venta: " . $conn->error), 500);
    }
    $saleId = $conn->insert_id;

    // --- 2. Insertar Detalle y Actualizar Stock ---
    foreach ($data['items'] as $item) {
        // Encontrar product_id usando SKU
        $stmtProduct = $conn->prepare("SELECT id, stock, type FROM Products WHERE sku = ?");
        $stmtProduct->bind_param("s", $item['sku']);
        $stmtProduct->execute();
        $productResult = $stmtProduct->get_result()->fetch_assoc();
        
        if (!$productResult) continue; // Producto no encontrado, omitir o logear error

        $productId = $productResult['id'];
        
        // Insertar Detalle de Venta
        $sqlDetail = "INSERT INTO SaleDetails (sale_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)";
        $stmtDetail = $conn->prepare($sqlDetail);
        $stmtDetail->bind_param("iiid", $saleId, $productId, $item['qty'], $item['price']);
        if (!$stmtDetail->execute()) {
            $conn->rollback();
            sendJsonResponse(array("message" => "Error al registrar detalle: " . $conn->error), 500);
        }

        // Actualizar Stock (solo si no es un servicio)
        if ($productResult['type'] != 'Servicio') {
            $newStock = $productResult['stock'] - $item['qty'];
            $sqlUpdateStock = "UPDATE Products SET stock = ? WHERE id = ?";
            $stmtUpdateStock = $conn->prepare($sqlUpdateStock);
            $stmtUpdateStock->bind_param("ii", $newStock, $productId);
            if (!$stmtUpdateStock->execute()) {
                $conn->rollback();
                sendJsonResponse(array("message" => "Error al actualizar stock"), 500);
            }
        }
    }

    $conn->commit();
    sendJsonResponse(array("message" => "Venta procesada con éxito", "sale_id" => $saleId), 201);

} else {
    sendJsonResponse(array("message" => "Método no permitido"), 405);
}
$conn->close();
?>