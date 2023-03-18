export default class NoteToFrequency {
  constructor() {
    this.memo = {};
  }

  get(note) {
    if (this.memo[note]) return this.memo[note];

    const noteFrequencyMapping = {
      C: -9,
      "C#": -8,
      D: -7,
      "D#": -6,
      E: -5,
      F: -4,
      "F#": -3,
      G: -2,
      "G#": -1,
      A: 0,
      "A#": 1,
      B: 2,
    };

    const octave = parseInt(note.slice(-1));
    const noteName = note.slice(0, -1);
    if (!noteFrequencyMapping.hasOwnProperty(noteName)) {
      throw new Error("Invalid note name: " + noteName);
    }
    // Calculate the half steps from A4 (440Hz)
    const halfStepsFromA4 = 12 * (octave - 4) + noteFrequencyMapping[noteName];

    // Calculate the frequency using the formula: 440Hz * 2^(n/12), where n is the number of half steps from A4
    const frequency = 440 * Math.pow(2, halfStepsFromA4 / 12);

    // Save this value so we don't need to recalculate later
    this.memo[note] = frequency;
    return frequency;
  }
}
