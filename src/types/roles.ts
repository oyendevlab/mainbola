import { PlayerPosition } from './index';

export type AttackerRole = 'Poacher' | 'Target Man' | 'False 9';
export type MidfielderRole = 'Playmaker' | 'Box-to-Box' | 'Ball-Winner';
export type DefenderRole = 'Stopper' | 'Ball-Playing Defender';
export type GoalkeeperRole = 'Sweeper Keeper' | 'Traditional';

export type PlayerRole = AttackerRole | MidfielderRole | DefenderRole | GoalkeeperRole;

export interface RoleDefinition {
  id: PlayerRole;
  name: string;
  position: PlayerPosition;
  description: string;
  icon: string;
  statBonusText: string;
}

export const ROLE_DEFINITIONS: Record<PlayerRole, RoleDefinition> = {
  // Attackers
  'Poacher': {
    id: 'Poacher',
    name: 'Pemburu Gol (Poacher)',
    position: 'ATT',
    description: 'Pakar penyudah di dalam kotak penalti. Mengutamakan ketepatan rembatan dan naluri gol.',
    icon: '🎯',
    statBonusText: '+15% Ketepatan Rembatan & Peluang Gol',
  },
  'Target Man': {
    id: 'Target Man',
    name: 'Sasaran Utama (Target Man)',
    position: 'ATT',
    description: 'Penyerang berfizikal tegap yang memegang bola dan memenangi tandukan udara untuk rakan sepasukan.',
    icon: '🏔️',
    statBonusText: '+15% Duels Udara & Kawalan Bola',
  },
  'False 9': {
    id: 'False 9',
    name: 'Penyerang Bayang (False 9)',
    position: 'ATT',
    description: 'Turun ke zon tengah untuk mengelirukan bek lawan dan mencipta hantaran gol kepada rakan sayap.',
    icon: '🎭',
    statBonusText: '+20% Peluang Bantuan Gol (Assist)',
  },

  // Midfielders
  'Playmaker': {
    id: 'Playmaker',
    name: 'Perancang Utama (Playmaker)',
    position: 'MID',
    description: 'Jeneral padang yang mendikte tempo perlawanan dan melancarkan hantaran lolos berbahaya.',
    icon: '🪄',
    statBonusText: '+20% Ketepatan Hantaran Lolos & Cipta Peluang',
  },
  'Box-to-Box': {
    id: 'Box-to-Box',
    name: 'Serba Boleh (Box-to-Box)',
    position: 'MID',
    description: 'Bekerja tanpa henti dari kotak penalti sendiri ke kotak lawan, seimbang dalam bertahan dan menyerang.',
    icon: '⚡',
    statBonusText: '+15% Pengurusan Stamina & Sumbangan Menyeluruh',
  },
  'Ball-Winner': {
    id: 'Ball-Winner',
    name: 'Pemusnah Serangan (Ball-Winner)',
    position: 'MID',
    description: 'Pakar mematahkan serangan lawan di bahagian tengah dengan terjahan keras dan pintar.',
    icon: '🛡️',
    statBonusText: '+20% Terjahan & Pintasan Bola Tengah',
  },

  // Defenders
  'Stopper': {
    id: 'Stopper',
    name: 'Penghalang Kebal (Stopper)',
    position: 'DEF',
    description: 'Pertahanan fizikal utama yang menyapu bersih sebarang ancaman bahaya di zon bahaya.',
    icon: '🧱',
    statBonusText: '+15% Sapuan Bersih & Sekatan Rembatan',
  },
  'Ball-Playing Defender': {
    id: 'Ball-Playing Defender',
    name: 'Pertahanan Moden (Ball-Playing)',
    position: 'DEF',
    description: 'Membina serangan terus dari benteng bawah dengan hantaran tepat ke barisan tengah.',
    icon: '⚽',
    statBonusText: '+15% Penguasaan Pasukan & Kawalan Bola Keluar',
  },

  // Goalkeepers
  'Sweeper Keeper': {
    id: 'Sweeper Keeper',
    name: 'Penjaga Sweeper',
    position: 'GK',
    description: 'Berani keluar dari garisan gol untuk memintas bola lolos dan membantu edaran bola awal.',
    icon: '🧤',
    statBonusText: '+15% Pintasan Luar Kotak & Hantaran Balas Pantas',
  },
  'Traditional': {
    id: 'Traditional',
    name: 'Penjaga Gol Tradisional',
    position: 'GK',
    description: 'Kekal di garisan gol dengan refleks kilat untuk menepis percubaan jarak dekat dan jauh.',
    icon: '🛡️',
    statBonusText: '+15% Refleks & Tangkapan Percubaan Bahaya',
  },
};

export function getRolesForPosition(pos: PlayerPosition): RoleDefinition[] {
  return Object.values(ROLE_DEFINITIONS).filter((r) => r.position === pos);
}

export function getDefaultRoleForPosition(pos: PlayerPosition): PlayerRole {
  switch (pos) {
    case 'ATT':
      return 'Poacher';
    case 'MID':
      return 'Playmaker';
    case 'DEF':
      return 'Stopper';
    case 'GK':
      return 'Traditional';
  }
}
