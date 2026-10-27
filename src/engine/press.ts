import { Player } from '../types';
import { createPRNG } from './prng';

export interface PressAnswer {
  id: string;
  text: string;
  moraleDelta: number;
  tone: 'Bersemangat' | 'Yakin' | 'Berwaspada';
  feedback: string;
}

export interface PressConferenceQuestion {
  id: string;
  question: string;
  context: string;
  answers: PressAnswer[];
}

export const PRESS_QUESTIONS: PressConferenceQuestion[] = [
  {
    id: 'press_q1',
    question: 'Wartawan bertanya: "Bagaimana persediaan mental pasukan menjelang perlawanan sengit ini?"',
    context: 'Bilik Media Stadium • Sidang Pra-Perlawanan',
    answers: [
      {
        id: 'ans_1a',
        text: '"Pemain berada pada tahap kemuncak. Kami masuk ke padang untuk menang besar!"',
        moraleDelta: 8,
        tone: 'Yakin',
        feedback: 'Skuad bersemangat tinggi mendengar keyakinan pengurus mereka (+8 Moral)!',
      },
      {
        id: 'ans_1b',
        text: '"Kami hormati lawan, tetapi taktikal kami telah diasah rapi untuk mengawal rentak perlawanan."',
        moraleDelta: 5,
        tone: 'Bersemangat',
        feedback: 'Pemain berasa tenang dan fokus dengan pendekatan tersusun (+5 Moral).',
      },
      {
        id: 'ans_1c',
        text: '"Ini perlawanan yang sukar. Jika kami tidak berhati-hati, kami mungkin dihukum."',
        moraleDelta: -4,
        tone: 'Berwaspada',
        feedback: 'Kenyataan berhati-hati sedikit meresahkan beberapa pemain muda (-4 Moral).',
      },
    ],
  },
  {
    id: 'press_q2',
    question: 'Wartawan bertanya: "Penyokong meletakkan harapan tinggi kepada bahagian serangan kelab hari ini. Apa mesej anda?"',
    context: 'Liputan Media Rasmi',
    answers: [
      {
        id: 'ans_2a',
        text: '"Barisan serangan kami lapar gol! Saksikan pesta jaringan petang ini!"',
        moraleDelta: 10,
        tone: 'Yakin',
        feedback: 'Penyerang pasukan teruja dan bersemangat membuktikan bisa (+10 Moral)!',
      },
      {
        id: 'ans_2b',
        text: '"Kemenangan adalah kerja berpasukan, bukan beban di bahu jentera serangan sahaja."',
        moraleDelta: 5,
        tone: 'Bersemangat',
        feedback: 'Semangat perpaduan dan kerjasama skuad meningkat (+5 Moral).',
      },
      {
        id: 'ans_2c',
        text: '"Kami perlu elak kesilapan mudah dahulu sebelum berfikir tentang menyerang."',
        moraleDelta: -3,
        tone: 'Berwaspada',
        feedback: 'Pemain serangan berasa pengurus kurang percaya pada naluri mereka (-3 Moral).',
      },
    ],
  },
  {
    id: 'press_q3',
    question: 'Wartawan bertanya: "Pihak lawan mendakwa mereka sudah membaca segala strategi dan formasi anda. Reaksi anda?"',
    context: 'Sesi Soal Jawab Wartawan Sukan',
    answers: [
      {
        id: 'ans_3a',
        text: '"Biarlah mereka bercakap di media. Di atas padang nanti, bola yang akan berbicara!"',
        moraleDelta: 9,
        tone: 'Bersemangat',
        feedback: 'Skuad melonjak motivasi untuk membuktikan kehebatan di atas padang (+9 Moral)!',
      },
      {
        id: 'ans_3b',
        text: '"Kami ada beberapa kejutan taktikal yang belum pernah mereka saksikan."',
        moraleDelta: 6,
        tone: 'Yakin',
        feedback: 'Pemain berasa yakin dengan pelan taktikal rahsia pasukan (+6 Moral).',
      },
      {
        id: 'ans_3c',
        text: '"Mungkin ada benarnya. Kami perlu lebih bersedia menghadapi kejutan."',
        moraleDelta: -5,
        tone: 'Berwaspada',
        feedback: 'Moral pasukan sedikit terjejas kerana keraguan yang timbul (-5 Moral).',
      },
    ],
  },
];

/**
 * Returns a deterministic pre-match press conference question based on seed.
 */
export function getPressConferenceQuestion(seed: number): PressConferenceQuestion {
  return getPreMatchPressConference(seed);
}

export function getPreMatchPressConference(seed: number): PressConferenceQuestion {
  const prng = createPRNG((seed * 4391 + 1013) >>> 0);
  const idx = prng.nextInt(0, PRESS_QUESTIONS.length - 1);
  return PRESS_QUESTIONS[idx];
}

/**
 * Applies morale change to a list of players, clamped between 20 and 100.
 */
export function applyMoraleDelta(players: Player[], delta: number): Player[] {
  return players.map((p) => {
    const currentMorale = p.morale ?? 80;
    const newMorale = Math.max(20, Math.min(100, currentMorale + delta));
    return {
      ...p,
      morale: newMorale,
    };
  });
}
