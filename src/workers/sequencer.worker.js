let timer = null;
let interval = 125; // ms per step (default 120bpm, 16th notes)

self.onmessage = (e) => {
  const { type, bpm } = e.data;
  switch (type) {
    case 'start':
      interval = 60000 / (bpm || 120) / 4;
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        self.postMessage({ type: 'tick' });
      }, interval);
      self.postMessage({ type: 'tick' });
      break;
    case 'stop':
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      break;
    case 'setBpm':
      interval = 60000 / (bpm || 120) / 4;
      if (timer) {
        clearInterval(timer);
        timer = setInterval(() => {
          self.postMessage({ type: 'tick' });
        }, interval);
      }
      break;
  }
};
