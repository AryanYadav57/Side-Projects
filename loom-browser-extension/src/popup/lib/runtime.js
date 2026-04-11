export function sendRuntimeMessage(message, options = {}) {
  const timeoutMs = Math.max(500, Number(options.timeoutMs || 5000));

  return new Promise((resolve) => {
    let completed = false;

    const finish = (value) => {
      if (completed) return;
      completed = true;
      resolve(value);
    };

    const timeoutId = setTimeout(() => {
      finish(null);
    }, timeoutMs);

    try {
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeoutId);
        if (chrome.runtime.lastError) {
          finish(null);
          return;
        }
        finish(response || null);
      });
    } catch {
      clearTimeout(timeoutId);
      finish(null);
    }
  });
}
