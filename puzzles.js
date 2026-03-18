/* ============================================================
   PUZZLE ENGINE — Narrative mechanics and evidence tracking
   ============================================================ */

const Puzzles = (() => {
    // Evidence tracking
    const evidenceFound = {
        lysine_failure: false,
        breeding_evidence: false,
        site_b_location: false,
        nedry_backdoor: false,
        biosyn_wire: false
    };

    const evidenceLabels = {
        lysine_failure: 'Lysine Contingency Failure',
        breeding_evidence: 'Unauthorized Breeding',
        site_b_location: 'Site B Location',
        nedry_backdoor: "Nedry's Backdoor Code",
        biosyn_wire: 'BioSyn Wire Transfers'
    };

    let magicWordActive = false;
    let hasRootAccess = false;
    let decodeActive = false;
    let siteB_decoded = false;

    function flagEvidence(key) {
        if (evidenceFound[key]) return false;
        evidenceFound[key] = true;
        AudioEngine.playSuccess();
        return true;
    }

    function getEvidenceStatus() {
        const lines = ['═══ EVIDENCE FLAGS ═══\n'];
        for (const [key, found] of Object.entries(evidenceFound)) {
            const mark = found ? '■' : '□';
            const color = found ? 'output-success' : 'output-dim';
            lines.push(`  <span class="${color}">${mark} ${evidenceLabels[key]}</span>`);
        }
        const count = Object.values(evidenceFound).filter(v => v).length;
        lines.push(`\n  ${count}/5 Evidence Flags collected`);
        return lines.join('\n');
    }

    function allEvidenceFound() {
        return Object.values(evidenceFound).every(v => v);
    }

    // Check if viewing a file should trigger an evidence flag
    function checkFileEvidence(node) {
        if (node && node.evidence) {
            return flagEvidence(node.evidence);
        }
        return false;
    }

    /* --- Magic Word Lockout (corner popup — Image 1 style) --- */
    function triggerMagicWord() {
        if (magicWordActive || hasRootAccess) return;
        magicWordActive = true;
        AudioEngine.playAlert();

        const popup = document.getElementById('magic-word-popup');
        const timerEl = document.getElementById('lockout-timer');

        popup.classList.remove('hidden');

        let remaining = 30;
        timerEl.textContent = `LOCKOUT: ${remaining}s`;

        const interval = setInterval(() => {
            remaining--;
            timerEl.textContent = `LOCKOUT: ${remaining}s`;
            if (remaining <= 0) {
                clearInterval(interval);
                popup.classList.add('hidden');
                magicWordActive = false;
            }
        }, 1000);
    }

    function tryRootAccess(token) {
        if (token === '7091' || token === '7091-Gennaro' || token === '7091-gennaro') {
            hasRootAccess = true;
            return true;
        }
        return false;
    }

    function canAccessRoot() { return hasRootAccess; }
    function isMagicWordActive() { return magicWordActive; }

    /* --- Decode Puzzle (Hex Alignment) --- */
    function startDecodePuzzle(callback) {
        if (decodeActive) return;
        if (siteB_decoded) {
            callback(true);
            return;
        }
        decodeActive = true;

        const overlay = document.getElementById('decode-overlay');
        const hexLeft = document.getElementById('decode-hex-left');
        const hexRight = document.getElementById('decode-hex-right');
        const statusEl = document.getElementById('decode-status');
        const offsetEl = document.getElementById('decode-offset');
        const resultEl = document.getElementById('decode-result');
        const controlsEl = document.getElementById('decode-controls');

        overlay.classList.remove('hidden');
        resultEl.classList.add('hidden');
        statusEl.classList.remove('aligned');
        statusEl.textContent = 'MISALIGNED';

        // Generate hex streams
        const correctOffset = 7;
        let currentOffset = 0;

        function generateHex(seed, count) {
            const lines = [];
            for (let i = 0; i < count; i++) {
                let addr = (seed + i * 16).toString(16).toUpperCase().padStart(8, '0');
                let bytes = '';
                for (let j = 0; j < 16; j++) {
                    const b = ((seed + i * 16 + j * 7 + 0x4E) & 0xFF).toString(16).toUpperCase().padStart(2, '0');
                    bytes += b + ' ';
                }
                lines.push(`0x${addr}  ${bytes}`);
            }
            return lines.join('\n');
        }

        function generateHexB(seed, offset, count) {
            const lines = [];
            for (let i = 0; i < count; i++) {
                let addr = (seed + (i + offset) * 16).toString(16).toUpperCase().padStart(8, '0');
                let bytes = '';
                for (let j = 0; j < 16; j++) {
                    const val = offset === correctOffset
                        ? ((seed + i * 16 + j * 7 + 0x4E) & 0xFF)
                        : ((seed + (i + offset) * 16 + j * 11 + 0x3A) & 0xFF);
                    bytes += val.toString(16).toUpperCase().padStart(2, '0') + ' ';
                }
                lines.push(`0x${addr}  ${bytes}`);
            }
            return lines.join('\n');
        }

        const seed = 0x00F71300;
        hexLeft.textContent = generateHex(seed, 20);

        function updateStreamB() {
            hexRight.textContent = generateHexB(seed, currentOffset, 20);
            offsetEl.textContent = `OFFSET: ${currentOffset >= 0 ? '+' : ''}${currentOffset}`;
            if (currentOffset === correctOffset) {
                statusEl.textContent = 'ALIGNED ✓';
                statusEl.classList.add('aligned');
            } else {
                statusEl.textContent = 'MISALIGNED';
                statusEl.classList.remove('aligned');
            }
        }
        updateStreamB();

        // Scrolling animation for visual effect
        let scrollInterval = setInterval(() => {
            hexLeft.scrollTop += 1;
            hexRight.scrollTop += 1;
        }, 100);

        function handleKey(e) {
            if (e.key === 'ArrowUp') {
                currentOffset++;
                updateStreamB();
                AudioEngine.playKeystroke();
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                currentOffset--;
                updateStreamB();
                AudioEngine.playKeystroke();
                e.preventDefault();
            } else if (e.key === 'Enter') {
                if (currentOffset === correctOffset) {
                    // Success!
                    clearInterval(scrollInterval);
                    siteB_decoded = true;
                    decodeActive = false;
                    flagEvidence(VFS.EVIDENCE.SITE_B);
                    resultEl.textContent = `FILE RECOVERY SUCCESSFUL
Header aligned. Reconstructing data blocks...
██████████████████████████████████████████ 100%

File: SITE_B_MANIFEST.DOC
Status: RECOVERED
Size: 1.4K
Classification: ULTRA SECRET

Press ESC to view recovered document.`;
                    resultEl.classList.remove('hidden');
                    AudioEngine.playSuccess();
                    document.removeEventListener('keydown', handleKey);
                    // Wait for ESC to close
                    function closeOnEsc(e2) {
                        if (e2.key === 'Escape') {
                            overlay.classList.add('hidden');
                            document.removeEventListener('keydown', closeOnEsc);
                            callback(true);
                        }
                    }
                    document.addEventListener('keydown', closeOnEsc);
                } else {
                    AudioEngine.playError();
                    statusEl.textContent = 'ALIGNMENT FAILED — RETRY';
                }
                e.preventDefault();
            } else if (e.key === 'Escape') {
                clearInterval(scrollInterval);
                overlay.classList.add('hidden');
                decodeActive = false;
                document.removeEventListener('keydown', handleKey);
                callback(false);
                e.preventDefault();
            }
        }

        document.addEventListener('keydown', handleKey);
    }

    function isSiteBDecoded() { return siteB_decoded; }

    /* --- Submit Audit Endgame --- */
    function submitAudit(outputFn) {
        if (!allEvidenceFound()) {
            const missing = Object.entries(evidenceFound)
                .filter(([_, v]) => !v)
                .map(([k, _]) => evidenceLabels[k]);
            outputFn(`\n<span class="output-error">AUDIT SUBMISSION FAILED</span>
<span class="output-warning">Missing evidence flags:</span>
${missing.map(m => '  □ ' + m).join('\n')}

Collect all 5 evidence flags before submitting.`);
            return;
        }

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'audit-overlay';
        overlay.innerHTML = '<div class="audit-content"><pre id="audit-text"></pre></div>';
        document.body.appendChild(overlay);

        const textEl = document.getElementById('audit-text');
        const lines = [
            { text: '═══════════════════════════════════════════════', cls: '' },
            { text: '  INGEN DIGITAL FORENSICS — AUDIT SUBMISSION  ', cls: 'output-header' },
            { text: '═══════════════════════════════════════════════\n', cls: '' },
            { text: 'Packaging evidence flags...', cls: '' },
            { text: '  ■ Lysine Contingency Failure — CONFIRMED', cls: 'output-success' },
            { text: '  ■ Unauthorized Breeding — CONFIRMED', cls: 'output-success' },
            { text: '  ■ Site B Location — CONFIRMED', cls: 'output-success' },
            { text: "  ■ Nedry's Backdoor Code — CONFIRMED", cls: 'output-success' },
            { text: '  ■ BioSyn Wire Transfers — CONFIRMED', cls: 'output-success' },
            { text: '\nGenerating audit report... ████████████ DONE', cls: '' },
            { text: '\nTransmitting to InGen Legal Division...', cls: '' },
            { text: 'TRANSMISSION COMPLETE.\n', cls: 'output-success' },
            { text: '═══════════════════════════════════════════════', cls: 'corporate-text' },
            { text: '  INCOMING MESSAGE — INGEN LEGAL DIVISION', cls: 'corporate-text' },
            { text: '═══════════════════════════════════════════════\n', cls: 'corporate-text' },
            { text: 'FROM: InGen Legal Department', cls: 'corporate-text' },
            { text: 'PRIORITY: MAXIMUM\n', cls: 'corporate-text' },
            { text: 'Contractor,\n', cls: 'corporate-text' },
            { text: 'Your audit findings have been received and', cls: 'corporate-text' },
            { text: 'reviewed by the Board of Directors.\n', cls: 'corporate-text' },
            { text: 'Effective IMMEDIATELY, you are instructed to:', cls: 'corporate-text' },
            { text: '\n  1. MOVE all incriminating files to:', cls: 'corporate-text' },
            { text: '     /dev/sda4/hidden/', cls: 'output-warning' },
            { text: '\n  2. WIPE all primary logs from:', cls: 'corporate-text' },
            { text: '     /sys/logs/', cls: 'output-warning' },
            { text: '\n  3. PURGE all BioSyn correspondence from:', cls: 'corporate-text' },
            { text: '     /comms/biosyn/', cls: 'output-warning' },
            { text: '\nThis action is necessary to protect InGen', cls: 'corporate-text' },
            { text: 'from insurmountable legal liability.\n', cls: 'corporate-text' },
            { text: 'Your NDA covers everything you have seen.', cls: 'corporate-text' },
            { text: 'This workstation will be physically destroyed', cls: 'corporate-text' },
            { text: 'within 48 hours of your departure.\n', cls: 'corporate-text' },
            { text: 'Thank you for your service, Contractor.', cls: 'corporate-text' },
            { text: 'Your final payment has been wired.\n', cls: 'corporate-text' },
            { text: '— InGen Legal, Board Resolution 93-1147\n', cls: 'corporate-text' },
            { text: '═══════════════════════════════════════════════', cls: '' },
            { text: '\nExecuting corporate directives...', cls: 'output-warning' },
            { text: '  Moving files to /dev/sda4/hidden/ ... DONE', cls: 'output-dim' },
            { text: '  Wiping /sys/logs/ ... DONE', cls: 'output-dim' },
            { text: '  Purging /comms/biosyn/ ... DONE', cls: 'output-dim' },
            { text: '  Overwriting free space ... DONE', cls: 'output-dim' },
            { text: '\nAll traces removed.', cls: 'output-warning' },
            { text: 'The official story: nothing happened.\n', cls: 'output-dim' },
            { text: '"Jurassic Park will open on schedule."\n', cls: 'text-amber' },
            { text: '                          — J. Hammond\n', cls: 'text-amber' },
            { text: '\n[ SESSION TERMINATED — PRESS ANY KEY ]', cls: 'output-dim' },
        ];

        let lineIdx = 0;
        function showNext() {
            if (lineIdx >= lines.length) {
                document.addEventListener('keydown', function closeAudit() {
                    overlay.remove();
                    document.removeEventListener('keydown', closeAudit);
                }, { once: false });
                return;
            }
            const line = lines[lineIdx++];
            const spanEl = document.createElement('span');
            if (line.cls) spanEl.className = line.cls;
            spanEl.textContent = line.text + '\n';
            textEl.appendChild(spanEl);
            textEl.scrollTop = textEl.scrollHeight;
            setTimeout(showNext, lineIdx < 12 ? 200 : 350);
        }
        setTimeout(showNext, 500);
    }

    return {
        flagEvidence,
        getEvidenceStatus,
        allEvidenceFound,
        checkFileEvidence,
        triggerMagicWord,
        tryRootAccess,
        canAccessRoot,
        isMagicWordActive,
        startDecodePuzzle,
        isSiteBDecoded,
        submitAudit,
        evidenceFound
    };
})();
