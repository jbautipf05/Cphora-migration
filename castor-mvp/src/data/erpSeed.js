// Seed completo del ERP — transcrito 1:1 del seed() de Castor_Dashboard_Demo6.html.
// Es el contenido que alimenta todas las vistas espejo (Comercial, Operación,
// Finanzas, Admin). En la Fase Supabase se reemplaza por la hidratación en login.

export const PROD_AREAS = [
  'Programación',
  'Ebanistería',
  'Preparación y pintura',
  'Metal mecánica',
  'Pintura electrostática',
  'Tapicería',
  'Tejido',
  'Ensamble',
  'Listo',
];

export const PRODUCT_CATEGORIES = [
  'Sillas', 'Mesas', 'Sofás', 'Butacas', 'Complementos', 'Camas',
  'Nocheros', 'Escritorios', 'Exterior', 'Colchones', 'Poufs', 'Modulares', 'Otros',
];

export const WAREHOUSES = [
  { id: 'W-CEDI', code: 'CEDI', name: 'Centro de Distribución', address: 'Zona Industrial Norte', responsable: 'Nelson Díaz', color: '#C9A961', tipo: 'terminado' },
  { id: 'W-C43', code: 'Castor 43', name: 'Castor 43', address: 'Bogotá · Calle 43', responsable: 'Mario Estrada', color: '#2F5585', tipo: 'terminado' },
  { id: 'W-CTG', code: 'Castor Ctg', name: 'Castor Cartagena', address: 'Cartagena · Centro Histórico', responsable: 'Luisa Ortega', color: '#0891b2', tipo: 'terminado' },
  { id: 'W-VOL', code: 'Volcanes', name: 'Volcanes', address: 'Medellín · Volcanes', responsable: 'Héctor Pulido', color: '#7c3aed', tipo: 'terminado' },
  // H-102: las dos bodegas de materia prima. Se muestran con el vocabulario del cliente
  // ("Almacén #1/#2"); el campo `tipo:'insumos'` (técnico, probado y transversal) NO se
  // renombra — separa MP de PT en todos los selectores. Ver docs/parity/FASE3/H-102.md.
  { id: 'W-ALM1', code: 'Almacén #1', name: 'Almacén #1', address: 'Bodega materia prima 1', responsable: 'Mario Estrada', color: '#059669', tipo: 'insumos' },
  { id: 'W-ALM2', code: 'Almacén #2', name: 'Almacén #2', address: 'Bodega materia prima 2', responsable: 'Mario Estrada', color: '#0ea5e9', tipo: 'insumos' },
];

