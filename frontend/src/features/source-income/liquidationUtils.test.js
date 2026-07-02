import { generateLiquidationReferenceNumber } from './liquidationUtils';

describe('generateLiquidationReferenceNumber', () => {
  it('creates a new liquidation reference using the current date and the next sequence number', () => {
    const reference = generateLiquidationReferenceNumber([], '2026-07-02');

    expect(reference).toBe('LIQ-20260702-0001');
  });

  it('increments the sequence number based on existing liquidation references', () => {
    const reference = generateLiquidationReferenceNumber([
      { referenceNumber: 'LIQ-20260702-0003' },
      { referenceNumber: 'LIQ-20260702-0010' },
    ], '2026-07-02');

    expect(reference).toBe('LIQ-20260702-0011');
  });
});
