export const CATEGORY_COLOR_PALETTE = [
  '#2563EB',
  '#22C55E',
  '#F59E0B',
  '#EF4444',
  '#A855F7',
  '#14B8A6',
  '#0EA5E9',
  '#84CC16',
  '#F97316',
  '#DB2777',
  '#64748B',
  '#EAB308',
  '#06B6D4',
  '#BE185D',
  '#0F766E',
  '#9333EA',
  '#DC2626',
  '#047857',
  '#F472B6',
  '#0F172A',
];

export const CATEGORY_COLOR_FALLBACK = CATEGORY_COLOR_PALETTE[0];

export function pickDefaultColor(
  usedColors: Set<string>,
  usageCounts: Record<string, number> = {}
): string {
  const unused = CATEGORY_COLOR_PALETTE.find(color => !usedColors.has(color));
  if (unused) {
    return unused;
  }

  let candidate = CATEGORY_COLOR_PALETTE[0];
  let candidateCount = usageCounts[candidate] ?? 0;

  for (const color of CATEGORY_COLOR_PALETTE) {
    const count = usageCounts[color] ?? 0;
    if (count < candidateCount) {
      candidate = color;
      candidateCount = count;
    }
  }

  return candidate;
}
