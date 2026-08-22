import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type JSX,
} from 'react';
import { CompletionScreen } from '../features/completion/CompletionScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { SessionPlayer } from '../features/player/SessionPlayer';
import { ReminderDialog } from '../features/reminders/ReminderDialog';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { createCoachAudio, type CoachAudio } from '../platform/audio/coachAudio';
import {
  createWakeLockController,
  type WakeLockController,
} from '../platform/lifecycle/wakeLock';
import { OfflineReadyNotice } from '../pwa/OfflineReadyNotice';
import { getSessionSummary } from '../session/selectors';
import styles from './App.module.css';
import {
  createPlatformBridge,
  resolveInstallInstructions,
  type PlatformBridge,
} from './platformBridge';
import {
  useAppModel,
  type AppModelDependencies,
  type AppRoute,
} from './useAppModel';

export interface AppRuntime {
  readonly audio: CoachAudio;
  readonly wakeLock: WakeLockController;
  readonly platform: PlatformBridge;
}

export interface AppProps {
  readonly runtime?: AppRuntime;
  readonly modelDependencies?: AppModelDependencies;
}

const FALLBACK_RUNTIME: AppRuntime = {
  audio: createCoachAudio(),
  wakeLock: createWakeLockController(),
  platform: createPlatformBridge(),
};

