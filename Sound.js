import MusicalScale from "https://unpkg.com/musical-scale@1.0.4/index.js";
import NoteToFrequency from "./NoteToFrequency.js";

const noteToFrequency = new NoteToFrequency();
const scale = new MusicalScale({ root: "A", mode: "locrian" });

export default class Sound {
  constructor() {
    this.ctx = new AudioContext();
    const mainOutputGainNode = this.ctx.createGain();
    mainOutputGainNode.connect(this.ctx.destination);
    mainOutputGainNode.gain.setValueAtTime(0.75, this.ctx.currentTime);

    const delayGainNode = this.ctx.createGain();
    delayGainNode.gain.setValueAtTime(0.25, this.ctx.currentTime);

    const delayNode = this.ctx.createDelay();
    delayNode.delayTime.value = 0.3; // Set delay time in seconds

    const delayHighPassFilterNode = this.ctx.createBiquadFilter();
    delayHighPassFilterNode.type = "highpass";
    delayHighPassFilterNode.frequency.value = 1400;

    this.bandPassFilterNode = this.ctx.createBiquadFilter();
    this.bandPassFilterNode.type = "bandpass";
    this.bandPassFilterNode.frequency.value = 1000;
    this.bandPassFilterNode.Q.value = 0.1;

    this.bandPassFilterNode.connect(mainOutputGainNode);

    this.mainNode = this.bandPassFilterNode;
    this.mainNode.connect(delayNode);
    delayNode.connect(delayGainNode);
    delayGainNode.connect(delayHighPassFilterNode);
    delayHighPassFilterNode.connect(mainOutputGainNode);

    this.i = 0;
    this.initNoise();
  }

  async initNoise() {
    // Register the AudioWorkletProcessor
    await this.ctx.audioWorklet.addModule("./white-noise-processor.js");

    // lowpass node for noise
    const lowPassFilterNode = this.ctx.createBiquadFilter();
    lowPassFilterNode.type = "lowpass";
    lowPassFilterNode.frequency.value = 12000; // Set your

    // Create an AudioWorkletNode
    const whiteNoiseNode = new AudioWorkletNode(
      this.ctx,
      "white-noise-processor"
    );

    // Create a GainNode to control the volume
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0.00625;

    // Connect the white noise node to the gain node, and the gain node to the audio output
    whiteNoiseNode.connect(lowPassFilterNode);
    lowPassFilterNode.connect(gainNode);
    // gainNode.connect(this.mainNode);
  }

  tick(x, y) {
    this.interval = scale.intervals[Math.floor(Math.max(0, x) * 7)];
    this.tickFilter(x, y);
    this.tickBass();
    this.tickSynth();
    this.tickTwinkles();
    this.i++;
  }

  tickFilter(x, y) {
    if (this.i % 10 === 0) {
      this.bandPassFilterNode.frequency.linearRampToValueAtTime(
        Math.pow(1 - y, 2) * 16000 + 100,
        this.ctx.currentTime + 0.1
      );
      this.bandPassFilterNode.Q.linearRampToValueAtTime(
        Math.abs(y - 0.5) * 2,
        this.ctx.currentTime + 0.1
      );
    }
  }

  tickBass() {
    if (Math.random() < 0.9 || this.playingBass) {
      return;
    }
    this.playingBass = true;
    const index = Math.floor(Math.random() * 3);
    const { notation, octave } = this.interval.notes[index];
    const note = notation + (1 + octave);
    this.playSound({
      attack: 0.2,
      release: 0.2,
      note,
      level: 0.4,
      length: Math.random() * 4 + 0.5,
      type: "triangle",
      onEnd: () => (this.playingBass = false),
    });
  }

  tickSynth() {
    if (Math.random() < 0.9 || this.playingSynth) {
      return;
    }
    this.playingSynth = true;
    const index = Math.floor(Math.random() * 3);
    const n1 = this.interval.notes[index];
    const n2 = this.interval.notes[(index + 2) % 3];
    const n3 = this.interval.notes[(index + 1) % 3];
    const note1 = n1.notation + (3 + n1.octave);
    const note2 = n2.notation + (4 + n2.octave);
    const note3 = n3.notation + (4 + n3.octave);
    const args = {
      attack: 0.2,
      release: 0.2,
      level: 0.05,
      length: Math.random() * 3 + 0.125,
      type: "sawtooth",
      onEnd: () => (this.playingSynth = false),
    };
    this.playSound({ ...args, note: note1 });
    if (note2) this.playSound({ ...args, note: note2 });
    if (Math.random() > 0.5) this.playSound({ ...args, note: note3 });
  }

  tickTwinkles() {
    if (Math.random() < 0.8 || this.playingTwinkles) {
      return;
    }
    this.playingTwinkles = true;
    this.twinkleIndex =
      this.twinkleIndex === undefined ? 0 : this.twinkleIndex + 1;
    const index = 2 - (this.twinkleIndex % 3);
    const { notation, octave } = this.interval.notes[index];
    const note = notation + (6 + octave);
    this.playSound({
      note,
      level: 0.04,
      length: Math.random() * 0.2 + 0.05,
      type: "sine",
      onEnd: () => (this.playingTwinkles = false),
    });
  }

  playSound({
    note,
    length, // in seconds
    level = 0.1, // level 0 - 1
    attack = 0.01, // in seconds
    sustain = 0.5, // level 0 - 1 (as multiple of level arg)
    decay = 0.02, // in seconds
    release = 0.1, // in seconds
    type = "sine", // oscillator type ('sine', 'square', 'sawtooth', or 'triangle')
    onEnd = () => {},
  }) {
    const frequency = noteToFrequency.get(note);
    // Create an oscillator
    const oscillator = this.ctx.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.ctx.currentTime);

    // Create a gain node
    const gainNode = this.ctx.createGain();

    // Set initial gain to 0
    gainNode.gain.setValueAtTime(0, this.ctx.currentTime);

    // Attack
    gainNode.gain.linearRampToValueAtTime(level, this.ctx.currentTime + attack);

    // Sustain and decay
    gainNode.gain.linearRampToValueAtTime(
      sustain * level,
      this.ctx.currentTime + attack + decay
    );

    // Release
    const releaseStartTime = this.ctx.currentTime + length;
    gainNode.gain.setValueAtTime(sustain * level, releaseStartTime);
    gainNode.gain.linearRampToValueAtTime(0, releaseStartTime + release);

    // Connect the oscillator to the gain node and the gain node to the output
    oscillator.connect(gainNode);
    gainNode.connect(this.mainNode);

    // Start the oscillator
    oscillator.start(this.ctx.currentTime);

    // Stop the oscillator after the specified length
    oscillator.stop(releaseStartTime + release);

    // Cleanup function to be called when the oscillator stops
    function onOscillatorEnded() {
      oscillator.removeEventListener("ended", onOscillatorEnded);
      oscillator.disconnect(gainNode);
      gainNode.disconnect(this.mainNode);
      onEnd();
    }

    // Add the event listener for the 'ended' event to call the cleanup function
    oscillator.addEventListener("ended", onOscillatorEnded);
  }
}