export const PRODUCTS = [
  { id: 'p1', sku: 'BUT-SER-001', name: 'Butaca Serenity', description: 'Butaca individual tapizada en cuero sintético, estructura de madera sólida.', price: 2850000, cost: 1800000, category: 'Butacas', warehouseId: 'W-CEDI', stock: 12, min: 3, entryDate: '2026-03-10', photo: '🛋', dimensions: { ancho: 78, alto: 92, profundidad: 85 }, areas: ['Ebanistería', 'Tapicería', 'Ensamble', 'Listo'], bom: [{ supplyId: 'IN-01', qty: 4.5 }, { supplyId: 'IN-04', qty: 2.5 }, { supplyId: 'IN-06', qty: 1 }], verified: true },
  { id: 'p2', sku: 'SOF-EMM-002', name: 'Sofá Emma 3 puestos', description: 'Sofá seccional de 3 puestos, tela antimanchas, patas de aluminio cepillado.', price: 4650000, cost: 2900000, category: 'Sofás', warehouseId: 'W-C43', stock: 6, min: 2, entryDate: '2026-02-15', photo: '🛋', dimensions: { ancho: 210, alto: 88, profundidad: 95 }, areas: ['Ebanistería', 'Metal mecánica', 'Pintura electrostática', 'Tapicería', 'Ensamble', 'Listo'], bom: [{ supplyId: 'IN-01', qty: 8 }, { supplyId: 'IN-02', qty: 6 }, { supplyId: 'IN-04', qty: 5 }, { supplyId: 'IN-06', qty: 4 }], verified: true },
  { id: 'p3', sku: 'SIL-ATL-003', name: 'Silla Atlanta', description: 'Silla de comedor en madera de roble con asiento tapizado.', price: 890000, cost: 510000, category: 'Sillas', warehouseId: 'W-VOL', stock: 24, min: 10, entryDate: '2026-03-22', photo: '🪑', dimensions: { ancho: 45, alto: 98, profundidad: 52 }, areas: ['Ebanistería', 'Preparación y pintura', 'Tapicería', 'Ensamble', 'Listo'], bom: [{ supplyId: 'IN-01', qty: 2 }, { supplyId: 'IN-04', qty: 0.8 }, { supplyId: 'IN-03', qty: 0.3 }], verified: true },
  { id: 'p4', sku: 'MES-COR-004', name: 'Mesa Cordelia', description: 'Mesa auxiliar en madera laminada con detalles dorados.', price: 2200000, cost: 1350000, category: 'Mesas', warehouseId: 'W-CTG', stock: 8, min: 3, entryDate: '2026-01-28', photo: '🪵', dimensions: { ancho: 120, alto: 75, profundidad: 60 }, areas: ['Ebanistería', 'Preparación y pintura', 'Ensamble', 'Listo'], bom: [{ supplyId: 'IN-01', qty: 6 }, { supplyId: 'IN-03', qty: 0.8 }, { supplyId: 'IN-07', qty: 1 }], verified: true },
  { id: 'p5', sku: 'POU-LUN-005', name: 'Pouf Luna', description: 'Pouf redondo en boucle marfil, ideal para salas modernas.', price: 650000, cost: 320000, category: 'Poufs', warehouseId: 'W-CEDI', stock: 31, min: 8, entryDate: '2026-03-30', photo: '⚪', dimensions: { ancho: 55, alto: 40, profundidad: 55 }, areas: ['Tapicería', 'Tejido', 'Listo'], bom: [{ supplyId: 'IN-04', qty: 2 }, { supplyId: 'IN-05', qty: 1.5 }], verified: true },
  { id: 'p6', sku: 'MUB-ROM-006', name: 'Módulo Roma', description: 'Modular en L, 6 puestos, tela lino gris, estructura reforzada.', price: 7400000, cost: 4600000, category: 'Modulares', warehouseId: 'W-C43', stock: 2, min: 1, entryDate: '2026-02-05', photo: '🛋', dimensions: { ancho: 320, alto: 86, profundidad: 180 }, areas: ['Ebanistería', 'Metal mecánica', 'Pintura electrostática', 'Tapicería', 'Ensamble', 'Listo'], bom: [{ supplyId: 'IN-01', qty: 12 }, { supplyId: 'IN-02', qty: 10 }, { supplyId: 'IN-04', qty: 9 }, { supplyId: 'IN-06', qty: 6 }], verified: true },
  { id: 'p7', sku: 'CAM-VER-007', name: 'Cama Verona Queen', description: 'Cama Queen con cabecero tapizado capitoné, base madera maciza.', price: 5200000, cost: 3100000, category: 'Camas', warehouseId: 'W-VOL', stock: 4, min: 2, entryDate: '2026-03-18', photo: '🛏', dimensions: { ancho: 170, alto: 120, profundidad: 210 }, areas: ['Ebanistería', 'Preparación y pintura', 'Tapicería', 'Ensamble', 'Listo'], bom: [{ supplyId: 'IN-01', qty: 10 }, { supplyId: 'IN-03', qty: 1.5 }, { supplyId: 'IN-04', qty: 4 }], verified: true },
  { id: 'p8', sku: 'MES-NOB-008', name: 'Mesa Comedor Noble', description: 'Mesa de comedor 8 puestos, tapa de mármol sintético.', price: 6850000, cost: 4200000, category: 'Mesas', warehouseId: 'W-CTG', stock: 3, min: 1, entryDate: '2026-04-02', photo: '🪑', dimensions: { ancho: 240, alto: 76, profundidad: 100 }, areas: ['Ebanistería', 'Metal mecánica', 'Pintura electrostática', 'Ensamble', 'Listo'], bom: [{ supplyId: 'IN-01', qty: 8 }, { supplyId: 'IN-02', qty: 5 }, { supplyId: 'IN-07', qty: 1 }], verified: true },
];

export const SUPPLIERS = [
  { id: 'SUP-01', name: 'Maderas del Sur', nit: '900123456-1', contact: 'Jaime Ortiz', phone: '320 441 2233', email: 'ventas@maderassur.co', category: 'Madera', city: 'Medellín', address: 'Cra 52 # 30-15', pais: 'Colombia', actividadEconomica: 'Comercio al por mayor de madera' },
  { id: 'SUP-02', name: 'Telas Colombia', nit: '900654321-2', contact: 'Marisol Gómez', phone: '301 776 9988', email: 'marisol@telascol.co', category: 'Telas', city: 'Bogotá', address: 'Cl 13 # 45-22', pais: 'Colombia', actividadEconomica: 'Fabricación y venta de textiles' },
  { id: 'SUP-03', name: 'Metalúrgica Andes', nit: '800998877-3', contact: 'Rodrigo Paz', phone: '312 889 0011', email: 'rpaz@metandes.co', category: 'Hierro', city: 'Cali', address: 'Av 3N # 68-40', pais: 'Colombia', actividadEconomica: 'Fabricación de productos metálicos' },
  { id: 'SUP-04', name: 'Pinturas Industriales SA', nit: '900555444-4', contact: 'Diana Marín', phone: '315 223 1199', email: 'diana@pinturasind.co', category: 'Pintura', city: 'Bogotá', address: 'Cl 80 # 70-30', pais: 'Colombia', actividadEconomica: 'Fabricación de pinturas y recubrimientos' },
  { id: 'SUP-05', name: 'Herrajes del Norte', nit: '900111222-5', contact: 'Oscar Rivera', phone: '318 662 0077', email: 'ocar@herrajes.co', category: 'Insumos', city: 'Barranquilla', address: 'Cl 72 # 45-11', pais: 'Colombia', actividadEconomica: 'Comercio de herrajes y ferretería' },
];

