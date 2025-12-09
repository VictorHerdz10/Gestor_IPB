class ProductManager {
    constructor() {
        this.products = [];
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
        if (savedProducts) {
            this.products = JSON.parse(savedProducts);
        }
    }

    saveProducts() {
        localStorage.setItem('ipb_products', JSON.stringify(this.products));
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
        return this.products.filter(product => {
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
        
        if (!nombreInput || !precioInput) return;
        
        const nombre = nombreInput.value.trim();
        const precio = parseFloat(precioInput.value);
        const alerta = document.getElementById('alerta-duplicado');

        // Validation
        if (!nombre || !precio || precio <= 0) {
            this.showAlert('Por favor, complete todos los campos correctamente', 'warning');
            return;
        }

        // Check for duplicates
        const duplicate = this.products.find(p => 
            p.nombre.toLowerCase() === nombre.toLowerCase()
        );

        if (duplicate) {
            if (alerta) {
                alerta.textContent = `¡Advertencia! Ya existe un producto con el nombre "${duplicate.nombre}"`;
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
            fechaCreacion: new Date().toISOString(),
            fechaActualizacion: new Date().toISOString()
        };

        this.products.push(newProduct);
        this.saveProducts();
        this.renderProducts();
        
        this.showAlert('Producto agregado exitosamente', 'success');
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

        // Update total
        totalProducts.textContent = productsToRender.length;

        // Show/hide empty state
        if (productsToRender.length === 0) {
            emptyState.style.display = 'block';
            tableContainer.style.display = 'none';
            if (pagination) pagination.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        tableContainer.style.display = 'block';

        // Calculate pagination
        const totalPages = Math.ceil(productsToRender.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageProducts = productsToRender.slice(startIndex, endIndex);

        // Render products
        tbody.innerHTML = '';
        pageProducts.forEach(product => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="product-name">${product.nombre}</td>
                <td class="product-price">$${product.precio.toFixed(2)}</td>
                <td>${new Date(product.fechaCreacion).toLocaleDateString()}</td>
                <td class="actions-cell-products">
                    <button class="btn-icon-products btn-edit-products" data-id="${product.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon-products btn-delete-products" data-id="${product.id}" title="Eliminar">
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
                this.openEditModal(id);
            });
        });

        tbody.querySelectorAll('.btn-delete-products').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                this.confirmDeleteProduct(id);
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
        const filtered = this.products.filter(product =>
            product.nombre.toLowerCase().includes(term) ||
            product.precio.toString().includes(term)
        );

        this.currentPage = 1;
        this.renderProducts(filtered);
    }

    openEditModal(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        this.currentEditId = productId;

        const nombreInput = document.getElementById('edit-producto-nombre');
        const precioInput = document.getElementById('edit-producto-precio');
        
        if (nombreInput) nombreInput.value = product.nombre;
        if (precioInput) precioInput.value = product.precio;

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
        
        const warningDiv = document.getElementById('similar-products-edit-warning');
        if (warningDiv) warningDiv.style.display = 'none';
    }

    updateProduct() {
        const nombreInput = document.getElementById('edit-producto-nombre');
        const precioInput = document.getElementById('edit-producto-precio');
        
        if (!nombreInput || !precioInput) return;
        
        const nombre = nombreInput.value.trim();
        const precio = parseFloat(precioInput.value);

        if (!nombre || !precio || precio <= 0) {
            this.showAlert('Por favor, complete todos los campos correctamente', 'warning');
            return;
        }

        // Check for duplicates (excluding current product)
        const duplicate = this.products.find(p => 
            p.id !== this.currentEditId &&
            p.nombre.toLowerCase() === nombre.toLowerCase()
        );

        if (duplicate) {
            const alerta = document.getElementById('alerta-duplicado-edit');
            if (alerta) {
                alerta.textContent = `¡Advertencia! Ya existe un producto con el nombre "${duplicate.nombre}"`;
                alerta.style.display = 'flex';
            }
            return;
        }

        // Update product
        const productIndex = this.products.findIndex(p => p.id === this.currentEditId);
        if (productIndex !== -1) {
            this.products[productIndex] = {
                ...this.products[productIndex],
                nombre,
                precio,
                fechaActualizacion: new Date().toISOString()
            };

            this.saveProducts();
            this.renderProducts();
            this.closeEditModal();
            this.showAlert('Producto actualizado exitosamente', 'success');
        }
    }

    confirmDeleteProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Usar el modal de confirmación existente del dashboard
        if (window.showConfirmationModal) {
            window.showConfirmationModal(
                '¿Eliminar Producto?',
                `¿Está seguro de eliminar el producto "${product.nombre}"? Esta acción no se puede deshacer.`,
                'warning',
                () => this.deleteProduct(productId)
            );
        } else {
            // Fallback si el modal no está disponible
            if (confirm(`¿Está seguro de eliminar el producto "${product.nombre}"?`)) {
                this.deleteProduct(productId);
            }
        }
    }

    deleteProduct(productId) {
        const productIndex = this.products.findIndex(p => p.id === productId);
        if (productIndex !== -1) {
            this.products.splice(productIndex, 1);
            this.saveProducts();
            this.renderProducts();
            this.showAlert('Producto eliminado exitosamente', 'success');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the products section
    if (document.getElementById('productos-section')) {
        const productManager = new ProductManager();
        
        // Make it available globally for debugging
        window.productManager = productManager;
    }
});