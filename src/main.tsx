import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { boot } from './app/boot';
import { setStore } from './app/hooks';
import { createLocalStorageRepository } from './storage/localStorageRepository';
import { StorageError } from './storage/errors';
import { requestPersistence } from './storage/persist';
import { App } from './ui/App';
import { LoadErrorScreen } from './ui/LoadErrorScreen';
import './ui/styles/tokens.css';
import './ui/styles/global.css';

registerSW({ immediate: true });
void requestPersistence();

async function start() {
  const root = createRoot(document.getElementById('root')!);
  let result;
  try {
    result = await boot(createLocalStorageRepository());
  } catch (error) {
    // Хранилище недоступно совсем (например, запрещено браузером).
    const storageError =
      error instanceof StorageError
        ? error
        : new StorageError('unavailable', 'Хранилище браузера недоступно.', { cause: error });
    result = { status: 'failed', error: storageError, raw: undefined } as const;
  }
  if (result.status === 'ready') setStore(result.store);
  root.render(
    <StrictMode>
      {result.status === 'ready' ? (
        <App />
      ) : (
        <LoadErrorScreen error={result.error} raw={result.raw} />
      )}
    </StrictMode>,
  );
}

void start();
