// Pure Web Audio API micro-sound synthesis (Zero dependencies)

let audioCtx: AudioContext | null = null;
let audioEnabled = true;

export const setAudioEnabled = (enabled: boolean) => {
  audioEnabled = enabled;
};

export const isAudioEnabled = () => audioEnabled;

export const playClick = () => {
  if (!audioEnabled || typeof window === "undefined") return;
  
  if (!audioCtx) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const t = audioCtx.currentTime;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  // 12ms soft sine click at 440Hz -> 880Hz
  osc.type = "sine";
  osc.frequency.setValueAtTime(440, t);
  osc.frequency.exponentialRampToValueAtTime(880, t + 0.012);
  
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.012, t + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start(t);
  osc.stop(t + 0.012);
};