export const SUPPLIES = [
  { id: 'IN-01', name: 'Madera de roble', unit: 'Pie tabla', unitOut: 'Pie tabla', convFactor: 1, cost: 85000, supplierId: 'SUP-01', stock: 250, min: 50, category: 'Madera', warehouseId: 'W-ALM1' },
  { id: 'IN-02', name: 'Tubo acero 2"', unit: 'Unidad', unitOut: 'Mts', convFactor: 6, cost: 32000, supplierId: 'SUP-03', stock: 80, min: 20, category: 'Hierro', warehouseId: 'W-ALM1' },
  { id: 'IN-03', name: 'Mármol sintético', unit: 'Mts', unitOut: 'Mts', convFactor: 1, cost: 180000, supplierId: 'SUP-01', stock: 35, min: 10, category: 'Madera', warehouseId: 'W-ALM1' },
  { id: 'IN-04', name: 'Tela lino premium', unit: 'Mts', unitOut: 'Mts', convFactor: 1, cost: 48000, supplierId: 'SUP-02', stock: 320, min: 80, category: 'Telas', warehouseId: 'W-ALM2' },
  { id: 'IN-05', name: 'Boucle marfil', unit: 'Mts', unitOut: 'Mts', convFactor: 1, cost: 62000, supplierId: 'SUP-02', stock: 110, min: 30, category: 'Telas', warehouseId: 'W-ALM2' },
  { id: 'IN-06', name: 'Espuma alta densidad', unit: 'Unidad', unitOut: 'Cm', convFactor: 200, cost: 240000, supplierId: 'SUP-04', stock: 18, min: 5, category: 'Espuma', warehouseId: 'W-ALM2' },
  { id: 'IN-07', name: 'Grapas industriales', unit: 'Caja', unitOut: 'Carril', convFactor: 144, cost: 45000, supplierId: 'SUP-05', stock: 20, min: 5, category: 'Insumos', warehouseId: 'W-ALM1' },
  { id: 'IN-08', name: 'Pintura electrostática negra', unit: 'Galon', unitOut: '1/4 Galon', convFactor: 4, cost: 28000, supplierId: 'SUP-04', stock: 95, min: 25, category: 'Pintura', warehouseId: 'W-ALM1' },
];

export const PURCHASE_ORDERS = [
  { id: 'OC-3001', supplierId: 'SUP-01', supplier: 'Maderas del Sur', date: '2026-04-05', expectedDate: '2026-04-20', warehouseId: 'W-ALM1', estado: 'abierta', total: 12500000, createdBy: 'Mario Estrada', notes: 'Reposición madera roble Q2', items: [{ supplyId: 'IN-01', qty: 100, unit: 'Pie tabla', cost: 85000, received: 40, status: 'parcial' }, { supplyId: 'IN-03', qty: 20, unit: 'Mts', cost: 180000, received: 0, status: 'pendiente' }] },
  { id: 'OC-3002', supplierId: 'SUP-02', supplier: 'Telas Colombia', date: '2026-04-10', expectedDate: '2026-04-25', warehouseId: 'W-ALM2', estado: 'abierta', total: 7800000, createdBy: 'Mario Estrada', notes: 'Telas tapicería línea Roma', items: [{ supplyId: 'IN-04', qty: 120, unit: 'Mts', cost: 48000, received: 0, status: 'pendiente' }, { supplyId: 'IN-05', qty: 40, unit: 'Mts', cost: 62000, received: 0, status: 'pendiente' }] },
  { id: 'OC-3003', supplierId: 'SUP-04', supplier: 'Pinturas Industriales SA', date: '2026-03-25', expectedDate: '2026-04-08', warehouseId: 'W-ALM1', estado: 'cerrada', total: 2240000, createdBy: 'Mario Estrada', notes: 'Pintura negra stock crítico', items: [{ supplyId: 'IN-08', qty: 80, unit: 'Galon', cost: 28000, received: 80, status: 'completo' }] },
];

