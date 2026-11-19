/**
 * End-of-session signals: three beeps generated with Web Audio (no audio file)
 * and a system notification through the browser Notification API.
 */

let audioContext: AudioContext | null = null;

/**
 * Creates or resumes the audio context. Browsers only allow sound after a user
 * gesture, so this is called on the "Iniciar sessão" click and on any later
 * interaction with the page.
 */
export function primeAudio(): void {
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();
  } catch {
    // No Web Audio: the notification and the on-screen state still work.
  }
}

const BEEP_COUNT = 3;
const BEEP_SECONDS = 0.35;
const BEEP_INTERVAL_SECONDS = 0.55;

/** About 1.5 s: three short beeps. */
export function playSessionEndBeeps(): void {
  primeAudio();
  const context = audioContext;
  if (!context) return;

  const start = context.currentTime + 0.05;
  for (let index = 0; index < BEEP_COUNT; index += 1) {
    const from = start + index * BEEP_INTERVAL_SECONDS;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, from);
    gain.gain.exponentialRampToValueAtTime(0.25, from + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, from + BEEP_SECONDS);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(from);
    oscillator.stop(from + BEEP_SECONDS);
  }
}

export type NotificationState = NotificationPermission | "unsupported";

export function notificationState(): NotificationState {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
}

/** Asks for permission only while it is still undecided; must run inside a click handler. */
export async function requestNotificationPermission(): Promise<NotificationState> {
  if (notificationState() !== "default") return notificationState();
  try {
    return await Notification.requestPermission();
  } catch {
    return notificationState();
  }
}

export function notifySessionEnd(options: { sessionId: string; kicker: string; onClick: () => void }): void {
  if (notificationState() !== "granted") return;
  try {
    const notification = new Notification("Sessão concluída", {
      body: `${options.kicker}: escreva seu resumo com suas palavras.`,
      tag: options.sessionId,
      requireInteraction: true,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
      options.onClick();
    };
  } catch {
    // Some browsers only allow notifications from a service worker; the sound already played.
  }
}
