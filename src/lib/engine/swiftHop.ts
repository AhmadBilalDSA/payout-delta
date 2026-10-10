/**
 * PayoutDelta — SWIFT intermediary hop chain extractor and node types.
 *
 * Pure, deterministic helpers with zero side-effects. All monetary values in USD.
 */

export interface SwiftHopNode {
  id: string;
  label: string;
  bicOrCode: string;
  role: 'origin' | 'intermediary' | 'clearing' | 'beneficiary';
  deductEstimateUsd: number;
  status: 'completed' | 'deduct_point' | 'settled';
}

/**
 * Builds a 4-node hop chain for a SWIFT wire corridor.
 *
 * - Node 1: Originating / remitting bank
 * - Node 2: Correspondent intermediary gateway (deduct point when SHA/BEN)
 * - Node 3: Domestic RTGS / clearing system of destination
 * - Node 4: Beneficiary account / final receiving bank
 *
 * When `isOurRoute` is true the intermediary deduction is absorbed ($0).
 */
export function resolveHopChain(
  originBank: string,
  originBic: string,
  intermediaryBic: string,
  targetClearingSystem: string,
  destBank: string,
  destBic: string,
  isOurRoute: boolean
): SwiftHopNode[] {
  return [
    {
      id: 'hop-1',
      label: originBank || 'Remitting Bank',
      bicOrCode: originBic || 'FEDWIRE/CHIPS',
      role: 'origin',
      deductEstimateUsd: 0,
      status: 'completed'
    },
    {
      id: 'hop-2',
      label: 'Correspondent Gateway',
      bicOrCode: intermediaryBic || 'CHASUS33 / CITIUS33',
      role: 'intermediary',
      deductEstimateUsd: isOurRoute ? 0 : 20,
      status: 'deduct_point'
    },
    {
      id: 'hop-3',
      label: 'Domestic RTGS / Clearing',
      bicOrCode: targetClearingSystem || 'PRISM / RTGS',
      role: 'clearing',
      deductEstimateUsd: 0,
      status: 'completed'
    },
    {
      id: 'hop-4',
      label: destBank || 'Beneficiary Account',
      bicOrCode: destBic || 'LOCAL NOSTRO',
      role: 'beneficiary',
      deductEstimateUsd: 0,
      status: 'settled'
    }
  ];
}
