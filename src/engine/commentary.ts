import { MatchEvent } from '../types';

export interface CommentaryOptions {
  enabled?: boolean;
  language?: 'ms' | 'en';
  rate?: number;
  pitch?: number;
}

let lastSpokenTime = 0;
const THROTTLE_MS = 1400; // minimum ms between commentary utterances

/**
 * Returns formatted spoken commentary string for a given match event.
 */
export function getSpokenCommentary(event: MatchEvent, language: 'ms' | 'en' = 'ms'): string {
  const pName = event.playerName || 'Pemain';

  if (language === 'ms') {
    switch (event.type) {
      case 'GOAL':
        return `Gol! Jaringan menarik oleh ${pName}! Skor ${event.homeScore} berbalas ${event.awayScore}.`;
      case 'ONE_TWO':
        return `Kombinasi satu-dua menarik oleh ${pName}! Ruang pertahanan ditembusi!`;
      case 'SHOT':
        return `Percubaan bahaya daripada ${pName}!`;
      case 'SHOT_BLOCK':
        return 'Pertahanan kental merebahkan badan menghadang bola!';
      case 'SAVE':
        return 'Tangkapan kemas penjaga gol menyelamatkan gawang!';
      case 'FOUL':
        return `Kekasaran berlaku! Pengadil meniup wisel menghentikan permainan.`;
      case 'PENALTY':
        return `Sepakan penalti diberikan! Peluang keemasan di hadapan gawang gol!`;
      case 'CORNER':
        return 'Sepakan sudut diambil, bola melambung ke dalam kotak penalti!';
      case 'TACKLE':
        return `Terjahan bersih berjaya mematikan serangan!`;
      case 'INTERCEPTION':
        return 'Hantaran berjaya dipintas di tengah padang.';
      case 'YELLOW_CARD':
        return `Kad kuning dilayangkan kepada ${pName} kerana kesalahan terjahan.`;
      case 'RED_CARD':
        return `Perintah keluar padang! Kad merah terus untuk ${pName}!`;
      case 'HALFTIME':
        return 'Wisel separuh masa dibunyikan. Rehat 15 minit untuk kedua-dua pasukan.';
      case 'FULLTIME':
        return `Wisel penamat ditiupkan! Keputusan akhir: ${event.homeScore} berbalas ${event.awayScore}.`;
      case 'KICKOFF':
        return 'Wisel permulaan ditiupkan! Perlawanan kini bermula.';
      default:
        return event.description;
    }
  } else {
    switch (event.type) {
      case 'GOAL':
        return `Goal! Stunning finish by ${pName}! Score is now ${event.homeScore} to ${event.awayScore}.`;
      case 'SHOT':
        return `Dangerous shot on target by ${pName}!`;
      case 'SAVE':
        return 'Brilliant save by the goalkeeper!';
      case 'TACKLE':
        return 'Strong, clean tackle wins back possession.';
      case 'INTERCEPTION':
        return 'Pass intercepted in the midfield.';
      case 'YELLOW_CARD':
        return `Yellow card shown to ${pName}.`;
      case 'RED_CARD':
        return `Red card! ${pName} is sent off the pitch!`;
      case 'HALFTIME':
        return 'Half-time whistle blown. Players head into the locker rooms.';
      case 'FULLTIME':
        return `Full-time whistle! Final score: ${event.homeScore} to ${event.awayScore}.`;
      case 'KICKOFF':
        return 'The referee blows the whistle and we are underway!';
      default:
        return event.description;
    }
  }
}

/**
 * Speaks the commentary aloud using the browser Web Speech API (speechSynthesis).
 */
export function speakCommentary(
  event: MatchEvent,
  options: CommentaryOptions = {}
): boolean {
  const { enabled = true, language = 'ms', rate = 1.05, pitch = 1.0 } = options;

  if (!enabled) return false;
  const synth =
    typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis
      : typeof speechSynthesis !== 'undefined'
      ? speechSynthesis
      : null;

  if (!synth) return false;

  const now = Date.now();
  // Throttle regular events (pass/tackle), but always announce GOAL and RED_CARD immediately
  const isHighPriority = event.type === 'GOAL' || event.type === 'RED_CARD' || event.type === 'FULLTIME';
  if (!isHighPriority && now - lastSpokenTime < THROTTLE_MS) {
    return false;
  }

  const text = getSpokenCommentary(event, language);
  if (!text) return false;

  try {
    // If high priority, cancel current speech
    if (isHighPriority && synth.speaking) {
      synth.cancel();
    }

    const UtteranceClass =
      typeof SpeechSynthesisUtterance !== 'undefined'
        ? SpeechSynthesisUtterance
        : (window as unknown as { SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance }).SpeechSynthesisUtterance;

    if (!UtteranceClass) return false;

    const utterance = new UtteranceClass(text);
    utterance.lang = language === 'ms' ? 'ms-MY' : 'en-US';
    utterance.rate = rate;
    utterance.pitch = pitch;

    synth.speak(utterance);
    lastSpokenTime = now;
    return true;
  } catch (err) {
    console.warn('[Commentary] Web Speech API error:', err);
    return false;
  }
}

/**
 * Cancels any active speech synthesis audio.
 */
export function stopCommentary(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}
