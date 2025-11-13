<?php
require_once 'db_connect.php';
$conn = getDbConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'POST') {
    // Registrar una nueva venta
    $input = file_get_contents("php://input");
    error_log("Raw input received: " . $input);
    
    $data = json_decode($input, true);
    
    if (!$data || json_last_error() !== JSON_ERROR_NONE) {
        sendJsonResponse(array("message" => "Datos JSON inválidos: " . json_last_error_msg()), 400);
    }
    
    // Validar datos requeridos
    if (!isset($data['subtotal']) || !isset($data['total_net']) || !isset($data['payment_method']) || !isset($data['items'])) {
        sendJsonResponse(array("message" => "Datos incompletos: subtotal, total_net, payment_method e items son requeridos"), 400);
    }
    
    // --- 1. Insertar Encabezado de Venta (Sales) ---
    $conn->begin_transaction();
    
    try {
        // Verificar que existe al menos un usuario
        $userCheck = $conn->query("SELECT id FROM Users LIMIT 1");
        if ($userCheck->num_rows === 0) {
            // Crear usuario por defecto si no existe
            $createUser = $conn->query("INSERT INTO Users (email, password_hash, role, first_name, last_name) 
                                      VALUES ('sistema@opticaflow.com', '" . password_hash('temp123', PASSWORD_DEFAULT) . "', 'Vendedor', 'Sistema', 'Automático')");
            if (!$createUser) {
                throw new Exception("No hay usuarios en el sistema y no se pudo crear uno automáticamente");
            }
            $userId = $conn->insert_id;
        } else {
            // Usar el primer usuario disponible
            $userResult = $userCheck->fetch_assoc();
            $userId = $userResult['id'];
        }
        
        $patientId = isset($data['patient_id']) && $data['patient_id'] !== null && $data['patient_id'] !== '' ? $data['patient_id'] : null;

        $sqlSale = "INSERT INTO Sales (patient_id, user_id, subtotal, discount_amount, total_net, payment_method) 
                    VALUES (?, ?, ?, ?, ?, ?)";
        $stmtSale = $conn->prepare($sqlSale);
        
        if (!$stmtSale) {
            throw new Exception("Error preparando consulta de venta: " . $conn->error);
        }

        // Manejar patient_id NULL correctamente
        if ($patientId === null) {
            $null = null;
            $stmtSale->bind_param("idddds", 
                $null, $userId, $data['subtotal'], $data['discount_amount'] ?? 0, 
                $data['total_net'], $data['payment_method']
            );
        } else {
            $stmtSale->bind_param("idddds", 
                $patientId, $userId, $data['subtotal'], $data['discount_amount'] ?? 0, 
                $data['total_net'], $data['payment_method']
            );
        }

        if (!$stmtSale->execute()) {
            throw new Exception("Error al registrar venta: " . $stmtSale->error);
        }
        $saleId = $conn->insert_id;
        error_log("Venta registrada con ID: " . $saleId . " por usuario: " . $userId);

        // --- 2. Insertar Detalle y Actualizar Stock ---
        foreach ($data['items'] as $item) {
            error_log("Procesando ítem: " . print_r($item, true));
            
            // Validar ítem
            if (!isset($item['sku']) || !isset($item['qty']) || !isset($item['price'])) {
                throw new Exception("Ítem incompleto: sku, qty y price son requeridos");
            }

            // Para productos personalizados (CUSTOM-), no buscamos en la base de datos
            if (strpos($item['sku'], 'CUSTOM-') === 0) {
                error_log("Procesando producto personalizado: " . $item['sku']);
                
                // Insertar producto personalizado sin afectar stock
                $sqlCustomDetail = "INSERT INTO SaleDetails (sale_id, product_id, quantity, unit_price, product_name) VALUES (?, NULL, ?, ?, ?)";
                $stmtCustomDetail = $conn->prepare($sqlCustomDetail);
                if (!$stmtCustomDetail) {
                    throw new Exception("Error preparando consulta de detalle personalizado: " . $conn->error);
                }
                
                $productName = isset($item['name']) ? $item['name'] : 'Producto Personalizado';
                $stmtCustomDetail->bind_param("iids", $saleId, $item['qty'], $item['price'], $productName);
                if (!$stmtCustomDetail->execute()) {
                    throw new Exception("Error al registrar detalle personalizado: " . $stmtCustomDetail->error);
                }
                error_log("Detalle personalizado registrado: " . $productName);
                continue;
            }
            
            // Encontrar product_id usando SKU para productos del inventario
            $stmtProduct = $conn->prepare("SELECT id, stock, type, name FROM Products WHERE sku = ?");
            if (!$stmtProduct) {
                throw new Exception("Error preparando consulta de producto: " . $conn->error);
            }
            
            $stmtProduct->bind_param("s", $item['sku']);
            if (!$stmtProduct->execute()) {
                throw new Exception("Error ejecutando consulta de producto: " . $stmtProduct->error);
            }
            
            $productResult = $stmtProduct->get_result()->fetch_assoc();
            
            if (!$productResult) {
                throw new Exception("Producto no encontrado con SKU: " . $item['sku']);
            }

            $productId = $productResult['id'];
            error_log("Producto encontrado: " . $productResult['name'] . " (ID: " . $productId . ")");
            
            // Insertar Detalle de Venta
            $sqlDetail = "INSERT INTO SaleDetails (sale_id, product_id, quantity, unit_price, product_name) VALUES (?, ?, ?, ?, ?)";
            $stmtDetail = $conn->prepare($sqlDetail);
            if (!$stmtDetail) {
                throw new Exception("Error preparando consulta de detalle: " . $conn->error);
            }
            
            $stmtDetail->bind_param("iiids", $saleId, $productId, $item['qty'], $item['price'], $productResult['name']);
            if (!$stmtDetail->execute()) {
                throw new Exception("Error al registrar detalle: " . $stmtDetail->error);
            }
            error_log("Detalle registrado para producto: " . $productResult['name']);

            // Actualizar Stock (solo si no es un servicio)
            if ($productResult['type'] != 'Servicio') {
                $newStock = $productResult['stock'] - $item['qty'];
                if ($newStock < 0) {
                    throw new Exception("Stock insuficiente para: " . $productResult['name'] . ". Stock actual: " . $productResult['stock'] . ", solicitado: " . $item['qty']);
                }
                
                $sqlUpdateStock = "UPDATE Products SET stock = ? WHERE id = ?";
                $stmtUpdateStock = $conn->prepare($sqlUpdateStock);
                if (!$stmtUpdateStock) {
                    throw new Exception("Error preparando actualización de stock: " . $conn->error);
                }
                
                $stmtUpdateStock->bind_param("ii", $newStock, $productId);
                if (!$stmtUpdateStock->execute()) {
                    throw new Exception("Error al actualizar stock: " . $stmtUpdateStock->error);
                }
                error_log("Stock actualizado: " . $productResult['name'] . " - Nuevo stock: " . $newStock);
            } else {
                error_log("Producto es servicio, no se actualiza stock: " . $productResult['name']);
            }
        }

        $conn->commit();
        error_log("Transacción completada exitosamente para venta ID: " . $saleId);
        
        sendJsonResponse(array(
            "message" => "Venta procesada con éxito", 
            "sale_id" => $saleId,
            "total" => $data['total_net']
        ), 201);

    } catch (Exception $e) {
        $conn->rollback();
        error_log("Error en transacción: " . $e->getMessage());
        sendJsonResponse(array("message" => $e->getMessage()), 500);
    }

} else {
    sendJsonResponse(array("message" => "Método no permitido"), 405);
}
$conn->close();
?>