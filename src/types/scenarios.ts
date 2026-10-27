import { TacticalStyle, FormationType } from './index';

export interface ScenarioDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  difficulty: 'Mudah' | 'Sederhana' | 'Sukar' | 'Lagenda';
  icon: string;
  opponentName: string;
  opponentFormation: FormationType;
  opponentTactics: TacticalStyle;
  opponentRating: number;
  startingMinute: number;
  initialHomeScore: number;
  initialAwayScore: number;
  initialRedCards: number; // e.g. 1 red card for user's team
  targetGoal: 'win' | 'draw_or_win' | 'clean_sheet_win';
  targetDescription: string;
  creditReward: number;
}

export const SCENARIO_PRESETS: ScenarioDefinition[] = [
  {
    id: 'comeback_miracle',
    title: 'Keajaiban Minit Akhir',
    subtitle: 'Ketinggalan 0-2 pada minit 70\' dengan 10 pemain!',
    description: 'Bintang pertahanan anda dilayangkan kad merah pada babak pertama dan pasukan ketinggalan dua gol. Masih berbaki 20 minit masa perlawanan untuk merencana keajaiban seri atau menang!',
    difficulty: 'Sukar',
    icon: '⚡',
    opponentName: 'Gergasi Merah FC',
    opponentFormation: '4-3-3',
    opponentTactics: 'Balanced',
    opponentRating: 78,
    startingMinute: 70,
    initialHomeScore: 0,
    initialAwayScore: 2,
    initialRedCards: 1,
    targetGoal: 'draw_or_win',
    targetDescription: 'Raih sekurang-kurangnya keputusan Seri (2-2) atau Kemenangan',
    creditReward: 20000,
  },
  {
    id: 'iron_wall',
    title: 'Tembok Besi Pertahanan',
    subtitle: 'Mendahului 1-0 pada minit 65\' menentang penyerang gergasi!',
    description: 'Pasukan anda mendahului 1-0 hasil sepakan sudut awal. Pihak lawan menurunkan 3 penyerang bertaraf bintang dalam formasi menyerang agresif. Pertahankan gawang anda sehingga wisel penamat!',
    difficulty: 'Sederhana',
    icon: '🧱',
    opponentName: 'Harimau Kumbang',
    opponentFormation: '4-2-3-1',
    opponentTactics: 'Attacking',
    opponentRating: 80,
    startingMinute: 65,
    initialHomeScore: 1,
    initialAwayScore: 0,
    initialRedCards: 0,
    targetGoal: 'clean_sheet_win',
    targetDescription: 'Kekalkan bolos sifar dan menangi perlawanan',
    creditReward: 15000,
  },
  {
    id: 'academy_derby',
    title: 'Kebanggaan Akademi Remaja',
    subtitle: 'Barisan ubi muda menentang skuad bintang senior!',
    description: 'Pasukan lawan memperlekehkan keupayaan pemain akademi anda. Buktikan disiplin taktikal dan semangat juang muda mampu menumbangkan skuad elit dari minit pertama!',
    difficulty: 'Lagenda',
    icon: '🌟',
    opponentName: 'Galacticos City',
    opponentFormation: '4-3-3',
    opponentTactics: 'Attacking',
    opponentRating: 84,
    startingMinute: 0,
    initialHomeScore: 0,
    initialAwayScore: 0,
    initialRedCards: 0,
    targetGoal: 'win',
    targetDescription: 'Menangi perlawanan menentang lawan berating 84+',
    creditReward: 30000,
  },
];
