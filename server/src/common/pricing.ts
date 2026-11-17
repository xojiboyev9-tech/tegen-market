export type PType = 'PIECE' | 'WEIGHT';

/** PIECE: quantity = dona. WEIGHT: quantity = gramm, unitPrice = 1 kg narxi. */
export function lineTotal(type: PType, unitPrice: number, quantity: number): number {
  return type === 'WEIGHT' ? Math.round((unitPrice * quantity) / 1000) : unitPrice * quantity;
}

export function validQuantity(type: PType, q: number): boolean {
  if (!Number.isInteger(q)) return false;
  return type === 'WEIGHT' ? q >= 50 && q <= 20000 && q % 10 === 0 : q >= 1 && q <= 99;
}

export const fmtMoney = (n: number) => `${n.toLocaleString('en-US').replace(/,/g, ' ')} so'm`;
export const fmtQty = (type: PType, q: number) =>
  type === 'WEIGHT' ? `${q / 1000} kg` : `${q} dona`;
