document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('recetaForm');

    form.addEventListener('submit', async function(event) {
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
                optometrist_name: 'Dr. Carlos Rodríguez',
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
            
            alert('✅ Receta guardada con éxito y lista para la venta.');

            // Opcional: Redirigir al Punto de Venta (POS)
            const irAPOS = confirm('¿Desea ir al Punto de Venta para procesar la venta?');
            if (irAPOS) {
                window.location.href = 'pos.html?consultaId=' + result.id;
            }

        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error al guardar la receta: ' + error.message);
        }
    });
    
    // Funcionalidad simple para el botón Imprimir
    document.querySelector('.btn-print').addEventListener('click', () => {
        printReceta();
    });
});

// Función de impresión (igual que en consultas.js)
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
            <h2 style="text-align: center; color: #3498db; border-bottom: 2px solid #3498db; padding-bottom: 10px;">RECETA OPTOMÉTRICA</h2>
            
            <div style="margin-bottom: 15px;">
                <strong>Paciente:</strong> ${paciente} <br>
                <strong>Fecha:</strong> ${fecha} <br>
                <strong>Optometrista:</strong> Dr. Carlos Rodríguez
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #ccc;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
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
            
            <p><strong>D.I.P. (Distancia Interpupilar):</strong> ${dp}</p>
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