export const CUSTOMERS = [
  { id: 'C-001', name: 'Jose Ramírez', tipo: 'lead', phone: '311 445 7788', email: 'jramirez@mail.com', city: 'Bogotá', address: 'Cra 50 # 80-10', doc: 'CC 79.554.332', createdAt: '2026-01-10', channel: '', asesor: 'Thalia Cifuentes', linkedLeadId: null },
  { id: 'C-002', name: 'María Delgado', tipo: 'lead', phone: '313 668 1100', email: 'maria.d@mail.co', city: 'Cali', address: 'Cl 5 # 40-22', doc: 'CC 52.887.210', createdAt: '2026-02-20', channel: '', asesor: 'Alexander Vivas', linkedLeadId: null },
  { id: 'C-003', name: 'Adriano Villadiego', tipo: 'institucional', razonSocial: 'Villadiego Inmuebles', nit: '900777555-1', contacto: 'Adriano Villadiego', phone: '301 774 3322', email: 'avilla@mail.co', city: 'Cartagena', address: 'Cl 35 # 3-27', doc: 'CC 12.554.876', createdAt: '2026-02-15', channel: '', asesor: 'Alexander Vivas', linkedLeadId: null },
  { id: 'C-004', name: 'Carmiña Chapman', tipo: 'lead', phone: '315 900 7721', email: 'carmina.ch@mail.co', city: 'Cartagena', address: 'Centro Histórico, Cl 35 # 3-27', doc: 'CC 45.662.980', createdAt: '2026-03-20', channel: '', asesor: 'Alexander Vivas', linkedLeadId: 'L-105' },
];

export const INVOICES = [
  { id: 'FAC-001', orderId: 'PED-1248', type: 'factura', clientName: 'Jose Ramírez', nit: 'CC 79.554.332', amount: 7850000, emitDate: '2026-04-06', dueDate: '2026-04-21', estado: 'pagada', dianCufe: 'aB7x-92ef-0018' },
  { id: 'REM-014', orderId: 'PED-1251', type: 'remisión', clientName: 'María Delgado', nit: 'CC 52.887.210', amount: 12200000, emitDate: '2026-03-10', dueDate: null, estado: 'entregada', dianCufe: null },
  { id: 'FAC-002', orderId: 'PED-1252', type: 'factura', clientName: 'Adriano Villadiego', nit: 'CC 12.554.876', amount: 18900000, emitDate: '2026-02-20', dueDate: '2026-03-20', estado: 'vencida', dianCufe: 'aB7x-88cc-0019' },
];

export const LEADS = [
  { id: 'L-101', name: 'Antonio González', tipo: 'institucional', razonSocial: 'GrupoInmob SA', nit: '900111222-3', contacto: 'Antonio González', phone: '300 555 1122', email: 'antonio@inmob.co', doc: 'CC 80.221.554', address: 'Cra 11 # 95-20', city: 'Bogotá', channel: 'Llamada', clasificacion: 'alto', estado: 'En gestión', asesor: 'Alexander Vivas', valor: 24500000, productosInteres: [{ productId: 'p2', qty: 2 }, { productId: 'p1', qty: 4 }], createdAt: '2026-04-01', notes: [{ at: '2026-04-01T10:30:00Z', by: 'Alexander Vivas', text: 'Primer contacto. Interesado en amueblar dos oficinas ejecutivas.' }, { at: '2026-04-08T15:20:00Z', by: 'Alexander Vivas', text: 'Envió brief por correo. Listo para cotización esta semana.' }] },
  { id: 'L-102', name: 'Laura Mendoza', tipo: 'lead', phone: '310 444 8833', email: 'laura.mendoza@mail.com', doc: 'CC 43.110.998', address: 'Cl 10 Sur # 30-15', city: 'Medellín', channel: 'Pagina Web', clasificacion: 'alto', estado: 'En gestión', asesor: 'Thalia Cifuentes', valor: 18200000, productosInteres: [{ productId: 'p6', qty: 1 }], createdAt: '2026-03-28', notes: [{ at: '2026-03-28T09:00:00Z', by: 'Thalia Cifuentes', text: 'Solicita cotización formal de sala completa.' }] },
  { id: 'L-103', name: 'Ricardo Solano', tipo: 'institucional', razonSocial: 'Solano & Cía', nit: '900554433-1', contacto: 'Ricardo Solano', phone: '316 221 4455', email: 'rsolano@mail.co', doc: 'CC 94.553.221', address: 'Av 6N # 28-70', city: 'Cali', channel: 'Tienda 43', clasificacion: 'medio', estado: 'En gestión', asesor: 'Alexander Vivas', valor: 9500000, productosInteres: [{ productId: 'p3', qty: 8 }], createdAt: '2026-04-05', notes: [] },
  { id: 'L-104', name: 'Paola Ramírez', tipo: 'lead', phone: '301 778 2100', email: 'paola.r@disenospr.co', doc: 'CC 22.887.440', address: 'Cra 53 # 75-100', city: 'Barranquilla', channel: 'Instagram', clasificacion: 'medio', estado: 'Nuevo', asesor: 'Thalia Cifuentes', valor: 6800000, productosInteres: [], createdAt: '2026-04-10', notes: [] },
  { id: 'L-105', name: 'Carmiña Chapman', tipo: 'lead', phone: '315 900 7721', email: 'carmina.ch@mail.co', doc: 'CC 45.662.980', address: 'Centro Histórico, Cl 35 # 3-27', city: 'Cartagena', channel: 'WhatsApp', clasificacion: 'alto', estado: 'Compro', asesor: 'Alexander Vivas', valor: 15300000, productosInteres: [{ productId: 'p6', qty: 1 }, { productId: 'p5', qty: 4 }], createdAt: '2026-03-20', linkedCustomerId: 'C-004', notes: [{ at: '2026-03-30T11:00:00Z', by: 'Alexander Vivas', text: 'Cotización aceptada. Pasa a pedido.' }] },
];

