<?php
require_once 'db_connect.php';
$conn = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;

    if (!$startDate || !$endDate) {
        sendJsonResponse(array("message" => "Fechas de inicio y fin (start_date, end_date) son requeridas"), 400);
    }

    // Consulta para obtener las ventas en el rango de fechas, uniendo con Pacientes
    $sql = "SELECT s.id, s.sale_date, s.subtotal, s.discount_amount, s.total_net, 
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name
            FROM Sales s
            LEFT JOIN Patients p ON s.patient_id = p.id
            WHERE s.sale_date BETWEEN ? AND ?
            ORDER BY s.sale_date DESC";
            
    $stmt = $conn->prepare($sql);
    // Agregamos un día a la fecha final para incluir ventas hasta el final de ese día
    $endDateAdjusted = date('Y-m-d 23:59:59', strtotime($endDate));
    $stmt->bind_param("ss", $startDate, $endDateAdjusted);
    $stmt->execute();
    $result = $stmt->get_result();
    $transactions = $result->fetch_all(MYSQLI_ASSOC);

    // Cálculo de métricas
    $totalNet = array_sum(array_column($transactions, 'total_net'));
    $totalTransactions = count($transactions);
    $averageTicket = $totalTransactions > 0 ? round($totalNet / $totalTransactions, 2) : 0.00;

    // Formatear resultados (MySQL DATETIME a DATE)
    foreach ($transactions as &$t) {
        $t['fecha'] = date('Y-m-d', strtotime($t['sale_date']));
        $t['paciente'] = $t['patient_name'] ?? 'Venta Anónima';
        unset($t['sale_date']);
        unset($t['patient_name']);
    }

    sendJsonResponse(array(
        "start_date" => $startDate,
        "end_date" => $endDate,
        "total_net" => round($totalNet, 2),
        "total_transactions" => $totalTransactions,
        "average_ticket" => $averageTicket,
        "transactions_detail" => $transactions
    ));
} else {
    sendJsonResponse(array("message" => "Método no permitido"), 405);
}
$conn->close();
?>