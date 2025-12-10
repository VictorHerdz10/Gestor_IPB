class ProductManager {
    constructor() {
        this.products = [];
        this.cocinaProducts = []; // Nueva: productos específicos de cocina
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentEditId = null;
        this.init();
    }

    init() {
        this.loadProducts();
        this.bindEvents();
        this.renderProducts();
    }

    loadProducts() {
        const savedProducts = localStorage.getItem('ipb_products');
        const savedCocinaProducts = localStorage.getItem('ipb_cocina_products'); // Nueva
        
        if (savedProducts) {
            this.products = JSON.parse(savedProducts);
        }
        
        if (savedCocinaProducts) {
            this.cocinaProducts = JSON.parse(savedCocinaProducts);
        }
    }

    saveProducts() {
        localStorage.setItem('ipb_products', JSON.stringify(this.products));
        localStorage.setItem('ipb_cocina_products', JSON.stringify(this.cocinaProducts)); // Nueva
    }

    bindEvents() {
        // Form submission
        document.getElementById('form-nuevo-producto')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        // Cancel button
        document.getElementById('btn-cancelar-producto')?.addEventListener('click', () => {
            this.hideForm();
        });

        // Add product button
        document.getElementById('btn-agregar-producto')?.addEventListener('click', () => {
            this.showForm();
        });

        // Add first product button
        const btnAddFirst = document.getElementById('btn-add-first-producto');
        if (btnAddFirst) {
            btnAddFirst.addEventListener('click', () => this.showForm());
        }

        // Search functionality
        document.getElementById('product-search')?.addEventListener('input', (e) => {
            this.filterProducts(e.target.value);
        });

        // Modal events
        document.getElementById('modal-edit-close')?.addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('modal-edit-cancel')?.addEventListener('click', () => {
            this.closeEditModal();
        });

        // Save edit
        document.getElementById('form-edit-producto')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProduct();
        });

        // Check for similar products on name input
        document.getElementById('producto-nombre')?.addEventListener('input', (e) => {
            this.checkSimilarProducts(e.target.value);
        });
    }

    showForm() {
        const form = document.getElementById('producto-form');
        if (form) form.style.display = 'block';
        
        const nombreInput = document.getElementById('producto-nombre');
        if (nombreInput) nombreInput.focus();
        
        const alerta = document.getElementById('alerta-duplicado');
        if (alerta) alerta.style.display = 'none';
        
        const warning = document.getElementById('similar-products-warning');
        if (warning) warning.style.display = 'none';
        
        // Reset location selection
        const locationSelect = document.getElementById('producto-ubicacion');
        if (locationSelect) locationSelect.value = 'salon';
    }

    hideForm() {
        const form = document.getElementById('producto-form');
        if (form) form.style.display = 'none';
        
        const formElement = document.getElementById('form-nuevo-producto');
        if (formElement) formElement.reset();
        
        const alerta = document.getElementById('alerta-duplicado');
        if (alerta) alerta.style.display = 'none';
        
        const warning = document.getElementById('similar-products-warning');
        if (warning) warning.style.display = 'none';
    }

    checkSimilarProducts(name) {
        if (!name || name.length < 3) {
            const warning = document.getElementById('similar-products-warning');
            if (warning) warning.style.display = 'none';
            return;
        }

        const similar = this.findSimilarProducts(name);
        const warningDiv = document.getElementById('similar-products-warning');
        const similarList = document.getElementById('similar-products-list');

        if (warningDiv && similarList) {
            if (similar.length > 0) {
                similarList.innerHTML = '';
                similar.forEach(product => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>${product.nombre}</span>
                        <span>$${product.precio.toFixed(2)}</span>
                        <span class="product-location-badge">${product.ubicacion === 'cocina' ? 'Cocina' : 'Salón'}</span>
                    `;
                    similarList.appendChild(li);
                });
                warningDiv.style.display = 'block';
            } else {
                warningDiv.style.display = 'none';
            }
        }
    }

    findSimilarProducts(name) {
        const searchTerm = name.toLowerCase().trim();
        const allProducts = [...this.products, ...this.cocinaProducts];
        
        return allProducts.filter(product => {
            const productName = product.nombre.toLowerCase();
            
            // Check for exact match (excluding current edit)
            if (this.currentEditId !== product.id && productName === searchTerm) {
                return true;
            }

            // Check for similar words using Levenshtein distance
            if (this.calculateSimilarity(productName, searchTerm) > 0.8) {
                return true;
            }

            // Check if one contains the other
            if (productName.includes(searchTerm) || searchTerm.includes(productName)) {
                return true;
            }

            return false;
        });
    }

    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / parseFloat(longer.length);
    }

    levenshteinDistance(str1, str2) {
        const track = Array(str2.length + 1).fill(null).map(() =>
            Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i += 1) {
            track[0][i] = i;
        }
        
        for (let j = 0; j <= str2.length; j += 1) {
            track[j][0] = j;
        }
        
        for (let j = 1; j <= str2.length; j += 1) {
            for (let i = 1; i <= str1.length; i += 1) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j][i - 1] + 1,
                    track[j - 1][i] + 1,
                    track[j - 1][i - 1] + indicator,
                );
            }
        }
        
        return track[str2.length][str1.length];
    }

    saveProduct() {
        const nombreInput = document.getElementById('producto-nombre');
        const precioInput = document.getElementById('producto-precio');
        const ubicacionSelect = document.getElementById('producto-ubicacion');
        
        if (!nombreInput || !precioInput || !ubicacionSelect) return;
        
        const nombre = nombreInput.value.trim();
        const precio = parseFloat(precioInput.value);
        const ubicacion = ubicacionSelect.value; // 'salon' o 'cocina'
        const alerta = document.getElementById('alerta-duplicado');

        // Validation
        if (!nombre || !precio || precio <= 0) {
            this.showAlert('Por favor, complete todos los campos correctamente', 'warning');
            return;
        }

        // Check for duplicates based on location
        let duplicate = null;
        if (ubicacion === 'salon') {
            duplicate = this.products.find(p => 
                p.nombre.toLowerCase() === nombre.toLowerCase()
            );
        } else {
            duplicate = this.cocinaProducts.find(p => 
                p.nombre.toLowerCase() === nombre.toLowerCase()
            );
        }

        if (duplicate) {
            if (alerta) {
                alerta.textContent = `¡Advertencia! Ya existe un producto con el nombre "${duplicate.nombre}" en ${ubicacion === 'cocina' ? 'Cocina' : 'Salón'}`;
                alerta.style.display = 'flex';
                alerta.className = 'alert-products alert-products-warning';
            }
            return;
        }

        // Create new product
        const newProduct = {
            id: Date.now(),
            nombre,
            precio,
            ubicacion, // Añadimos la ubicación
            fechaCreacion: new Date().toISOString(),
            fechaActualizacion: new Date().toISOString()
        };

        // Add to appropriate array
        if (ubicacion === 'salon') {
            this.products.push(newProduct);
        } else {
            this.cocinaProducts.push(newProduct);
        }
        
        this.saveProducts();
        this.renderProducts();
        
        this.showAlert(`Producto agregado exitosamente a ${ubicacion === 'cocina' ? 'Cocina' : 'Salón'}`, 'success');
        this.hideForm();
    }

    showAlert(message, type) {
        const alertDiv = document.getElementById('form-alert');
        if (alertDiv) {
            alertDiv.textContent = message;
            alertDiv.className = `alert-products alert-products-${type}`;
            alertDiv.style.display = 'flex';

            setTimeout(() => {
                alertDiv.style.display = 'none';
            }, 3000);
        }
    }

    renderProducts(filteredProducts = null) {
        const productsToRender = filteredProducts || this.products;
        const tbody = document.getElementById('products-tbody');
        const totalProducts = document.getElementById('total-products');
        const emptyState = document.getElementById('products-empty-state');
        const tableContainer = document.querySelector('.products-table-wrapper');
        const pagination = document.getElementById('pagination');
        const pageInfo = document.getElementById('page-info');

        if (!tbody || !totalProducts || !emptyState || !tableContainer) return;

        // Update total (sum of both types)
        const totalCount = this.products.length + this.cocinaProducts.length;
        totalProducts.textContent = totalCount;

        // Show/hide empty state
        if (totalCount === 0) {
            emptyState.style.display = 'block';
            tableContainer.style.display = 'none';
            if (pagination) pagination.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        tableContainer.style.display = 'block';

        // Combine both product lists for display
        const allProducts = [...this.products, ...this.cocinaProducts];
        
        // Calculate pagination
        const totalPages = Math.ceil(allProducts.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageProducts = allProducts.slice(startIndex, endIndex);

        // Render products
        tbody.innerHTML = '';
        pageProducts.forEach((product, index) => {
            const tr = document.createElement('tr');
            const rowNumber = startIndex + index + 1;
            
            tr.innerHTML = `
                <td class="row-number">${rowNumber}</td>
                <td class="product-name">${product.nombre}</td>
                <td class="product-price">$${product.precio.toFixed(2)}</td>
                <td>${new Date(product.fechaCreacion).toLocaleDateString()}</td>
                <td>
                    <span class="product-location ${product.ubicacion === 'cocina' ? 'location-cocina' : 'location-salon'}">
                        ${product.ubicacion === 'cocina' ? 'Cocina' : 'Salón'}
                    </span>
                </td>
                <td class="actions-cell-products">
                    <button class="btn-icon-products btn-edit-products" data-id="${product.id}" data-ubicacion="${product.ubicacion}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon-products btn-delete-products" data-id="${product.id}" data-ubicacion="${product.ubicacion}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add event listeners to action buttons
        tbody.querySelectorAll('.btn-edit-products').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                const ubicacion = e.currentTarget.dataset.ubicacion;
                this.openEditModal(id, ubicacion);
            });
        });

        tbody.querySelectorAll('.btn-delete-products').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                const ubicacion = e.currentTarget.dataset.ubicacion;
                this.confirmDeleteProduct(id, ubicacion);
            });
        });

        // Update pagination
        this.updatePagination(totalPages, pageInfo);

        // Show/hide pagination
        if (pagination) {
            pagination.style.display = totalPages > 1 ? 'flex' : 'none';
        }
    }

    updatePagination(totalPages, pageInfo) {
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (!prevBtn || !nextBtn || !pageInfo) return;

        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages;

        pageInfo.textContent = `Página ${this.currentPage} de ${totalPages}`;

        prevBtn.onclick = () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderProducts();
            }
        };

        nextBtn.onclick = () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderProducts();
            }
        };
    }

    filterProducts(searchTerm) {
        if (!searchTerm) {
            this.currentPage = 1;
            this.renderProducts();
            return;
        }

        const term = searchTerm.toLowerCase();
        const allProducts = [...this.products, ...this.cocinaProducts];
        const filtered = allProducts.filter(product =>
            product.nombre.toLowerCase().includes(term) ||
            product.precio.toString().includes(term) ||
            (product.ubicacion === 'cocina' ? 'cocina' : 'salon').includes(term)
        );

        this.currentPage = 1;
        this.renderFilteredProducts(filtered);
    }

    renderFilteredProducts(filteredProducts) {
        const tbody = document.getElementById('products-tbody');
        const totalProducts = document.getElementById('total-products');
        const emptyState = document.getElementById('products-empty-state');
        const tableContainer = document.querySelector('.products-table-wrapper');
        const pagination = document.getElementById('pagination');
        const pageInfo = document.getElementById('page-info');

        if (!tbody || !totalProducts || !emptyState || !tableContainer) return;

        // Update total
        totalProducts.textContent = filteredProducts.length;

        // Show/hide empty state
        if (filteredProducts.length === 0) {
            emptyState.style.display = 'block';
            tableContainer.style.display = 'none';
            if (pagination) pagination.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        tableContainer.style.display = 'block';

        // Calculate pagination
        const totalPages = Math.ceil(filteredProducts.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageProducts = filteredProducts.slice(startIndex, endIndex);

        // Render products
        tbody.innerHTML = '';
        pageProducts.forEach((product, index) => {
            const tr = document.createElement('tr');
            const rowNumber = startIndex + index + 1;
            
            tr.innerHTML = `
                <td class="row-number">${rowNumber}</td>
                <td class="product-name">${product.nombre}</td>
                <td class="product-price">$${product.precio.toFixed(2)}</td>
                <td>${new Date(product.fechaCreacion).toLocaleDateString()}</td>
                <td>
                    <span class="product-location ${product.ubicacion === 'cocina' ? 'location-cocina' : 'location-salon'}">
                        ${product.ubicacion === 'cocina' ? 'Cocina' : 'Salón'}
                    </span>
                </td>
                <td class="actions-cell-products">
                    <button class="btn-icon-products btn-edit-products" data-id="${product.id}" data-ubicacion="${product.ubicacion}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon-products btn-delete-products" data-id="${product.id}" data-ubicacion="${product.ubicacion}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add event listeners to action buttons
        tbody.querySelectorAll('.btn-edit-products').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                const ubicacion = e.currentTarget.dataset.ubicacion;
                this.openEditModal(id, ubicacion);
            });
        });

        tbody.querySelectorAll('.btn-delete-products').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                const ubicacion = e.currentTarget.dataset.ubicacion;
                this.confirmDeleteProduct(id, ubicacion);
            });
        });

        // Update pagination
        this.updatePagination(totalPages, pageInfo);

        // Show/hide pagination
        if (pagination) {
            pagination.style.display = totalPages > 1 ? 'flex' : 'none';
        }
    }

    openEditModal(productId, ubicacion) {
        let product;
        if (ubicacion === 'salon') {
            product = this.products.find(p => p.id === productId);
        } else {
            product = this.cocinaProducts.find(p => p.id === productId);
        }
        
        if (!product) return;

        this.currentEditId = productId;
        this.currentEditUbicacion = ubicacion;

        const nombreInput = document.getElementById('edit-producto-nombre');
        const precioInput = document.getElementById('edit-producto-precio');
        const ubicacionSelect = document.getElementById('edit-producto-ubicacion');
        
        if (nombreInput) nombreInput.value = product.nombre;
        if (precioInput) precioInput.value = product.precio;
        if (ubicacionSelect) ubicacionSelect.value = product.ubicacion;

        // Check for similar products
        const similar = this.findSimilarProducts(product.nombre);
        const warningDiv = document.getElementById('similar-products-edit-warning');
        const similarList = document.getElementById('similar-products-edit-list');

        if (warningDiv && similarList) {
            if (similar.length > 0) {
                similarList.innerHTML = '';
                similar.forEach(p => {
                    if (p.id !== productId) {
                        const li = document.createElement('li');
                        li.innerHTML = `
                            <span>${p.nombre}</span>
                            <span>$${p.precio.toFixed(2)}</span>
                            <span class="product-location-badge">${p.ubicacion === 'cocina' ? 'Cocina' : 'Salón'}</span>
                        `;
                        similarList.appendChild(li);
                    }
                });
                warningDiv.style.display = similar.length > 1 ? 'block' : 'none';
            } else {
                warningDiv.style.display = 'none';
            }
        }

        const modal = document.getElementById('modal-edit');
        if (modal) modal.classList.add('active');
    }

    closeEditModal() {
        const modal = document.getElementById('modal-edit');
        if (modal) modal.classList.remove('active');
        
        this.currentEditId = null;
        this.currentEditUbicacion = null;
        
        const warningDiv = document.getElementById('similar-products-edit-warning');
        if (warningDiv) warningDiv.style.display = 'none';
    }

    updateProduct() {
        const nombreInput = document.getElementById('edit-producto-nombre');
        const precioInput = document.getElementById('edit-producto-precio');
        const ubicacionSelect = document.getElementById('edit-producto-ubicacion');
        
        if (!nombreInput || !precioInput || !ubicacionSelect) return;
        
        const nombre = nombreInput.value.trim();
        const precio = parseFloat(precioInput.value);
        const nuevaUbicacion = ubicacionSelect.value;

        if (!nombre || !precio || precio <= 0) {
            this.showAlert('Por favor, complete todos los campos correctamente', 'warning');
            return;
        }

        // Check for duplicates in the new location (excluding current product)
        let duplicate = null;
        if (nuevaUbicacion === 'salon') {
            duplicate = this.products.find(p => 
                p.id !== this.currentEditId &&
                p.nombre.toLowerCase() === nombre.toLowerCase()
            );
        } else {
            duplicate = this.cocinaProducts.find(p => 
                p.id !== this.currentEditId &&
                p.nombre.toLowerCase() === nombre.toLowerCase()
            );
        }

        if (duplicate) {
            const alerta = document.getElementById('alerta-duplicado-edit');
            if (alerta) {
                alerta.textContent = `¡Advertencia! Ya existe un producto con el nombre "${duplicate.nombre}" en ${nuevaUbicacion === 'cocina' ? 'Cocina' : 'Salón'}`;
                alerta.style.display = 'flex';
            }
            return;
        }

        // Find and update product
        let productArray;
        let otherArray;
        
        if (this.currentEditUbicacion === 'salon') {
            productArray = this.products;
            otherArray = this.cocinaProducts;
        } else {
            productArray = this.cocinaProducts;
            otherArray = this.products;
        }
        
        const productIndex = productArray.findIndex(p => p.id === this.currentEditId);
        
        if (productIndex !== -1) {
            const product = productArray[productIndex];
            
            // If location changed, move product to other array
            if (this.currentEditUbicacion !== nuevaUbicacion) {
                // Remove from current array
                productArray.splice(productIndex, 1);
                
                // Add to new array
                const updatedProduct = {
                    ...product,
                    nombre,
                    precio,
                    ubicacion: nuevaUbicacion,
                    fechaActualizacion: new Date().toISOString()
                };
                
                if (nuevaUbicacion === 'salon') {
                    this.products.push(updatedProduct);
                } else {
                    this.cocinaProducts.push(updatedProduct);
                }
            } else {
                // Just update in place
                productArray[productIndex] = {
                    ...productArray[productIndex],
                    nombre,
                    precio,
                    fechaActualizacion: new Date().toISOString()
                };
            }
            
            this.saveProducts();
            this.renderProducts();
            this.closeEditModal();
            this.showAlert('Producto actualizado exitosamente', 'success');
        }
    }

    confirmDeleteProduct(productId, ubicacion) {
        let product;
        if (ubicacion === 'salon') {
            product = this.products.find(p => p.id === productId);
        } else {
            product = this.cocinaProducts.find(p => p.id === productId);
        }
        
        if (!product) return;

        // Usar el modal de confirmación existente del dashboard
        if (window.showConfirmationModal) {
            window.showConfirmationModal(
                '¿Eliminar Producto?',
                `¿Está seguro de eliminar el producto "${product.nombre}" de ${ubicacion === 'cocina' ? 'Cocina' : 'Salón'}? Esta acción no se puede deshacer.`,
                'warning',
                () => this.deleteProduct(productId, ubicacion)
            );
        } else {
            // Fallback si el modal no está disponible
            if (confirm(`¿Está seguro de eliminar el producto "${product.nombre}" de ${ubicacion === 'cocina' ? 'Cocina' : 'Salón'}?`)) {
                this.deleteProduct(productId, ubicacion);
            }
        }
    }

    deleteProduct(productId, ubicacion) {
        let productArray;
        
        if (ubicacion === 'salon') {
            productArray = this.products;
        } else {
            productArray = this.cocinaProducts;
        }
        
        const productIndex = productArray.findIndex(p => p.id === productId);
        if (productIndex !== -1) {
            productArray.splice(productIndex, 1);
            this.saveProducts();
            this.renderProducts();
            this.showAlert('Producto eliminado exitosamente', 'success');
        }
    }

    // Nuevo método para obtener productos por ubicación
    getProductsByUbicacion(ubicacion) {
        if (ubicacion === 'salon') {
            return this.products;
        } else {
            return this.cocinaProducts;
        }
    }

    // Método para sincronizar con otras secciones
    syncProductsToSection(section) {
        if (section === 'salon') {
            return this.products;
        } else if (section === 'cocina') {
            return this.cocinaProducts;
        }
        return [];
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the products section
    if (document.getElementById('productos-section')) {
        const productManager = new ProductManager();
        
        // Make it available globally for other sections
        window.productManager = productManager;
    }
});