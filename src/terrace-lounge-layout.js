// Deliberately composed pockets, not a repeated or random fill. Angles are
// measured around the existing tiers; wide stretches remain completely empty.
const POCKETS = [
  [
    { angle: 25, seats: [1, 2, 1], gap: 0.95, mode: 'cluster' },
    { angle: 69, seats: [2], mode: 'isolated' },
    { angle: 110, seats: [1, 2], gap: 1.05, mode: 'cluster' },
    { angle: 147, seats: [4], mode: 'gathering' },
    { angle: 222, seats: [1, 1], gap: 0.95, mode: 'cluster' },
    { angle: 254, seats: [3], mode: 'gathering' },
    { angle: 315, seats: [2], mode: 'isolated' },
  ],
  [
    { angle: 48, seats: [2, 1], gap: 1.05, mode: 'cluster' },
    { angle: 104, seats: [1], mode: 'isolated' },
    { angle: 134, seats: [3], mode: 'gathering' },
    { angle: 198, seats: [1, 2, 1], gap: 1.05, mode: 'cluster' },
    { angle: 284, seats: [4], mode: 'gathering' },
    { angle: 331, seats: [2], mode: 'isolated' },
  ],
];

export function terraceLoungePlan(tiers) {
  return POCKETS.map((pockets, tier) => pockets.flatMap((pocket, pocketIndex) => {
    const radius = tiers[tier].inner + 0.49;
    const widths = pocket.seats.map(capacity => 0.45 + capacity * 0.70);
    const span = widths.reduce((a, b) => a + b, 0) + (pocket.gap ?? 0) * (widths.length - 1);
    let cursor = pocket.angle * Math.PI / 180 - span / (2 * radius);
    return widths.map((width, index) => {
      const start = cursor, end = start + width / radius;
      cursor = end + (pocket.gap ?? 0) / radius;
      return { start, end, capacity: pocket.seats[index], cluster: `tier-${tier + 1}-pocket-${pocketIndex + 1}`, mode: pocket.mode };
    });
  }));
}
