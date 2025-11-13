document.addEventListener('DOMContentLoaded', () => {
    // Inicializa las fechas con el último mes por defecto
    setPeriod('month');
});

function setPeriod(type) {
    const end = new Date();
    const start = new Date();

    if (type === 'week') {
        start.setDate(end.getDate() - 7);
    } else if (type === 'month') {
        start.setMonth(end.getMonth() - 1);
    } else if (type === 'year') {
        start.setFullYear(end.getFullYear() - 1);
    }
    
    document.getElementById('startDate').value = start.toISOString().slice(0, 10);
    document.getElementById('endDate').value = end.toISOString().slice(0, 10);
}

async function generateReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        alert('❌ Por favor, seleccione un período válido.');
        return;
    }

    try {
        const response = await fetch(`backend/reportes.php?start_date=${startDate}&end_date=${endDate}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error del servidor');
        }

        const reportData = await response.json();
        
        // Actualizar Display
        document.getElementById('totalVentas').textContent = `$${reportData.total_net.toFixed(2)}`;
        document.getElementById('totalTransacciones').textContent = reportData.total_transactions;
        document.getElementById('ticketPromedio').textContent = `$${reportData.average_ticket.toFixed(2)}`;
        document.getElementById('periodDisplay').textContent = `${formatDate(startDate)} a ${formatDate(endDate)}`;

        // Renderizar Detalle de Transacciones
        const transactionsBody = document.getElementById('transactionsBody');
        transactionsBody.innerHTML = '';
        
        if (reportData.transactions_detail.length === 0) {
            transactionsBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: var(--secondary-color);">
                        No hay transacciones en el período seleccionado
                    </td>
                </tr>
            `;
        } else {
            reportData.transactions_detail.forEach(t => {
                const row = transactionsBody.insertRow();
                row.innerHTML = `
                    <td>${formatDate(t.fecha)}</td>
                    <td>${t.id}</td>
                    <td>${t.paciente}</td>
                    <td>$${t.subtotal.toFixed(2)}</td>
                    <td>$${t.discount_amount.toFixed(2)}</td>
                    <td style="font-weight: bold; color: var(--success-color);">$${t.total_net.toFixed(2)}</td>
                `;
            });
        }
        
        document.getElementById('reportResults').style.display = 'block';

    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al generar reporte: ' + error.message, 'error');
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