export const QUOTES = [
  { id: 'COT-2001', leadId: 'L-102', clientName: 'Laura Mendoza', city: 'Medellín', channel: 'Pagina Web', items: [{ productId: 'p2', qty: 1, price: 4650000, desc: 'Sofá Emma 3 puestos' }, { productId: 'p1', qty: 2, price: 2850000, desc: 'Butaca Serenity' }, { productId: 'p3', qty: 4, price: 890000, desc: 'Silla Atlanta' }], discount: 10, vigenciaDias: 45, notes: 'Entrega en 45 días. 60% anticipo, 40% contraentrega.', asesor: 'Thalia Cifuentes', estado: 'enviada', createdAt: '2026-05-01', vigencia: '2026-06-15' },
  { id: 'COT-2002', leadId: 'L-105', clientName: 'Carmiña Chapman', city: 'Cartagena', channel: 'WhatsApp', items: [{ productId: 'p6', qty: 1, price: 7400000, desc: 'Módulo Roma' }, { productId: 'p5', qty: 4, price: 650000, desc: 'Pouf Luna' }], discount: 15, vigenciaDias: 30, notes: 'Cliente VIP. Entrega 60 días.', asesor: 'Alexander Vivas', estado: 'aceptada', createdAt: '2026-03-25', vigencia: '2026-04-25' },
];

export const ORDERS = [
  { id: 'PED-1245', quoteId: 'COT-2002', customerId: 'C-004', clientName: 'Carmiña Chapman', total: 8500000, paid: 60, tiempo: 60, orderDate: '2026-03-30', dueDate: '2026-05-29', estado: 'produccion', area: 'Tapicería', asesor: 'Alexander Vivas', tipo: 'produccion', docType: 'factura', deliveryAddress: 'Centro Histórico, Cl 35 # 3-27', verified: true, productId: 'p6', qty: 1 },
  { id: 'PED-1248', quoteId: null, customerId: 'C-001', clientName: 'Jose Ramírez', total: 7850000, paid: 100, tiempo: 30, orderDate: '2026-04-05', estado: 'entregado', area: 'Listo', asesor: 'Thalia Cifuentes', tipo: 'stock', docType: 'factura', deliveryAddress: 'Cra 50 # 80-10', verified: true, productId: 'p1', qty: 2, invoiced: true },
  { id: 'PED-1251', quoteId: null, customerId: 'C-002', clientName: 'María Delgado', total: 12200000, paid: 60, tiempo: 45, orderDate: '2026-03-05', dueDate: '2026-04-19', estado: 'produccion', area: 'Ensamble', asesor: 'Alexander Vivas', tipo: 'produccion', docType: 'remisión', deliveryAddress: 'Cl 5 # 40-22', verified: true, productId: 'p2', qty: 2 },
  { id: 'PED-1252', quoteId: null, customerId: 'C-003', clientName: 'Adriano Villadiego', total: 18900000, paid: 60, tiempo: 60, orderDate: '2026-02-18', dueDate: '2026-04-19', estado: 'produccion', area: 'Metal mecánica', asesor: 'Alexander Vivas', tipo: 'produccion', docType: 'factura', deliveryAddress: 'Cl 35 # 3-27', verified: true, productId: 'p6', qty: 1 },
  { id: 'PED-1253', quoteId: null, customerId: 'C-001', clientName: 'Jose Ramírez', total: 3450000, paid: 50, tiempo: 30, orderDate: '2026-04-15', estado: 'pendiente_op', area: null, asesor: 'Thalia Cifuentes', tipo: 'produccion', docType: 'remisión', deliveryAddress: 'Cra 50 # 80-10', verified: false, productId: 'p3', qty: 4 },
];

export const FINISHED_STOCK = [
  { id: 'FS-001', productId: 'p1', orderId: null, warehouseId: 'W-CEDI', qty: 4, status: 'disponible', readyDate: '2026-04-10', notes: 'Listo para despacho general' },
  { id: 'FS-002', productId: 'p2', orderId: null, warehouseId: 'W-C43', qty: 2, status: 'disponible', readyDate: '2026-04-08', notes: '' },
  { id: 'FS-003', productId: 'p6', orderId: 'PED-1245', warehouseId: 'W-CEDI', qty: 1, status: 'reservado', readyDate: '2026-04-14', notes: 'Pedido PED-1245 Carmiña Chapman — despacho programado' },
  { id: 'FS-004', productId: 'p7', orderId: null, warehouseId: 'W-VOL', qty: 2, status: 'disponible', readyDate: '2026-04-05', notes: '' },
  { id: 'FS-005', productId: 'p8', orderId: null, warehouseId: 'W-CTG', qty: 1, status: 'disponible', readyDate: '2026-04-15', notes: '' },
  { id: 'FS-006', productId: 'p5', orderId: null, warehouseId: 'W-CEDI', qty: 8, status: 'disponible', readyDate: '2026-04-12', notes: '' },
];

