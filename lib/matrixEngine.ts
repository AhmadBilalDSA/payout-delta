export interface MatrixResult {
  tier: number;
  spread: number;
  rail: string;
  deduction: number;
  dragPct: number;
  dragAmount: number;
  heat: "green" | "amber" | "rose";
}

const TIERS = [500, 1000, 2500, 5000, 10000, 25000, 50000];
const SPREADS = [0.25, 0.75, 1.50, 2.25, 3.50];

export const RAILS = [
  { id: "swift-sha", name: "SWIFT SHA (Avg $25)", deduction: 25 },
  { id: "swift-our", name: "SWIFT OUR (Flat $25)", deduction: 25 },
  { id: "local-ach", name: "Local ACH (Zero Deduct)", deduction: 0 },
  { id: "fcva", name: "USD Exporter Retention", deduction: 0 },
];

export function buildMatrix(): MatrixResult[] {
  const results: MatrixResult[] = [];
  
  for (const rail of RAILS) {
    for (const spread of SPREADS) {
      for (const tier of TIERS) {
        // Special case: USD Exporter Retention (FCVA) assumes no FX conversion
        const actualSpread = rail.id === "fcva" ? 0 : spread;
        
        const fxCost = tier * (actualSpread / 100);
        const totalDrag = fxCost + rail.deduction;
        const dragPct = (totalDrag / tier) * 100;
        
        let heat: "green" | "amber" | "rose" = "green";
        if (dragPct >= 3.0) {
          heat = "rose";
        } else if (dragPct >= 1.0) {
          heat = "amber";
        }
        
        results.push({
          tier,
          spread: actualSpread,
          rail: rail.name,
          deduction: rail.deduction,
          dragPct,
          dragAmount: totalDrag,
          heat
        });
      }
    }
  }
  
  return results;
}
