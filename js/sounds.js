/* ============================================================
   BIRTHDAY SURPRISE — SOUND ENGINE
   All sounds are synthesized via the Web Audio API.
   No external audio files required!
   ============================================================ */

const SoundEngine = (() => {
    'use strict';

    let audioCtx = null;
    let bgMusicNodes = null;      // { oscillators, gains, masterGain }
    let bgMusicPlaying = false;
    let themeMusicNodes = null;   // separate tracker for theme ambient music
    let themeMusicPlaying = false;
    let themeMusicTimeout = null; // for scheduling loop repeats
    let isMuted = false;
    let masterVolume = 0.5;

    // ─────────── LAZY INIT ───────────
    // AudioContext must be created after user gesture
    function ensureContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // ─────────── UTILITY ───────────
    function now() {
        return ensureContext().currentTime;
    }

    function createGain(value = 1) {
        const ctx = ensureContext();
        const g = ctx.createGain();
        g.gain.setValueAtTime(value * masterVolume * (isMuted ? 0 : 1), ctx.currentTime);
        return g;
    }

    // ─────────── CLICK SOUND ───────────
    // Short, satisfying click/tap sound
    function playClick() {
        if (isMuted) return;
        const ctx = ensureContext();
        const t = now();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.06);

        gain.gain.setValueAtTime(0.15 * masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
    }
// commit
    // ─────────── POP SOUND ───────────
    // Bubbly pop for confetti / reveal
    function playPop() {
        if (isMuted) return;
        const ctx = ensureContext();
        const t = now();

        // Two layered oscillators for richness
        for (let i = 0; i < 2; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = i === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(600 + i * 400, t);
            osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);

            gain.gain.setValueAtTime(0.2 * masterVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.25);
        }

        // Noise burst for that satisfying "pop"
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.08 * masterVolume, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        noise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(t);
    }

    // ─────────── WHOOSH SOUND ───────────
    // Smooth transition whoosh
    function playWhoosh() {
        if (isMuted) return;
        const ctx = ensureContext();
        const t = now();

        // Filtered noise sweep
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, t);
        filter.frequency.exponentialRampToValueAtTime(2000, t + 0.1);
        filter.frequency.exponentialRampToValueAtTime(400, t + 0.25);
        filter.Q.setValueAtTime(1, t);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1 * masterVolume, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(t);
        noise.stop(t + 0.35);
    }

    // ─────────── SUCCESS CHIME ───────────
    // Ascending chime for "Yes" / correct answer
    function playSuccess() {
        if (isMuted) return;
        const ctx = ensureContext();
        const t = now();

        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + i * 0.1);

            gain.gain.setValueAtTime(0, t + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.15 * masterVolume, t + i * 0.1 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.3);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + i * 0.1);
            osc.stop(t + i * 0.1 + 0.35);
        });
    }

    // ─────────── DODGE BUZZ ───────────
    // Playful "nope!" sound when No button dodges
    function playDodge() {
        if (isMuted) return;
        const ctx = ensureContext();
        const t = now();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(200, t + 0.08);
        osc.frequency.linearRampToValueAtTime(350, t + 0.12);

        gain.gain.setValueAtTime(0.08 * masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.18);
    }

    // ─────────── FANFARE ───────────
    // Grand reveal fanfare
    function playFanfare() {
        if (isMuted) return;
        const ctx = ensureContext();
        const t = now();

        // Major chord arpeggio with harmonics
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4-G5
        notes.forEach((freq, i) => {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(freq, t);
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(freq * 2, t);

            const startTime = t + i * 0.08;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.12 * masterVolume, startTime + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            osc1.start(startTime);
            osc2.start(startTime);
            osc1.stop(startTime + 0.85);
            osc2.stop(startTime + 0.85);
        });
    }

    // ─────────── BOY AMBIENT MUSIC ───────────
    // Warm, calm, deeper-toned ambient — gentle adventure feel
    // Uses lower octave sine waves with soft pad-like sustain
    function playBoyAmbient() {
        if (isMuted) return;
        stopThemeMusic();

        const ctx = ensureContext();

        // Gentle, warm melody in a lower register
        // Inspired by calm adventure / lullaby vibes
        const melody = [
            // Phrase 1 — calm and warm
            { note: 130.81, dur: 2 },   // C3
            { note: 164.81, dur: 1.5 }, // E3
            { note: 146.83, dur: 1.5 }, // D3
            { note: 196.00, dur: 2 },   // G3
            { note: 0, dur: 0.5 },

            // Phrase 2 — gentle rise
            { note: 174.61, dur: 1.5 }, // F3
            { note: 196.00, dur: 1 },   // G3
            { note: 220.00, dur: 2 },   // A3
            { note: 196.00, dur: 1.5 }, // G3
            { note: 0, dur: 0.5 },

            // Phrase 3 — settling
            { note: 164.81, dur: 2 },   // E3
            { note: 146.83, dur: 1.5 }, // D3
            { note: 130.81, dur: 2 },   // C3
            { note: 164.81, dur: 1.5 }, // E3
            { note: 0, dur: 0.5 },

            // Phrase 4 — resolve
            { note: 196.00, dur: 1.5 }, // G3
            { note: 174.61, dur: 1.5 }, // F3
            { note: 164.81, dur: 1.5 }, // E3
            { note: 130.81, dur: 2.5 }, // C3 (held)
            { note: 0, dur: 1 },
        ];

        const tempo = 72; // slower, calmer BPM
        const beatDuration = 60 / tempo;
        let totalDuration = 0;
        melody.forEach(n => totalDuration += n.dur * beatDuration);

        function scheduleLoop() {
            if (isMuted || !themeMusicPlaying) return;

            const ctx2 = ensureContext();
            const t = ctx2.currentTime;

            const masterGain = ctx2.createGain();
            masterGain.gain.setValueAtTime(0, t);
            masterGain.gain.linearRampToValueAtTime(0.12 * masterVolume, t + 2);
            masterGain.connect(ctx2.destination);

            const oscillators = [];
            const gains = [];
            let offset = 0;

            melody.forEach(({ note, dur }) => {
                const noteStart = t + offset;
                const noteDur = dur * beatDuration;

                if (note > 0) {
                    // Deep warm sine
                    const osc1 = ctx2.createOscillator();
                    osc1.type = 'sine';
                    osc1.frequency.setValueAtTime(note, noteStart);

                    // Soft pad layer (triangle, octave up)
                    const osc2 = ctx2.createOscillator();
                    osc2.type = 'triangle';
                    osc2.frequency.setValueAtTime(note * 2, noteStart);

                    // Sub bass rumble (one octave down)
                    const osc3 = ctx2.createOscillator();
                    osc3.type = 'sine';
                    osc3.frequency.setValueAtTime(note / 2, noteStart);

                    const noteGain = ctx2.createGain();
                    noteGain.gain.setValueAtTime(0, noteStart);
                    noteGain.gain.linearRampToValueAtTime(0.5, noteStart + 0.08);
                    noteGain.gain.setValueAtTime(0.4, noteStart + noteDur * 0.6);
                    noteGain.gain.linearRampToValueAtTime(0.001, noteStart + noteDur * 0.95);

                    const padGain = ctx2.createGain();
                    padGain.gain.setValueAtTime(0.08, noteStart);
                    padGain.gain.linearRampToValueAtTime(0.001, noteStart + noteDur * 0.85);

                    const subGain = ctx2.createGain();
                    subGain.gain.setValueAtTime(0.12, noteStart);
                    subGain.gain.linearRampToValueAtTime(0.001, noteStart + noteDur * 0.7);

                    osc1.connect(noteGain);
                    osc2.connect(padGain);
                    osc3.connect(subGain);
                    noteGain.connect(masterGain);
                    padGain.connect(masterGain);
                    subGain.connect(masterGain);

                    osc1.start(noteStart);
                    osc1.stop(noteStart + noteDur);
                    osc2.start(noteStart);
                    osc2.stop(noteStart + noteDur);
                    osc3.start(noteStart);
                    osc3.stop(noteStart + noteDur);

                    oscillators.push(osc1, osc2, osc3);
                    gains.push(noteGain, padGain, subGain);
                }

                offset += noteDur;
            });

            // Fade out at end of this loop
            masterGain.gain.setValueAtTime(0.12 * masterVolume, t + totalDuration - 2);
            masterGain.gain.linearRampToValueAtTime(0, t + totalDuration);

            themeMusicNodes = { oscillators, gains, masterGain };

            // Schedule next loop
            themeMusicTimeout = setTimeout(() => {
                if (themeMusicPlaying) scheduleLoop();
            }, (totalDuration - 1.5) * 1000);
        }

        themeMusicPlaying = true;
        scheduleLoop();
    }

    // ─────────── GIRL AMBIENT MUSIC ───────────
    // Light, sparkly, higher-toned ambient — delicate music-box / fairy feel
    // Uses higher octave with bell-like shimmer
    function playGirlAmbient() {
        if (isMuted) return;
        stopThemeMusic();

        const ctx = ensureContext();

        // Delicate, whimsical melody in a higher register
        // Inspired by music boxes and fairy-tale vibes
        const melody = [
            // Phrase 1 — light and airy
            { note: 523.25, dur: 1.5 }, // C5
            { note: 659.25, dur: 1 },   // E5
            { note: 783.99, dur: 1.5 }, // G5
            { note: 659.25, dur: 1 },   // E5
            { note: 0, dur: 0.5 },

            // Phrase 2 — sparkling
            { note: 698.46, dur: 1 },   // F5
            { note: 783.99, dur: 1 },   // G5
            { note: 880.00, dur: 1.5 }, // A5
            { note: 783.99, dur: 1 },   // G5
            { note: 659.25, dur: 1.5 }, // E5
            { note: 0, dur: 0.5 },

            // Phrase 3 — gentle descent
            { note: 987.77, dur: 1.5 }, // B5
            { note: 880.00, dur: 1 },   // A5
            { note: 783.99, dur: 1.5 }, // G5
            { note: 659.25, dur: 1 },   // E5
            { note: 0, dur: 0.5 },

            // Phrase 4 — resolve softly
            { note: 698.46, dur: 1 },   // F5
            { note: 659.25, dur: 1 },   // E5
            { note: 587.33, dur: 1 },   // D5
            { note: 523.25, dur: 2 },   // C5 (held)
            { note: 0, dur: 1 },
        ];

        const tempo = 90; // gentle waltz-like tempo
        const beatDuration = 60 / tempo;
        let totalDuration = 0;
        melody.forEach(n => totalDuration += n.dur * beatDuration);

        function scheduleLoop() {
            if (isMuted || !themeMusicPlaying) return;

            const ctx2 = ensureContext();
            const t = ctx2.currentTime;

            const masterGain = ctx2.createGain();
            masterGain.gain.setValueAtTime(0, t);
            masterGain.gain.linearRampToValueAtTime(0.10 * masterVolume, t + 1.5);
            masterGain.connect(ctx2.destination);

            const oscillators = [];
            const gains = [];
            let offset = 0;

            melody.forEach(({ note, dur }) => {
                const noteStart = t + offset;
                const noteDur = dur * beatDuration;

                if (note > 0) {
                    // Bright, clear sine
                    const osc1 = ctx2.createOscillator();
                    osc1.type = 'sine';
                    osc1.frequency.setValueAtTime(note, noteStart);

                    // Bell/shimmer harmonic (3rd overtone)
                    const osc2 = ctx2.createOscillator();
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(note * 3, noteStart);

                    // Soft triangle pad (octave down for warmth)
                    const osc3 = ctx2.createOscillator();
                    osc3.type = 'triangle';
                    osc3.frequency.setValueAtTime(note / 2, noteStart);

                    const noteGain = ctx2.createGain();
                    noteGain.gain.setValueAtTime(0, noteStart);
                    noteGain.gain.linearRampToValueAtTime(0.45, noteStart + 0.03);
                    noteGain.gain.setValueAtTime(0.35, noteStart + noteDur * 0.5);
                    noteGain.gain.linearRampToValueAtTime(0.001, noteStart + noteDur * 0.92);

                    // Bell shimmer — quick attack, quick decay
                    const bellGain = ctx2.createGain();
                    bellGain.gain.setValueAtTime(0, noteStart);
                    bellGain.gain.linearRampToValueAtTime(0.06, noteStart + 0.01);
                    bellGain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDur * 0.3);

                    // Warm pad
                    const padGain = ctx2.createGain();
                    padGain.gain.setValueAtTime(0.1, noteStart);
                    padGain.gain.linearRampToValueAtTime(0.001, noteStart + noteDur * 0.8);

                    osc1.connect(noteGain);
                    osc2.connect(bellGain);
                    osc3.connect(padGain);
                    noteGain.connect(masterGain);
                    bellGain.connect(masterGain);
                    padGain.connect(masterGain);

                    osc1.start(noteStart);
                    osc1.stop(noteStart + noteDur);
                    osc2.start(noteStart);
                    osc2.stop(noteStart + noteDur);
                    osc3.start(noteStart);
                    osc3.stop(noteStart + noteDur);

                    oscillators.push(osc1, osc2, osc3);
                    gains.push(noteGain, bellGain, padGain);
                }

                offset += noteDur;
            });

            // Fade out at end of this loop
            masterGain.gain.setValueAtTime(0.10 * masterVolume, t + totalDuration - 1.5);
            masterGain.gain.linearRampToValueAtTime(0, t + totalDuration);

            themeMusicNodes = { oscillators, gains, masterGain };

            // Schedule next loop
            themeMusicTimeout = setTimeout(() => {
                if (themeMusicPlaying) scheduleLoop();
            }, (totalDuration - 1) * 1000);
        }

        themeMusicPlaying = true;
        scheduleLoop();
    }

    // ─────────── STOP THEME MUSIC ───────────
    function stopThemeMusic() {
        if (themeMusicTimeout) {
            clearTimeout(themeMusicTimeout);
            themeMusicTimeout = null;
        }
        if (themeMusicNodes) {
            try {
                const t = now();
                themeMusicNodes.masterGain.gain.cancelScheduledValues(t);
                themeMusicNodes.masterGain.gain.setValueAtTime(
                    themeMusicNodes.masterGain.gain.value, t
                );
                themeMusicNodes.masterGain.gain.linearRampToValueAtTime(0, t + 0.8);

                setTimeout(() => {
                    if (themeMusicNodes) {
                        themeMusicNodes.oscillators.forEach(o => {
                            try { o.stop(); } catch (e) { /* already stopped */ }
                        });
                        themeMusicNodes = null;
                    }
                }, 900);
            } catch (e) {
                themeMusicNodes = null;
            }
        }
        themeMusicPlaying = false;
    }

    // ─────────── HAPPY BIRTHDAY — BOY VERSION ───────────
    // Warm, deep, masculine — lower octave with rich bass and soft pads
    // Like a gentle acoustic guitar / cello serenade
    function playHappyBirthdayBoy() {
        if (isMuted) return;
        stopBgMusic();

        const ctx = ensureContext();
        const t = now();

        // Happy Birthday melody transposed down — C3 range
        const melody = [
            // "Hap-py birth-day to you"
            { note: 132, dur: 0.75 },   // C3
            { note: 132, dur: 0.25 },
            { note: 148.5, dur: 1 },    // D3
            { note: 132, dur: 1 },      // C3
            { note: 176, dur: 1 },      // F3
            { note: 165, dur: 2 },      // E3

            // "Hap-py birth-day to you"
            { note: 132, dur: 0.75 },
            { note: 132, dur: 0.25 },
            { note: 148.5, dur: 1 },
            { note: 132, dur: 1 },
            { note: 198, dur: 1 },      // G3
            { note: 176, dur: 2 },      // F3

            // "Hap-py birth-day dear [name]"
            { note: 132, dur: 0.75 },
            { note: 132, dur: 0.25 },
            { note: 264, dur: 1 },      // C4
            { note: 220, dur: 1 },      // A3
            { note: 176, dur: 1 },      // F3
            { note: 165, dur: 1 },      // E3
            { note: 148.5, dur: 1 },    // D3

            // Rest
            { note: 0, dur: 0.5 },

            // "Hap-py birth-day to you"
            { note: 235, dur: 0.75 },   // Bb3
            { note: 235, dur: 0.25 },
            { note: 220, dur: 1 },      // A3
            { note: 176, dur: 1 },      // F3
            { note: 198, dur: 1 },      // G3
            { note: 176, dur: 2 },      // F3

            // Rest between loops
            { note: 0, dur: 1 },
        ];

        const tempo = 120; // slightly slower for gravitas
        const beatDuration = 60 / tempo;
        let totalDuration = 0;
        melody.forEach(n => totalDuration += n.dur * beatDuration);

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0, t);
        masterGain.gain.linearRampToValueAtTime(0.20 * masterVolume, t + 1.5);
        masterGain.connect(ctx.destination);

        const oscillators = [];
        const gains = [];

        function scheduleMelody(startTime) {
            let offset = 0;

            melody.forEach(({ note, dur }) => {
                const noteStart = startTime + offset;
                const noteDur = dur * beatDuration;

                if (note > 0) {
                    // Warm, rich sine (main voice)
                    const osc1 = ctx.createOscillator();
                    osc1.type = 'sine';
                    osc1.frequency.setValueAtTime(note, noteStart);

                    // Deep sub-bass (octave below)
                    const osc2 = ctx.createOscillator();
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(note / 2, noteStart);

                    // Soft triangle pad (octave above for body)
                    const osc3 = ctx.createOscillator();
                    osc3.type = 'triangle';
                    osc3.frequency.setValueAtTime(note * 2, noteStart);

                    // Main voice — warm, sustained envelope
                    const noteGain = ctx.createGain();
                    noteGain.gain.setValueAtTime(0, noteStart);
                    noteGain.gain.linearRampToValueAtTime(0.65, noteStart + 0.04);
                    noteGain.gain.setValueAtTime(0.55, noteStart + noteDur * 0.65);
                    noteGain.gain.linearRampToValueAtTime(0.001, noteStart + noteDur * 0.95);

                    // Sub-bass — adds warmth and depth
                    const subGain = ctx.createGain();
                    subGain.gain.setValueAtTime(0.18, noteStart);
                    subGain.gain.linearRampToValueAtTime(0.001, noteStart + noteDur * 0.8);

                    // Triangle pad — subtle overtone
                    const padGain = ctx.createGain();
                    padGain.gain.setValueAtTime(0.08, noteStart);
                    padGain.gain.linearRampToValueAtTime(0.001, noteStart + noteDur * 0.7);

                    osc1.connect(noteGain);
                    osc2.connect(subGain);
                    osc3.connect(padGain);
                    noteGain.connect(masterGain);
                    subGain.connect(masterGain);
                    padGain.connect(masterGain);

                    osc1.start(noteStart);
                    osc1.stop(noteStart + noteDur);
                    osc2.start(noteStart);
                    osc2.stop(noteStart + noteDur);
                    osc3.start(noteStart);
                    osc3.stop(noteStart + noteDur);

                    oscillators.push(osc1, osc2, osc3);
                    gains.push(noteGain, subGain, padGain);
                }

                offset += noteDur;
            });
        }

        // Schedule 3 loops
        for (let loop = 0; loop < 3; loop++) {
            scheduleMelody(t + loop * totalDuration);
        }

        const totalTime = totalDuration * 3;
        masterGain.gain.setValueAtTime(0.20 * masterVolume, t + totalTime - 3);
        masterGain.gain.linearRampToValueAtTime(0, t + totalTime);

        bgMusicNodes = { oscillators, gains, masterGain };
        bgMusicPlaying = true;
    }

    // ─────────── HAPPY BIRTHDAY — GIRL VERSION ───────────
    // Light, sparkly, feminine — higher octave with bell harmonics
    // Like a crystal music box / celesta
    function playHappyBirthdayGirl() {
        if (isMuted) return;
        stopBgMusic();

        const ctx = ensureContext();
        const t = now();

        // Happy Birthday melody transposed up — C5 range
        const melody = [
            // "Hap-py birth-day to you"
            { note: 523, dur: 0.75 },   // C5
            { note: 523, dur: 0.25 },
            { note: 587, dur: 1 },      // D5
            { note: 523, dur: 1 },      // C5
            { note: 698, dur: 1 },      // F5
            { note: 659, dur: 2 },      // E5

            // "Hap-py birth-day to you"
            { note: 523, dur: 0.75 },
            { note: 523, dur: 0.25 },
            { note: 587, dur: 1 },
            { note: 523, dur: 1 },
            { note: 784, dur: 1 },      // G5
            { note: 698, dur: 2 },      // F5

            // "Hap-py birth-day dear [name]"
            { note: 523, dur: 0.75 },
            { note: 523, dur: 0.25 },
            { note: 1047, dur: 1 },     // C6
            { note: 880, dur: 1 },      // A5
            { note: 698, dur: 1 },      // F5
            { note: 659, dur: 1 },      // E5
            { note: 587, dur: 1 },      // D5

            // Rest
            { note: 0, dur: 0.5 },

            // "Hap-py birth-day to you"
            { note: 932, dur: 0.75 },   // Bb5
            { note: 932, dur: 0.25 },
            { note: 880, dur: 1 },      // A5
            { note: 698, dur: 1 },      // F5
            { note: 784, dur: 1 },      // G5
            { note: 698, dur: 2 },      // F5

            // Rest between loops
            { note: 0, dur: 1 },
        ];

        const tempo = 150; // slightly faster for playfulness
        const beatDuration = 60 / tempo;
        let totalDuration = 0;
        melody.forEach(n => totalDuration += n.dur * beatDuration);

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0, t);
        masterGain.gain.linearRampToValueAtTime(0.15 * masterVolume, t + 1.5);
        masterGain.connect(ctx.destination);

        const oscillators = [];
        const gains = [];

        function scheduleMelody(startTime) {
            let offset = 0;

            melody.forEach(({ note, dur }) => {
                const noteStart = startTime + offset;
                const noteDur = dur * beatDuration;

                if (note > 0) {
                    // Bright, clear sine (main voice)
                    const osc1 = ctx.createOscillator();
                    osc1.type = 'sine';
                    osc1.frequency.setValueAtTime(note, noteStart);

                    // Sparkly bell harmonic (3rd overtone)
                    const osc2 = ctx.createOscillator();
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(note * 3, noteStart);

                    // Delicate triangle (octave below for gentle warmth)
                    const osc3 = ctx.createOscillator();
                    osc3.type = 'triangle';
                    osc3.frequency.setValueAtTime(note / 2, noteStart);

                    // Main voice — crisp, quick attack
                    const noteGain = ctx.createGain();
                    noteGain.gain.setValueAtTime(0, noteStart);
                    noteGain.gain.linearRampToValueAtTime(0.55, noteStart + 0.015);
                    noteGain.gain.setValueAtTime(0.4, noteStart + noteDur * 0.5);
                    noteGain.gain.linearRampToValueAtTime(0.001, noteStart + noteDur * 0.9);

                    // Bell shimmer — fast attack, fast decay for sparkle
                    const bellGain = ctx.createGain();
                    bellGain.gain.setValueAtTime(0, noteStart);
                    bellGain.gain.linearRampToValueAtTime(0.07, noteStart + 0.008);
                    bellGain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDur * 0.25);

                    // Warm triangle pad — gentle body
                    const padGain = ctx.createGain();
                    padGain.gain.setValueAtTime(0.12, noteStart);
                    padGain.gain.linearRampToValueAtTime(0.001, noteStart + noteDur * 0.75);

                    osc1.connect(noteGain);
                    osc2.connect(bellGain);
                    osc3.connect(padGain);
                    noteGain.connect(masterGain);
                    bellGain.connect(masterGain);
                    padGain.connect(masterGain);

                    osc1.start(noteStart);
                    osc1.stop(noteStart + noteDur);
                    osc2.start(noteStart);
                    osc2.stop(noteStart + noteDur);
                    osc3.start(noteStart);
                    osc3.stop(noteStart + noteDur);

                    oscillators.push(osc1, osc2, osc3);
                    gains.push(noteGain, bellGain, padGain);
                }

                offset += noteDur;
            });
        }

        // Schedule 3 loops
        for (let loop = 0; loop < 3; loop++) {
            scheduleMelody(t + loop * totalDuration);
        }

        const totalTime = totalDuration * 3;
        masterGain.gain.setValueAtTime(0.15 * masterVolume, t + totalTime - 3);
        masterGain.gain.linearRampToValueAtTime(0, t + totalTime);

        bgMusicNodes = { oscillators, gains, masterGain };
        bgMusicPlaying = true;
    }

    // ─────────── STOP BACKGROUND MUSIC ───────────
    function stopBgMusic() {
        if (bgMusicNodes) {
            try {
                const t = now();
                bgMusicNodes.masterGain.gain.cancelScheduledValues(t);
                bgMusicNodes.masterGain.gain.setValueAtTime(
                    bgMusicNodes.masterGain.gain.value, t
                );
                bgMusicNodes.masterGain.gain.linearRampToValueAtTime(0, t + 0.5);

                // Stop all oscillators after fade
                setTimeout(() => {
                    if (bgMusicNodes) {
                        bgMusicNodes.oscillators.forEach(o => {
                            try { o.stop(); } catch (e) { /* already stopped */ }
                        });
                        bgMusicNodes = null;
                    }
                }, 600);
            } catch (e) {
                bgMusicNodes = null;
            }
        }
        bgMusicPlaying = false;
    }

    // ─────────── MUTE / UNMUTE ───────────
    function toggleMute() {
        isMuted = !isMuted;
        if (isMuted) {
            if (bgMusicPlaying) stopBgMusic();
            if (themeMusicPlaying) stopThemeMusic();
        }
        return isMuted;
    }

    function getMuted() {
        return isMuted;
    }

    // ─────────── PUBLIC API ───────────
    return {
        playClick,
        playPop,
        playWhoosh,
        playSuccess,
        playDodge,
        playFanfare,
        playBoyAmbient,
        playGirlAmbient,
        stopThemeMusic,
        playHappyBirthdayBoy,
        playHappyBirthdayGirl,
        stopBgMusic,
        toggleMute,
        getMuted,
        ensureContext,
    };
})();
