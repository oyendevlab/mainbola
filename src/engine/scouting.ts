import { ClubSnapshot, TacticalStyle, Player, PlayerPosition } from '../types';

export interface ScoutingReport {
  opponentId: string;
  opponentName: string;
  opponentFormation: string;
  opponentTactics: TacticalStyle;
  teamStrengthAverage: number;
  keyThreat: {
    player: Player;
    threatDescription: string;
    dangerLevel: 'Sederhana' | 'Tinggi' | 'Bahaya Kritikal';
  };
  weakness: {
    position: PlayerPosition;
    description: string;
  };
  counterTacticsAdvice: {
    recommendedTactics: TacticalStyle;
    tacticalTip: string;
  };
  dangerZone: string;
}

/**
 * Generates an in-depth tactical scouting report on an opposing club.
 */
export function generateScoutingReport(opponent: ClubSnapshot): ScoutingReport {
  const squad = opponent.startingXI;

  // Calculate average team rating
  const totalRating = squad.reduce((acc, p) => acc + p.overallRating, 0);
  const teamStrengthAverage = Math.round(totalRating / (squad.length || 1));

  // 1. Identify Key Threat (highest overall rating or attack)
  const attackers = squad.filter((p) => p.position === 'ATT');
  const midfielders = squad.filter((p) => p.position === 'MID');
  const offensivePool = attackers.length > 0 ? attackers : midfielders.length > 0 ? midfielders : squad;

  const keyThreatPlayer = [...offensivePool].sort((a, b) => {
    const scoreA = a.attributes.attack * 1.5 + a.attributes.speed + a.overallRating;
    const scoreB = b.attributes.attack * 1.5 + b.attributes.speed + b.overallRating;
    return scoreB - scoreA;
  })[0] || squad[0];

  const dangerLevel =
    keyThreatPlayer.overallRating >= 80
      ? 'Bahaya Kritikal'
      : keyThreatPlayer.overallRating >= 74
      ? 'Tinggi'
      : 'Sederhana';

  const threatDescription =
    keyThreatPlayer.position === 'ATT'
      ? `${keyThreatPlayer.name} memiliki naluri pemusnah dengan penarafan ATT ${keyThreatPlayer.attributes.attack} dan kelajuan SPD ${keyThreatPlayer.attributes.speed}. Perlu dikawal rapi oleh bek tengah.`
      : `${keyThreatPlayer.name} bertindak sebagai jeneral tengah dengan hantaran tajam PAS ${keyThreatPlayer.attributes.passing}. Boleh membuka ruang untuk serangan mengejut.`;

  // 2. Identify Weakness (lowest rated defensive player or goalkeeper)
  const defenders = squad.filter((p) => p.position === 'DEF');
  const goalkeepers = squad.filter((p) => p.position === 'GK');
  const defensivePool = defenders.length > 0 ? defenders : goalkeepers.length > 0 ? goalkeepers : squad;

  const weakestPlayer = [...defensivePool].sort((a, b) => a.overallRating - b.overallRating)[0] || squad[0];

  const weakness = {
    position: weakestPlayer.position,
    description:
      weakestPlayer.position === 'GK'
        ? `Penjaga gol lawan agak goyah (OVR ${weakestPlayer.overallRating}). Kerap lepaskan bola muntah daripada rembatan jarak jauh.`
        : `Benteng pertahanan lawan agak perlahan di zon ${weakestPlayer.name} (DEF ${weakestPlayer.attributes.defense}, SPD ${weakestPlayer.attributes.speed}). Manfaatkan larian sayap pantas untuk menembusi.`,
  };

  // 3. Formulate Counter-Tactics
  let recommendedTactics: TacticalStyle = 'Balanced';
  let tacticalTip = '';

  if (opponent.tactics === 'Attacking') {
    recommendedTactics = 'Defensive';
    tacticalTip =
      'Lawan gemar menolak barisan tinggi (high press). Disiplin bertahan padat dan serang balas pantas (counter-attack) melalui sayap akan merobek ruang belakang mereka.';
  } else if (opponent.tactics === 'Defensive') {
    recommendedTactics = 'Attacking';
    tacticalTip =
      'Lawan gemar berkampung di kawasan sendiri (low block). Gunakan taktik Menyerang dengan hantaran pantas dari tepi kotak penalti untuk memancing kesilapan benteng mereka.';
  } else {
    recommendedTactics = 'Attacking';
    tacticalTip =
      'Lawan bermain dengan pendekatan seimbang. Peningkatan intensiti rembatan dan penguasaan bola awal akan memberi kelebihan gol awal.';
  }

  // 4. Danger Zone
  const dangerZone =
    opponent.formation === '4-3-3'
      ? 'Koridor Sayap Kiri & Kanan'
      : opponent.formation === '4-2-3-1'
      ? 'Ruang Poket Tengah (Zone 14)'
      : 'Kotak Penalti Terbuka';

  return {
    opponentId: opponent.id,
    opponentName: opponent.name,
    opponentFormation: opponent.formation,
    opponentTactics: opponent.tactics,
    teamStrengthAverage,
    keyThreat: {
      player: keyThreatPlayer,
      threatDescription,
      dangerLevel,
    },
    weakness,
    counterTacticsAdvice: {
      recommendedTactics,
      tacticalTip,
    },
    dangerZone,
  };
}
