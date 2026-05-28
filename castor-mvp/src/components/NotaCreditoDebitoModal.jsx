import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { Field, MoneyInput } from './form';
import { fmtCOP } from '../lib/format';

// Modal compartido NC/ND (§7.9). Reutilizable: cambia `mode` ('NC' | 'ND').
// NC: tipo total (anula factura) o parcial (monto < total).
// ND: siempre monto manual (no aplica "total" automático — es un cargo nuevo).
// El cálculo base+IVA es preview informativo (19% inclusivo, default del motor).
// El motor recalcula con la regla isDefault real al postear.
export default function NotaCreditoDebitoModal({ open, onClose, mode, invoice, onSubmit }) {
  const isNC = mode === 'NC';
  const total = invoice ? +(invoice.total != null ? invoice.total : invoice.amount) || 0 : 0;
  const [tipo, setTipo] = useState('total'); // solo NC
  const [amount, setAmount] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (open) {
      setTipo('total');
      setAmount('');
      setMotivo('');
    }
  }, [open, invoice?.id, mode]);

  const monto = useMemo(() => {
    if (isNC && tipo === 'total') return total;
    return +amount || 0;
  }, [isNC, tipo, amount, total]);

  const isRemision = invoice?.type === 'remisión' || invoice?.type === 'remision';
  const rate = isRemision ? 0 : 0.19;
  const base = rate > 0 ? Math.round((monto / (1 + rate)) * 100) / 100 : monto;
  const iva = rate > 0 ? Math.round((monto - base) * 100) / 100 : 0;

  const exceeds = isNC && monto > total + 0.5;
  const canSubmit =
    !!invoice && motivo.trim().length > 0 && monto > 0 && !exceeds;

  function handleSubmit() {
    if (!canSubmit) return;
    const payload = { motivo };
    if (!isNC || tipo === 'parcial') payload.amount = monto;
    onSubmit(payload);
  }

  if (!invoice) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNC ? `Nota crédito sobre ${invoice.id}` : `Nota débito sobre ${invoice.id}`}
      size="sm"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-gold" onClick={handleSubmit} disabled={!canSubmit}>
            Emitir {mode}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-brand-gold/30 bg-brand-gold/5 p-3 text-sm">
          <p className="text-brand-muted">
            Factura{' '}
            <span className="font-mono text-brand-gold">{invoice.id}</span> ·{' '}
            <span className="text-white">{fmtCOP(total)}</span> ·{' '}
            <span className="text-white">{invoice.clientName || '—'}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-brand-muted">
            Numeración interna · No oficial DIAN
          </p>
        </div>

        {isNC && (
          <Field label="Tipo">
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2 text-white">
                <input
                  type="radio"
                  checked={tipo === 'total'}
                  onChange={() => setTipo('total')}
                />
                Total (anula factura)
              </label>
              <label className="flex items-center gap-2 text-white">
                <input
                  type="radio"
                  checked={tipo === 'parcial'}
                  onChange={() => setTipo('parcial')}
                />
                Parcial
              </label>
            </div>
          </Field>
        )}

        {(!isNC || tipo === 'parcial') && (
          <Field label="Monto (COP)">
            <MoneyInput
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {exceeds && (
              <p className="mt-1 text-xs text-red-300">
                Monto excede el total de la factura ({fmtCOP(total)}).
              </p>
            )}
          </Field>
        )}

        <Field label="Motivo">
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="input-field min-h-[64px]"
            rows={3}
            placeholder={
              isNC
                ? 'Devolución parcial, descuento por avería, anulación, …'
                : 'Intereses por mora, ajuste de precio al alza, gastos al cliente, …'
            }
          />
        </Field>

        {monto > 0 && (
          <div className="space-y-1 rounded-lg bg-brand-bg/40 p-3 text-sm">
            <div className="flex justify-between text-brand-muted">
              <span>Base</span>
              <span>{fmtCOP(base)}</span>
            </div>
            <div className="flex justify-between text-brand-muted">
              <span>IVA {Math.round(rate * 100)}%</span>
              <span>{fmtCOP(iva)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-brand-border pt-1 font-semibold text-brand-gold">
              <span>Total {mode}</span>
              <span>{fmtCOP(monto)}</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
