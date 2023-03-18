import MusicalScale from "https://unpkg.com/musical-scale@1.0.4/index.js";
import NoteToFrequency from "./NoteToFrequency.js";
import Particles from "./Particles.js?Asdf";

const canvas = document.querySelector("canvas");
canvas.addEventListener("dragstart", (e) => e.preventDefault());

const particles = new Particles(canvas);

let audioContext;
let mainNode;
let x = 0;
let y = 0;
let i = 0;
const scale = new MusicalScale({ root: "A", mode: "locrian" });
const noteToFrequency = new NoteToFrequency();

document.body.addEventListener("click", onCanvasTap);
console.log(scale);

function onCanvasTap(event) {
  if (!audioContext) {
    document.querySelector("h1").remove();
    document.body.style.cursor = "crosshair";
    audioContext = new AudioContext();
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.setValueAtTime(0.75, audioContext.currentTime);

    const delayGainNode = audioContext.createGain();
    delayGainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
    const delayNode = audioContext.createDelay();
    delayNode.delayTime.value = 0.3; // Set delay time in seconds
    const hiPassFilterNode = audioContext.createBiquadFilter();
    hiPassFilterNode.type = "highpass";
    hiPassFilterNode.frequency.value = 1400; // Set your

    const lowPassFilterNode = audioContext.createBiquadFilter();
    lowPassFilterNode.type = "lowpass";
    lowPassFilterNode.frequency.value = 1000; // Set your

    lowPassFilterNode.connect(delayNode);
    lowPassFilterNode.connect(gainNode);
    delayNode.connect(delayGainNode);
    delayGainNode.connect(hiPassFilterNode);
    hiPassFilterNode.connect(gainNode);

    mainNode = lowPassFilterNode;
    tick();
    document.body.addEventListener("touchmove", (e) => {
      x = e.touches[0].clientX / window.innerWidth;
      y = e.touches[0].clientY / window.innerHeight;
    });
    document.body.addEventListener("mousemove", (e) => {
      x = e.clientX / window.innerWidth;
      y = e.clientY / window.innerHeight;
    });
  }
  x = event.clientX / window.innerWidth;
  y = event.clientY / window.innerHeight;
}

function tick() {
  requestAnimationFrame(tick);
  particles.drawParticles(
    x * canvas.width,
    y * canvas.height,
    (1 - y) * 8 + 0.5
  );
  if (i % 10 === 0) {
    mainNode.frequency.linearRampToValueAtTime(
      Math.pow(1 - y, 2) * 20000 + 50,
      audioContext.currentTime + 0.1
    );
  }
  i++;

  const interval = scale.intervals[Math.floor(Math.max(0, x) * 7)];
  if (Math.random() > 0.9) {
    const { notation, octave } = interval.notes[Math.floor(Math.random() * 3)];
    const note = notation + (5 + octave);
    playSound({ note, length: Math.random() * 0.5 + 0.1, type: "sawtooth" });
  }
  if (Math.random() > 0.97) {
    const { notation, octave } = interval.notes[Math.floor(Math.random() * 3)];
    const note = notation + (6 + octave);
    playSound({
      note,
      level: 0.02,
      length: Math.random() * 0.2 + 0.1,
      type: "square",
    });
  }
  if (Math.random() > 0.99) {
    const { notation, octave } = interval.notes[Math.floor(Math.random() * 3)];
    const note = notation + (2 + octave);
    playSound({ note, length: 1.5, level: 0.2, type: "triangle" });
  }
}

function playSound({
  note,
  length, // in seconds
  level = 0.1, // level 0 - 1
  attack = 0.01, // in seconds
  sustain = 0.5, // level 0 - 1 (as multiple of level arg)
  decay = 0.02, // in seconds
  release = 0.1, // in seconds
  oscillatorType = "sine", // oscillator type ('sine', 'square', 'sawtooth', or 'triangle')
}) {
  const frequency = noteToFrequency.get(note);
  // Create an oscillator
  const oscillator = audioContext.createOscillator();
  oscillator.type = oscillatorType;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

  // Create a gain node
  const gainNode = audioContext.createGain();

  // Set initial gain to 0
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);

  // Attack
  gainNode.gain.linearRampToValueAtTime(
    level,
    audioContext.currentTime + attack
  );

  // Sustain and decay
  gainNode.gain.linearRampToValueAtTime(
    sustain * level,
    audioContext.currentTime + attack + decay
  );

  // Release
  const releaseStartTime = audioContext.currentTime + length;
  gainNode.gain.setValueAtTime(sustain * level, releaseStartTime);
  gainNode.gain.linearRampToValueAtTime(0, releaseStartTime + release);

  // Connect the oscillator to the gain node and the gain node to the output
  oscillator.connect(gainNode);
  gainNode.connect(mainNode);

  // Start the oscillator
  oscillator.start(audioContext.currentTime);

  // Stop the oscillator after the specified length
  oscillator.stop(releaseStartTime + release);

  // Cleanup function to be called when the oscillator stops
  function onOscillatorEnded() {
    oscillator.removeEventListener("ended", onOscillatorEnded);
    oscillator.disconnect(gainNode);
    gainNode.disconnect(mainNode);
  }

  // Add the event listener for the 'ended' event to call the cleanup function
  oscillator.addEventListener("ended", onOscillatorEnded);
}
