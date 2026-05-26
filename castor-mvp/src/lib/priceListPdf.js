// H-040 — Exportación a PDF de la Lista de Precios.
// Reusa el patrón de quotePdf.js (jsPDF, mm/a4, sin jspdf-autotable). Layout corporativo del
// archivo de referencia (Castor_Lista_Precios.pdf): encabezado "CASTOR CPHORA" + "Lista de Precios"
// con fecha; por cada producto, columna izquierda (detalle: nombre, SKU·Categoría·Medidas, descripción)
// y columna derecha (precio comercial), con separadores grises tenues.
import { jsPDF } from 'jspdf';
import { fmtDate, today } from './format';

const $$ = (n) => '$ ' + Math.round(+n || 0).toLocaleString('es-CO').replace(/,/g, '.');

const medidasOf = (p) => {
  const d = p.dimensions;
  if (!d) return '';
  const parts = [d.ancho, d.alto, d.profundidad].filter((x) => x != null);
  return parts.length ? `${parts.join('x')}cm` : '';
};

export function exportPriceListPDF(products = [], { warehouses = [] } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.width;
  const ph = doc.internal.pageSize.height;
  const left = 14;
  const right = pw - 14;

  const wName = (id) => warehouses.find((w) => w.id === id)?.code || '';

  // === Encabezado institucional ===
  function header() {
    doc.setFontSize(18).setFont(undefined, 'bold').setTextColor(40, 40, 40);
    doc.text('CASTOR CPHORA', left, 20, { charSpace: 0.8 });
    doc.setFontSize(12).setFont(undefined, 'bold').setTextColor(60, 60, 60);
    doc.text('Lista de Precios', right, 17, { align: 'right' });
    doc.setFontSize(9).setFont(undefined, 'normal').setTextColor(120, 120, 120);
    doc.text(fmtDate(today()), right, 23, { align: 'right' });
    doc.setDrawColor(200, 200, 200).setLineWidth(0.4);
    doc.line(left, 27, right, 27);
  }

  header();
  let y = 36;

  products.forEach((p) => {
    // Salto de página
    if (y > ph - 24) {
      doc.addPage();
      header();
      y = 36;
    }

    // Columna izquierda: nombre (negrita)
    doc.setFontSize(11).setFont(undefined, 'bold').setTextColor(30, 30, 30);
    doc.text(String(p.name || '—'), left, y);

    // Columna derecha: precio comercial (mayor, alineado a la derecha)
    doc.setFontSize(12).setFont(undefined, 'bold').setTextColor(40, 40, 40);
    doc.text($$(p.price), right, y, { align: 'right' });

    // Línea secundaria: SKU · Categoría · Medidas
    const meta = [p.sku, p.category, medidasOf(p)].filter(Boolean).join(' · ');
    doc.setFontSize(8.5).setFont(undefined, 'normal').setTextColor(110, 110, 110);
    doc.text(meta, left, y + 4.5);

    // Bodega (si aplica) — debajo de meta, a la derecha del bloque izquierdo
    const wn = p.warehouseId ? wName(p.warehouseId) : '';

    // Descripción larga (gris, fuente menor, multilínea acotada)
    let yAfter = y + 4.5;
    if (p.description) {
      const desc = doc.splitTextToSize(String(p.description), pw - 28 - 36);
      doc.setFontSize(8).setTextColor(140, 140, 140);
      doc.text(desc.slice(0, 2), left, y + 9);
      yAfter = y + 9 + (Math.min(desc.length, 2) - 1) * 3.6;
    }
    if (wn) {
      doc.setFontSize(8).setTextColor(150, 150, 150);
      doc.text(`Bodega: ${wn}`, right, y + 4.5, { align: 'right' });
    }

    // Separador inferior gris tenue
    const rowBottom = Math.max(yAfter, y + 6) + 3;
    doc.setDrawColor(225, 225, 225).setLineWidth(0.2);
    doc.line(left, rowBottom, right, rowBottom);
    y = rowBottom + 6;
  });

  if (products.length === 0) {
    doc.setFontSize(10).setFont(undefined, 'italic').setTextColor(150, 150, 150);
    doc.text('Sin productos para exportar.', left, y);
  }

  doc.save(`Lista_Precios_${today()}.pdf`);
}
