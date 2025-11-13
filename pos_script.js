let orderItems = [];
const IVA_RATE = 0.16; // 16% de IVA

document.addEventListener('DOMContentLoaded', () => {
    // Cargar paciente de la consulta si viene de consultas.html
    const urlParams = new URLSearchParams(window.location.search);
    const consultaId = urlParams.get('consultaId');
    
    if (consultaId) {
        document.getElementById('current_patient_name').textContent = 'Paciente desde Consulta';
        document.getElementById('current_receta').textContent = `Receta #${consultaId}`;
    }
    
    // Inicializar cálculos
    updateTotals();

    // Escuchar el evento de finalizar venta
    const paymentForm = document.getElementById('paymentForm');
    paymentForm.addEventListener('submit', function(event) {
        event.preventDefault();
        processSale();
    });

    // Cargar datos del inventario para autocompletar
    loadInventorySuggestions();
});

function loadInventorySuggestions() {
    // Por ahora usamos datos locales, pero podrían venir del backend
    const inventory = [
        { sku: 'M001', nombre: 'Montura Classic Black', precio: 1200.00 },
        { sku: 'L001', nombre: 'Lente Oftálmico Blue Light', precio: 800.00 },
        { sku: 'S001', nombre: 'Consulta Optométrica', precio: 300.00 },
        { sku: 'M002', nombre: 'Montura Fashion Gold', precio: 1500.00 }
    ];
    
    const itemNameInput = document.getElementById('item_name');
    
    itemNameInput.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        if (value.length < 2) return;
        
        const matches = inventory.filter(item => 
            item.nombre.toLowerCase().includes(value) || 
            item.sku.toLowerCase().includes(value)
        );
        
        if (matches.length > 0) {
            // Podrías mostrar un dropdown con sugerencias aquí
            document.getElementById('item_price').value = matches[0].precio;
        }
    });
}

function addItem() {
    const nameInput = document.getElementById('item_name');
    const priceInput = document.getElementById('item_price');
    const qtyInput = document.getElementById('item_qty');

    const name = nameInput.value.trim();
    const price = Math.max(0, parseFloat(priceInput.value) || 0);
    const qty = Math.max(1, parseInt(qtyInput.value) || 1);

    if (name && price > 0 && qty > 0) {
        const total = price * qty;
        
        const newItem = {
            id: Date.now(),
            name: name,
            price: price,
            qty: qty,
            total: total,
            sku: 'CUSTOM-' + Date.now() // SKU temporal
        };

        orderItems.push(newItem);
        
        // Limpiar campos después de añadir
        nameInput.value = '';
        priceInput.value = '0.00';
        qtyInput.value = '1';
        nameInput.focus();

        renderOrderTable();
        updateTotals();
        
        showNotification(`✅ Ítem "${name}" añadido a la orden`);

    } else {
        showNotification('❌ Error: Ingrese nombre, precio y cantidad válidos', 'error');
    }
}

