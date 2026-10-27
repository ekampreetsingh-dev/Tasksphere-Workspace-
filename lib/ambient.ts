/* Procedural ambient bed, ported from the shipped sound engine.
   Synthesised in WebAudio so there are no audio assets to fetch offline. */

export type AmbientKind = "off" | "white" | "rain" | "lofi";

const AMBIENT_KINDS: AmbientKind[] = ["off", "white", "rain", "lofi"];

export function isAmbientKind(value: unknown): value is AmbientKind {
  return AMBIENT_KINDS.includes(value as AmbientKind);
}

interface Bed {
  ctx: AudioContext;
  stop: () => void;
}

let bed: Bed | null = null;

function makeNoise(
  ctx: AudioContext,
  type: "white" | "pink",
): AudioBufferSourceNode {
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (type === "pink") {
      last = 0.99 * last + 0.01 * white;
      data[i] = last * 3.2;
    } else {
      data[i] = white;
    }
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

export function setAmbient(kind: AmbientKind, volume: number): void {
  bed?.stop();
  bed = null;
  if (kind === "off" || volume <= 0) return;

  let ctx: AudioContext;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
  } catch {
    return;
  }

  const master = ctx.createGain();
  master.gain.value = Math.max(0.0001, volume * 0.28);
  master.connect(ctx.destination);

  const stops: (() => void)[] = [];

  if (kind === "white") {
    const noise = makeNoise(ctx, "white");
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2400;
    noise.connect(filter).connect(master);
    noise.start();
    stops.push(() => noise.stop());
  } else if (kind === "rain") {
    const noise = makeNoise(ctx, "pink");
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1100;
    band.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 320;
    lfo.connect(lfoGain).connect(band.frequency);
    noise.connect(band).connect(master);
    noise.start();
    lfo.start();
    stops.push(() => noise.stop(), () => lfo.stop());
  } else {
    /* lofi: a slow detuned triad under a pink wash */
    const wash = makeNoise(ctx, "pink");
    const washFilter = ctx.createBiquadFilter();
    washFilter.type = "lowpass";
    washFilter.frequency.value = 900;
    const washGain = ctx.createGain();
    washGain.gain.value = 0.5;
    wash.connect(washFilter).connect(washGain).connect(master);
    wash.start();
    stops.push(() => wash.stop());

    for (const freq of [146.83, 220, 293.66]) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 8;
      const gain = ctx.createGain();
      gain.gain.value = 0.055;
      osc.connect(gain).connect(master);
      osc.start();
      stops.push(() => osc.stop());
    }
  }

  void ctx.resume();
  bed = {
    ctx,
    stop: () => {
      for (const stop of stops) {
        try {
          stop();
        } catch {
          /* already stopped */
        }
      }
      void ctx.close();
    },
  };
}

export function stopAmbient(): void {
  bed?.stop();
  bed = null;
}
