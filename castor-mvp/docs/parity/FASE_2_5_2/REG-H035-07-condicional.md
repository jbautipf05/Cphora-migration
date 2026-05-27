# REG-H035-07 (parte CONDICIONAL) — Validación de acabados obligatorios (modal Nueva Venta)

**Fase:** 2.5.2 · **Prioridad:** P0 · **Bloque:** A (cierra REG-07) · **Archivo:** `src/components/NuevaVentaModal.jsx`
**Estado:** ✅ Implementado · lint + build OK · E2E live diferido (validación humana en PAUSA de Bloque A).

---

## 1. Alcance
Completa REG-H035-07: la parte no-condicional (≥1 ítem válido) se cerró antes (`cf58120`); esto agrega
la validación **condicional** de acabados, que dependía de los selectores del Bloque A (REG-01/02).

## 2. Inspección de Demo6
En `renderSaleAcabados:5848-5865` los selects/inputs de acabado se generan con `required` nativo →
el navegador bloquea el submit si, para un ítem de **Producción**, falta el acabado que su producto exige
por `areas`. No hay mensaje JS específico; lo fuerza el `required`.

## 3. Implementación (patrón inline del proyecto)
`validateItems` extendido: por cada ítem en **Producción** con producto, según `product.areas`:
- `Preparación y pintura` → `colorMadera` requerido (si = 'Otro', `colorMaderaOtro` requerido).
- `Pintura electrostática` → `colorMetal` requerido.
- `Tapicería` → `telaId` requerido.
- `Tejido` → `colorTejido` requerido.
Errores por fila con claves `item_{i}_{madera|metal|tela|tejido}` → `errLine` ya renderizado bajo cada
selector (REG-01/02). Limpieza: `setItem` limpia los errores de la fila editada; `clearAllItemErrs`
limpia todo al agregar/quitar filas (los índices se corren). En modo **Stock** no se valida acabado.

## 4. Calidad y nota de alcance
- `eslint` → 0 · `vite build` → OK.
- **Nota (downstream):** la captura de acabados vive en el estado del ítem y viaja por `onSubmit` (`...f`);
  que `Ventas.submitSale` los persista en `order.acabados` (como hace `saveSale` de Demo6) es lógica
  downstream existente, no modificada en este hallazgo del modal. Si se requiere persistencia 1:1, es un
  follow-up acotado a `submitSale`.
- E2E a validar a mano: en Producción, producto p3 → submit sin elegir Color madera/Tela → bloquea con
  inline bajo esos campos; elegir 'Otro' en madera sin especificar → "Especifica el color 'Otro'";
  completar → pasa. En Stock, los acabados no se piden.
