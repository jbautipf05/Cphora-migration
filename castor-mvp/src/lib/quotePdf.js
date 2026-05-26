// Generación del PDF de cotización — port 1:1 de exportQuotePDF() de Demo6
// (Castor_Dashboard_Demo6.html, líneas 4992-5188). Usa jsPDF y dibuja el mismo
// layout: marco, logo CASTOR, header de cliente (2 columnas), tabla de ítems con
// columna IMAGEN, notas (vigencia/IVA/tiempos), totales y footer asesor + contacto.
// H-015.
import { jsPDF } from 'jspdf';
import { fmtDate } from './format';

const subtotal = (q) => q.items.reduce((a, i) => a + i.qty * i.price, 0);
const total = (q) => Math.round(subtotal(q) * (1 - q.discount / 100));

export function exportQuotePDF(q, { products = [], leads = [], customers = [], employees = [] } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.width;
  const ph = doc.internal.pageSize.height;

  // Datos del lead/cliente para llenar el header
  const lead = q.leadId ? leads.find((x) => x.id === q.leadId) : null;
  const customer = lead || customers.find((c) => c.name === q.clientName) || {};
  const asesorEmp = employees.find((e) => e.name === q.asesor);

  const sub = subtotal(q);
  const tot = total(q);
  const flete = q.flete || 0;
  const abono = q.abono || 0;
  const totFinal = tot + flete - abono;

  // Helper: formato número estilo Holman ($ 4.490.000)
  const $$ = (n) => '$ ' + (Math.round(+n || 0)).toLocaleString('es-CO').replace(/,/g, '.');

  // === MARCO EXTERIOR ===
  doc.setDrawColor(0, 0, 0).setLineWidth(0.4);
  doc.rect(8, 8, pw - 16, ph - 16);

  // === LOGO CASTOR (header) — triángulos estilizados ===
  doc.setFillColor(212, 178, 107); doc.triangle(18, 18, 28, 12, 23, 28, 'F');
  doc.setFillColor(58, 82, 118); doc.triangle(28, 12, 38, 18, 33, 28, 'F');
  doc.setFillColor(160, 90, 55); doc.triangle(23, 28, 33, 28, 28, 38, 'F');
  doc.setFontSize(20).setFont(undefined, 'bold').setTextColor(40, 40, 40);
  doc.text('CASTOR', 42, 24);
  doc.setFontSize(7).setFont(undefined, 'normal').setTextColor(110, 110, 110);
  doc.text('MUEBLES Y ACCESORIOS', 42, 30);

  // === HEADER FORM (2 columnas) ===
  const fy0 = 45;
  const valX = 38;
  const lblXR = pw / 2 + 6; // eslint-disable-line no-unused-vars
  const valXR = pw / 2 + 32;
  doc.setTextColor(0, 0, 0).setFontSize(9);
  const fields = [
    { lbl: 'CLIENTE', val: q.clientName || customer.name || '' },
    { lbl: 'NIT/ CC.', val: customer.doc || customer.nit || '' },
    { lbl: 'EMAIL', val: customer.email || '' },
    { lbl: 'NO. CONTACTO', val: customer.phone || '' },
  ];
  const fieldsR = [
    { lbl: 'DIRECCION', val: customer.address || '' },
    { lbl: 'CIUDAD', val: customer.city || q.city || '' },
    { lbl: 'FECHA', val: fmtDate(q.createdAt) },
    { lbl: 'METODO DE PAGO', val: q.metodoPago || '' },
  ];
  fields.forEach((f, i) => {
    const yy = fy0 + i * 7;
    doc.setFont(undefined, 'bold'); doc.text(f.lbl, valX - 2, yy, { align: 'right' });
    doc.setFont(undefined, 'normal'); doc.text(String(f.val), valX, yy);
    doc.setDrawColor(0, 0, 0).setLineWidth(0.2).line(valX, yy + 1.2, valX + 50, yy + 1.2);
  });
  fieldsR.forEach((f, i) => {
    const yy = fy0 + i * 7;
    doc.setFont(undefined, 'bold'); doc.text(f.lbl, valXR - 2, yy, { align: 'right' });
    doc.setFont(undefined, 'normal'); doc.text(String(f.val), valXR, yy);
    doc.setDrawColor(0, 0, 0).setLineWidth(0.2).line(valXR, yy + 1.2, valXR + 50, yy + 1.2);
  });

  // === TABLA: HEADER NEGRO ===
  let ty = fy0 + 4 * 7 + 8;
  const cols = [
    { x: 14, w: 28, lbl: 'IMAGEN', align: 'center' },
    { x: 42, w: 38, lbl: 'PRODUCTO', align: 'center' },
    { x: 80, w: 48, lbl: 'DESCRIPCION', align: 'center' },
    { x: 128, w: 15, lbl: 'QTY', align: 'center' },
    { x: 143, w: 24, lbl: 'PRECIO', align: 'right' },
    { x: 167, w: 28, lbl: 'VALOR TOTAL', align: 'right' },
  ];
  doc.setFillColor(0, 0, 0); doc.rect(14, ty, 181, 9, 'F');
  doc.setFillColor(218, 165, 32); doc.rect(167, ty, 28, 9, 'F');
  doc.setTextColor(255, 255, 255).setFont(undefined, 'bold').setFontSize(9);
  cols.forEach((c) => {
    const tx = c.align === 'right' ? c.x + c.w - 2 : c.x + c.w / 2;
    doc.text(c.lbl, tx, ty + 5.5, { align: c.align });
  });
  ty += 9;

  // === FILAS DE PRODUCTOS ===
  doc.setTextColor(0, 0, 0).setFont(undefined, 'normal').setFontSize(8.5);
  const rowH = 22;
  q.items.forEach((it) => {
    const p = products.find((x) => x.id === it.productId);
    const name = p?.name || it.desc || '';
    const desc = (p?.description || it.desc || '').substring(0, 150);
    if (ty + rowH > ph - 60) {
      doc.addPage();
      doc.setDrawColor(0, 0, 0).setLineWidth(0.4); doc.rect(8, 8, pw - 16, ph - 16);
      ty = 18;
    }
    doc.setDrawColor(150, 150, 150).setLineWidth(0.1);
    cols.forEach((c) => doc.rect(c.x, ty, c.w, rowH));

    // IMAGEN: emoji/foto del producto centrado
    doc.setFontSize(18).setTextColor(120, 120, 120);
    doc.text(p?.photo || '📦', cols[0].x + cols[0].w / 2, ty + rowH / 2 + 3, { align: 'center' });

    // PRODUCTO (nombre centrado, multilínea)
    doc.setFontSize(8.5).setTextColor(0, 0, 0).setFont(undefined, 'normal');
    const nameLines = doc.splitTextToSize(name, cols[1].w - 4);
    doc.text(nameLines, cols[1].x + cols[1].w / 2, ty + rowH / 2 - (nameLines.length - 1) * 1.5, { align: 'center' });

    // DESCRIPCION (centrada, multilínea)
    doc.setFontSize(8);
    const descLines = doc.splitTextToSize(desc, cols[2].w - 4);
    doc.text(descLines, cols[2].x + cols[2].w / 2, ty + rowH / 2 - (descLines.length - 1) * 1.4, { align: 'center' });

    // QTY centrado
    doc.setFontSize(9);
    doc.text(String(it.qty), cols[3].x + cols[3].w / 2, ty + rowH / 2 + 1, { align: 'center' });

    // PRECIO derecha
    doc.text($$(it.price), cols[4].x + cols[4].w - 3, ty + rowH / 2 + 1, { align: 'right' });

    // VALOR TOTAL derecha
    doc.text($$(it.qty * it.price), cols[5].x + cols[5].w - 3, ty + rowH / 2 + 1, { align: 'right' });

    ty += rowH;
  });

  // === BLOQUE FINAL: NOTAS (izq) + TOTALES (der) ===
  if (ty + 30 > ph - 50) { doc.addPage(); doc.setDrawColor(0, 0, 0).setLineWidth(0.4); doc.rect(8, 8, pw - 16, ph - 16); ty = 18; }
  ty += 4;

  const totalsX = 142;
  const totalsW = 53;
  doc.setDrawColor(0, 0, 0).setLineWidth(0.3);

  // Notas izquierda
  doc.setTextColor(0, 0, 0).setFontSize(9).setFont(undefined, 'bold');
  doc.text('NOTA:', 14, ty + 5);
  doc.setFont(undefined, 'normal');
  doc.text('Esta cotizacion es valida por ' + (q.vigenciaDias || 30) + ' días. ', 26, ty + 5);
  doc.setFont(undefined, 'bold').text('ESTA COTIZACION YA INCLUYE EL IVA', 26, ty + 10);
  doc.setFont(undefined, 'normal').setFontSize(8.5);
  doc.text('Nuestros tiempos de producción son de 40 a 50 días calendario.', 14, ty + 16);
  if (q.notes) {
    const nlines = doc.splitTextToSize(q.notes, 120);
    doc.text(nlines, 14, ty + 22);
  }

  // Totales derecha
  doc.setFontSize(9);
  const totRows = [
    { lbl: 'SUBTOTAL', val: $$(sub), bold: true },
    { lbl: 'ABONO', val: abono > 0 ? $$(abono) : '-', bold: false },
    { lbl: 'FLETE', val: flete > 0 ? $$(flete) : $$(0), bold: false },
    { lbl: 'TOTAL', val: $$(totFinal), bold: true, hl: true },
  ];
  let tty = ty + 4;
  totRows.forEach((r) => {
    doc.setFont(undefined, r.bold ? 'bold' : 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(r.lbl, totalsX, tty, { align: 'right' });
    if (r.hl) {
      doc.setFillColor(245, 245, 245); doc.rect(totalsX + 2, tty - 4, totalsW - 4, 6, 'F');
    }
    doc.text(r.val, totalsX + totalsW - 2, tty, { align: 'right' });
    tty += 6;
  });

  // === FOOTER ASESOR ===
  let fy = ph - 38;
  doc.setDrawColor(0, 0, 0).setLineWidth(0.3);
  doc.rect(14, fy, pw - 28, 12);
  doc.setFontSize(8).setFont(undefined, 'bold').setTextColor(0, 0, 0);
  doc.text('NOMBRE DEL ASESOR', 38, fy + 4, { align: 'right' });
  doc.text('EMAIL', 38, fy + 8, { align: 'right' });
  doc.text('CELULAR', 38, fy + 12, { align: 'right' });
  doc.setFont(undefined, 'normal');
  doc.text((q.asesor || '').toUpperCase(), 40, fy + 4);
  doc.text(asesorEmp?.email || '', 40, fy + 8);
  doc.text(asesorEmp?.phone || '3184199681', 40, fy + 12);

  // === FOOTER CONTACTO CASTOR ===
  fy = ph - 22;
  doc.setFontSize(8).setTextColor(60, 60, 60).setFont(undefined, 'normal');
  doc.text('🌐 www.castormya.co     f @castormueblesyaccesorios     📞 3182396820     ✉ talkwithcastor@gmail.com', pw / 2, fy, { align: 'center' });
  doc.text('📍 Barranquilla: Cra 65 # 76 - 152 / Cra 43 # 84 - 204    Cartagena: Cra 3 # 7 - 58    Medellín: Cra 43F # 12 - 19', pw / 2, fy + 4, { align: 'center' });

  doc.save(`Cotizacion_${q.id}_${(q.clientName || '').replace(/\s+/g, '_')}.pdf`);
}
