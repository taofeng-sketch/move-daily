export type InstallState =
  | { readonly kind: 'installable'; prompt(): Promise<'accepted' | 'dismissed'> }
  | { readonly kind: 'ios-instructions' }
  | { readonly kind: 'installed' }
  | { readonly kind: 'unsupported' };

interface DeferredInstallPromptEvent extends Event {
  readonly prompt: () => Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>;
}

type InstallPlatform = 'ios' | 'android' | 'desktop' | 'unknown';

const INSTRUCTIONS: Readonly<Record<InstallPlatform, readonly string[]>> = {
  ios: ['Tap Share in Safari.', 'Choose Add to Home Screen.'],
  android: ['Open the browser menu.', 'Choose Install app or Add to Home screen if it appears.'],
  desktop: [
    'Use the install button in the address bar or browser menu if it appears.',
    'Otherwise, bookmark this page for quick access.',
  ],
  unknown: [
    'Installation is not available in this browser.',
    'Bookmark this page for quick access.',
  ],
};

export function getInstallInstructions(platform: InstallPlatform): readonly string[] {
  return INSTRUCTIONS[platform];
}

export function observeInstallPrompt(callback: (state: InstallState) => void): () => void {
  let active = true;

  const emit = (state: InstallState): void => {
    if (!active) return;
    try {
      callback(state);
    } catch {
      // A presentation callback must not break capability observation.
    }
  };

  const onBeforeInstallPrompt = (rawEvent: Event): void => {
    if (!active) return;
    try {
      rawEvent.preventDefault();
    } catch {
      // Some browser shims expose an event whose methods cannot be accessed.
    }

    const event = rawEvent as DeferredInstallPromptEvent;
    let promptResult: Promise<'accepted' | 'dismissed'> | undefined;
    const prompt = (): Promise<'accepted' | 'dismissed'> => {
      if (promptResult) return promptResult;
      promptResult = runInstallPrompt(event);
      return promptResult;
    };

    emit({ kind: 'installable', prompt });
  };

  const onAppInstalled = (): void => emit({ kind: 'installed' });

  safeAddListener('beforeinstallprompt', onBeforeInstallPrompt);
  safeAddListener('appinstalled', onAppInstalled);
  emit(initialInstallState());

  return () => {
    active = false;
    safeRemoveListener('beforeinstallprompt', onBeforeInstallPrompt);
    safeRemoveListener('appinstalled', onAppInstalled);
  };
}

async function runInstallPrompt(
  event: DeferredInstallPromptEvent,
): Promise<'accepted' | 'dismissed'> {
  try {
    await event.prompt();
    const choice = await event.userChoice;
    return choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch {
    return 'dismissed';
  }
}

function initialInstallState(): InstallState {
  if (isInstalled()) return { kind: 'installed' };
  if (isIos()) return { kind: 'ios-instructions' };
  return { kind: 'unsupported' };
}

function isInstalled(): boolean {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
  } catch {
    // Continue to the iOS standalone property.
  }

  try {
    return (navigator as Navigator & { readonly standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

function isIos(): boolean {
  try {
    if (/iPad|iPhone|iPod/i.test(navigator.userAgent)) return true;
    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  } catch {
    return false;
  }
}

function safeAddListener(type: string, listener: EventListener): void {
  try {
    window.addEventListener(type, listener);
  } catch {
    // Installation remains optional when browser event access is unavailable.
  }
}

function safeRemoveListener(type: string, listener: EventListener): void {
  try {
    window.removeEventListener(type, listener);
  } catch {
    // Cleanup is best-effort after callbacks have already been disabled.
  }
}
