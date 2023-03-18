import MusicalScale from "https://unpkg.com/musical-scale@1.0.4/index.js";
import NoteToFrequency from "./NoteToFrequency.js";
import Particles from "./Particles.js";

const canvas = document.querySelector("canvas");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

const particles = new Particles(canvas);

let audioContext;
let mainNode;
let x = 0;
let y = 0;
const scale = new MusicalScale({ root: "C", mode: "ionian" });
const noteToFrequency = new NoteToFrequency();

canvas.addEventListener("click", onCanvasTap);
console.log(scale);

function onCanvasTap(event) {
  if (!audioContext) {
    audioContext = new AudioContext();
    mainNode = audioContext.createGain();
    mainNode.connect(audioContext.destination);
    mainNode.gain.setValueAtTime(0.75, audioContext.currentTime);
    tick();
  }
  x = event.clientX / window.innerWidth;
  y = event.clientY / window.innerHeight;
}

function tick(timestamp) {
  requestAnimationFrame(tick);
  particles.drawParticles(x, y, 0.1, [1, 0, 0, 1]);

  const interval = scale.intervals[Math.floor(x * 7)];
  if (Math.random() > 0.9) {
    const note = interval.notes[Math.floor(Math.random() * 3)].notation + "5";
    playSound({ note, length: Math.random() * 0.5 + 0.1, type: "sawtooth" });
  }
  if (Math.random() > 0.99) {
    const note = interval.notes[Math.floor(Math.random() * 3)].notation + "3";
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
  gainNode.connect(audioContext.destination);

  // Start the oscillator
  oscillator.start(audioContext.currentTime);

  // Stop the oscillator after the specified length
  oscillator.stop(releaseStartTime + release);

  // Cleanup function to be called when the oscillator stops
  function onOscillatorEnded() {
    oscillator.removeEventListener("ended", onOscillatorEnded);
    oscillator.disconnect(gainNode);
    gainNode.disconnect(audioContext.destination);
  }

  // Add the event listener for the 'ended' event to call the cleanup function
  oscillator.addEventListener("ended", onOscillatorEnded);
}