export const PAYMENTS = [
  { id: 'PAG-501', orderId: 'PED-1245', amount: 9180000, method: 'Transferencia', bankId: 'B-01', type: 'anticipo', date: '2026-03-30', reference: 'TRX-88321', estado: 'confirmado' },
  { id: 'PAG-502', orderId: 'PED-1248', amount: 7850000, method: 'Tarjeta', bankId: 'B-02', type: 'total', date: '2026-04-05', reference: 'TC-1122', estado: 'confirmado' },
  { id: 'PAG-503', orderId: 'PED-1251', amount: 7320000, method: 'Transferencia', bankId: 'B-03', type: 'anticipo', date: '2026-03-05', reference: 'TRX-89002', estado: 'confirmado' },
  { id: 'PAG-504', orderId: 'PED-1252', amount: 11340000, method: 'Transferencia', bankId: 'B-01', type: 'anticipo', date: '2026-02-18', reference: 'TRX-87001', estado: 'pendiente' },
];

export const OUTGOING_PAYMENTS = [
  { id: 'OUT-031', tipo: 'proveedor', beneficiario: 'Pinturas Industriales SA', concepto: 'Pago OC-3003', ocId: 'OC-3003', amount: 2609600, method: 'Transferencia', bankId: 'B-01', estado: 'confirmado', date: '2026-04-30', reference: 'TRX-90011' },
  { id: 'OUT-032', tipo: 'empleado', beneficiario: 'Nómina abril 2026', concepto: 'Neto nómina mensual', ocId: null, amount: 24012000, method: 'Transferencia', bankId: 'B-02', estado: 'pendiente', date: '2026-04-30', reference: '—' },
];

export const WARRANTIES = [
  { id: 'GAR-051', orderId: 'PED-1248', clientName: 'Jose Ramírez', comercial: 'Thalia Cifuentes', asesor: 'Thalia Cifuentes', productId: 'p1', qty: 1, motivo: 'Costura suelta en apoyabrazos', causal: 'Costura', reportedAt: '2026-04-12', diagnosticoAt: '', solucionAt: '', cierreAt: '', estado: 'en_proceso', asignado: 'Taller Interno', resolucion: '', comunicaciones: [], fotos: [], generatedOpId: null, opCostos: [] },
];

export const POST_SALES = [
  { id: 'PS-31', orderId: 'PED-1248', clientName: 'Jose Ramírez', asesor: 'Thalia Cifuentes', hito: '7d', type: 'llamada', date: '2026-04-10', fechaObjetivo: '2026-04-12', estado: 'completado', notes: 'Cliente contento con la entrega. Pidió tiempos de garantía.', nps: 9 },
  { id: 'PS-32', orderId: 'PED-1245', clientName: 'Carmiña Chapman', asesor: 'Alexander Vivas', hito: '7d', type: 'llamada', date: null, fechaObjetivo: '2026-04-21', estado: 'pendiente', notes: '', nps: null },
  { id: 'PS-33', orderId: 'PED-1251', clientName: 'María Delgado', asesor: 'Alexander Vivas', hito: '7d', type: 'llamada', date: null, fechaObjetivo: '2026-05-25', estado: 'programado', notes: '', nps: null },
];

