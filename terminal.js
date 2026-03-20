/* ============================================================
   TC-SHELL — Interactive Unix-lite terminal
   ============================================================ */

const Terminal = (() => {
    let cwd = '/';
    let history = [];
    let historyIdx = -1;
    let activeTerminalId = null;

    function spawn(windowId) {
        activeTerminalId = windowId;
        const body = WindowManager.getBody(windowId);
        body.classList.add('terminal-body');
        body.innerHTML = `<div class="terminal-output" id="${windowId}-output"></div>
            <div class="terminal-input-line">
                <span class="terminal-prompt" id="${windowId}-prompt">root@jp-server:${cwd}# </span>
                <input type="text" class="terminal-input" id="${windowId}-input" autocomplete="off" spellcheck="false" autofocus>
            </div>`;

        const input = document.getElementById(`${windowId}-input`);
        const output = document.getElementById(`${windowId}-output`);

        // Welcome message
        appendOutput(output, `<span class="output-header">Jurassic Park (TM) System — TC Shell v4.0.5</span>
<span class="output-dim">InGen Corp. Workstation NEDRY-WS01</span>
<span class="output-dim">Type 'help' for available commands.</span>\n`);

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = input.value.trim();
                if (cmd) {
                    history.push(cmd);
                    historyIdx = history.length;
                }
                appendOutput(output, `<span class="terminal-prompt">${getPrompt()}</span>${escapeHtml(cmd)}`);
                input.value = '';
                if (cmd) processCommand(cmd, output, windowId);
                body.scrollTop = body.scrollHeight;
                AudioEngine.playKeystroke();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (historyIdx > 0) { historyIdx--; input.value = history[historyIdx]; }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIdx < history.length - 1) { historyIdx++; input.value = history[historyIdx]; }
                else { historyIdx = history.length; input.value = ''; }
            } else {
                AudioEngine.playKeystroke();
            }
        });

        // Focus input when clicking terminal body
        body.addEventListener('click', () => input.focus());
        setTimeout(() => input.focus(), 100);
    }

    function getPrompt() {
        return `root@jp-server:${cwd}# `;
    }

    function updatePrompt(windowId) {
        const prompt = document.getElementById(`${windowId}-prompt`);
        if (prompt) prompt.textContent = getPrompt();
    }

    function appendOutput(outputEl, html) {
        outputEl.innerHTML += html + '\n';
        outputEl.parentElement.scrollTop = outputEl.parentElement.scrollHeight;
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function processCommand(cmdStr, output, windowId) {
        const parts = cmdStr.match(/(?:[^\s"]+|"[^"]*")/g) || [];
        const cmd = parts[0]?.toLowerCase();
        const args = parts.slice(1).map(a => a.replace(/"/g, ''));

        switch (cmd) {
            case 'help': case 'man': cmdHelp(output); break;
            case 'ls': cmdLs(output, args); break;
            case 'cd': cmdCd(output, args, windowId); break;
            case 'pwd': appendOutput(output, cwd); break;
            case 'cat': cmdCat(output, args); break;
            case 'grep': cmdGrep(output, args); break;
            case 'clear': cmdClear(windowId); break;
            case 'binwalk': cmdBinwalk(output, args); break;
            case 'decode': cmdDecode(output, args); break;
            case 'vitals': cmdVitals(output, args); break;
            case 'ledger': cmdLedger(); break;
            case 'submit_audit': cmdSubmitAudit(output); break;
            case 'evidence': Puzzles.openEvidenceTracker(); break;
            case 'talk': cmdTalk(output, args); break;
            case 'brief': Puzzles.showMissionBriefing(); break;
            case 'whoami': appendOutput(output, '<span class="output-info">contractor_forensics (InGen Security Clearance: Level 4)</span>'); break;
            case 'date': appendOutput(output, '<span class="output-info">Sat Jun 12 04:15:33 CST 1993</span>'); break;
            case 'uname':
                appendOutput(output, '<span class="output-info">IRIX 5.3 jp-server 4D/480 mips</span>');
                break;
            case 'access':
                if (args[0] === '/sys/root' && args[1]) {
                    if (Puzzles.tryRootAccess(args[1])) {
                        appendOutput(output, '<span class="output-success">ACCESS GRANTED — Root directory unlocked.</span>');
                        AudioEngine.playSuccess();
                    } else {
                        appendOutput(output, '<span class="output-error">ACCESS DENIED — Invalid bypass token.</span>');
                        AudioEngine.playError();
                    }
                } else {
                    appendOutput(output, '<span class="output-dim">Usage: access /sys/root [TOKEN]</span>');
                }
                break;
            default:
                appendOutput(output, `<span class="output-error">sh: ${escapeHtml(cmd)}: command not found</span>`);
                break;
        }
    }

    /* --- HELP --- */
    function cmdHelp(output) {
        appendOutput(output, `<span class="output-header">═══ JP FORENSIC WORKSTATION — COMMAND REFERENCE ═══</span>

<span class="text-amber">NAVIGATION:</span>
  <span class="text-cyan">ls [-l] [-a]</span>    List directory contents
                   <span class="output-dim">-l for details, -a to show hidden files</span>
  <span class="text-cyan">cd [path]</span>        Change directory
  <span class="text-cyan">pwd</span>              Print working directory
  <span class="text-cyan">cat [file]</span>       Print file contents
  <span class="text-cyan">grep [str] [path]</span> Search files for keywords
  <span class="text-cyan">clear</span>            Clear terminal

<span class="text-amber">FORENSIC TOOLS:</span>
  <span class="text-cyan">binwalk [file]</span>   Scan for hidden data offsets
  <span class="text-cyan">decode [file] --align</span>  Bit-alignment recovery tool
  <span class="text-cyan">vitals [paddock]</span> Open telemetry for a paddock

<span class="text-amber">CASE MANAGEMENT:</span>
  <span class="text-cyan">evidence</span>         Open Evidence Tracker window
  <span class="text-cyan">brief</span>            Re-read the mission briefing
  <span class="text-cyan">ledger</span>           Open persistent Case Notes
  <span class="text-cyan">talk reeves</span>      Contact your handler
  <span class="text-cyan">submit_audit</span>     Package evidence (endgame)

<span class="text-amber">SYSTEM:</span>
  <span class="text-cyan">access [path] [token]</span>  Authenticate with bypass token
  <span class="text-cyan">whoami</span>           Display user identity
  <span class="text-cyan">date</span>             Display system date
  <span class="text-cyan">uname</span>            Display system info`);
    }

    /* --- LS --- */
    function cmdLs(output, args) {
        let targetPath = cwd;
        let longFormat = false;
        let showAll = false;

        for (const arg of args) {
            if (arg.startsWith('-')) {
                if (arg.includes('l')) longFormat = true;
                if (arg.includes('a')) showAll = true;
            } else {
                targetPath = VFS.normalizePath(cwd, arg);
            }
        }

        // Check root access
        if (targetPath.startsWith('/sys/root') && !Puzzles.canAccessRoot()) {
            Puzzles.triggerMagicWord();
            return;
        }

        const node = VFS.resolvePath(targetPath);
        if (!node) {
            appendOutput(output, `<span class="output-error">ls: cannot access '${escapeHtml(targetPath)}': No such file or directory</span>`);
            return;
        }
        if (node.type !== VFS.DIR) {
            appendOutput(output, escapeHtml(targetPath.split('/').pop()));
            return;
        }

        const entries = VFS.listDir(node);
        if (!entries || entries.length === 0) {
            appendOutput(output, '<span class="output-dim">(empty directory)</span>');
            return;
        }

        // Filter hidden dotfiles unless -a flag is set
        const visibleEntries = showAll ? entries : entries.filter(e => !e.name.startsWith('.'));

        if (longFormat) {
            let lines = [`<span class="output-dim">total ${visibleEntries.length}</span>`];
            for (const e of visibleEntries) {
                const typeChar = e.type === VFS.DIR ? 'd' : '-';
                const perms = e.type === VFS.DIR ? 'rwxr-xr-x' : 'rw-r--r--';
                const size = (e.size || '0').padStart(6);
                const mod = (e.modified || '').padEnd(16);
                const name = e.type === VFS.DIR
                    ? `<span class="text-cyan">${escapeHtml(e.name)}/</span>`
                    : escapeHtml(e.name);
                const lock = e.locked ? ' <span class="output-error">[LOCKED]</span>' : '';
                lines.push(`${typeChar}${perms}  root  ${size}  ${mod}  ${name}${lock}`);
            }
            appendOutput(output, lines.join('\n'));
        } else {
            const names = visibleEntries.map(e => {
                if (e.type === VFS.DIR) return `<span class="text-cyan">${escapeHtml(e.name)}/</span>`;
                return escapeHtml(e.name);
            });
            appendOutput(output, names.join('  '));
        }
    }

    /* --- TALK --- */
    // Persist chat messages across window close/reopen
    let talkHistory = [];

    function cmdTalk(output, args, injectedMessage) {
        if (!args[0] || args[0].toLowerCase() !== 'reeves') {
            appendOutput(output, '<span class="output-dim">Usage: talk reeves</span>');
            return;
        }

        const win = WindowManager.createWindow('talk — M. Reeves @ InGen', 'talk', {
            width: 520, height: 380, singleInstance: 'talk-reeves'
        });
        const body = WindowManager.getBody(win.id);
        body.classList.add('talk-body');

        body.innerHTML = `
            <div class="talk-header">[Connection to reeves@ingen.com established]</div>
            <div class="talk-split">
                <div class="talk-pane">
                    <div class="talk-label">[ M. Reeves — InGen Security ]</div>
                    <div class="talk-messages" id="${win.id}-boss"></div>
                </div>
                <div class="talk-divider"></div>
                <div class="talk-pane">
                    <div class="talk-label">[ Contractor — Forensics ]</div>
                    <div class="talk-input-area">
                        <input type="text" class="talk-input" id="${win.id}-input" 
                            placeholder="Type a message..." autocomplete="off" spellcheck="false">
                    </div>
                </div>
            </div>`;

        const bossPane = document.getElementById(`${win.id}-boss`);
        const talkInput = document.getElementById(`${win.id}-input`);

        // Restore previous messages
        if (talkHistory.length > 0) {
            talkHistory.forEach(msg => {
                const el = document.createElement('div');
                el.className = msg.isPlayer ? 'talk-msg talk-player' : 'talk-msg';
                el.textContent = msg.text;
                bossPane.appendChild(el);
            });
            bossPane.scrollTop = bossPane.scrollHeight;
        }

        // Type out boss message with natural "jazz" cadence
        // Variable speed: bursts of fast typing, pauses at punctuation,
        // slight hesitation at word starts, occasional typo + correction
        function typeMessage(text, callback) {
            const msgEl = document.createElement('div');
            msgEl.className = 'talk-msg';
            bossPane.appendChild(msgEl);
            let i = 0;
            let currentText = '';

            function getDelay(char, nextChar, prevChar) {
                // Long pauses after sentence-ending punctuation
                if ('.!?'.includes(char)) return 180 + Math.random() * 300;
                // Medium pause after commas, dashes
                if (',;:—–'.includes(char)) return 100 + Math.random() * 150;
                // Slight pause at start of new word (thinking)
                if (prevChar === ' ') return 60 + Math.random() * 100;
                // Fast burst for common letter sequences
                if ('etaoinshrdlu'.includes(char.toLowerCase())) return 25 + Math.random() * 35;
                // Slightly slower for less common chars  
                return 35 + Math.random() * 55;
            }

            function shouldTypo() {
                // ~3% chance per character, never on spaces/punctuation
                return Math.random() < 0.03;
            }

            function getTypoChar(intended) {
                // Pick an adjacent key on QWERTY
                const neighbors = {
                    'a':'sq','b':'vn','c':'xv','d':'sf','e':'wr','f':'dg',
                    'g':'fh','h':'gj','i':'uo','j':'hk','k':'jl','l':'k;',
                    'm':'n,','n':'bm','o':'ip','p':'o[','q':'wa','r':'et',
                    's':'ad','t':'ry','u':'yi','v':'cb','w':'qe','x':'zc',
                    'y':'tu','z':'xa'
                };
                const key = intended.toLowerCase();
                const adj = neighbors[key];
                if (!adj) return intended;
                const typoChar = adj[Math.floor(Math.random() * adj.length)];
                return intended === intended.toUpperCase() ? typoChar.toUpperCase() : typoChar;
            }

            function typeNext() {
                if (i >= text.length) {
                    bossPane.scrollTop = bossPane.scrollHeight;
                    talkHistory.push({ text: text, isPlayer: false });
                    if (callback) setTimeout(callback, 500);
                    return;
                }

                const char = text[i];
                const prevChar = i > 0 ? text[i-1] : '';
                const nextChar = i < text.length - 1 ? text[i+1] : '';

                // Occasional typo on letters only
                if (char.match(/[a-zA-Z]/) && shouldTypo() && i > 5) {
                    const wrong = getTypoChar(char);
                    currentText += wrong;
                    msgEl.textContent = currentText;
                    bossPane.scrollTop = bossPane.scrollHeight;

                    // Pause — "notice" the typo
                    setTimeout(() => {
                        // Backspace
                        currentText = currentText.slice(0, -1);
                        msgEl.textContent = currentText;

                        // Brief pause, then type correct char
                        setTimeout(() => {
                            currentText += char;
                            msgEl.textContent = currentText;
                            bossPane.scrollTop = bossPane.scrollHeight;
                            i++;
                            setTimeout(typeNext, getDelay(char, nextChar, prevChar));
                        }, 60 + Math.random() * 40);
                    }, 150 + Math.random() * 200);
                    return;
                }

                currentText += char;
                msgEl.textContent = currentText;
                bossPane.scrollTop = bossPane.scrollHeight;
                i++;
                setTimeout(typeNext, getDelay(char, nextChar, prevChar));
            }

            // Initial pause before typing (like focusing on keyboard)
            setTimeout(typeNext, 400 + Math.random() * 300);
        }

        // Store reference for external message injection
        activeTalk = { bossPane, typeMessage };

        // Only show greeting / injected message if this is a fresh chat (no history)
        if (talkHistory.length === 0) {
            if (injectedMessage) {
                setTimeout(() => typeMessage(injectedMessage), 800);
            } else {
                const count = Puzzles.getEvidenceCount();
                let greeting;
                if (count === 0) {
                    greeting = `Reeves here. Find anything yet? That workstation should have plenty to dig through. Remember — look for hidden files, suspicious programs, anything that doesn't belong on a park management system. Use 'ls -a' to check for hidden directories.`;
                } else if (count < 3) {
                    greeting = `Good work so far, Contractor. ${count} piece${count > 1 ? 's' : ''} submitted. Keep digging. Nedry was the sole systems programmer — if he was planning something, the evidence is on that machine somewhere. Check his personal directories carefully.`;
                } else if (count < 5) {
                    greeting = `We're building a strong case. Just need a bit more and we'll have enough to present to the board. You're close.`;
                } else {
                    greeting = `That's everything we need, Contractor. Run 'submit_audit' in the terminal to package your findings and transmit them. Outstanding work.`;
                }
                setTimeout(() => typeMessage(greeting), 800);
            }
        } else if (injectedMessage) {
            // History exists but we got a new injected message (e.g. evidence submission)
            setTimeout(() => typeMessage(injectedMessage), 800);
        }

        // Handle player messages
        talkInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && talkInput.value.trim()) {
                const playerMsg = talkInput.value.trim();
                talkInput.value = '';
                
                const playerEl = document.createElement('div');
                playerEl.className = 'talk-msg talk-player';
                playerEl.textContent = `> ${playerMsg}`;
                bossPane.appendChild(playerEl);
                bossPane.scrollTop = bossPane.scrollHeight;
                talkHistory.push({ text: `> ${playerMsg}`, isPlayer: true });

                // Boss auto-response
                setTimeout(() => {
                    const responses = [
                        'Copy that. Keep searching.',
                        'Understood. Focus on the evidence.',
                        'Roger. Stay on task.',
                        `We need ${5 - Puzzles.getEvidenceCount()} more pieces. Keep at it.`,
                        'Check hidden directories. Programmers always hide things.',
                        'Read everything carefully. Not all evidence is obvious.'
                    ];
                    const resp = responses[Math.floor(Math.random() * responses.length)];
                    typeMessage(resp);
                }, 1000);
            }
        });
        setTimeout(() => talkInput.focus(), 100);
    }

    /* --- CD --- */
    function cmdCd(output, args, windowId) {
        if (!args[0]) {
            // No args = go up one folder
            if (cwd !== '/') {
                cwd = cwd.split('/').slice(0, -1).join('/') || '/';
            }
            updatePrompt(windowId);
            return;
        }
        const target = VFS.normalizePath(cwd, args[0]);

        // Check root access
        if (target.startsWith('/sys/root') && !Puzzles.canAccessRoot()) {
            Puzzles.triggerMagicWord();
            return;
        }

        const node = VFS.resolvePath(target);
        if (!node) {
            appendOutput(output, `<span class="output-error">cd: ${escapeHtml(args[0])}: No such directory</span>`);
            return;
        }
        if (node.type !== VFS.DIR) {
            appendOutput(output, `<span class="output-error">cd: ${escapeHtml(args[0])}: Not a directory</span>`);
            return;
        }
        cwd = target;
        updatePrompt(windowId);
    }

    /* --- CAT --- */
    function cmdCat(output, args) {
        if (!args[0]) {
            appendOutput(output, '<span class="output-dim">Usage: cat [file]</span>');
            return;
        }
        const path = VFS.normalizePath(cwd, args[0]);

        // Check root access
        if (path.startsWith('/sys/root') && !Puzzles.canAccessRoot()) {
            Puzzles.triggerMagicWord();
            return;
        }

        const node = VFS.resolvePath(path);
        if (!node) {
            appendOutput(output, `<span class="output-error">cat: ${escapeHtml(args[0])}: No such file</span>`);
            return;
        }
        if (node.type === VFS.DIR) {
            appendOutput(output, `<span class="output-error">cat: ${escapeHtml(args[0])}: Is a directory</span>`);
            return;
        }

        // Check if corrupted
        if (node.corrupted) {
            appendOutput(output, `<span class="output-warning">${escapeHtml(node.content)}</span>`);
            return;
        }

        appendOutput(output, escapeHtml(node.content));
    }

    /* --- GREP --- */
    function cmdGrep(output, args) {
        if (args.length < 1) {
            appendOutput(output, '<span class="output-dim">Usage: grep [string] [path]</span>');
            return;
        }
        const searchStr = args[0];
        const searchPath = args[1] ? VFS.normalizePath(cwd, args[1].replace('*', '')) : cwd;

        const results = VFS.grepFiles(searchStr, searchPath);
        if (results.length === 0) {
            appendOutput(output, `<span class="output-dim">No matches found for "${escapeHtml(searchStr)}"</span>`);
            return;
        }

        const lines = results.map(r =>
            `<span class="text-cyan">${escapeHtml(r.file)}</span>:<span class="output-dim">${r.line}:</span> ${escapeHtml(r.content)}`
        );
        appendOutput(output, lines.join('\n'));
    }

    /* --- BINWALK --- */
    function cmdBinwalk(output, args) {
        if (!args[0]) {
            appendOutput(output, '<span class="output-dim">Usage: binwalk [file]</span>');
            return;
        }
        const path = VFS.normalizePath(cwd, args[0]);
        const node = VFS.resolvePath(path);
        if (!node || node.type === VFS.DIR) {
            appendOutput(output, `<span class="output-error">binwalk: ${escapeHtml(args[0])}: Invalid target</span>`);
            return;
        }

        appendOutput(output, `<span class="output-header">BINWALK v2.3.1 — Firmware/Steganography Analysis</span>
Scanning: ${escapeHtml(args[0])}...

<span class="text-amber">DECIMAL       HEXADECIMAL     DESCRIPTION</span>
──────────────────────────────────────────────────────`);

        if (node.corrupted) {
            appendOutput(output, `0             0x00000000      Data (corrupted header)
1024          0x00000400      JFIF marker (invalid)
4096          0x00001000      Data block (misaligned +7)
8192          0x00002000      Data block (misaligned +7)
12288         0x00003000      Embedded document header
16384         0x00004000      End of recoverable data

<span class="output-warning">WARNING: File header is corrupted. Data offset mismatch detected.</span>
<span class="output-warning">Recoverable with bit-alignment tool.</span>
<span class="output-info">Suggested: decode ${escapeHtml(args[0])} --align</span>`);
        } else {
            appendOutput(output, `0             0x00000000      Text document header
${(node.content?.length || 0).toString().padStart(14)}  ${('0x' + (node.content?.length || 0).toString(16).toUpperCase()).padEnd(16)}End of file

<span class="output-dim">No hidden data offsets detected.</span>`);
        }
    }

    /* --- DECODE --- */
    function cmdDecode(output, args) {
        if (!args[0]) {
            appendOutput(output, '<span class="output-dim">Usage: decode [file] --align</span>');
            return;
        }
        if (!args.includes('--align')) {
            appendOutput(output, '<span class="output-dim">decode: requires --align flag for bit-alignment mode</span>');
            return;
        }

        const path = VFS.normalizePath(cwd, args[0]);
        const node = VFS.resolvePath(path);
        if (!node || !node.corrupted) {
            appendOutput(output, `<span class="output-error">decode: ${escapeHtml(args[0])}: File is not corrupted or does not exist</span>`);
            return;
        }

        appendOutput(output, `<span class="output-header">DECODE — Bit Alignment Recovery Tool v2.1</span>
Loading file data...
Launching alignment interface...`);

        Puzzles.startDecodePuzzle((success) => {
            if (success) {
                // Mark file as decoded
                node.corrupted = false;
                node.content = node.decoded_content;
                appendOutput(output, `\n<span class="output-success">File successfully recovered: ${escapeHtml(args[0])}</span>
<span class="output-info">Use 'cat ${escapeHtml(args[0])}' to view contents.</span>`);
            } else {
                appendOutput(output, `\n<span class="output-warning">Decode aborted.</span>`);
            }
        });
    }

    /* --- VITALS --- */
    function cmdVitals(output, args) {
        if (!args[0]) {
            appendOutput(output, `<span class="output-dim">Usage: vitals [paddock_id]</span>
<span class="output-dim">Available: rex, raptor, trike, brachio, dilopho, stego, galli, compy</span>`);
            return;
        }

        const paddockData = {
            rex: { name: 'Tyrannosaurus Rex — Paddock 01', fence: '10,000V', status: 'CONTAINED', heartRate: '45 BPM', temp: '101.2°F', activity: 'RESTING', feeding: '06/11 18:00', weight: '6.8 tons', alert: false },
            raptor: { name: 'Velociraptor Pack — Paddock 12', fence: '10,000V', status: 'CONTAINED', heartRate: '120 BPM', temp: '99.8°F', activity: 'ACTIVE — Fence testing', feeding: '06/11 16:00', weight: '150kg (avg)', alert: true },
            trike: { name: 'Triceratops — Paddock 03', fence: '5,000V', status: 'CONTAINED', heartRate: '38 BPM', temp: '100.4°F', activity: 'ILL — Under observation', feeding: '06/11 12:00', weight: '4.2 tons', alert: true },
            brachio: { name: 'Brachiosaurus — Paddock 02', fence: '2,000V', status: 'CONTAINED', heartRate: '22 BPM', temp: '99.2°F', activity: 'GRAZING', feeding: 'Free-range', weight: '33 tons', alert: false },
            dilopho: { name: 'Dilophosaurus — Paddock 04', fence: '7,500V', status: 'CONTAINED', heartRate: '88 BPM', temp: '98.6°F', activity: 'STALKING (near maint bay)', feeding: '06/11 14:00', weight: '400kg', alert: false },
            stego: { name: 'Stegosaurus — Paddock 06', fence: '3,000V', status: 'CONTAINED', heartRate: '30 BPM', temp: '100.1°F', activity: 'RESTING', feeding: '06/11 10:00', weight: '3.1 tons', alert: false },
            galli: { name: 'Gallimimus — Paddock 05', fence: '5,000V', status: 'POSSIBLE BREACH', heartRate: '155 BPM', temp: '101.0°F', activity: 'FLOCK MOVEMENT', feeding: '06/11 08:00', weight: '200kg (avg)', alert: true },
            compy: { name: 'Compsognathus — Paddock 08', fence: '1,000V', status: 'BREACH CONFIRMED', heartRate: '210 BPM', temp: '100.8°F', activity: 'FREE RANGE', feeding: 'Self-sufficient', weight: '3kg (avg)', alert: true }
        };

        const id = args[0].toLowerCase();
        const p = paddockData[id];
        if (!p) {
            appendOutput(output, `<span class="output-error">vitals: Unknown paddock ID '${escapeHtml(args[0])}'</span>`);
            return;
        }

        const statusCls = p.alert ? 'output-warning' : 'output-success';
        appendOutput(output, `<span class="output-header">═══ LIVE TELEMETRY — ${escapeHtml(p.name)} ═══</span>

  Fence Voltage:  ${p.fence}
  Status:         <span class="${statusCls}">${p.status}</span>
  Heart Rate:     ${p.heartRate}
  Body Temp:      ${p.temp}
  Activity:       ${p.activity}
  Last Feeding:   ${p.feeding}
  Est. Weight:    ${p.weight}
  Alert Level:    ${p.alert ? '<span class="output-error">▲ ELEVATED</span>' : '<span class="output-success">● NORMAL</span>'}`);
    }

    /* --- LEDGER --- */
    function cmdLedger() {
        const win = WindowManager.createWindow('Case_Notes.md — Ledger', 'ledger', { width: 500, height: 450, singleInstance: 'ledger' });
        const body = WindowManager.getBody(win.id);
        const saved = localStorage.getItem('nedry_audit_notes') || '# Case Notes — Project 713\n# InGen Digital Forensics Audit\n# ──────────────────────────────\n\n';

        body.innerHTML = `<div class="ledger-body">
            <div class="ledger-toolbar">
                <button class="ledger-btn" id="${win.id}-save">💾 Save</button>
                <button class="ledger-btn" id="${win.id}-clear">Clear</button>
                <span class="output-dim" id="${win.id}-status" style="margin-left:auto;padding:2px 8px;font-size:11px;">Saved to localStorage</span>
            </div>
            <textarea class="ledger-textarea" id="${win.id}-text">${escapeHtml(saved)}</textarea>
        </div>`;

        const textarea = document.getElementById(`${win.id}-text`);
        const statusEl = document.getElementById(`${win.id}-status`);

        document.getElementById(`${win.id}-save`).addEventListener('click', () => {
            localStorage.setItem('nedry_audit_notes', textarea.value);
            statusEl.textContent = 'Saved ✓';
            setTimeout(() => statusEl.textContent = 'Saved to localStorage', 2000);
        });

        document.getElementById(`${win.id}-clear`).addEventListener('click', () => {
            if (confirm('Clear all notes?')) {
                textarea.value = '';
                localStorage.removeItem('nedry_audit_notes');
            }
        });

        // Auto-save on change
        textarea.addEventListener('input', () => {
            localStorage.setItem('nedry_audit_notes', textarea.value);
            statusEl.textContent = 'Auto-saved';
        });
    }

    /* --- SUBMIT AUDIT --- */
    function cmdSubmitAudit(output) {
        Puzzles.submitAudit((html) => appendOutput(output, html));
    }

    /* --- CLEAR --- */
    function cmdClear(windowId) {
        const output = document.getElementById(`${windowId}-output`);
        if (output) output.innerHTML = '';
    }

    /* --- PUBLIC: open talk window from outside, optionally inject a message --- */
    // Track active talk window for message injection
    let activeTalk = null; // { bossPane, typeMessage }

    function openTalkReeves(message) {
        // If talk window already exists and we have a message, just inject it
        if (activeTalk && activeTalk.bossPane && document.body.contains(activeTalk.bossPane)) {
            if (message) {
                activeTalk.typeMessage(message);
            }
            return;
        }

        // Otherwise open a new talk window
        const dummy = document.createElement('div');
        cmdTalk(dummy, ['reeves'], message);
    }

    return { spawn, cwd: () => cwd, openTalkReeves };
})();
