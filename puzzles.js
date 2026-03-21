/* ============================================================
   PUZZLE ENGINE — Evidence tracking & submission system
   Project 713: The Nedry Audit
   ============================================================
   
   NEW SYSTEM: Player-driven evidence submission.
   Files tagged evidence:'critical' are real evidence (5 pieces).
   Files tagged evidence:'motive' give context but aren't evidence.
   Files with no tag are irrelevant.
   
   Player submits file paths via Evidence Tracker window.
   Boss responds based on file tag.
   ============================================================ */

const Puzzles = (() => {
    /* ─────── STATE ─────── */
    let submittedEvidence = [];      // Paths of accepted critical evidence
    let submittedPaths = new Set();  // All submitted paths (dedup)
    let magicWordActive = false;
    let hasRootAccess = false;
    let decodeActive = false;
    let siteB_decoded = false;
    const REQUIRED_EVIDENCE = 5;

    /* ─────── EVIDENCE EVALUATION ─────── */

    /**
     * Evaluate a submitted file path.
     * Returns { status, response } where status is:
     *   'critical'  — real evidence, accepted
     *   'motive'    — circumstantial, not evidence
     *   'irrelevant'— not useful
     *   'duplicate' — already submitted
     *   'not_found' — file doesn't exist
     *   'directory' — submitted a directory, not a file
     */
    function evaluateSubmission(filePath) {
        // Sanitize pasted paths — handle Windows-style (C:\sys\park\file),
        // emoji prefixes (📁 /sys/park/), and trailing slashes
        let cleaned = filePath.trim();
        cleaned = cleaned.replace(/^[^\x00-\x7F\s]+\s*/, ''); // strip leading emoji/non-ASCII
        cleaned = cleaned.replace(/\\/g, '/');                   // backslash → forward slash
        cleaned = cleaned.replace(/^[A-Za-z]:/, '');             // strip drive letter (C:)
        cleaned = cleaned.replace(/\/+$/, '');                   // strip trailing slashes
        if (cleaned && !cleaned.startsWith('/')) cleaned = '/' + cleaned;

        const normalizedPath = VFS.normalizePath('/', cleaned);
        
        // Duplicate check
        if (submittedPaths.has(normalizedPath)) {
            return {
                status: 'duplicate',
                response: `You already submitted this file. Focus, Contractor.`
            };
        }

        // Resolve the file
        const node = VFS.resolvePath(normalizedPath);
        if (!node) {
            return {
                status: 'not_found',
                response: `File not found: ${filePath}. Check the path and try again.`
            };
        }
        if (node.type === VFS.DIR) {
            return {
                status: 'directory',
                response: `That's a directory, not a file. Submit specific files as evidence.`
            };
        }

        submittedPaths.add(normalizedPath);

        // Evaluate based on evidence tag
        if (node.evidence === 'critical') {
            submittedEvidence.push(normalizedPath);
            const count = submittedEvidence.length;
            
            if (count >= REQUIRED_EVIDENCE) {
                return {
                    status: 'critical',
                    response: `Excellent find. This is exactly what we needed.\n\n` +
                        `That should be everything. We have enough for the investigation.\n` +
                        `Run 'submit_audit' in the terminal to package your findings.`
                };
            }
            return {
                status: 'critical',
                response: `Excellent find. Flagging this for the investigation.\n\n` +
                    `Keep looking. There has to be more.`
            };
        }

        if (node.evidence === 'motive') {
            return {
                status: 'motive',
                response: `Interesting — paints a picture, but it's not proof of anything criminal on its own. ` +
                    `I need the smoking gun. Comms, tools, plans. Keep digging.`
            };
        }

        // Irrelevant file — Reeves dismisses this specific file, not files in general
        const fileName = normalizedPath.split('/').pop();
        const annoyedResponses = [
            `I looked at this. It's routine. Doesn't tell me anything about what Nedry was up to.`,
            `This is just normal park operations. I need things that tie Nedry to what happened that night.`,
            `Not what I'm looking for, Contractor. This doesn't connect to the sabotage.`,
            `I can see what this is. It's not going to help us. Think about what Nedry was hiding and where he'd hide it.`,
            `Noted, but this is a dead end. Focus on anything that looks like it was deliberately concealed or modified.`,
            `This doesn't move the needle. I need records of what Nedry did, not what the park was doing.`
        ];
        const idx = Math.floor(Math.random() * annoyedResponses.length);
        return {
            status: 'irrelevant',
            response: annoyedResponses[idx]
        };
    }

    function guessFileType(filename) {
        if (filename.endsWith('.msg')) return 'personal email';
        if (filename.endsWith('.txt')) return 'text file';
        if (filename.endsWith('.log')) return 'routine log file';
        if (filename.endsWith('.exe')) return 'system executable';
        if (filename.endsWith('.c')) return 'source code file';
        if (filename.endsWith('.sh')) return 'shell script';
        if (filename.endsWith('.dat')) return 'data file';
        if (filename.endsWith('.vax')) return 'system program';
        return 'file';
    }

    function getEvidenceCount() {
        return submittedEvidence.length;
    }

    function allEvidenceFound() {
        return submittedEvidence.length >= REQUIRED_EVIDENCE;
    }

    function getSubmittedEvidence() {
        return [...submittedEvidence];
    }

    /* ─────── MAGIC WORD LOCKOUT ─────── */
    function triggerMagicWord() {
        if (hasRootAccess) return;

        // Open a new window with the Nedry GIF — just like the movie
        const win = WindowManager.createWindow('THE KING', 'magic-word', {
            width: 420, height: 400
        });
        const body = WindowManager.getBody(win.id);
        body.style.background = '#fff';
        body.style.display = 'flex';
        body.style.alignItems = 'center';
        body.style.justifyContent = 'center';
        body.style.padding = '0';
        body.innerHTML = `<img src="nedry_king.gif" alt="Ah ah ah" style="max-width:100%;max-height:100%;display:block;" />`;

        // Play the audio on loop until the window is closed
        const audio = new Audio('magic_word.mp3');
        audio.loop = true;
        audio.volume = 0.8;
        audio.play().catch(() => {});

        // Stop audio when window is closed
        const winObj = WindowManager.getWindow(win.id);
        if (winObj) {
            winObj.cleanup = () => {
                audio.pause();
                audio.currentTime = 0;
            };
        }
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

    /* ─────── DECODE PUZZLE ─────── */
    function startDecodePuzzle(callback) {
        if (decodeActive) return;
        if (siteB_decoded) { callback(true); return; }
        decodeActive = true;

        const overlay = document.getElementById('decode-overlay');
        const hexLeft = document.getElementById('decode-hex-left');
        const hexRight = document.getElementById('decode-hex-right');
        const statusEl = document.getElementById('decode-status');
        const offsetEl = document.getElementById('decode-offset');
        const resultEl = document.getElementById('decode-result');

        overlay.classList.remove('hidden');
        resultEl.classList.add('hidden');
        statusEl.classList.remove('aligned');
        statusEl.textContent = 'MISALIGNED';

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

        let scrollInterval = setInterval(() => {
            hexLeft.scrollTop += 1;
            hexRight.scrollTop += 1;
        }, 100);

        function handleKey(e) {
            if (e.key === 'ArrowUp') {
                currentOffset++; updateStreamB();
                AudioEngine.playKeystroke(); e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                currentOffset--; updateStreamB();
                AudioEngine.playKeystroke(); e.preventDefault();
            } else if (e.key === 'Enter') {
                if (currentOffset === correctOffset) {
                    clearInterval(scrollInterval);
                    siteB_decoded = true;
                    decodeActive = false;
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

    /* ─────── SUBMIT AUDIT ENDGAME ─────── */
    function submitAudit(outputFn) {
        if (!allEvidenceFound()) {
            const count = submittedEvidence.length;
            let msg;
            if (count === 0) {
                msg = `I\'ve got nothing from you yet. I can\'t submit an empty report.\nStart digging through the file system and submit what you find via the Evidence Tracker.`;
            } else if (count < 3) {
                msg = `You\'ve sent me a few things but it\'s not enough to build a case.\nKeep looking. Check hidden directories, personal files, access logs.`;
            } else {
                msg = `We\'re getting close but there are still gaps in the picture.\nDon\'t stop now. There has to be more on that machine.`;
            }
            outputFn(`\n<span class="output-error">AUDIT SUBMISSION REJECTED</span>\n${msg}`);
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
            { text: 'Packaging evidence...', cls: '' },
            ...submittedEvidence.map(p => ({ text: `  ■ ${p}`, cls: 'output-success' })),
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
            { text: '\n  3. PURGE all evidence from:', cls: 'corporate-text' },
            { text: '     Nedry\'s workstation', cls: 'output-warning' },
            { text: '\nThe Board has determined that these materials', cls: 'corporate-text' },
            { text: 'constitute an unacceptable liability exposure.\n', cls: 'corporate-text' },
            { text: 'Your NDA covers everything you have seen.', cls: 'corporate-text' },
            { text: 'This workstation will be physically destroyed', cls: 'corporate-text' },
            { text: 'within 48 hours of your departure.\n', cls: 'corporate-text' },
            { text: 'Thank you for your service, Contractor.', cls: 'corporate-text' },
            { text: 'Your final payment has been wired.\n', cls: 'corporate-text' },
            { text: '— InGen Legal, Board Resolution 93-1147\n', cls: 'corporate-text' },
            { text: '═══════════════════════════════════════════════', cls: '' },
            { text: '\nExecuting corporate directives...', cls: 'output-warning' },
            { text: '  Moving files to /dev/sda4/hidden/ ... DONE', cls: 'output-dim' },
            { text: '  Wiping logs ... DONE', cls: 'output-dim' },
            { text: '  Purging evidence ... DONE', cls: 'output-dim' },
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

    /* ─────── EVIDENCE TRACKER WINDOW ─────── */
    function openEvidenceTracker() {
        const win = WindowManager.createWindow('Evidence Tracker', 'evidence', {
            width: 480, height: 420, singleInstance: 'evidence-tracker'
        });
        const body = WindowManager.getBody(win.id);
        body.classList.add('evidence-tracker-body');

        const count = submittedEvidence.length;
        body.innerHTML = `
            <div class="evidence-header">
                <span class="evidence-title">INGEN FORENSIC EVIDENCE TRACKER</span>
            </div>
            <div class="evidence-submit-bar">
                <input type="text" class="evidence-input" id="${win.id}-input" 
                    placeholder="Enter file path (e.g. /usr/nedry/mail/file.msg)" 
                    autocomplete="off" spellcheck="false">
                <button class="evidence-btn" id="${win.id}-btn">SUBMIT</button>
            </div>
            <div class="evidence-log" id="${win.id}-log">
                <div class="evidence-log-header">── Submission Log ──</div>
            </div>`;

        const input = document.getElementById(`${win.id}-input`);
        const btn = document.getElementById(`${win.id}-btn`);
        const log = document.getElementById(`${win.id}-log`);

        function handleSubmit() {
            const path = input.value.trim();
            if (!path) return;
            input.value = '';

            const result = evaluateSubmission(path);
            const entry = document.createElement('div');
            entry.className = `evidence-entry evidence-${result.status}`;

            // Evidence tracker just shows the path + transmission status
            entry.innerHTML = `
                <div class="evidence-entry-path">▸ ${path}</div>
                <div class="evidence-entry-response" id="entry-status-${Date.now()}">Transmitting...</div>`;
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;

            const statusEl = entry.querySelector('.evidence-entry-response');

            // After a short delay, update status and route response to talk window
            const sendDelay = 2000 + Math.random() * 2000; // 2-4 seconds
            setTimeout(() => {
                // Update tracker status
                if (result.status === 'critical') {
                    statusEl.textContent = 'Received — flagged for review';
                    statusEl.style.color = 'var(--crt-green)';
                    AudioEngine.playSuccess();
                } else if (result.status === 'motive') {
                    statusEl.textContent = 'Received — under review';
                    statusEl.style.color = 'var(--crt-amber)';
                } else if (result.status === 'duplicate') {
                    statusEl.textContent = 'Already submitted';
                    statusEl.style.color = '#666';
                } else if (result.status === 'not_found' || result.status === 'directory') {
                    statusEl.textContent = 'Error — invalid path';
                    statusEl.style.color = '#666';
                } else {
                    statusEl.textContent = 'Received — under review';
                    statusEl.style.color = '#888';
                }

                // Boss responds via talk window after another brief pause
                const responseDelay = 1500 + Math.random() * 2000; // 1.5-3.5 seconds
                setTimeout(() => {
                    // Open talk window if not already open, then send response
                    Terminal.openTalkReeves(result.response);
                }, responseDelay);

            }, sendDelay);
        }

        btn.addEventListener('click', handleSubmit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSubmit();
        });
        setTimeout(() => input.focus(), 100);
    }

    /* ─────── MISSION BRIEFING ─────── */
    function showMissionBriefing() {
        const overlay = document.createElement('div');
        overlay.className = 'briefing-overlay';
        overlay.id = 'mission-briefing';
        overlay.innerHTML = `
            <div class="briefing-window">
                <div class="briefing-titlebar">
                    <span>📋 INGEN SECURITY — FIELD BRIEF #93-7130</span>
                </div>
                <div class="briefing-content">
                    <pre class="briefing-text">CLASSIFICATION: CONFIDENTIAL
DISTRIBUTION: CONTRACTOR EYES ONLY
────────────────────────────────────

Contractor,

You've been brought in to perform a digital
forensic audit of Workstation NEDRY-WS01.

THE SITUATION:
  Dennis Nedry, InGen's lead systems programmer,
  is deceased as of 06/12/1993. On the night of
  June 11-12, critical security infrastructure
  failed simultaneously. We don't believe it was
  a coincidence. Your job is to prove it.

WHAT WE NEED:
  Evidence of sabotage, espionage, or criminal
  conspiracy. If Nedry was working with someone,
  we need to know who, what, and how.

YOUR WORKSTATION:
  You have full access to Nedry's machine. The
  filesystem is laid out as follows:

    /sys    System files, park operations
    /usr    User home directories
    /lab    Genetics lab & veterinary records
    /log    System logs, access records
    /bin    Executables
    /dev    Hardware interfaces
    /comms  Communications archives

  Standard Unix tools are at your disposal — ls,
  cd, cat, grep. Type 'help' if you need a full
  command reference.

  A skilled programmer wouldn't leave evidence
  in plain sight. Think about what you'd hide
  and where you'd hide it. Check permissions,
  timestamps, anything that looks out of place.

SUBMIT FINDINGS:
  Open the Evidence Tracker (type 'evidence')
  and submit file paths as you find them. I'll
  review each submission and tell you whether
  it's actionable.

  Don't waste my time with routine files. I
  need proof, not someone's lunch schedule.

COMMUNICATION:
  Reach me anytime: type 'talk reeves'

  — M. Reeves
    InGen Security Division</pre>
                    <button class="briefing-btn" id="briefing-ack">ACKNOWLEDGED</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        document.getElementById('briefing-ack').addEventListener('click', () => {
            overlay.remove();
        });
    }

    return {
        evaluateSubmission,
        getEvidenceCount,
        allEvidenceFound,
        getSubmittedEvidence,
        triggerMagicWord,
        tryRootAccess,
        canAccessRoot,
        isMagicWordActive,
        startDecodePuzzle,
        isSiteBDecoded,
        submitAudit,
        openEvidenceTracker,
        showMissionBriefing,
        REQUIRED_EVIDENCE
    };
})();
