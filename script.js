const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const chromatic = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const major = [0, 2, 4, 5, 7, 9, 11];
const natMinor = [0, 2, 3, 5, 7, 8, 10];
const harmMinor = [0, 2, 3, 5, 7, 8, 11];
const melMinor = [0, 2, 3, 5, 7, 9, 11]; // up, and then natMinor down.

const modes = [
    {displayName: "Chromatic", scaleUp: chromatic, scaleDown: chromatic},
    {displayName: "Major", scaleUp: major, scaleDown: major},
    {displayName: "Natural Minor", scaleUp: natMinor, scaleDown: natMinor},
    {displayName: "Harmonic Minor", scaleUp: harmMinor, scaleDown: harmMinor},
    {displayName: "Melodic Minor", scaleUp: melMinor, scaleDown: natMinor}
];
const accidentals = [
    {displayName: "Natural", change: 0},
    {displayName: "Sharp", change: 1},
    {displayName: "Flat", change: -1}
];
const directions = [
    {displayName: "Up", id: "up"},
    {displayName: "Up And Down", id: "both"},
    {displayName: "Down", id: "down"}
];
// UI Code
function createListeners() {
    // Key List
    const keyListElement = document.getElementById("key-list");
    let selectedKey = 0;
    for (let i = 0; i < major.length; i++) {
        let noteElement = document.createElement("div");
        noteElement.classList.add("select-option")
        noteElement.textContent = notes[major[i]];
        noteElement.addEventListener("click", () => {
            keyListElement.childNodes.forEach(x => x.classList.remove("selected"));
            noteElement.classList.add("selected");
            selectedKey = major[i];
        })
        keyListElement.append(noteElement);
    }
    keyListElement.childNodes[0].classList.add("selected");
    const octaveElement = document.getElementById("key-oct");
    // Accidental button
    const accidentalElement = document.getElementById("key-accident");
    let selectedAccidental = 0;
    accidentalElement.addEventListener("click", () => {
        accidentalElement.classList.remove("accent-green");
        accidentalElement.classList.remove("accent-orange");
        selectedAccidental = (selectedAccidental + 1) % accidentals.length;
        if (selectedAccidental == 1)
            accidentalElement.classList.add("accent-green");
        if (selectedAccidental == 2)
            accidentalElement.classList.add("accent-orange");
        accidentalElement.textContent = accidentals[selectedAccidental].displayName;
    })

    // Mode selection 
    const modeListElement = document.getElementById("mode-list");
    let selectedMode = modes[1];
    for (let mode of modes) {
        let modeElement = document.createElement("div");
        modeElement.classList.add("select-option")
        modeElement.textContent = mode.displayName;
        modeElement.addEventListener("click", () => {
            modeListElement.childNodes.forEach(x => x.classList.remove("selected"));
            modeElement.classList.add("selected");
            selectedMode = mode;
        })
        modeListElement.append(modeElement);
    }
    modeListElement.childNodes[1].classList.add("selected");
    
    // Direction selection
    const directionElement = document.getElementById("direction");
    let selectedDirection = 0;
    directionElement.addEventListener("click", () => {
        directionElement.classList.remove("accent-green");
        directionElement.classList.remove("accent-orange");
        selectedDirection = (selectedDirection + 1) % directions.length;
        if (selectedDirection == 1)
            directionElement.classList.add("accent-green");
        if (selectedDirection == 2)
            directionElement.classList.add("accent-orange");
        directionElement.textContent = directions[selectedDirection].displayName;
    })
    // Text fields
    const bpmElement = document.getElementById("bpm");
    const lengthElement = document.getElementById("octs");

    // Set up Audio context
    const audio = new AudioContext({latencyHint: "balanced"});

    // Set basic overtones (of course, the higher ones should decrease faster over time)
    //const overtones = Float32Array.from([0, 1, 0.6, 0.6, 0.7, 0.5, 0.2, 0.5, 0.1]);
    const overtones = Float32Array.from([0, 0.5, 0.75, 1, 0.65, 0.6, 0.35, 0.6, 0.7, 0.6, 0.45, 0.52, 0.7, 0.55, 0.51]);
    const sines = new Float32Array(overtones.length); // zeros
    const synth = audio.createPeriodicWave(overtones, sines);
    // Create waveshaper
    const shaper_samples = Math.pow(2, 15);
    const curve = new Float32Array(shaper_samples);
    // Sigmoid shaper curve
    const k = 10;
    const deg = Math.PI / 180;
    for (let i = 0; i < shaper_samples; i++) {
        let input = i * 2 / shaper_samples - 1;
        curve[i] = ( 3 + k ) * input * 20 * deg / ( Math.PI + k * Math.abs(input) );
    }
    const shaper = audio.createWaveShaper();
    shaper.curve = curve;
    shaper.oversample = '2x';
    // Create a gain node
    const gain = audio.createGain();
    // Create lowpass filter node
    const lp = audio.createBiquadFilter();
    lp.type = "lowpass";
    // Connect shaper -> lp -> gain -> output
    shaper.connect(lp);
    lp.connect(gain);
    gain.connect(audio.destination);
    // Get a handle to the gain and lp freq
    const gainParam = gain.gain;
    const lpFreqParam = lp.frequency;
    const lpQParam = lp.Q;

    let lastOsc;
    const playElement = document.getElementById("play-btn");
    playElement.addEventListener("click", () => {
        // Create the scale
        
        function getFreq(octave, semitones_in_scale) {
            // We're going to compute how many semitones off from A4 this is.
            // First, we compute how many semitones off from A4 the root note is.
            let root = selectedKey - 9; // A is the 9th note if we're starting at C
            let root_semis = root + 
                accidentals[selectedAccidental].change + 
                12 * (octaveElement.valueAsNumber - 4);
            let total_semis = root_semis +
                semitones_in_scale + 
                12 * octave;
            return 440 * Math.pow(2, total_semis/12);
        };
        let ups = [];
        let downs = [];
        let dir = directions[selectedDirection].id;
        if (selectedMode.scaleUp.length != selectedMode.scaleDown.length)
            console.error("Up and down scales can't be different lengths. easy to fix but seems useless")
        for (let octave = 0; octave < lengthElement.valueAsNumber; ++octave) {
            for (let note = 0; note < selectedMode.scaleUp.length; note++) {
                if (dir == "up" || dir == "both")
                    ups.push(getFreq(octave, selectedMode.scaleUp[note]));
                
                if (dir == "down" || dir == "both")
                    downs.unshift(getFreq(octave, selectedMode.scaleDown[note]));
                
            }
        }
        // Add top (bottom) note
        let top = getFreq(lengthElement.valueAsNumber, 0);
        ups.push(top);

        let scale = ups.concat(downs);
        console.log(scale);

        let bpm = bpmElement.valueAsNumber;
        let note_duration = 60 / bpm;
        let ramp = Math.max(note_duration/20, 0.05);
        
        // Kill the old oscillator
        if (lastOsc) {
            lastOsc.stop();
            lastOsc.disconnect(shaper);
        }
        gainParam.cancelScheduledValues(0);
        // Create a new oscillator
        let osc = audio.createOscillator();
        osc.setPeriodicWave(synth);
        osc.connect(shaper);

        let freqParam = osc.frequency;
        // Queue up the scale
        const startTime = audio.currentTime;
        for (let t = 0; t < scale.length; t++) {
            let onset = startTime + note_duration * t;
            freqParam.setValueAtTime(scale[t], onset);
            lpFreqParam.setValueAtTime(scale[t]*8, onset);
            lpFreqParam.exponentialRampToValueAtTime(scale[t]*5, onset+note_duration*0.7);
            lpQParam.setValueAtTime(2, onset);
            lpQParam.exponentialRampToValueAtTime(0.5, onset + note_duration * 0.8);
            gainParam.setValueAtTime(0.1, onset);
            gainParam.linearRampToValueAtTime(1, onset + ramp);
            gainParam.exponentialRampToValueAtTime(0.4, onset + note_duration * 0.9);
        }
        // Trail off last note
        gainParam.linearRampToValueAtTime(0.0, startTime + note_duration * (scale.length+0.5));
        // Play the scale
        lastOsc = osc;
        osc.start();
    });
}

if (document.readyState === "complete" ||
   (document.readyState !== "loading" && !document.documentElement.doScroll) ) {
    createListeners();
} else {
    document.addEventListener("DOMContentLoaded", createListeners);
}