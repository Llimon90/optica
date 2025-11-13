document.addEventListener('DOMContentLoaded', () => {
    cargarPacientes();
    
    // Configuración del modal
    const modal = document.getElementById('newPatientModal');
    document.querySelector('.close-button').onclick = () => modal.style.display = 'none';
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    document.getElementById('newPatientForm').addEventListener('submit', addNewPatient);
    document.getElementById('searchInput').addEventListener('keyup', searchPatients);
});

async function cargarPacientes() {
    try {
        const response = await fetch('pacientes.php');
        if (!response.ok) throw new Error('Error al cargar pacientes');
        
        const patients = await response.json();
        renderPatientsTable(patients);
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al cargar pacientes', 'error');
    }
}

function renderPatientsTable(data) {
    const tableBody = document.getElementById('patientsTableBody');
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--secondary-color);">
                    No se encontraron pacientes. ¡Registre el primero!
                </td>
            </tr>
        `;
        return;
    }
    
    data.forEach(patient => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${patient.id}</td>
            <td>${patient.first_name} ${patient.last_name}</td>
            <td>${patient.phone}</td>
            <td>${formatDate(patient.birth_date)}</td>
            <td>${formatDate(patient.registration_date)}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="viewHistory(${patient.id})" title="Ver historial completo">
                    <span class="material-icons">history</span>
                </button>
                <button class="btn btn-primary btn-sm" onclick="startConsultation(${patient.id}, '${patient.first_name} ${patient.last_name}')" title="Nueva consulta">
                    <span class="material-icons">visibility</span>
                </button>
            </td>
        `;
    });
}

function openNewPatientModal() {
    document.getElementById('newPatientModal').style.display = 'flex';
    document.getElementById('p_nombre').focus();
}

async function addNewPatient(event) {
    event.preventDefault();
    
    const nombre = document.getElementById('p_nombre').value.trim();
    const apellido = document.getElementById('p_apellido').value.trim();
    const telefono = document.getElementById('p_telefono').value.trim();
    const fechaNac = document.getElementById('p_fecha_nac').value;
    
    if (!nombre || !apellido) {
        alert('❌ Por favor, complete al menos el nombre y apellido del paciente.');
        return;
    }
    
    try {
        const newPatient = {
            first_name: nombre,
            last_name: apellido,
            phone: telefono,
            birth_date: fechaNac
        };

        const response = await fetch('pacientes.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newPatient)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error del servidor');
        }

        const result = await response.json();
        
        document.getElementById('newPatientModal').style.display = 'none';
        showNotification(`✅ Paciente ${nombre} ${apellido} registrado con éxito (ID: ${result.id}).`);
        document.getElementById('newPatientForm').reset();
        
        // Recargar la lista de pacientes
        cargarPacientes();

    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al crear paciente: ' + error.message, 'error');
    }
}

async function searchPatients() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    
    try {
        const response = await fetch('pacientes.php');
        if (!response.ok) throw new Error('Error al buscar pacientes');
        
        const allPatients = await response.json();
        const filtered = allPatients.filter(patient => 
            `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(input) || 
            patient.phone.includes(input) ||
            patient.id.toString().includes(input)
        );
        renderPatientsTable(filtered);
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al buscar pacientes', 'error');
    }
}

async function viewHistory(id) {
    try {
        // Cargar información del paciente
        const patientResponse = await fetch(`pacientes.php/${id}`);
        if (!patientResponse.ok) throw new Error('Error al cargar paciente');
        
        const patient = await patientResponse.json();
        
        // Cargar recetas del paciente
        const prescriptionsResponse = await fetch(`consultas.php?patient_id=${id}`);
        const prescriptions = prescriptionsResponse.ok ? await prescriptionsResponse.json() : [];
        
        const totalConsultas = prescriptions.length;
        const ultimaConsulta = totalConsultas > 0 ? prescriptions[0] : null;
        
        let historialHTML = `
            <strong>ID:</strong> ${patient.id}<br>
            <strong>Nombre:</strong> ${patient.first_name} ${patient.last_name}<br>
            <strong>Teléfono:</strong> ${patient.phone}<br>
            <strong>Fecha Nacimiento:</strong> ${formatDate(patient.birth_date)}<br>
            <strong>Total Consultas:</strong> ${totalConsultas}<br>
        `;
        
        if (ultimaConsulta) {
            historialHTML += `<strong>Última Consulta:</strong> ${formatDate(ultimaConsulta.exam_date)}`;
        }
        
        alert(`Historial del Paciente:\n\n${historialHTML}`);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al cargar historial', 'error');
    }
}

function startConsultation(id, nombre) {
    window.location.href = `consultas.html?patientId=${id}&patientName=${encodeURIComponent(nombre)}`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'error' ? '#ef4444' : '#10b981'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

// Funciones para el menú móvil
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('mobile-open');
}

window.addEventListener('resize', function() {
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    if (window.innerWidth <= 640) {
        mobileBtn.classList.remove('d-none');
    } else {
        mobileBtn.classList.add('d-none');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    window.dispatchEvent(new Event('resize'));
});