// RRHH-01: shape completo (contratación legal colombiana) — alineado con el form de RRHH.
export const EMPLOYEES = [
  { id: 'E-001', name: 'Alexander Vivas', role: 'Gerente Comercial', area: 'Comercial', sexo: 'Hombre', cc: 'CC 79.554.001', celular: '320 441 1001', direccion: 'Cra 11 # 93-45', ciudad: 'Bogotá', fechaNacimiento: '1985-04-12', hiredAt: '2021-05-10', fechaRetiro: '', tipoContrato: 'Indefinido', arl: 'Sura', fondoPension: 'Porvenir', salud: 'Sura', cajaCompensacion: 'Compensar', estado: 'activo', salario: 6500000, bono: 500000, lugarTrabajo: 'Bogotá · Calle 43', email: 'alex@castor.co' },
  { id: 'E-002', name: 'Thalia Cifuentes', role: 'Asesora Comercial', area: 'Comercial', sexo: 'Mujer', cc: 'CC 52.887.002', celular: '310 444 2002', direccion: 'Cl 53 # 24-30', ciudad: 'Bogotá', fechaNacimiento: '1993-09-22', hiredAt: '2023-02-14', fechaRetiro: '', tipoContrato: 'Termino fijo', arl: 'Positiva', fondoPension: 'Colpensiones', salud: 'Sanitas', cajaCompensacion: 'Cafam', estado: 'activo', salario: 3500000, bono: 0, lugarTrabajo: 'Bogotá · Calle 43', email: 'thalia@castor.co' },
  { id: 'E-003', name: 'Nelson Díaz', role: 'Jefe de Taller', area: 'Ebanistería', sexo: 'Hombre', cc: 'CC 71.220.003', celular: '312 889 3003', direccion: 'Cra 50 # 6-21', ciudad: 'Medellín', fechaNacimiento: '1980-01-30', hiredAt: '2020-08-01', fechaRetiro: '', tipoContrato: 'Indefinido', arl: 'Sura', fondoPension: 'Protección', salud: 'Sura', cajaCompensacion: 'Comfama', estado: 'activo', salario: 4200000, bono: 300000, lugarTrabajo: 'Medellín · Taller', email: 'nelson@castor.co' },
  { id: 'E-004', name: 'Yolanda Reyes', role: 'Contadora', area: 'Administrativo', sexo: 'Mujer', cc: 'CC 43.110.004', celular: '301 778 4004', direccion: 'Cl 10 Sur # 30-15', ciudad: 'Bogotá', fechaNacimiento: '1988-07-08', hiredAt: '2022-03-15', fechaRetiro: '', tipoContrato: 'Indefinido', arl: 'Positiva', fondoPension: 'Porvenir', salud: 'Compensar EPS', cajaCompensacion: 'Compensar', estado: 'activo', salario: 4800000, bono: 0, lugarTrabajo: 'Bogotá · Calle 43', email: 'yolanda@castor.co' },
  { id: 'E-005', name: 'Mario Estrada', role: 'Auxiliar Almacén', area: 'Almacén', sexo: 'Hombre', cc: 'CC 80.221.005', celular: '318 662 5005', direccion: 'Cra 30 # 1-50', ciudad: 'Bogotá', fechaNacimiento: '1996-11-03', hiredAt: '2024-01-10', fechaRetiro: '', tipoContrato: 'Obra labor', arl: 'Colmena', fondoPension: 'Colpensiones', salud: 'Famisanar', cajaCompensacion: 'Colsubsidio', estado: 'activo', salario: 1900000, bono: 0, lugarTrabajo: 'Bogotá · Almacén #1', email: 'mario@castor.co' },
  { id: 'E-006', name: 'Luisa Ortega', role: 'Coord. Bodega Ctg', area: 'Logística', sexo: 'Mujer', cc: 'CC 45.662.006', celular: '315 900 6006', direccion: 'Centro Histórico, Cl 35 # 3-27', ciudad: 'Cartagena', fechaNacimiento: '1991-02-18', hiredAt: '2023-06-01', fechaRetiro: '', tipoContrato: 'Termino fijo', arl: 'Sura', fondoPension: 'Protección', salud: 'Mutual Ser', cajaCompensacion: 'Comfenalco', estado: 'activo', salario: 2600000, bono: 0, lugarTrabajo: 'Cartagena · Bodega', email: 'luisa@castor.co' },
  { id: 'E-007', name: 'Héctor Pulido', role: 'Coord. Bodega Volcanes', area: 'Logística', sexo: 'Hombre', cc: 'CC 94.553.007', celular: '316 221 7007', direccion: 'Av 6N # 28-70', ciudad: 'Medellín', fechaNacimiento: '1987-12-05', hiredAt: '2023-09-12', fechaRetiro: '', tipoContrato: 'Indefinido', arl: 'Positiva', fondoPension: 'Porvenir', salud: 'Sura', cajaCompensacion: 'Comfama', estado: 'activo', salario: 2600000, bono: 0, lugarTrabajo: 'Medellín · Volcanes', email: 'hector@castor.co' },
];

export const STOCK_MOVES = [
  { id: 'M-01', productId: 'p1', type: 'entrada', qty: 5, date: '2026-03-15', reason: 'Producción terminada', by: 'Nelson Díaz', warehouseId: 'W-CEDI' },
  { id: 'M-02', supplyId: 'IN-04', type: 'salida', qty: 9, date: '2026-04-01', reason: 'Salida a producción OP Roma', by: 'Mario Estrada', warehouseId: 'W-ALM2' },
  { id: 'M-03', productId: 'p5', type: 'entrada', qty: 12, date: '2026-03-30', reason: 'Producción', by: 'Nelson Díaz', warehouseId: 'W-CEDI' },
];

export const INNOVATION = [
  { id: 'INN-01', title: 'App B2B para distribuidores', description: 'Portal web con catálogo, precios y pedidos para tiendas aliadas.', estado: 'idea', votos: 8, createdAt: '2026-03-10' },
  { id: 'INN-02', title: 'Tela resistente manchas Nano-Tex', description: 'Pilotear nueva línea con tela premium de fácil limpieza.', estado: 'piloto', votos: 12, createdAt: '2026-02-20' },
];

export const AUDITS = [
  { id: 'A-01', tipo: 'interna', area: 'Almacén', findings: 3, open: 1, date: '2026-03-20', responsable: 'Yolanda Reyes', estado: 'parcial' },
  { id: 'A-02', tipo: 'interna', area: 'Producción', findings: 5, open: 2, date: '2026-04-02', responsable: 'Nelson Díaz', estado: 'abierta' },
];