export function App({
  runtime = FALLBACK_RUNTIME,
  modelDependencies,
}: AppProps = {}): JSX.Element {
  const model = useAppModel(modelDependencies);
  const platform = useSyncExternalStore(
    runtime.platform.subscribe,
    runtime.platform.getSnapshot,
    runtime.platform.getServerSnapshot,
  );
  const [completionReminderOpen, setCompletionReminderOpen] = useState(false);
  const [completionReminderReturnFocus, setCompletionReminderReturnFocus] =
    useState<HTMLElement | null>(null);
  const route = model.route;
  const previousRouteNameRef = useRef(route.name);
  const installInstructions = resolveInstallInstructions(platform.installState);
  const completionCanInstall =
    platform.installState.kind === 'installable' ||
    platform.installState.kind === 'ios-instructions';

  useEffect(() => {
    if (previousRouteNameRef.current === route.name) return;
    previousRouteNameRef.current = route.name;
    const heading = document.querySelector<HTMLElement>('main h1');
    if (heading === null) return;
    const scrollingElement = document.scrollingElement ?? document.documentElement;
    scrollingElement.scrollTop = 0;
    scrollingElement.scrollLeft = 0;
    if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, [route.name]);

  const activateCapabilities = (): void => {
    let audioPromise: Promise<unknown>;
    let wakeLockPromise: Promise<unknown>;
    try {
      audioPromise = runtime.audio.unlock();
    } catch {
      audioPromise = Promise.resolve();
    }
    try {
      wakeLockPromise = runtime.wakeLock.request();
    } catch {
      wakeLockPromise = Promise.resolve();
    }
    void Promise.allSettled([audioPromise, wakeLockPromise]);
  };

  const startRoutine = (routineId: 'back' | 'left-toe'): void => {
    activateCapabilities();
    model.startRoutine(routineId);
  };

  const resumeSession = (): void => {
    activateCapabilities();
    model.resumeSession();
  };

  const openCompletionReminder = (): void => {
    setCompletionReminderReturnFocus(document.activeElement as HTMLElement | null);
    setCompletionReminderOpen(true);
  };

  const content = (
    <RouteContent
      completionCanInstall={completionCanInstall}
      installInstructions={installInstructions}
      model={model}
      openCompletionReminder={openCompletionReminder}
      platform={platform}
      resumeSession={resumeSession}
      route={route}
      runtime={runtime}
      startRoutine={startRoutine}
    />
  );

  const notices = (
    <Notices
      onApplyUpdate={platform.applyUpdate}
      onDismissOffline={runtime.platform.dismissOfflineReady}
      offlineReady={platform.offlineReady}
      persistenceNotice={model.persistenceNotice}
      route={route}
    />
  );

  return (
    <div
      className={styles.app}
      data-reduced-motion={model.preferences.reducedMotion ? 'true' : 'false'}
    >
      {route.name === 'completion' ? (
        <div
          aria-hidden={completionReminderOpen ? true : undefined}
          data-testid="completion-surface"
          inert={completionReminderOpen ? true : undefined}
        >
          {notices}
          {content}
        </div>
      ) : (
        <>
          {notices}
          {content}
        </>
      )}

      {route.name === 'completion' && completionReminderOpen ? (
        <ReminderDialog
          onClose={() => setCompletionReminderOpen(false)}
          returnFocus={completionReminderReturnFocus}
          routineId={route.session.routineId}
        />
      ) : null}
    </div>
  );
}

interface RouteContext {
  readonly route: AppRoute;
  readonly model: ReturnType<typeof useAppModel>;
  readonly runtime: AppRuntime;
  readonly platform: ReturnType<PlatformBridge['getSnapshot']>;
  readonly installInstructions: readonly string[];
  readonly completionCanInstall: boolean;
  readonly startRoutine: (routineId: 'back' | 'left-toe') => void;
  readonly resumeSession: () => void;
  readonly openCompletionReminder: () => void;
}

function RouteContent(context: RouteContext): JSX.Element {
  const {
    route,
    model,
    runtime,
    platform,
    installInstructions,
    completionCanInstall,
    startRoutine,
    resumeSession,
    openCompletionReminder,
  } = context;

  switch (route.name) {
    case 'home':
      return (
        <HomeScreen
          activeSession={model.activeSession}
          balanceSeconds={model.preferences.balanceSeconds}
          coachPace={model.preferences.coachPace}
          history={model.history}
          now={model.now}
          onOpenSettings={model.openSettings}
          onResume={resumeSession}
          onStart={startRoutine}
        />
      );
    case 'player':
      return (
        <SessionPlayer
          audio={runtime.audio}
          initialSession={route.session}
          onExit={model.exitSession}
          onFinished={model.finishSession}
          onVoiceEnabledChange={(voiceEnabled) => model.updatePreferences({ voiceEnabled })}
          reducedMotion={model.preferences.reducedMotion}
          routineId={route.routineId}
          saveSession={model.saveActiveSession}
          voiceEnabled={model.preferences.voiceEnabled}
          wakeLock={runtime.wakeLock}
        />
      );
    case 'completion':
      return (
        <CompletionScreen
          onDone={model.goHome}
          onInstall={model.openSettings}
          onSetReminder={openCompletionReminder}
          routineId={route.session.routineId}
          showInstallAction={completionCanInstall}
          showReminderAction={model.history.length > 0}
          summary={getSessionSummary(route.session)}
        />
      );
    case 'settings':
      return (
        <SettingsScreen
          installInstructions={installInstructions}
          installState={platform.installState}
          offlineAvailable={platform.offlineAvailable}
          onApplyUpdate={
            platform.applyUpdate === null
              ? undefined
              : () => {
                  void platform.applyUpdate?.();
                }
          }
          onClose={model.closeSettings}
          onPreferencesChange={model.updatePreferences}
          onReset={model.resetAllProgress}
          preferences={model.preferences}
        />
      );
  }
}

interface NoticesProps {
  readonly route: AppRoute;
  readonly offlineReady: boolean;
  readonly onDismissOffline: () => void;
  readonly onApplyUpdate: (() => Promise<void>) | null;
  readonly persistenceNotice: ReturnType<typeof useAppModel>['persistenceNotice'];
}

function Notices({
  route,
  offlineReady,
  onDismissOffline,
  onApplyUpdate,
  persistenceNotice,
}: NoticesProps): JSX.Element | null {
  const canShowActions = route.name === 'home' || route.name === 'completion';
  const updateVisible =
    onApplyUpdate !== null && (route.name === 'player' || canShowActions);
  const hasNotice =
    persistenceNotice !== null || (offlineReady && canShowActions) || updateVisible;
  if (!hasNotice) return null;

  return (
    <div className={styles.noticeStack}>
      {persistenceNotice === 'unavailable' ? (
        <p className={styles.statusNotice} role="status">
          This session will work, but progress cannot be saved on this device.
        </p>
      ) : null}
      {persistenceNotice === 'recovered' ? (
        <p className={styles.statusNotice} role="status">
          Saved progress was unreadable, so Move Daily started fresh.
        </p>
      ) : null}
      {offlineReady && canShowActions ? (
        <OfflineReadyNotice onDismiss={onDismissOffline} />
      ) : null}
      {onApplyUpdate !== null ? (
        route.name === 'player' ? (
          <p className={styles.statusNotice} role="status">
            Update ready — apply after this session.
          </p>
        ) : canShowActions ? (
          <aside aria-label="App update" className={styles.actionNotice}>
            <p role="status">Update ready.</p>
            <button onClick={() => void onApplyUpdate()} type="button">
              Apply update
            </button>
          </aside>
        ) : null
      ) : null}
    </div>
  );
}
