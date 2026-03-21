/* ============================================================
   BOOT SEQUENCE — Realistic IRIX startup
   Lines appear like a real terminal: newest at bottom,
   older lines scroll up but stay visible (no overflow scroll).
   ============================================================ */

const Boot = (() => {
    const bootLines = [
        { text: '', delay: 400 },
        { text: 'SILICON GRAPHICS INC. IRIS-4D SERIES', delay: 80, cls: 'output-header' },
        { text: 'IRIX 5.3 System V Release 4.0', delay: 60 },
        { text: 'Copyright (c) 1988-1993 Silicon Graphics, Inc.', delay: 60, cls: 'output-dim' },
        { text: 'All Rights Reserved.', delay: 300, cls: 'output-dim' },
        { text: '', delay: 200 },
        { text: 'Initializing hardware...', delay: 400 },
        { text: '  CPU: MIPS R4400 @ 150MHz           [OK]', delay: 120 },
        { text: '  RAM: 256MB SIMM                     [OK]', delay: 100 },
        { text: '  GPU: GR3-Elan                       [OK]', delay: 100 },
        { text: '  NET: 10BASE-T Ethernet              [OK]', delay: 160 },
        { text: '  DMA: Channel 0-3                    [OK]', delay: 80 },
        { text: '  FPU: MIPS R4010                     [OK]', delay: 80 },
        { text: '', delay: 150 },
        { text: 'Running POST...', delay: 500 },
        { text: '  Memory test: 262144K OK', delay: 300 },
        { text: '  SCSI bus scan:', delay: 200 },
        { text: '    ID 0: Seagate ST31200N  1.05GB     [OK]', delay: 120 },
        { text: '    ID 1: Seagate ST31200N  1.05GB     [OK]', delay: 120 },
        { text: '    ID 4: Toshiba XM-3401TA CD-ROM     [OK]', delay: 120 },
        { text: '', delay: 200 },
        { text: 'Mounting filesystems...', delay: 300 },
        { text: '  /dev/dsk/dks0d1s0 on /              [OK]', delay: 100 },
        { text: '  /dev/dsk/dks0d1s6 on /usr            [OK]', delay: 100 },
        { text: '  /dev/dsk/dks0d2s7 on /ingen/data     [OK]', delay: 100 },
        { text: '', delay: 200 },
        { text: '>>> Connecting to InGen Central Network...', delay: 600, cls: 'text-amber' },
        { text: '    MODEM: Hayes Microcomputer 14.4K', delay: 200 },
        { text: '    DIALING: 011-506-2233-4455', delay: 400 },
        { text: '    CARRIER DETECT...', delay: 800 },
        { text: '    HANDSHAKE: V.32bis 14400/LAPM/V.42bis', delay: 500 },
        { text: '    CONNECTION ESTABLISHED              [OK]', delay: 200, cls: 'output-success' },
        { text: '', delay: 200 },
        { text: 'Starting network services...', delay: 250 },
        { text: '  inetd                               [OK]', delay: 80 },
        { text: '  nfs.server                          [OK]', delay: 80 },
        { text: '  named                               [OK]', delay: 80 },
        { text: '', delay: 200 },
        { text: 'Loading Jurassic Park (TM) System Compilation...', delay: 400, cls: 'output-header' },
        { text: '  > initializing tour_program.vax', delay: 200 },
        { text: '  > loading perimeter_fence_control.sys  [OK]', delay: 150 },
        { text: '  > loading security_cam_monitor.sys     [OK]', delay: 120 },
        { text: '  > loading paddock_telemetry.sys        [OK]', delay: 120 },
        { text: '  > loading embryo_storage_ctrl.sys      [OK]', delay: 120 },
        { text: '  > loading census_tracking.sys          [OK]', delay: 120 },
        { text: '  > status check: all systems operational', delay: 200, cls: 'output-success' },
        { text: '  > compiling local subroutines...', delay: 350 },
        { text: '  > WARNING: anomalous entries in access_log.dat', delay: 200, cls: 'output-warning' },
        { text: '  > WARNING: sensor count mismatch detected', delay: 200, cls: 'output-warning' },
        { text: '  > NOTE: Last user session (NEDRY) not terminated', delay: 250, cls: 'output-warning' },
        { text: '', delay: 150 },
        { text: '════════════════════════════════════════════════════', delay: 80, cls: 'text-amber' },
        { text: '  INGEN DIGITAL FORENSICS — CONTRACTOR WORKSTATION', delay: 80, cls: 'text-amber' },
        { text: '  PROJECT 713: THE NEDRY AUDIT', delay: 80, cls: 'text-amber' },
        { text: '  Date: June 12, 1993 — 04:15 CST', delay: 80, cls: 'text-amber' },
        { text: '  Clearance: Level 4 — Full System Access', delay: 80, cls: 'text-amber' },
        { text: '════════════════════════════════════════════════════', delay: 80, cls: 'text-amber' },
        { text: '', delay: 200 },
        { text: 'Loading desktop environment...', delay: 600, cls: 'output-success' },
    ];

    async function run() {
        const textEl = document.getElementById('boot-text');
        const totalLines = bootLines.length;

        // Start modem sound partway through
        let modemStarted = false;

        for (let i = 0; i < totalLines; i++) {
            const line = bootLines[i];

            // Start modem sound when we hit the "CARRIER DETECT" line
            if (!modemStarted && line.text.includes('CARRIER DETECT')) {
                modemStarted = true;
                AudioEngine.playModemHandshake(10);
            }

            const span = document.createElement('span');
            if (line.cls) span.className = line.cls;
            span.textContent = line.text + '\n';
            textEl.appendChild(span);

            await sleep(line.delay);
        }

        // Hard cut to black (like real CRT mode switch — no smooth fades in 1993)
        await sleep(500);
        const bootScreen = document.getElementById('boot-screen');
        bootScreen.style.background = '#000';
        textEl.style.display = 'none';
        await sleep(400);
        bootScreen.classList.add('hidden');

        return true;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    return { run };
})();
