<?php
require_once 'db_connect.php';

// Log del método y headers
error_log("=== VENTAS.PHP CALLED ===");
error_log("REQUEST METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("CONTENT TYPE: " . ($_SERVER['CONTENT_TYPE'] ?? 'No content type'));
error_log("REQUEST HEADERS: " . print_r(getallheaders(), true));

$conn = getDbConnection();

// Manejar preflight CORS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'POST') {
    error_log("Processing POST request");
    
    // Registrar una nueva venta
    $input = file_get_contents("php://input");
    error_log("Raw input length: " . strlen($input));
    error_log("Raw input: " . $input);
    
    $data = json_decode($input, true);
    
    if (!$data || json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON decode error: " . json_last_error_msg());
        sendJsonResponse(array("message" => "Datos JSON inválidos: " . json_last_error_msg()), 400);
    }
    
    error_log("Datos decodificados: " . print_r($data, true));
    
    // Validar datos requeridos
    if (!isset($data['subtotal']) || !isset($data['total_net']) || !isset($data['payment_method']) || !isset($data['items'])) {
        error_log("Datos faltantes");
        sendJsonResponse(array("message" => "Datos incompletos"), 400);
    }
    
    // --- 1. Insertar Encabezado de Venta (Sales) ---
    $conn->begin_transaction();
    
    try {
        // Verificar que existe al menos un usuario
        $userCheck = $conn->query("SELECT id FROM Users LIMIT 1");
        if ($userCheck->num_rows === 0) {
            throw new Exception("No hay usuarios configurados en el sistema");
        }
        $userResult = $userCheck->fetch_assoc();
        $userId = $userResult['id'];
        error_log("Usuario ID para la venta: " . $userId);
        
        // Manejar patient_id - puede ser NULL
        $patientId = null;
        if (isset($data['patient_id']) && $data['patient_id'] !== null && $data['patient_id'] !== '' && $data['patient_id'] !== 'null') {
            $patientId = intval($data['patient_id']);
            error_log("Patient ID: " . $patientId);
            
            // Verificar que el paciente existe
            $patientCheck = $conn->prepare("SELECT id FROM Patients WHERE id = ?");
            $patientCheck->bind_param("i", $patientId);
            $patientCheck->execute();
            if ($patientCheck->get_result()->num_rows === 0) {
                error_log("Paciente no encontrado, usando NULL");
                $patientId = null;
            }
        }
        
        error_log("Patient ID final: " . ($patientId ?? 'NULL'));

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
        error_log("✅ Venta registrada con ID: " . $saleId);

        // --- 2. Insertar Detalle ---
        foreach ($data['items'] as $item) {
            error_log("Procesando ítem: " . print_r($item, true));
            
            // Validar ítem
            if (!isset($item['sku']) || !isset($item['qty']) || !isset($item['price'])) {
                throw new Exception("Ítem incompleto");
            }

            // Para productos personalizados (CUSTOM-)
            if (strpos($item['sku'], 'CUSTOM-') === 0) {
                error_log("Producto personalizado: " . $item['sku']);
                
                $sqlCustomDetail = "INSERT INTO SaleDetails (sale_id, product_id, quantity, unit_price, product_name) VALUES (?, NULL, ?, ?, ?)";
                $stmtCustomDetail = $conn->prepare($sqlCustomDetail);
                if (!$stmtCustomDetail) {
                    throw new Exception("Error preparando detalle personalizado");
                }
                
                $productName = isset($item['name']) ? $item['name'] : 'Producto Personalizado';
                $stmtCustomDetail->bind_param("iids", $saleId, $item['qty'], $item['price'], $productName);
                if (!$stmtCustomDetail->execute()) {
                    throw new Exception("Error al registrar detalle personalizado");
                }
                continue;
            }
            
            // Para productos del inventario
            $stmtProduct = $conn->prepare("SELECT id, name FROM Products WHERE sku = ?");
            if (!$stmtProduct) {
                throw new Exception("Error preparando consulta de producto");
            }
            
            $stmtProduct->bind_param("s", $item['sku']);
            if (!$stmtProduct->execute()) {
                throw new Exception("Error ejecutando consulta de producto");
            }
            
            $productResult = $stmtProduct->get_result()->fetch_assoc();
            
            if (!$productResult) {
                throw new Exception("Producto no encontrado: " . $item['sku']);
            }

            $productId = $productResult['id'];
            
            // Insertar Detalle de Venta
            $sqlDetail = "INSERT INTO SaleDetails (sale_id, product_id, quantity, unit_price, product_name) VALUES (?, ?, ?, ?, ?)";
            $stmtDetail = $conn->prepare($sqlDetail);
            if (!$stmtDetail) {
                throw new Exception("Error preparando consulta de detalle");
            }
            
            $stmtDetail->bind_param("iiids", $saleId, $productId, $item['qty'], $item['price'], $productResult['name']);
            if (!$stmtDetail->execute()) {
                throw new Exception("Error al registrar detalle");
            }
        }

        $conn->commit();
        error_log("✅ Transacción completada para venta ID: " . $saleId);
        
        sendJsonResponse(array(
            "message" => "Venta procesada con éxito", 
            "sale_id" => $saleId,
            "total" => $data['total_net']
        ), 201);

    } catch (Exception $e) {
        $conn->rollback();
        error_log("❌ Error en transacción: " . $e->getMessage());
        sendJsonResponse(array("message" => $e->getMessage()), 500);
    }

} else {
    error_log("❌ Método no permitido: " . $method);
    sendJsonResponse(array("message" => "Método no permitido. Se recibió: " . $method), 405);
}
$conn->close();
?>