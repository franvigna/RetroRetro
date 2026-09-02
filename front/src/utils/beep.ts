// Beep corto generado con Web Audio API (tono 8-bit, sin archivo de audio
// externo — regla de "todo original" del proyecto, ver CLAUDE.md). Usado por
// TimerFinishedBanner y SpeakerRotationWarning como alarma de aviso.
let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  // webkitAudioContext: prefijo histórico de Safari, no está en lib.dom.
  const AudioContextClass =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedContext) {
    sharedContext = new AudioContextClass();
  }
  return sharedContext;
}

export function playBeep({ frequency = 880, durationMs = 220 }: { frequency?: number; durationMs?: number } = {}): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.08;

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  oscillator.start(now);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  oscillator.stop(now + durationMs / 1000);
}
