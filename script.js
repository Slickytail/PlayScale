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
    {displayName: "Down", id: "down"},
    {displayName: "Both", id: "both"}
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
    // Loop selection
    const loopElement = document.getElementById("loop");
    let selectedLoop = false;
    loopElement.addEventListener("click", () => {
        loopElement.classList.toggle("accent-green");
        selectedLoop = !selectedLoop;

        loopElement.textContent = selectedLoop ? "Loop" : "Once";
    })
    // Leadin
    const delayElement = document.getElementById("leadin");
    let selectedDelay = false;
    delayElement.addEventListener("click", () => {
        delayElement.classList.toggle("accent-green");
        selectedDelay = !selectedDelay;

        delayElement.textContent = selectedDelay ? "Leadin" : "Immediate";
    })

    // Text fields
    const bpmElement = document.getElementById("bpm");
    bpmElement.addEventListener("change", () =>
        Tone.Transport.bpm.value = bpmElement.value
    );

    const lengthElement = document.getElementById("octs");
    const playElement = document.getElementById("play-btn");

    // Use Piano sounds!
    let samples_to_load = {};
    ["C", "A"].forEach(n => {
        for (let t = 1; t < 7; t++)
            samples_to_load[n + t] = n + t + ".mp3"
    });
    const sampler = new Tone.Sampler({
        urls: samples_to_load,
        release: 1,
        baseUrl: "https://tonejs.github.io/audio/salamander/",
    }).toDestination();

    // click for leadin
    const click = new Tone.NoiseSynth({
        volume: -15,
        envelope: {
            attack: 0.001,
            decay: 0.1,
            sustain: 0
        }
    }).toDestination();

    //==== Audio Stuff =====
    playElement.addEventListener("click", async () => {
        // Make sure Tone is started
        await Tone.start();
        // Toggle the symbol of the Play element
        let stopping = !playElement.classList.toggle("playing");
        if (stopping) {
            // kill the 
            Tone.Transport.stop();
            Tone.Transport.cancel();
            return;
        }

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
        // When looping up and down, don't duplicate the bottom note.
        if (selectedLoop && dir == "both")
            scale.pop();
            
        const leadinPart = new Tone.Loop(((time) => {
			click.triggerAttack(time);
		}), "4n");

        const scaleSequence = new Tone.Sequence((time, note) => {
            sampler.triggerAttackRelease(note, "4n", time);
        }, scale, "4n");

        // Callback to reset the play button when finished
        if (!(scaleSequence.loop = selectedLoop)) {
            let total_beats = scale.length + selectedDelay*4;
            let measures = Math.floor(total_beats / 4);
            let extra_beats = total_beats % 4;
            // schedule to stop
            Tone.Transport.schedule(() => {
                playElement.classList.remove("playing");
                Tone.Transport.stop();
                Tone.Transport.cancel();
            }, `${measures}:${extra_beats}:8`);
        }

        if (selectedDelay) {
            leadinPart.start(0);
            leadinPart.stop("1m");
            scaleSequence.start("1m");
        }
        else
            scaleSequence.start(0);

        Tone.Transport.start();
        // When the transport is stopped, dispose of the sequences
        Tone.Transport.once("stop", () => {
            leadinPart.dispose();
            scaleSequence.dispose();
        });
    });
}

if (document.readyState === "complete" ||
   (document.readyState !== "loading" && !document.documentElement.doScroll) ) {
    createListeners();
} else {
    document.addEventListener("DOMContentLoaded", createListeners);
}
