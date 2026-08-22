export interface LocalSpeech {
  readonly available: boolean;
  speak(text: string): void;
  cancel(): void;
  dispose(): void;
}

export interface LocalSpeechDependencies {
  readonly synthesis?: SpeechSynthesis;
  readonly createUtterance?: (text: string) => SpeechSynthesisUtterance;
}

export function chooseLocalEnglishVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const localEnglishVoices = voices.filter(
    (voice) => voice.localService === true && voice.lang.toLowerCase().startsWith('en'),
  );

  return localEnglishVoices.find((voice) => voice.lang.toLowerCase() === 'en-gb')
    ?? localEnglishVoices[0]
    ?? null;
}

function getBrowserSynthesis(): SpeechSynthesis | undefined {
  try {
    return globalThis.speechSynthesis;
  } catch {
    return undefined;
  }
}

function createBrowserUtterance(text: string): SpeechSynthesisUtterance | null {
  try {
    return new SpeechSynthesisUtterance(text);
  } catch {
    return null;
  }
}

export function createLocalSpeech(deps: LocalSpeechDependencies = {}): LocalSpeech {
  const synthesis = deps.synthesis ?? getBrowserSynthesis();
  const createUtterance = deps.createUtterance ?? createBrowserUtterance;
  let selectedVoice: SpeechSynthesisVoice | null = null;
  let disposed = false;

  const refreshVoice = () => {
    if (disposed || !synthesis) {
      selectedVoice = null;
      return;
    }

    try {
      selectedVoice = chooseLocalEnglishVoice(synthesis.getVoices());
    } catch {
      selectedVoice = null;
    }
  };

  refreshVoice();
  try {
    synthesis?.addEventListener?.('voiceschanged', refreshVoice);
  } catch {
    // Voice-list updates are optional; the current local voice is still usable.
  }

  return {
    get available() {
      return !disposed && selectedVoice !== null;
    },
    speak(text) {
      if (disposed || !synthesis || text.trim() === '') return;

      try {
        synthesis.cancel();
        refreshVoice();
        if (!selectedVoice) return;

        const utterance = createUtterance(text);
        if (!utterance) return;

        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
        synthesis.speak(utterance);
      } catch {
        // Browser speech is progressive enhancement; captions remain authoritative.
      }
    },
    cancel() {
      if (disposed || !synthesis) return;

      try {
        synthesis.cancel();
      } catch {
        // Some browser speech implementations reject cancellation after interruption.
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      selectedVoice = null;

      try {
        synthesis?.removeEventListener?.('voiceschanged', refreshVoice);
        synthesis?.cancel();
      } catch {
        // Disposal must not leak platform failures into the UI.
      }
    },
  };
}