function renderOrderTable() {
    const tableBody = document.getElementById('order_items_body');
    tableBody.innerHTML = '';

    if (orderItems.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: var(--secondary-color);">
                    No hay ítems en la orden. Agregue productos o servicios.
                </td>
            </tr>
        `;
        return;
    }

    orderItems.forEach(item => {
        const row = tableBody.insertRow();
        row.id = `item-${item.id}`;
        
        row.insertCell().textContent = item.name;
        row.insertCell().textContent = item.qty;
        row.insertCell().textContent = `$${item.price.toFixed(2)}`;
        row.insertCell().textContent = `$${item.total.toFixed(2)}`;
        
        const deleteCell = row.insertCell();
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
        deleteBtn.onclick = () => removeItem(item.id);
        deleteCell.appendChild(deleteBtn);
    });
}

function removeItem(itemId) {
    orderItems = orderItems.filter(item => item.id !== itemId);
    renderOrderTable();
    updateTotals();
    showNotification('Ítem eliminado de la orden');
}

function updateTotals() {
    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const discountPercent = Math.min(100, Math.max(0, parseFloat(document.getElementById('discount_input').value) || 0));
    
    const discountAmount = subtotal * (discountPercent / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxAmount = subtotalAfterDiscount * IVA_RATE;
    const grandTotal = subtotalAfterDiscount + taxAmount;

    document.getElementById('subtotal_display').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax_display').textContent = `$${taxAmount.toFixed(2)}`;
    document.getElementById('grand_total_display').textContent = `$${grandTotal.toFixed(2)}`;
}

async function processSale() {
    if (orderItems.length === 0) {
        showNotification('❌ No se puede procesar la venta. La orden está vacía.', 'error');
        return;
    }

    const grandTotal = parseFloat(document.getElementById('grand_total_display').textContent.replace('$', ''));
    const patientName = document.getElementById('current_patient_name').textContent;
    const paymentMethod = document.getElementById('payment_method').value;
    const discountPercent = parseFloat(document.getElementById('discount_input').value) || 0;

    try {
        // Preparar datos para el backend
        const saleData = {
            patient_id: null, // Podría venir de la consulta
            subtotal: orderItems.reduce((sum, item) => sum + item.total, 0),
            discount_amount: orderItems.reduce((sum, item) => sum + item.total, 0) * (discountPercent / 100),
            total_net: grandTotal,
            payment_method: paymentMethod,
            items: orderItems.map(item => ({
                sku: item.sku,
                qty: item.qty,
                price: item.price
            }))
        };

        // Enviar al backend
        const response = await fetch('ventas.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(saleData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error del servidor');
        }

        const result = await response.json();
        
        showNotification(`✅ Venta procesada con éxito. Total: $${grandTotal.toFixed(2)}`);
        
        // Imprimir ticket
        printTicket(result.sale_id);
        
        // Reiniciar el POS para una nueva venta
        resetPOS();

    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al procesar venta: ' + error.message, 'error');
    }
}

function resetPOS() {
    orderItems = [];
    document.getElementById('discount_input').value = '0';
    document.getElementById('current_patient_name').textContent = '-- Ninguno --';
    document.getElementById('current_receta').textContent = 'No asociada';
    
    renderOrderTable();
    updateTotals();
}

function printTicket(saleId = 'T' + Date.now().toString().slice(-6)) {
    if (orderItems.length === 0) {
        showNotification("❌ No hay ítems en la orden.", 'error');
        return;
    }

    const patientName = document.getElementById('current_patient_name').textContent;
    const paymentMethod = document.getElementById('payment_method').value;
    const subtotal = document.getElementById('subtotal_display').textContent;
    const tax = document.getElementById('tax_display').textContent;
    const grandTotal = document.getElementById('grand_total_display').textContent;
    const discountPercent = document.getElementById('discount_input').value;

    let itemsHtml = '';
    orderItems.forEach(item => {
        itemsHtml += `
            <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px;">
                <span style="flex: 2; text-align: left;">${item.qty}x ${item.name.substring(0, 25)}</span>
                <span style="flex: 1; text-align: right;">$${item.total.toFixed(2)}</span>
            </div>
        `;
    });

    const ticketContent = `
        <div style="font-family: 'Courier New', monospace; padding: 15px; width: 280px; margin: auto;">
            <h3 style="text-align: center; margin: 5px 0; font-size: 16px;">ÓPTICAFLOW VISION</h3>
            <p style="text-align: center; margin: 2px 0; font-size: 12px;">${new Date().toLocaleString()}</p>
            <p style="text-align: center; margin: 2px 0; font-size: 12px;">Transacción: ${saleId}</p>
            <hr style="border: 1px dashed #333; margin: 10px 0;">
            
            <p style="font-size: 14px; margin: 5px 0;"><strong>Cliente:</strong> ${patientName}</p>
            
            <div style="margin: 10px 0;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; border-bottom: 1px dashed #333; padding-bottom: 5px;">
                    <span>DESCRIPCIÓN</span>
                    <span>TOTAL</span>
                </div>
                ${itemsHtml}
            </div>

            <hr style="border: 1px dashed #333; margin: 10px 0;">

            <div style="font-size: 14px;">
                <div style="display: flex; justify-content: space-between; margin: 2px 0;"><span>Subtotal:</span><span>${subtotal}</span></div>
                <div style="display: flex; justify-content: space-between; margin: 2px 0;"><span>Descuento (${discountPercent}%):</span><span>-$${(parseFloat(subtotal.replace('$', '')) * (parseFloat(discountPercent)/100)).toFixed(2)}</span></div>
                <div style="display: flex; justify-content: space-between; margin: 2px 0;"><span>Impuestos (IVA):</span><span>${tax}</span></div>
            </div>

            <div style="border-top: 2px solid #333; margin: 10px 0; padding-top: 5px; font-size: 16px; font-weight: bold;">
                <div style="display: flex; justify-content: space-between;"><span>TOTAL:</span><span>${grandTotal}</span></div>
            </div>
            
            <p style="margin-top: 10px; font-size: 14px;"><strong>Método de Pago:</strong> ${paymentMethod.toUpperCase()}</p>
            <p style="text-align: center; margin-top: 15px; font-size: 12px;">¡GRACIAS POR SU COMPRA!</p>
        </div>
    `;

    const printWindow = window.open('', '', 'height=600,width=400');
    printWindow.document.write('<html><head><title>Ticket de Venta</title></head><body>');
    printWindow.document.write(ticketContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
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