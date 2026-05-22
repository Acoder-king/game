/**
 * QuizMaster Pro - Procedural Audio Synthesizer
 * Uses native Web Audio API to synthesize responsive KBC-style TV show sound effects.
 * 100% stable, offline-capable, and immune to network download lag.
 */

let audioCtx: AudioContext | null = null;
let suspenseOsc1: OscillatorNode | null = null;
let suspenseOsc2: OscillatorNode | null = null;
let suspenseGain: GainNode | null = null;
let isMuted = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const soundManager = {
  toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
      this.stopSuspense();
    }
    return isMuted;
  },

  getMuted() {
    return isMuted;
  },

  // Low, atmospheric synth drone to build extreme tension in the Hot Seat
  playSuspense() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (suspenseGain) return; // Already running

      suspenseGain = ctx.createGain();
      suspenseGain.gain.setValueAtTime(0, ctx.currentTime);
      suspenseGain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 2); // Slow rise

      // Low Base drone osc
      suspenseOsc1 = ctx.createOscillator();
      suspenseOsc1.type = 'sawtooth';
      suspenseOsc1.frequency.setValueAtTime(55, ctx.currentTime); // A1 note

      // Detuned chorus osc
      suspenseOsc2 = ctx.createOscillator();
      suspenseOsc2.type = 'triangle';
      suspenseOsc2.frequency.setValueAtTime(55.5, ctx.currentTime); // Slightly detuned

      // Low pass filter to make it mysterious and deep
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, ctx.currentTime);

      suspenseOsc1.connect(filter);
      suspenseOsc2.connect(filter);
      filter.connect(suspenseGain);
      suspenseGain.connect(ctx.destination);

      suspenseOsc1.start();
      suspenseOsc2.start();
    } catch (e) {
      console.warn('Procedural audio suspense initialization avoided:', e);
    }
  },

  stopSuspense() {
    try {
      if (suspenseGain && audioCtx) {
        const ctx = audioCtx;
        const gainNode = suspenseGain;
        const osc1 = suspenseOsc1;
        const osc2 = suspenseOsc2;

        gainNode.gain.cancelScheduledValues(ctx.currentTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1); // smooth fadeout

        setTimeout(() => {
          try {
            osc1?.stop();
            osc2?.stop();
          } catch(err){}
        }, 1100);

        suspenseOsc1 = null;
        suspenseOsc2 = null;
        suspenseGain = null;
      }
    } catch (e) {
      console.warn('Suspense cleanup error:', e);
    }
  },

  // Fast, sharp tension click on countdown heartbeat ticks
  playTick() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, ctx.currentTime); // Standard click pitch
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1); // Pitch drop for thud

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  },

  // Locked answer metallic clang sound effect
  playLock() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Heavy deep note representing major action
      const primaryOsc = ctx.createOscillator();
      const synthGain = ctx.createGain();
      primaryOsc.type = 'square';
      primaryOsc.frequency.setValueAtTime(110, now); // A2 note
      primaryOsc.frequency.exponentialRampToValueAtTime(45, now + 0.4);

      // High metal chime detune
      const metallicOsc = ctx.createOscillator();
      metallicOsc.type = 'sawtooth';
      metallicOsc.frequency.setValueAtTime(880, now);

      synthGain.gain.setValueAtTime(0.35, now);
      synthGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      primaryOsc.connect(synthGain);
      metallicOsc.connect(synthGain);
      synthGain.connect(ctx.destination);

      primaryOsc.start();
      metallicOsc.start();
      primaryOsc.stop(now + 0.5);
      metallicOsc.stop(now + 0.5);
    } catch (e) {}
  },

  // Escalating, grandiose bright major chord for a CORRECT answer!
  playCorrect() {
    if (isMuted) return;
    try {
      this.stopSuspense();
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const notes = [261.63, 329.63, 392.00, 523.25]; // C4 Major Chord (C, E, G, C)
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + (idx * 0.08)); // Stagger notes for harp effect
        osc.frequency.linearRampToValueAtTime(freq * 1.5, now + 0.8);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + (idx * 0.08) + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + (idx * 0.08));
        osc.stop(now + 1.3);
      });
    } catch (e) {}
  },

  // Deep, dramatic buzzing drop for a WRONG answer
  playWrong() {
    if (isMuted) return;
    try {
      this.stopSuspense();
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';

      osc1.frequency.setValueAtTime(120, now);
      osc1.frequency.linearRampToValueAtTime(60, now + 0.8); // Sliding deep buzz

      osc2.frequency.setValueAtTime(121.5, now); // Detune for organic grittiness
      osc2.frequency.linearRampToValueAtTime(61.5, now + 0.8);

      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(now + 1);
      osc2.stop(now + 1);
    } catch (e) {}
  },

  // Tech-synth swirling swoop for lifeline activation
  playLifeline() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(2400, now + 0.5); // Rapid laser sweep up

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(now + 0.6);
    } catch (e) {}
  },

  // Grand majestic fanfares on 1 Crore ultimate victory
  playCelebration() {
    if (isMuted) return;
    try {
      this.stopSuspense();
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Combine multiple harmonic frequencies for royal brass celebration
      const roots = [196.00, 246.94, 293.66, 392.00, 493.88]; // G major arpeggio
      roots.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + (idx * 0.1));

        // Vibrato
        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        vibrato.frequency.setValueAtTime(6, now); // 6Hz
        vibratoGain.gain.setValueAtTime(3, now); // pitch width

        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + (idx * 0.1) + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

        vibrato.start();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + (idx * 0.1));
        vibrato.stop(now + 2.6);
        osc.stop(now + 2.6);
      });
    } catch (e) {}
  }
};
