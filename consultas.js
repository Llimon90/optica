document.addEventListener('DOMContentLoaded', () => {
    // Inicializa la fecha con el día de hoy
    document.getElementById('fecha').value = new Date().toISOString().slice(0, 10);
    
    // Simular precarga de paciente si viene de pacientes.html
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patientId');
    const patientName = urlParams.get('patientName');
    
    if (patientId && patientName) {
        document.getElementById('paciente').value = `${patientName} (ID: ${patientId})`;
        document.getElementById('paciente').dataset.patientId = patientId;
        
        // Cargar historial del paciente desde el backend
        cargarHistorialPaciente(patientId);
    }

    document.getElementById('recetaForm').addEventListener('submit', handleRecetaSubmit);
});

async function cargarHistorialPaciente(patientId) {
    try {
        const response = await fetch(`consultas.php?patient_id=${patientId}`);
        if (!response.ok) throw new Error('Error al cargar historial');
        
        const prescripciones = await response.json();
        
        if (prescripciones.length > 0) {
            mostrarHistorialPaciente(prescripciones);
            cargarDatosAnteriores(prescripciones[0]); // Cargar última consulta
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al cargar historial del paciente', 'error');
    }
}

function mostrarHistorialPaciente(historial) {
    const historialContainer = document.createElement('div');
    historialContainer.className = 'card';
    historialContainer.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">
                <span class="material-icons">history</span>
                Historial de Consultas Anteriores (${historial.length})
            </h3>
        </div>
        <div class="card-body">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Esfera OD</th>
                            <th>Esfera OI</th>
                            <th>Cilindro OD</th>
                            <th>Cilindro OI</th>
                            <th>Adición</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historial.map(consulta => `
                            <tr>
                                <td>${formatDate(consulta.exam_date)}</td>
                                <td>${consulta.od_sphere || '—'}</td>
                                <td>${consulta.oi_sphere || '—'}</td>
                                <td>${consulta.od_cylinder || '—'}</td>
                                <td>${consulta.oi_cylinder || '—'}</td>
                                <td>${consulta.od_add || '—'}</td>
                                <td>
                                    <button class="btn btn-secondary btn-sm" onclick="cargarConsultaAnterior(${consulta.id})">
                                        Cargar
                                    </button>
                                    <button class="btn btn-primary btn-sm" onclick="compararConActual(${consulta.id})">
                                        Comparar
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Insertar después del primer fieldset
    const firstFieldset = document.querySelector('fieldset');
    firstFieldset.parentNode.insertBefore(historialContainer, firstFieldset.nextSibling);
}

function cargarDatosAnteriores(consultaAnterior) {
    const loadButton = document.createElement('button');
    loadButton.type = 'button';
    loadButton.className = 'btn btn-outline btn-sm';
    loadButton.innerHTML = '<span class="material-icons">upload</span> Cargar datos de última consulta';
    loadButton.onclick = () => cargarConsultaAnterior(consultaAnterior.id);
    
    const pacienteField = document.querySelector('label[for="paciente"]');
    pacienteField.parentNode.appendChild(loadButton);
}

async function cargarConsultaAnterior(consultaId) {
    try {
        const patientId = document.getElementById('paciente').dataset.patientId;
        const response = await fetch(`consultas.php?patient_id=${patientId}`);
        if (!response.ok) throw new Error('Error al cargar consulta');
        
        const consultas = await response.json();
        const consultaAnterior = consultas.find(c => c.id == consultaId);
        
        if (consultaAnterior && confirm('¿Cargar datos de la consulta anterior? Los datos actuales se perderán.')) {
            // Cargar datos de refracción
            document.querySelector('[name="od_esfera"]').value = consultaAnterior.od_sphere || '';
            document.querySelector('[name="od_cilindro"]').value = consultaAnterior.od_cylinder || '';
            document.querySelector('[name="od_eje"]').value = consultaAnterior.od_axis || '';
            document.querySelector('[name="od_adicion"]').value = consultaAnterior.od_add || '';
            document.querySelector('[name="od_av"]').value = consultaAnterior.od_av || '';
            
            document.querySelector('[name="oi_esfera"]').value = consultaAnterior.oi_sphere || '';
            document.querySelector('[name="oi_cilindro"]').value = consultaAnterior.oi_cylinder || '';
            document.querySelector('[name="oi_eje"]').value = consultaAnterior.oi_axis || '';
            document.querySelector('[name="oi_adicion"]').value = consultaAnterior.oi_add || '';
            document.querySelector('[name="oi_av"]').value = consultaAnterior.oi_av || '';
            
            document.getElementById('dp').value = consultaAnterior.dp || '';
            document.getElementById('observaciones').value = consultaAnterior.observations || '';
            
            showNotification('✅ Datos de consulta anterior cargados');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al cargar consulta anterior', 'error');
    }
}

async function compararConActual(consultaId) {
    try {
        const patientId = document.getElementById('paciente').dataset.patientId;
        const response = await fetch(`consultas.php?patient_id=${patientId}`);
        if (!response.ok) throw new Error('Error al cargar consultas');
        
        const consultas = await response.json();
        const consultaAnterior = consultas.find(c => c.id == consultaId);
        
        if (!consultaAnterior) return;
        
        const datosActuales = obtenerDatosFormulario();
        mostrarModalComparacion(consultaAnterior, datosActuales);
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al comparar consultas', 'error');
    }
}

function obtenerDatosFormulario() {
    return {
        od: {
            esfera: document.querySelector('[name="od_esfera"]').value,
            cilindro: document.querySelector('[name="od_cilindro"]').value,
            eje: document.querySelector('[name="od_eje"]').value,
            adicion: document.querySelector('[name="od_adicion"]').value,
            av: document.querySelector('[name="od_av"]').value
        },
        oi: {
            esfera: document.querySelector('[name="oi_esfera"]').value,
            cilindro: document.querySelector('[name="oi_cilindro"]').value,
            eje: document.querySelector('[name="oi_eje"]').value,
            adicion: document.querySelector('[name="oi_adicion"]').value,
            av: document.querySelector('[name="oi_av"]').value
        },
        dp: document.getElementById('dp').value
    };
}

function mostrarModalComparacion(anterior, actual) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <span class="close-button" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>Comparativa de Evolución</h2>
            <p><strong>Consulta anterior:</strong> ${formatDate(anterior.exam_date)}</p>
            
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Parámetro</th>
                            <th>Ojo</th>
                            <th>Anterior (${formatDate(anterior.exam_date)})</th>
                            <th>Actual</th>
                            <th>Diferencia</th>
                            <th>Evolución</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generarFilasComparacion(anterior, actual)}
                    </tbody>
                </table>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function generarFilasComparacion(anterior, actual) {
    const parametros = [
        { key: 'sphere', label: 'ESFERA' },
        { key: 'cylinder', label: 'CILINDRO' },
        { key: 'add', label: 'ADICIÓN' }
    ];
    let filas = '';
    
    parametros.forEach(param => {
        ['od', 'oi'].forEach(ojo => {
            const valorAnterior = parseFloat(anterior[`${ojo}_${param.key}`]) || 0;
            const valorActual = parseFloat(actual[ojo][param.key === 'add' ? 'adicion' : param.key === 'sphere' ? 'esfera' : 'cilindro']) || 0;
            const diferencia = valorActual - valorAnterior;
            const evolucion = calcularEvolucion(diferencia, param.key);
            
            filas += `
                <tr>
                    <td>${param.label}</td>
                    <td>${ojo.toUpperCase()}</td>
                    <td>${valorAnterior || '—'}</td>
                    <td>${valorActual || '—'}</td>
                    <td>${diferencia !== 0 ? diferencia.toFixed(2) : '—'}</td>
                    <td>
                        <span class="badge ${evolucion.clase}">
                            ${evolucion.texto}
                        </span>
                    </td>
                </tr>
            `;
        });
    });
    
    return filas;
}

function calcularEvolucion(diferencia, parametro) {
    if (diferencia === 0) return { texto: 'Sin cambio', clase: 'badge-secondary' };
    
    const umbral = parametro === 'sphere' ? 0.25 : 0.12;
    const absDiferencia = Math.abs(diferencia);
    
    if (absDiferencia < umbral) {
        return { texto: 'Cambio mínimo', clase: 'badge-info' };
    } else if (absDiferencia < umbral * 2) {
        return { texto: 'Cambio moderado', clase: 'badge-warning' };
    } else {
        return { texto: 'Cambio significativo', clase: 'badge-danger' };
    }
}

async function handleRecetaSubmit(event) {
    event.preventDefault();
    
    const pacienteField = document.getElementById('paciente');
    const paciente = pacienteField.value;
    const pacienteId = pacienteField.dataset.patientId;
    
    if (!paciente || !pacienteId || paciente === 'Seleccionar paciente...') {
        alert('❌ Por favor, seleccione un paciente antes de guardar.');
        return;
    }
    
    try {
        // 1. Preparar datos para el backend
        const datosReceta = {
            patient_id: parseInt(pacienteId),
            exam_date: document.getElementById('fecha').value,
            optometrist_name: 'Dr. Carlos Rodríguez', // Podría venir de un input
            od_sphere: parseFloat(document.querySelector('[name="od_esfera"]').value) || null,
            od_cylinder: parseFloat(document.querySelector('[name="od_cilindro"]').value) || null,
            od_axis: parseInt(document.querySelector('[name="od_eje"]').value) || null,
            od_add: parseFloat(document.querySelector('[name="od_adicion"]').value) || null,
            od_av: document.querySelector('[name="od_av"]').value || null,
            oi_sphere: parseFloat(document.querySelector('[name="oi_esfera"]').value) || null,
            oi_cylinder: parseFloat(document.querySelector('[name="oi_cilindro"]').value) || null,
            oi_axis: parseInt(document.querySelector('[name="oi_eje"]').value) || null,
            oi_add: parseFloat(document.querySelector('[name="oi_adicion"]').value) || null,
            oi_av: document.querySelector('[name="oi_av"]').value || null,
            dp: document.getElementById('dp').value || null,
            observations: document.getElementById('observaciones').value || null
        };

        // 2. Enviar al backend
        const response = await fetch('consultas.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datosReceta)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error del servidor');
        }

        const result = await response.json();
        
        showNotification('✅ Consulta guardada con éxito. Lista para imprimir o vender.');
        
        // 3. Opción para ir al POS
        const irAPOS = confirm('¿Desea ir al Punto de Venta para procesar la venta?');
        if (irAPOS) {
            window.location.href = 'pos.html?consultaId=' + result.id;
        }

    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al guardar la consulta: ' + error.message, 'error');
    }
}

function formatDate(dateString) {
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

// Función de impresión mejorada
function printReceta() {
    const paciente = document.getElementById('paciente').value;
    const fecha = document.getElementById('fecha').value;
    const observaciones = document.getElementById('observaciones').value;
    const dp = document.getElementById('dp').value;

    const od_esfera = document.querySelector('[name="od_esfera"]').value || '—';
    const od_cilindro = document.querySelector('[name="od_cilindro"]').value || '—';
    const od_eje = document.querySelector('[name="od_eje"]').value || '—';
    const od_adicion = document.querySelector('[name="od_adicion"]').value || '—';
    const od_av = document.querySelector('[name="od_av"]').value || '—';

    const oi_esfera = document.querySelector('[name="oi_esfera"]').value || '—';
    const oi_cilindro = document.querySelector('[name="oi_cilindro"]').value || '—';
    const oi_eje = document.querySelector('[name="oi_eje"]').value || '—';
    const oi_adicion = document.querySelector('[name="oi_adicion"]').value || '—';
    const oi_av = document.querySelector('[name="oi_av"]').value || '—';

    const printContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 700px; margin: auto;">
            <h2 style="text-align: center; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">RECETA OPTOMÉTRICA - ÓPTICAFLOW</h2>
            
            <div style="margin-bottom: 15px;">
                <strong>Paciente:</strong> ${paciente} <br>
                <strong>Fecha:</strong> ${fecha} <br>
                <strong>Optometrista:</strong> Dr. Carlos Rodríguez
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #ccc;">
                <thead>
                    <tr style="background-color: #f8fafc;">
                        <th style="padding: 10px; border: 1px solid #ccc;">Ojo</th>
                        <th style="padding: 10px; border: 1px solid #ccc;">Esfera (Sph)</th>
                        <th style="padding: 10px; border: 1px solid #ccc;">Cilindro (Cyl)</th>
                        <th style="padding: 10px; border: 1px solid #ccc;">Eje (Axis)</th>
                        <th style="padding: 10px; border: 1px solid #ccc;">Adición (Add)</th>
                        <th style="padding: 10px; border: 1px solid #ccc;">AV</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ccc; font-weight: bold;">OD (Derecho)</td>
                        <td style="padding: 10px; border: 1px solid #ccc;">${od_esfera}</td>
                        <td style="padding: 10px; border: 1px solid #ccc;">${od_cilindro}</td>
                        <td style="padding: 10px; border: 1px solid #ccc;">${od_eje}</td>
                        <td style="padding: 10px; border: 1px solid #ccc;">${od_adicion}</td>
                        <td style="padding: 10px; border: 1px solid #ccc;">${od_av}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ccc; font-weight: bold;">OI (Izquierdo)</td>
                        <td style="padding: 10px; border: 1px solid #ccc;">${oi_esfera}</td>
                        <td style="padding: 10px; border: 1px solid #ccc;">${oi_cilindro}</td>
                        <td style="padding: 10px; border: 1px solid #ccc;">${oi_eje}</td>
                        <td style="padding: 10px; border: 1px solid #ccc;">${oi_adicion}</td>
                        <td style="padding: 10px; border: 1px solid #ccc;">${oi_av}</td>
                    </tr>
                </tbody>
            </table>
            
            <p><strong>D.I.P. (Distancia Interpupilar):</strong> ${dp || '—'}</p>
            <p><strong>Observaciones:</strong> ${observaciones || 'Ninguna'}</p>

            <div style="margin-top: 50px; text-align: center;">
                ______________________________<br>
                <strong>Dr. Carlos Rodríguez</strong><br>
                Lic. en Optometría
            </div>
        </div>
    `;

    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Receta Optométrica</title>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}