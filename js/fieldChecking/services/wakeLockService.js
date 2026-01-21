const WAKE_LOCK_TYPE = 'screen';

export function createWakeLockService() {
  let wakeLock = null;
  let isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  async function request() {
    if (!isSupported) {
      return null;
    }

    try {
      wakeLock = await navigator.wakeLock.request(WAKE_LOCK_TYPE);
      return wakeLock;
    } catch (error) {
      console.error(`${error.name}, ${error.message}`);
      isSupported = false;
      return null;
    }
  }

  async function release() {
    if (wakeLock) {
      try {
        await wakeLock.release();
      } catch (error) {
        console.error(`${error.name}, ${error.message}`);
      } finally {
        wakeLock = null;
      }
    }
  }

  async function handleVisibilityChange() {
    if (!isSupported) {
      return;
    }

    if (document.visibilityState === 'visible') {
      await request();
    } else if (document.visibilityState === 'hidden') {
      await release();
    }
  }

  function bindLifecycleEvents() {
    if (!isSupported) {
      return;
    }

    window.addEventListener('unload', () => {
      release();
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  return {
    request,
    release,
    bindLifecycleEvents
  };
}