export const MARKETING_ASSETS = [
  { id: 'MKT-001', name: 'Catálogo Primavera 2026', type: 'Catalogo', filename: 'catalogo_primavera_2026.pdf', format: 'PDF', size: '12.4 MB', productIds: ['p1', 'p2', 'p3', 'p6'], createdAt: '2026-03-01', description: 'Catálogo completo de la colección Primavera con 48 páginas de productos.' },
  { id: 'MKT-002', name: 'Foto Sofá Emma — ambiente sala', type: 'Foto ambiente', filename: 'sofa_emma_sala.jpg', format: 'JPG', size: '2.8 MB', productIds: ['p2'], createdAt: '2026-03-05', description: 'Fotografía del Sofá Emma en sala moderna con iluminación natural.' },
  { id: 'MKT-003', name: 'Reel Instagram Sofá Emma', type: 'Historias', filename: 'reel_sofa_emma.mp4', format: 'MP4', size: '28.5 MB', productIds: ['p2'], createdAt: '2026-03-08', description: 'Reel de 30s para Instagram mostrando el Sofá Emma en ambiente real.' },
  { id: 'MKT-004', name: 'Foto producto Butaca Serenity', type: 'Foto producto', filename: 'butaca_serenity_white.jpg', format: 'JPG', size: '1.8 MB', productIds: ['p1'], createdAt: '2026-03-12', description: 'Fotografía de producto de la Butaca Serenity sobre fondo blanco.' },
  { id: 'MKT-005', name: 'Foto cliente Carmiña — módulo Roma', type: 'Foto cliente', filename: 'cliente_chapman_roma.jpg', format: 'JPG', size: '3.4 MB', productIds: ['p6'], createdAt: '2026-02-15', description: 'Foto cortesía del cliente Carmiña Chapman con el Módulo Roma entregado.' },
  { id: 'MKT-006', name: 'Post Feed Mesa Comedor Noble', type: 'Feed', filename: 'feed_mesa_noble.png', format: 'PNG', size: '920 KB', productIds: ['p8'], createdAt: '2026-04-01', description: 'Publicación cuadrada para Feed Instagram destacando Mesa Comedor Noble.' },
  { id: 'MKT-007', name: 'Campaña Lanzamiento Roma — set completo', type: 'Campañas', filename: 'campana_roma_assets.zip', format: 'ZIP', size: '45.6 MB', productIds: ['p6'], createdAt: '2026-03-20', description: 'Pack completo de campaña lanzamiento Módulo Roma: banners, posts, flyer, reels.' },
  { id: 'MKT-008', name: 'Foto ambiente cama Verona', type: 'Foto ambiente', filename: 'verona_habitacion.jpg', format: 'JPG', size: '4.1 MB', productIds: ['p7'], createdAt: '2026-02-28', description: 'Cama Verona en habitación principal estilo minimalista.' },
  { id: 'MKT-009', name: 'Historia IG Descuento 15% modulares', type: 'Historias', filename: 'historia_descuento_mod.png', format: 'PNG', size: '680 KB', productIds: ['p6'], createdAt: '2026-04-02', description: 'Historia para Instagram anunciando el 15% en modulares.' },
  { id: 'MKT-010', name: 'Foto producto Pouf Luna', type: 'Foto producto', filename: 'pouf_luna_white.jpg', format: 'JPG', size: '1.2 MB', productIds: ['p5'], createdAt: '2026-01-20', description: 'Foto producto pouf Luna sobre fondo neutro.' },
  { id: 'MKT-011', name: 'Feed Silla Atlanta — set comedor', type: 'Feed', filename: 'feed_atlanta_set.jpg', format: 'JPG', size: '2.4 MB', productIds: ['p3', 'p8'], createdAt: '2026-03-25', description: 'Post Feed mostrando set de comedor con Mesa Noble y 8 sillas Atlanta.' },
  { id: 'MKT-012', name: 'Catálogo Modulares 2026', type: 'Catalogo', filename: 'catalogo_modulares_2026.pdf', format: 'PDF', size: '8.9 MB', productIds: ['p6', 'p5'], createdAt: '2026-04-05', description: 'Catálogo especializado en líneas modulares y complementos.' },
];

export const DISPATCH_REQUESTS = [
  { id: 'DSP-01', orderId: 'PED-1245', opId: 'OP-5001', clientName: 'Carmiña Chapman', ciudad: 'Cartagena', address: 'Centro Histórico, Cl 35 # 3-27', requestedAt: '2026-04-14', estado: 'pendiente' },
  { id: 'DSP-02', orderId: 'PED-1248', opId: 'OP-4990', clientName: 'Jose Ramírez', ciudad: 'Bogotá', address: 'Cra 50 # 80-10', requestedAt: '2026-04-08', estado: 'despachado' },
];
