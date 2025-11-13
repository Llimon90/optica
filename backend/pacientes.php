<?php
require_once 'db_connect.php';
$conn = getDbConnection();

$method = $_SERVER['REQUEST_METHOD'];
$request_uri = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$id = end($request_uri) != 'pacientes.php' ? end($request_uri) : null;

switch ($method) {
    case 'GET':
        // Obtener todos o uno por ID
        if ($id) {
            $stmt = $conn->prepare("SELECT id, first_name, last_name, phone, birth_date, registration_date FROM Patients WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();
            if ($result) {
                sendJsonResponse($result);
            } else {
                sendJsonResponse(array("message" => "Paciente no encontrado"), 404);
            }
        } else {
            // Consulta de listado
            $result = $conn->query("SELECT id, first_name, last_name, phone, birth_date, registration_date FROM Patients ORDER BY registration_date DESC");
            $patients = $result->fetch_all(MYSQLI_ASSOC);
            sendJsonResponse($patients);
        }
        break;

    case 'POST':
        // Crear nuevo paciente
        $data = json_decode(file_get_contents("php://input"), true);
        $sql = "INSERT INTO Patients (first_name, last_name, phone, birth_date) VALUES (?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssss", $data['first_name'], $data['last_name'], $data['phone'], $data['birth_date']);
        
        if ($stmt->execute()) {
            $new_id = $conn->insert_id;
            sendJsonResponse(array("message" => "Paciente creado con éxito", "id" => $new_id), 201);
        } else {
            sendJsonResponse(array("message" => "Error al crear paciente: " . $conn->error), 500);
        }
        break;

    default:
        sendJsonResponse(array("message" => "Método no permitido"), 405);
        break;
}
$conn->close();
?>