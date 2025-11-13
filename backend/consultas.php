<?php
require_once 'db_connect.php';
$conn = getDbConnection();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        // Crear nueva receta
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Asumiendo que todos los campos de refracción están en $data
        $sql = "INSERT INTO Prescriptions (patient_id, exam_date, optometrist_name, od_sphere, od_cylinder, od_axis, od_add, od_av, oi_sphere, oi_cylinder, oi_axis, oi_add, oi_av, dp, observations) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        
        $stmt->bind_param("issddiddsddidss", 
            $data['patient_id'], $data['exam_date'], $data['optometrist_name'], 
            $data['od_sphere'], $data['od_cylinder'], $data['od_axis'], $data['od_add'], $data['od_av'],
            $data['oi_sphere'], $data['oi_cylinder'], $data['oi_axis'], $data['oi_add'], $data['oi_av'],
            $data['dp'], $data['observations']
        );
        
        if ($stmt->execute()) {
            $new_id = $conn->insert_id;
            sendJsonResponse(array("message" => "Receta guardada con éxito", "id" => $new_id), 201);
        } else {
            sendJsonResponse(array("message" => "Error al guardar receta: " . $conn->error), 500);
        }
        break;

    case 'GET':
        // Obtener historial de recetas por paciente (ej: consultas.php?patient_id=1001)
        if (isset($_GET['patient_id'])) {
            $patient_id = $_GET['patient_id'];
            $stmt = $conn->prepare("SELECT * FROM Prescriptions WHERE patient_id = ? ORDER BY exam_date DESC");
            $stmt->bind_param("i", $patient_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $prescriptions = $result->fetch_all(MYSQLI_ASSOC);
            sendJsonResponse($prescriptions);
        } else {
            sendJsonResponse(array("message" => "ID de paciente requerido para obtener recetas"), 400);
        }
        break;

    default:
        sendJsonResponse(array("message" => "Método no permitido"), 405);
        break;
}
$conn->close();
?>