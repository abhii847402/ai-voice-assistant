// Speech Synthesis utility for RAJ AI supporting Hindi and English

export interface VoiceSettings {
  rate: number;
  pitch: number;
  volume: number;
  voiceName?: string;
  enabled: boolean;
}

export const defaultVoiceSettings: VoiceSettings = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  enabled: true,
};

let cachedVoices: SpeechSynthesisVoice[] = [];

export function getSystemVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      resolve(voices);
      return;
    }

    const handler = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(cachedVoices);
    };

    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // Timeout fallback
    setTimeout(() => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    }, 500);
  });
}

function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/[*_#`~>\[\]\(\)\{\}]/g, '') // strip markdown
    .replace(/https?:\/\/\S+/g, 'link')   // avoid reading raw URLs
    .replace(/calc\.exe/gi, 'calculator')
    .replace(/notepad\.exe/gi, 'notepad')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function speakAloud(
  text: string,
  language: 'hindi' | 'english' | 'hinglish' = 'english',
  settings: VoiceSettings = defaultVoiceSettings,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): boolean {
  if (!('speechSynthesis' in window) || !settings.enabled) {
    if (onEnd) onEnd();
    return false;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const clean = cleanTextForSpeech(text);
  if (!clean) {
    if (onEnd) onEnd();
    return false;
  }

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = settings.rate;
  utterance.pitch = settings.pitch;
  utterance.volume = settings.volume;

  // Language & Voice matching
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  const isHindi = language === 'hindi' || /[अ-ह]/.test(clean);

  if (settings.voiceName) {
    const selected = voices.find((v) => v.name === settings.voiceName);
    if (selected) utterance.voice = selected;
  } else if (isHindi) {
    // Look for Hindi voice: hi-IN, Google हिन्दी, Microsoft Hemant/Kalpana
    const hindiVoice = voices.find((v) => v.lang.includes('hi') || v.name.toLowerCase().includes('hindi'));
    if (hindiVoice) {
      utterance.voice = hindiVoice;
      utterance.lang = 'hi-IN';
    } else {
      // Fallback Indian English or default
      const inVoice = voices.find((v) => v.lang.includes('en-IN') || v.name.includes('India'));
      if (inVoice) utterance.voice = inVoice;
      utterance.lang = 'hi-IN';
    }
  } else {
    // English: prefer natural/neural English voices
    const preferredVoice = voices.find(
      (v) =>
        (v.lang.includes('en-IN') || v.lang.includes('en-US') || v.lang.includes('en-GB')) &&
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('Zira') || v.name.includes('Ravi'))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    utterance.lang = 'en-US';
  }

  utterance.onstart = () => {
    if (onStart) onStart();
  };

  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    console.warn('[SpeechSynthesis] Error:', e);
    if (onError) onError(e);
    if (onEnd) onEnd();
  };

  try {
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.error('Speech synthesis failure:', err);
    if (onEnd) onEnd();
    return false;
  }
}
