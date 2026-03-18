/* ============================================================
   AUDIO ENGINE — Web Audio API
   Procedural modem handshake, server hum, keyboard clacks
   ============================================================ */

const AudioEngine = (() => {
    let ctx = null;
    let humOsc = null;
    let humGain = null;
    let isInitialized = false;

    function init() {
        if (isInitialized) return;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            isInitialized = true;
        } catch (e) {
            console.warn('Web Audio API not available:', e);
        }
    }

    function ensureContext() {
        if (!ctx) init();
        if (ctx && ctx.state === 'suspended') ctx.resume();
        return !!ctx;
    }

    /* --- Modem Handshake (10 seconds) --- */
    function playModemHandshake(duration = 10) {
        if (!ensureContext()) return Promise.resolve();

        return new Promise(resolve => {
            const now = ctx.currentTime;
            const masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(0.12, now);
            masterGain.connect(ctx.destination);

            // Phase 1: Dial tone (0-1.5s)
            const dialOsc = ctx.createOscillator();
            dialOsc.type = 'sine';
            dialOsc.frequency.setValueAtTime(350, now);
            const dialOsc2 = ctx.createOscillator();
            dialOsc2.type = 'sine';
            dialOsc2.frequency.setValueAtTime(440, now);
            const dialGain = ctx.createGain();
            dialGain.gain.setValueAtTime(0.5, now);
            dialGain.gain.linearRampToValueAtTime(0, now + 1.5);
            dialOsc.connect(dialGain);
            dialOsc2.connect(dialGain);
            dialGain.connect(masterGain);
            dialOsc.start(now);
            dialOsc2.start(now);
            dialOsc.stop(now + 1.5);
            dialOsc2.stop(now + 1.5);

            // Phase 2: Carrier detect beeps (1.5-3s)
            for (let i = 0; i < 4; i++) {
                const beep = ctx.createOscillator();
                beep.type = 'square';
                beep.frequency.setValueAtTime(1200 + i * 200, now + 1.5 + i * 0.35);
                const beepGain = ctx.createGain();
                beepGain.gain.setValueAtTime(0.3, now + 1.5 + i * 0.35);
                beepGain.gain.linearRampToValueAtTime(0, now + 1.5 + i * 0.35 + 0.25);
                beep.connect(beepGain);
                beepGain.connect(masterGain);
                beep.start(now + 1.5 + i * 0.35);
                beep.stop(now + 1.5 + i * 0.35 + 0.3);
            }

            // Phase 3: Handshake screech (3-7s)
            const noiseLen = ctx.sampleRate * 4;
            const noiseBuffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseLen; i++) {
                noiseData[i] = (Math.random() * 2 - 1) * 0.4;
            }
            const noiseNode = ctx.createBufferSource();
            noiseNode.buffer = noiseBuffer;

            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(1000, now + 3);
            noiseFilter.frequency.linearRampToValueAtTime(2400, now + 5);
            noiseFilter.frequency.linearRampToValueAtTime(1800, now + 7);
            noiseFilter.Q.setValueAtTime(5, now + 3);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.6, now + 3);
            noiseGain.gain.linearRampToValueAtTime(0.3, now + 7);

            noiseNode.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(masterGain);
            noiseNode.start(now + 3);
            noiseNode.stop(now + 7);

            // Frequency sweep oscillator layered on top
            const sweepOsc = ctx.createOscillator();
            sweepOsc.type = 'sawtooth';
            sweepOsc.frequency.setValueAtTime(300, now + 3);
            sweepOsc.frequency.exponentialRampToValueAtTime(2400, now + 5);
            sweepOsc.frequency.exponentialRampToValueAtTime(600, now + 7);
            const sweepGain = ctx.createGain();
            sweepGain.gain.setValueAtTime(0.15, now + 3);
            sweepGain.gain.linearRampToValueAtTime(0.05, now + 7);
            sweepOsc.connect(sweepGain);
            sweepGain.connect(masterGain);
            sweepOsc.start(now + 3);
            sweepOsc.stop(now + 7);

            // Phase 4: Training sequence (7-9s)
            const trainOsc = ctx.createOscillator();
            trainOsc.type = 'square';
            trainOsc.frequency.setValueAtTime(1650, now + 7);
            const trainGain = ctx.createGain();
            // Pulsing
            for (let t = 0; t < 2; t += 0.1) {
                trainGain.gain.setValueAtTime(0.2, now + 7 + t);
                trainGain.gain.setValueAtTime(0.05, now + 7 + t + 0.05);
            }
            trainGain.gain.linearRampToValueAtTime(0, now + 9);
            trainOsc.connect(trainGain);
            trainGain.connect(masterGain);
            trainOsc.start(now + 7);
            trainOsc.stop(now + 9);

            // Phase 5: Connected (9-10s) — steady tone
            const connOsc = ctx.createOscillator();
            connOsc.type = 'sine';
            connOsc.frequency.setValueAtTime(1200, now + 9);
            const connGain = ctx.createGain();
            connGain.gain.setValueAtTime(0.15, now + 9);
            connGain.gain.linearRampToValueAtTime(0, now + 10);
            connOsc.connect(connGain);
            connGain.connect(masterGain);
            connOsc.start(now + 9);
            connOsc.stop(now + 10);

            // Cleanup
            masterGain.gain.linearRampToValueAtTime(0, now + duration);
            setTimeout(resolve, duration * 1000);
        });
    }

    /* --- Server Room Hum (continuous loop) --- */
    function startServerHum() {
        if (!ensureContext()) return;
        if (humOsc) return;

        humGain = ctx.createGain();
        humGain.gain.setValueAtTime(0.03, ctx.currentTime);
        humGain.connect(ctx.destination);

        // 60Hz fundamental
        humOsc = ctx.createOscillator();
        humOsc.type = 'sine';
        humOsc.frequency.setValueAtTime(60, ctx.currentTime);
        humOsc.connect(humGain);
        humOsc.start();

        // 120Hz harmonic
        const harm1 = ctx.createOscillator();
        harm1.type = 'sine';
        harm1.frequency.setValueAtTime(120, ctx.currentTime);
        const harm1Gain = ctx.createGain();
        harm1Gain.gain.setValueAtTime(0.015, ctx.currentTime);
        harm1.connect(harm1Gain);
        harm1Gain.connect(ctx.destination);
        harm1.start();

        // 180Hz harmonic
        const harm2 = ctx.createOscillator();
        harm2.type = 'sine';
        harm2.frequency.setValueAtTime(180, ctx.currentTime);
        const harm2Gain = ctx.createGain();
        harm2Gain.gain.setValueAtTime(0.008, ctx.currentTime);
        harm2.connect(harm2Gain);
        harm2Gain.connect(ctx.destination);
        harm2.start();

        // Very quiet fan noise
        const fanLen = ctx.sampleRate * 2;
        const fanBuf = ctx.createBuffer(1, fanLen, ctx.sampleRate);
        const fanData = fanBuf.getChannelData(0);
        for (let i = 0; i < fanLen; i++) {
            fanData[i] = (Math.random() * 2 - 1);
        }
        const fanNode = ctx.createBufferSource();
        fanNode.buffer = fanBuf;
        fanNode.loop = true;
        const fanFilter = ctx.createBiquadFilter();
        fanFilter.type = 'lowpass';
        fanFilter.frequency.setValueAtTime(200, ctx.currentTime);
        const fanGain = ctx.createGain();
        fanGain.gain.setValueAtTime(0.008, ctx.currentTime);
        fanNode.connect(fanFilter);
        fanFilter.connect(fanGain);
        fanGain.connect(ctx.destination);
        fanNode.start();
    }

    function stopServerHum() {
        if (humOsc) {
            humOsc.stop();
            humOsc = null;
        }
    }

    /* --- Keyboard Clack --- */
    function playKeystroke() {
        if (!ensureContext()) return;

        const now = ctx.currentTime;
        const clickLen = ctx.sampleRate * 0.04;
        const clickBuf = ctx.createBuffer(1, clickLen, ctx.sampleRate);
        const clickData = clickBuf.getChannelData(0);
        for (let i = 0; i < clickLen; i++) {
            const t = i / ctx.sampleRate;
            const envelope = Math.exp(-t * 150);
            clickData[i] = (Math.random() * 2 - 1) * envelope;
        }
        const clickNode = ctx.createBufferSource();
        clickNode.buffer = clickBuf;

        const clickFilter = ctx.createBiquadFilter();
        clickFilter.type = 'highpass';
        clickFilter.frequency.setValueAtTime(800, now);

        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(0.08 + Math.random() * 0.04, now);

        clickNode.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(ctx.destination);
        clickNode.start(now);
        clickNode.stop(now + 0.04);
    }

    /* --- Alert Beep --- */
    function playAlert() {
        if (!ensureContext()) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(600, now + 0.1);
        osc.frequency.setValueAtTime(800, now + 0.2);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    /* --- Success chime --- */
    function playSuccess() {
        if (!ensureContext()) return;
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.15);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.08, now + i * 0.15);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.4);
        });
    }

    /* --- Error buzz --- */
    function playError() {
        if (!ensureContext()) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    return {
        init,
        playModemHandshake,
        startServerHum,
        stopServerHum,
        playKeystroke,
        playAlert,
        playSuccess,
        playError
    };
})();
