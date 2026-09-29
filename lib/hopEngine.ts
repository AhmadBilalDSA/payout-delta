export interface HopRoute {
  id: string;
  type: "SHA" | "OUR" | "LOCAL";
  name: string;
  description: string;
  grossUsd: number;
  platformFeeUsd: number;
  intermediaryFeeUsd: number;
  fxMarginPct: number;
  netUsdBeforeFx: number;
  netLocal: number;
  frictionBps: number;
  estimatedHours: number;
}

/**
 * Pure TypeScript pathfinding and fee computation kernel.
 * Calculates 3 deterministic settlement routes between sovereign jurisdictions.
 */
export function calculateRoutes(
  grossUsd: number,
  rate: number,
  baseShaUsd: number
): HopRoute[] {
  const platformFeeUsd = grossUsd * 0.10; // Standard 10% platform processing cut
  const availableUsd = grossUsd - platformFeeUsd;

  // 1. Direct Correspondent Wire (SWIFT SHA)
  const shaFee = baseShaUsd;
  const shaUsdConvert = Math.max(0, availableUsd - shaFee);
  const shaFx = 0.025; // 2.5% retail FX margin
  const shaNetLocal = shaUsdConvert * rate * (1 - shaFx);
  const shaFriction = grossUsd > 0 ? ((grossUsd - (shaNetLocal / rate)) / grossUsd) * 10000 : 0;

  // 2. Covered Intermediary Corridor (SWIFT OUR)
  const ourFee = baseShaUsd + 15; // Premium over SHA for guaranteed landing
  const ourUsdConvert = Math.max(0, availableUsd - ourFee);
  const ourFx = 0.015; // 1.5% institutional rate
  const ourNetLocal = ourUsdConvert * rate * (1 - ourFx);
  const ourFriction = grossUsd > 0 ? ((grossUsd - (ourNetLocal / rate)) / grossUsd) * 10000 : 0;

  // 3. Hybrid Local Clearinghouse
  const hybridFee = Math.min(10, baseShaUsd * 0.5); // Cheaper flat fee for local injection
  const hybridUsdConvert = Math.max(0, availableUsd - hybridFee);
  const hybridFx = 0.035; // Wider spread for local liquidity providers
  const hybridNetLocal = hybridUsdConvert * rate * (1 - hybridFx);
  const hybridFriction = grossUsd > 0 ? ((grossUsd - (hybridNetLocal / rate)) / grossUsd) * 10000 : 0;

  return [
    {
      id: "direct-sha",
      type: "SHA",
      name: "Direct Correspondent Wire (SHA)",
      description: "Standard SWIFT wire. SHA deduction taken mid-flight; standard retail FX spread.",
      grossUsd,
      platformFeeUsd,
      intermediaryFeeUsd: shaFee,
      fxMarginPct: shaFx,
      netUsdBeforeFx: shaUsdConvert,
      netLocal: shaNetLocal,
      frictionBps: shaFriction,
      estimatedHours: 48,
    },
    {
      id: "covered-our",
      type: "OUR",
      name: "Covered Intermediary Corridor (OUR)",
      description: "Sender covers correspondent fee upfront. Zero landing drag with improved FX margin.",
      grossUsd,
      platformFeeUsd,
      intermediaryFeeUsd: ourFee,
      fxMarginPct: ourFx,
      netUsdBeforeFx: ourUsdConvert,
      netLocal: ourNetLocal,
      frictionBps: ourFriction,
      estimatedHours: 24,
    },
    {
      id: "hybrid-local",
      type: "LOCAL",
      name: "Hybrid Local Clearinghouse",
      description: "Instant local settlement via an FX clearing intermediary. Lowest fee, widest spread.",
      grossUsd,
      platformFeeUsd,
      intermediaryFeeUsd: hybridFee,
      fxMarginPct: hybridFx,
      netUsdBeforeFx: hybridUsdConvert,
      netLocal: hybridNetLocal,
      frictionBps: hybridFriction,
      estimatedHours: 1,
    }
  ];
}
