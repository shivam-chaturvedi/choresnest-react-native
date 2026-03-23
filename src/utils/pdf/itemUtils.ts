import { GroceryItem } from '../../contexts/FamilyContext';

export type PdfItem = {
  name: string;
  quantity: number;
  unit: string;
};

const normalizeKey = (name: string, unit: string) =>
  `${name.toLowerCase()}|${unit.toLowerCase()}`;

export const collapseShoppingItems = (items: GroceryItem[]): PdfItem[] => {
  const normalized: PdfItem[] = items
    .map(it => ({
      name: (it.name || '').trim(),
      quantity: Number(it.quantity ?? 0) || 0,
      unit: (it.unit || 'pcs').trim() || 'pcs',
    }))
    .filter(it => it.name.length > 0);

  const map = new Map<string, PdfItem>();
  normalized.forEach(item => {
    const key = normalizeKey(item.name, item.unit);
    const existing = map.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      map.set(key, { ...item });
    }
  });

  return Array.from(map.values());
};

export const formatQuantity = (value: number): string => {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2).replace(/\.00$/, '').replace(/\.?0+$/, '');
};
