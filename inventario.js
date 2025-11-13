let inventoryData = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarInventario();
    
    const modal = document.getElementById('newProductModal');
    document.querySelector('.close-button').onclick = () => modal.style.display = 'none';
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    document.getElementById('newProductForm').addEventListener('submit', addNewProduct);
    document.getElementById('filterSku').addEventListener('keyup', filterInventory);
    document.getElementById('filterTipo').addEventListener('change', filterInventory);
    document.getElementById('filterStock').addEventListener('change', filterInventory);
});

async function cargarInventario() {
    try {
        // Nota: Necesitarías crear un endpoint inventario.php
        // Por ahora usamos datos de ejemplo
        inventoryData = [
            { id: 1, sku: 'M001', nombre: 'Montura Classic Black', marca: 'Ray-Ban', tipo: 'Montura', stock: 15, precio: 1200.00 },
            { id: 2, sku: 'L001', nombre: 'Lente Oftálmico Blue Light', marca: 'Essilor', tipo: 'Lente', stock: 8, precio: 800.00 },
            { id: 3, sku: 'S001', nombre: 'Consulta Optométrica', marca: '', tipo: 'Servicio', stock: 999, precio: 300.00 },
            { id: 4, sku: 'M002', nombre: 'Montura Fashion Gold', marca: 'Oakley', tipo: 'Montura', stock: 5, precio: 1500.00 }
        ];
        
        renderInventoryTable(inventoryData);
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al cargar inventario', 'error');
    }
}

function renderInventoryTable(data) {
    const tableBody = document.getElementById('inventoryTableBody');
    tableBody.innerHTML = '';
    
    data.forEach(product => {
        const row = tableBody.insertRow();
        const stockClass = product.stock === 0 ? 'danger' : product.stock < 10 ? 'warning' : '';
        
        row.innerHTML = `
            <td>${product.sku}</td>
            <td>${product.nombre}</td>
            <td>${product.marca}</td>
            <td>${product.tipo}</td>
            <td class="${stockClass}">${product.stock}</td>
            <td>$${product.precio.toFixed(2)}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editProduct('${product.sku}')">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product.sku}')">Eliminar</button>
            </td>
        `;
    });
}

function openNewProductModal() {
    document.getElementById('newProductModal').style.display = 'flex';
    document.getElementById('prod_sku').focus();
}

async function addNewProduct(event) {
    event.preventDefault();
    
    const newProduct = {
        sku: document.getElementById('prod_sku').value.trim(),
        nombre: document.getElementById('prod_nombre').value.trim(),
        marca: document.getElementById('prod_marca').value.trim(),
        tipo: document.getElementById('prod_tipo').value,
        stock: parseInt(document.getElementById('prod_stock').value) || 0,
        precio: parseFloat(document.getElementById('prod_precio').value) || 0
    };
    
    if (!newProduct.sku || !newProduct.nombre) {
        alert('❌ Complete SKU y Nombre del producto.');
        return;
    }
    
    if (inventoryData.find(p => p.sku === newProduct.sku)) {
        alert('❌ El SKU ya existe. Use otro código.');
        return;
    }
    
    try {
        // Aquí iría la llamada al backend cuando exista el endpoint
        // const response = await fetch('inventario.php', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(newProduct)
        // });
        
        // Por ahora agregamos localmente
        newProduct.id = Date.now();
        inventoryData.push(newProduct);
        
        renderInventoryTable(inventoryData);
        
        document.getElementById('newProductModal').style.display = 'none';
        showNotification('✅ Producto agregado al inventario.');
        document.getElementById('newProductForm').reset();
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al agregar producto', 'error');
    }
}

function filterInventory() {
    const skuFilter = document.getElementById('filterSku').value.toLowerCase();
    const tipoFilter = document.getElementById('filterTipo').value;
    const stockFilter = document.getElementById('filterStock').value;
    
    let filtered = inventoryData.filter(product => {
        const matchSku = product.sku.toLowerCase().includes(skuFilter) || 
                         product.nombre.toLowerCase().includes(skuFilter) ||
                         product.marca.toLowerCase().includes(skuFilter);
        const matchTipo = !tipoFilter || product.tipo === tipoFilter;
        const matchStock = !stockFilter || 
                          (stockFilter === 'Bajo' && product.stock < 10) ||
                          (stockFilter === 'Agotado' && product.stock === 0);
        
        return matchSku && matchTipo && matchStock;
    });
    
    renderInventoryTable(filtered);
}

function editProduct(sku) {
    const product = inventoryData.find(p => p.sku === sku);
    if (product) {
        const nuevoStock = prompt(`Editar stock de ${product.nombre}:`, product.stock);
        if (nuevoStock !== null) {
            product.stock = parseInt(nuevoStock) || 0;
            renderInventoryTable(inventoryData);
            showNotification('✅ Stock actualizado.');
        }
    }
}

function deleteProduct(sku) {
    const product = inventoryData.find(p => p.sku === sku);
    if (product && confirm(`¿Está seguro de eliminar ${product.nombre} (${product.sku})?`)) {
        inventoryData = inventoryData.filter(p => p.sku !== sku);
        renderInventoryTable(inventoryData);
        showNotification('✅ Producto eliminado.');
    }
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