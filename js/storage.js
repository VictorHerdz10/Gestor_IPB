// Gestión de almacenamiento local
const StorageManager = {
    // Claves para localStorage
    KEYS: {
        PRODUCTS: 'ipb_products',
        COCINA_PRODUCTS: 'ipb_cocina_products', // NUEVA
        SALON: 'ipb_salon',
        COCINA: 'ipb_cocina',
        CONSUMO: 'ipb_consumo_data',
        EXTRACCIONES: 'ipb_extracciones',
        TRANSFERENCIAS: 'ipb_transferencias_data',
        DAILY_DATA: 'ipb_daily_data'
    },
    
    // Productos
    saveProducts(products) {
        localStorage.setItem(this.KEYS.PRODUCTS, JSON.stringify(products));
    },
    
    getProducts() {
        const products = localStorage.getItem(this.KEYS.PRODUCTS);
        return products ? JSON.parse(products) : [];
    },
    
    // Productos de Cocina (NUEVO)
    saveCocinaProducts(products) {
        localStorage.setItem(this.KEYS.COCINA_PRODUCTS, JSON.stringify(products));
    },
    
    getCocinaProducts() {
        const products = localStorage.getItem(this.KEYS.COCINA_PRODUCTS);
        return products ? JSON.parse(products) : [];
    },
    
    // Obtener todos los productos (ambos tipos)
    getAllProducts() {
        const salonProducts = this.getProducts();
        const cocinaProducts = this.getCocinaProducts();
        return [...salonProducts, ...cocinaProducts];
    },
    
    // Salón
    saveSalonData(data) {
        localStorage.setItem(this.KEYS.SALON, JSON.stringify(data));
    },
    
    getSalonData() {
        const data = localStorage.getItem(this.KEYS.SALON);
        return data ? JSON.parse(data) : [];
    },
    
    // Cocina
    saveCocinaData(data) {
        localStorage.setItem(this.KEYS.COCINA, JSON.stringify(data));
    },
    
    getCocinaData() {
        const data = localStorage.getItem(this.KEYS.COCINA);
        return data ? JSON.parse(data) : [];
    },
    
    // Consumo
    saveConsumoData(data) {
        localStorage.setItem(this.KEYS.CONSUMO, JSON.stringify(data));
    },
    
    getConsumoData() {
        const data = localStorage.getItem(this.KEYS.CONSUMO);
        return data ? JSON.parse(data) : [];
    },
    
    // Extracciones
    saveExtraccionesData(data) {
        localStorage.setItem(this.KEYS.EXTRACCIONES, JSON.stringify(data));
    },
    
    getExtraccionesData() {
        const data = localStorage.getItem(this.KEYS.EXTRACCIONES);
        return data ? JSON.parse(data) : [];
    },
    
    // Transferencias
    saveTransferenciasData(data) {
        localStorage.setItem(this.KEYS.TRANSFERENCIAS, JSON.stringify(data));
    },
    
    getTransferenciasData() {
        const data = localStorage.getItem(this.KEYS.TRANSFERENCIAS);
        return data ? JSON.parse(data) : [];
    },
    
    // Datos diarios consolidados
    saveDailyData(data) {
        localStorage.setItem(this.KEYS.DAILY_DATA, JSON.stringify(data));
    },
    
    getDailyData() {
        const data = localStorage.getItem(this.KEYS.DAILY_DATA);
        return data ? JSON.parse(data) : null;
    },
    
    // Limpiar todos los datos (nuevo día)
    clearDailyData() {
        localStorage.removeItem(this.KEYS.SALON);
        localStorage.removeItem(this.KEYS.COCINA);
        localStorage.removeItem(this.KEYS.CONSUMO);
        localStorage.removeItem(this.KEYS.EXTRACCIONES);
        localStorage.removeItem(this.KEYS.TRANSFERENCIAS);
        localStorage.removeItem(this.KEYS.DAILY_DATA);
        // NOTA: No limpiamos los productos, solo los datos del día
    },
    
    // Exportar todos los datos
    exportAllData() {
        const allData = {
            products: this.getProducts(),
            cocinaProducts: this.getCocinaProducts(),
            salon: this.getSalonData(),
            cocina: this.getCocinaData(),
            consumo: this.getConsumoData(),
            extracciones: this.getExtraccionesData(),
            transferencias: this.getTransferenciasData(),
            dailyData: this.getDailyData(),
            exportDate: new Date().toISOString()
        };
        
        return JSON.stringify(allData, null, 2);
    },
    
    // Importar datos
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (data.products) this.saveProducts(data.products);
            if (data.cocinaProducts) this.saveCocinaProducts(data.cocinaProducts);
            if (data.salon) this.saveSalonData(data.salon);
            if (data.cocina) this.saveCocinaData(data.cocina);
            if (data.consumo) this.saveConsumoData(data.consumo);
            if (data.extracciones) this.saveExtraccionesData(data.extracciones);
            if (data.transferencias) this.saveTransferenciasData(data.transferencias);
            if (data.dailyData) this.saveDailyData(data.dailyData);
            
            return { success: true, message: 'Datos importados correctamente' };
        } catch (error) {
            return { success: false, message: 'Error al importar datos: ' + error.message };
        }
    }
};

// Hacer disponible globalmente
window.StorageManager = StorageManager;