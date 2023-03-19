import MusicalScale from "https://unpkg.com/musical-scale@1.0.4/index.js";
import NoteToFrequency from "./NoteToFrequency.js";

const noteToFrequency = new NoteToFrequency();
const scale = new MusicalScale({ root: "G", mode: "locrian" });

export default class Sound {
  constructor() {
    this.ctx = new AudioContext();
    const mainOutputGainNode = this.ctx.createGain();
    mainOutputGainNode.connect(this.ctx.destination);
    mainOutputGainNode.gain.setValueAtTime(0.95, this.ctx.currentTime);

    this.bandPassFilterNode = this.ctx.createBiquadFilter();
    this.bandPassFilterNode.type = "bandpass";
    this.bandPassFilterNode.frequency.value = 1000;
    this.bandPassFilterNode.Q.value = 0.1;

    this.bandPassFilterNode.connect(mainOutputGainNode);

    this.mainNode = this.bandPassFilterNode;
    this.mainNode.connect(mainOutputGainNode);

    this.initializeOscillators();

    this.i = 0;
  }

  tick(x, y) {
    const order = [0, 1, 2, 3, 4, 5, 6];
    const interval = scale.intervals[order[Math.floor(Math.max(0, x) * 7)]];
    if (!this.interval || interval.notation !== this.interval.notation) {
      if (
        this.intervalChangeThreshold === undefined ||
        this.intervalChangeThreshold > 20
      ) {
        this.interval = interval;
        this.updateOscillators();
        this.intervalChangeThreshold = 0;
        // console.log("CHANGE TO", interval.notation);
      } else {
        this.intervalChangeThreshold++;
      }
    }
    this.tickFilter(x, y);
    this.i++;
  }

  initializeOscillators() {
    this.oscillators = [];
    for (let i = 1; i < 4; i++) {
      const type = "triangle";
      for (let j = 0; j < 3; j++) {
        const oscillator = this.ctx.createOscillator();
        oscillator.type = type;
        this.oscillators.push(oscillator);
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(this.mainNode);
      }
    }
  }

  updateOscillators() {
    this.oscillators.forEach((oscillator, i) => {
      const baseOctave = Math.floor(i / 3) + 2;
      const { notation, octave } = this.interval.notes[i % 3];
      const frequency = noteToFrequency.get(
        `${notation}${baseOctave + octave}`
      );
      if (this.i === 0) {
        oscillator.frequency.value = frequency;
        oscillator.start(this.ctx.currentTime);
      } else {
        oscillator.frequency.exponentialRampToValueAtTime(
          frequency,
          this.ctx.currentTime + 1.5
        );
      }
    });
  }

  tickFilter(x, y) {
    if (this.i % 10 === 0) {
      this.bandPassFilterNode.frequency.linearRampToValueAtTime(
        Math.pow(1 - y, 2) * 12000 + 100,
        this.ctx.currentTime + 0.1
      );
      this.bandPassFilterNode.Q.linearRampToValueAtTime(
        Math.abs(y - 0.5),
        this.ctx.currentTime + 0.1
      );
    }
  }
}
