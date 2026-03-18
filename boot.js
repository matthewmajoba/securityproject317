/* ============================================================
   BOOT SEQUENCE — 10-second startup animation
   ============================================================ */

const Boot = (() => {
    const bootLines = [
        { text: '', delay: 200 },
        { text: 'SILICON GRAPHICS INC. IRIS-4D SERIES', delay: 100, cls: 'output-header' },
        { text: 'IRIX 5.3 System V Release 4.0', delay: 100 },
        { text: 'Copyright (c) 1988-1993 Silicon Graphics, Inc.', delay: 100, cls: 'output-dim' },
        { text: 'All Rights Reserved.\n', delay: 200, cls: 'output-dim' },
        { text: 'Initializing hardware...', delay: 300 },
        { text: '  CPU: MIPS R4400 @ 150MHz           [OK]', delay: 150 },
        { text: '  RAM: 256MB SIMM                     [OK]', delay: 150 },
        { text: '  GPU: GR3-Elan                       [OK]', delay: 150 },
        { text: '  NET: 10BASE-T Ethernet              [OK]', delay: 200 },
        { text: '', delay: 100 },
        { text: '>>> Connecting to InGen Central Network...', delay: 500, cls: 'text-amber' },
        { text: '    MODEM: Hayes Microcomputer 14.4K', delay: 200 },
        { text: '    DIALING: 011-506-2233-4455', delay: 300 },
        { text: '    CARRIER DETECT...', delay: 600 },
        { text: '    HANDSHAKE: V.32bis 14400/LAPM/V.42bis', delay: 400 },
        { text: '    CONNECTION ESTABLISHED              [OK]', delay: 200, cls: 'output-success' },
        { text: '', delay: 100 },
        { text: 'Loading Jurassic Park (TM) System Compilation...', delay: 300, cls: 'output-header' },
        { text: '  > initializing tour_program.vax', delay: 200 },
        { text: '  > loading perimeter_fence_control.sys  [OK]', delay: 200 },
        { text: '  > loading security_cam_monitor.sys     [OK]', delay: 150 },
        { text: '  > loading paddock_telemetry.sys        [OK]', delay: 150 },
        { text: '  > loading embryo_storage_ctrl.sys      [OK]', delay: 150 },
        { text: '  > loading census_tracking.sys          [OK]', delay: 150 },
        { text: '  > status check: all systems operational', delay: 200, cls: 'output-success' },
        { text: '  > compiling local subroutines...', delay: 300 },
        { text: '  > WARNING: anomalous entries in access_log.dat', delay: 200, cls: 'output-warning' },
        { text: '  > WARNING: sensor count mismatch detected', delay: 200, cls: 'output-warning' },
        { text: '  > NOTE: Last user session (NEDRY) not terminated', delay: 200, cls: 'output-warning' },
        { text: '', delay: 100 },
        { text: '════════════════════════════════════════════════════', delay: 100, cls: 'text-amber' },
        { text: '  INGEN DIGITAL FORENSICS — CONTRACTOR WORKSTATION', delay: 100, cls: 'text-amber' },
        { text: '  PROJECT 713: THE NEDRY AUDIT', delay: 100, cls: 'text-amber' },
        { text: '  Date: June 12, 1993 — 04:15 CST', delay: 100, cls: 'text-amber' },
        { text: '  Clearance: Level 4 — Full System Access', delay: 100, cls: 'text-amber' },
        { text: '════════════════════════════════════════════════════', delay: 100, cls: 'text-amber' },
        { text: '', delay: 100 },
        { text: 'System ready. Loading desktop environment...', delay: 500, cls: 'output-success' },
    ];

    async function run() {
        const textEl = document.getElementById('boot-text');
        const fillEl = document.getElementById('boot-progress-fill');
        const totalLines = bootLines.length;

        // Start modem sound partway through
        let modemStarted = false;

        for (let i = 0; i < totalLines; i++) {
            const line = bootLines[i];

            // Start modem sound when we hit the "CARRIER DETECT" line
            if (!modemStarted && line.text.includes('CARRIER DETECT')) {
                modemStarted = true;
                AudioEngine.playModemHandshake(5);
            }

            const span = document.createElement('span');
            if (line.cls) span.className = line.cls;
            span.textContent = line.text + '\n';
            textEl.appendChild(span);
            textEl.scrollTop = textEl.scrollHeight;

            // Update progress bar
            fillEl.style.width = ((i + 1) / totalLines * 100) + '%';

            await sleep(line.delay);
        }

        // Fade out boot screen
        await sleep(500);
        const bootScreen = document.getElementById('boot-screen');
        bootScreen.style.transition = 'opacity 0.8s ease';
        bootScreen.style.opacity = '0';
        await sleep(800);
        bootScreen.classList.add('hidden');

        return true;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    return { run };
})();
