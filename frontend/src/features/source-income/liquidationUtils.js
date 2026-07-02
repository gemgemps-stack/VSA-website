export const generateLiquidationReferenceNumber = (entries = [], incomeDate) => {
  const normalizedDate = String(incomeDate || '').replace(/-/g, '');
  const prefix = `LIQ-${normalizedDate || '00000000'}`;
  const matchingEntries = (entries || [])
    .filter((entry) => {
      const referenceNumber = String(entry?.referenceNumber || '').trim();
      return referenceNumber.startsWith(prefix);
    })
    .map((entry) => Number(String(entry.referenceNumber || '').split('-').pop()))
    .filter((value) => Number.isFinite(value));

  const nextSequence = matchingEntries.length > 0 ? Math.max(...matchingEntries) + 1 : 1;
  return `${prefix}-${String(nextSequence).padStart(4, '0')}`;
};
