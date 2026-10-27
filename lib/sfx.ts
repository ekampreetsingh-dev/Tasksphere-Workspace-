"use client";

/**
 * Procedural UI sound. Everything is synthesised in WebAudio — no assets, so
 * the cues work offline, and the whole graph sits behind a compressor so
 * stacked cues stay quiet instead of clipping.
 */

export type SfxName =
  | "tap"
  | "nav"
  | "check"
  | "add"
  | "remove"
  | "claim"
  | "levelUp"
  | "start"
  | "pause"
  | "chime"
  | "hit"
  | "finish"
  | "error";

interface ToneOptions {
  freq: number;
  /** Seconds from now. */
  at?: number;
  dur?: number;
  gain?: number;
  type?: OscillatorType;
  glideTo?: number;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (ctx && master) {
      if (ctx.state === "suspended") void ctx.resume();
      return ctx;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    const shelf = ctx.createBiquadFilter();
    shelf.type = "lowpass";
    shelf.frequency.value = 7200;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 22;
    compressor.ratio.value = 9;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(shelf).connect(compressor).connect(ctx.destination);
    /* One slap-back: the same signal returns 62ms later at 18%, which is what
       lets a bell decay instead of stopping dead. Without the delay node this
       was just a louder shelf, not a tail. */
    const tail = ctx.createGain();
    tail.gain.value = 0.18;
    const slap = ctx.createDelay(0.2);
    slap.delayTime.value = 0.062;
    master.connect(tail).connect(slap).connect(shelf);
    return ctx;
  } catch {
    ctx = null;
    master = null;
    return null;
  }
}

function tone({ freq, at = 0, dur = 0.12, gain = 0.1, type = "triangle", glideTo }: ToneOptions): void {
  if (!ctx || !master) return;
  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const envelope = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(envelope).connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.04);
}

/** Short filtered noise hit, used for clicks and page transitions. */
function air(at = 0, dur = 0.1, gain = 0.06, from = 900, to = 1800): void {
  if (!ctx || !master) return;
  const start = ctx.currentTime + at;
  const length = Math.ceil(ctx.sampleRate * (dur + 0.05));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 0.9;
  band.frequency.setValueAtTime(from, start);
  band.frequency.exponentialRampToValueAtTime(to, start + dur);
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(gain, start);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  source.connect(band).connect(envelope).connect(master);
  source.start(start);
}

const CUES: Record<SfxName, () => void> = {
  tap: () => {
    air(0, 0.035, 0.05, 2400, 1200);
    tone({ freq: 180, dur: 0.05, gain: 0.045, type: "sine" });
  },
  /* Two-note upward pluck: completion, but understated. */
  check: () => {
    tone({ freq: 523.25, dur: 0.14, gain: 0.1, type: "triangle" });
    tone({ freq: 784, at: 0.07, dur: 0.2, gain: 0.085, type: "triangle" });
  },
  /* Soft upward sweep for view changes — reads as "turning a page". */
  nav: () => {
    air(0, 0.13, 0.045, 700, 2100);
    tone({ freq: 329.63, dur: 0.11, gain: 0.04, type: "sine", glideTo: 493.88 });
  },
  add: () => {
    tone({ freq: 392, dur: 0.09, gain: 0.075, type: "sine", glideTo: 523.25 });
  },
  remove: () => {
    tone({ freq: 392, dur: 0.16, gain: 0.06, type: "sine", glideTo: 246.94 });
  },
  claim: () => {
    [523.25, 659.25, 783.99].forEach((freq, index) =>
      tone({ freq, at: index * 0.06, dur: 0.3, gain: 0.075, type: "sine" }),
    );
  },
  levelUp: () => {
    [523.25, 587.33, 659.25, 783.99, 880].forEach((freq, index) =>
      tone({ freq, at: index * 0.075, dur: 0.42, gain: 0.07, type: "triangle" }),
    );
    air(0.1, 0.5, 0.03, 3200, 6400);
  },
  start: () => {
    tone({ freq: 329.63, dur: 0.1, gain: 0.06, type: "sine" });
    tone({ freq: 440, at: 0.05, dur: 0.16, gain: 0.05, type: "sine" });
  },
  /* The mirror of start: two descending pips, so holding a session sounds
     different from ending one and different from a plain click. */
  pause: () => {
    tone({ freq: 440, dur: 0.09, gain: 0.05, type: "sine" });
    tone({ freq: 329.63, at: 0.06, dur: 0.15, gain: 0.045, type: "sine" });
  },
  chime: () => {
    tone({ freq: 880, dur: 0.5, gain: 0.05, type: "sine" });
    tone({ freq: 1174.66, at: 0.05, dur: 0.6, gain: 0.03, type: "sine" });
  },
  /* Mallet thud for the dragon taking damage. */
  hit: () => {
    tone({ freq: 196, dur: 0.16, gain: 0.09, type: "sine", glideTo: 98 });
    air(0, 0.09, 0.05, 1600, 400);
  },
  finish: () => {
    tone({ freq: 440, dur: 0.8, gain: 0.085, type: "sine" });
    tone({ freq: 659.25, at: 0.12, dur: 0.9, gain: 0.06, type: "sine" });
    tone({ freq: 880, at: 0.26, dur: 1.1, gain: 0.045, type: "sine" });
  },
  error: () => {
    tone({ freq: 233.08, dur: 0.18, gain: 0.055, type: "sine" });
    tone({ freq: 207.65, at: 0.09, dur: 0.26, gain: 0.05, type: "sine" });
  },
};

export function primeSfx(): void {
  /* Browsers only allow a context once a gesture has happened. */
  audio();
}

export function playSfx(name: SfxName, enabled: boolean, volume: number): void {
  if (!enabled || volume <= 0) return;
  const context = audio();
  if (!context || !master) return;
  master.gain.setTargetAtTime(Math.min(0.6, Math.max(0.0001, volume * 0.55)), context.currentTime, 0.02);
  try {
    CUES[name]();
  } catch {
    /* the graph refused to start; the app stays usable */
  }
}
