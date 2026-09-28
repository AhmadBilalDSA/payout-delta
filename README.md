# PayoutDelta

## Executive Overview
PayoutDelta operates as a sovereign settlement ledger, a statutory safe-harbor mapping layer, and a deterministic intermediary deduction calculator. The repository serves as an institutional reference point for cross-border financial routing, codifying verified correspondent cuts, tax purpose codes, and regulatory clearance mandates across multiple jurisdictions.

## Core Architecture
The system is constructed with absolute architectural purity and deterministic execution in mind:
- **Zero-Dependency Static Export**: The web presence utilizes zero external runtime packages. All assets are compiled strictly to static HTML/CSS/JS without reliance on Node.js runtime servers.
- **Offline Service Worker Engine**: Powered by a vanilla JavaScript Service Worker ensuring continuous access to regulatory data and calculator models across disconnected environments, utilizing an uncompromised Cache-First/Stale-While-Revalidate caching regime for core registry assets.
- **Hex Sovereign Dossier Generator**: The dossier synthesis pipeline seamlessly isolates logic by jurisdiction, producing AEO (Authorized Economic Operator) grade tabular layouts completely free from third-party diagramming or styling libraries. All correspondent visualization is executed via native responsive inline SVGs.

## Verified Mathematical Modules
The repository implements high-fidelity deterministic modules validated continuously against institutional boundary tests:
- **Reverse Invoicing Gross-Up Engine** (`/reverse-calculator/`): Programmatically determines exact target sender funding requirements yielding absolute net targets via sequential matrix waterfall analysis.
- **Multi-Rail Corridor Split Optimizer** (`/split/`): Compares platform cuts, correspondent baseline deductions, and hidden foreign exchange premiums across available local networks to derive optimal settlement pathways.
- **Instant Static Omnibar Search** (`Cmd+K` / `Ctrl+K`): A fully offline memory-indexed search protocol mapping directly into the canonical dataset logic.

## Statutory Ground Truth
The platform strictly indexes against authoritative real-world matrices rather than inferred datasets:
- **195 Sovereign States**: Canonical index mappings covering regulatory requirements, safe-harbor directives, and local banking integrations across all UN states.
- **266 Commercial Banks**: Certified ISO 9362 BIC alignments guaranteeing accurate node representation within international clearing loops.
- **208 Corridors**: Fully modeled, bi-directional routing mappings with verified spread algorithms and tax clearance realization obligations.

## Deterministic Verification Battery
PayoutDelta adheres to an inflexible continuous integration mandate. Deployment is physically gated behind strict sequential execution sequences. Every module passes cleanly or the system halts:
- `audit:ui`: Enforces structural correctness and zero-dependency compliance on emitted DOM surfaces.
- `audit:hex`: Exhaustively confirms invariants and tabular metrics across all 208+ generated routing dossiers.
- `audit:utility`: Verifies logical and mathematical bounds across the reverse-calculator and split optimizers.
- `audit:search`: Asserts correct offline search compilation and ISO 9362 validations across the omnibar cache.
- `audit:offline`: Guarantees deterministic PWA manifest compilation, caching thresholds, and service-worker lifecycle compliance.
- `audit:security`: Executes high-entropy local static analysis ensuring rigid credential hygiene and absence of leaked organizational secrets.
