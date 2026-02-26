export const DAILY_XP_CAP = 120;

export function xpFromScore(scorePercent: number): number {
  return Math.min(DAILY_XP_CAP, Math.floor(scorePercent));
}

export function levelFromXp(totalXp: number): { level: number; currentLevelXp: number; nextLevelXp: number } {
  let level = 1;
  let threshold = 100;
  let remaining = totalXp;

  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold += 50;
  }

  return {
    level,
    currentLevelXp: remaining,
    nextLevelXp: threshold
  };
}
