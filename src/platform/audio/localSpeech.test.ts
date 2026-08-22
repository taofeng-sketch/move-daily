import { describe, expect, it, vi } from 'vitest';
import { createCoachAudio } from './coachAudio';
import { chooseLocalEnglishVoice, createLocalSpeech } from './localSpeech';

const voice = (overrides: Partial<SpeechSynthesisVoice> = {}): SpeechSynthesisVoice =>
  ({
    default: false,
    lang: 'en-US',
    localService: true,
    name: 'Local English',
    voiceURI: 'local-en',
    ...overrides,
  }) as SpeechSynthesisVoice;

class FakeSynthesis extends EventTarget {
  readonly cancel = vi.fn();
  readonly speak = vi.fn();
  voices: SpeechSynthesisVoice[] = [];

  getVoices = (): SpeechSynthesisVoice[] => this.voices;
}

describe('local English speech', () => {
  it('rejects remote voices and prefers a local en-GB voice', () => {
    const selected = chooseLocalEnglishVoice([
      voice({ localService: false, name: 'Remote English' }),
      voice({ lang: 'fr-FR', name: 'French' }),
      voice({ lang: 'en-GB', name: 'British' }),
    ]);

    expect(selected?.name).toBe('British');
  });

  it('returns null when no local English voice is available', () => {
    expect(
      chooseLocalEnglishVoice([
        voice({ lang: 'en-US', localService: false }),
        voice({ lang: 'de-DE', localService: true }),
      ]),
    ).toBeNull();
  });

  it('uses a local voice that arrives through voiceschanged', () => {
    const synthesis = new FakeSynthesis();
    const utterance = { text: '', voice: null } as unknown as SpeechSynthesisUtterance;
    const speech = createLocalSpeech({
      synthesis: synthesis as unknown as SpeechSynthesis,
      createUtterance: (text) => {
        utterance.text = text;
        return utterance;
      },
    });

    expect(speech.available).toBe(false);

    synthesis.voices = [voice({ lang: 'en-GB', name: 'British' })];
    synthesis.dispatchEvent(new Event('voiceschanged'));
    speech.speak('Start now');

    expect(speech.available).toBe(true);
    expect(synthesis.speak).toHaveBeenCalledWith(utterance);
    expect(utterance.voice?.name).toBe('British');
  });

  it('cancels stale speech before a new state cue', () => {
    const synthesis = new FakeSynthesis();
    synthesis.voices = [voice()];
    const speech = createLocalSpeech({
      synthesis: synthesis as unknown as SpeechSynthesis,
      createUtterance: (text) => ({ text, voice: null }) as unknown as SpeechSynthesisUtterance,
    });

    speech.speak('Fresh cue');

    expect(synthesis.cancel).toHaveBeenCalledOnce();
    expect(synthesis.speak).toHaveBeenCalledOnce();
  });

  it('does not queue speech when no local English voice exists', () => {
    const synthesis = new FakeSynthesis();
    const speech = createLocalSpeech({ synthesis: synthesis as unknown as SpeechSynthesis });

    speech.speak('Captions remain available');

    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it('reports speech as unavailable when an injected availability getter fails', () => {
    const audio = createCoachAudio({
      speech: {
        get available(): boolean {
          throw new Error('speech capability unavailable');
        },
        cancel: vi.fn(),
        dispose: vi.fn(),
        speak: vi.fn(),
      },
      tone: { cancel: vi.fn(), dispose: vi.fn(), tone: vi.fn(), unlock: vi.fn() },
    });

    expect(audio.speechAvailable).toBe(false);
  });
});
