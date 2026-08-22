import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/atkinson-hyperlegible-next';
import '@fontsource-variable/bricolage-grotesque';
import { App } from './app/App';
import { createPlatformBridge } from './app/platformBridge';
import { createCoachAudio } from './platform/audio/coachAudio';
import { createWakeLockController } from './platform/lifecycle/wakeLock';
import './styles/tokens.css';
import './styles/global.css';
import './styles/utilities.css';

const platform = createPlatformBridge();
platform.start();
const runtime = {
  audio: createCoachAudio(),
  wakeLock: createWakeLockController(),
  platform,
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App runtime={runtime} />
  </StrictMode>,
);
