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
            case 'evidence': appendOutput(output, Puzzles.getEvidenceStatus()); break;
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
  <span class="text-cyan">ls [-l]</span>          List directory contents
                   <span class="output-dim">-l flag reveals "last modified" timestamps</span>
  <span class="text-cyan">cd [path]</span>        Change directory
  <span class="text-cyan">pwd</span>              Print working directory
  <span class="text-cyan">cat [file]</span>       Print file contents
  <span class="text-cyan">grep [str] [path]</span> Search files for keywords
  <span class="text-cyan">clear</span>            Clear terminal

<span class="text-amber">FORENSIC TOOLS:</span>
  <span class="text-cyan">binwalk [file]</span>   Scan for hidden data offsets (Steganography)
  <span class="text-cyan">decode [file] --align</span>  Bit-alignment tool for corrupted files
  <span class="text-cyan">vitals [paddock]</span> Open telemetry for a specific paddock

<span class="text-amber">CASE MANAGEMENT:</span>
  <span class="text-cyan">ledger</span>           Open persistent Case_Notes.md
  <span class="text-cyan">evidence</span>         View collected evidence flags
  <span class="text-cyan">submit_audit</span>     Package discovered evidence (endgame)

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

        for (const arg of args) {
            if (arg === '-l' || arg === '-la' || arg === '-al') longFormat = true;
            else targetPath = VFS.normalizePath(cwd, arg);
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

        if (longFormat) {
            let lines = [`<span class="output-dim">total ${entries.length}</span>`];
            for (const e of entries) {
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
            const names = entries.map(e => {
                if (e.type === VFS.DIR) return `<span class="text-cyan">${escapeHtml(e.name)}/</span>`;
                return escapeHtml(e.name);
            });
            appendOutput(output, names.join('  '));
        }
    }

    /* --- CD --- */
    function cmdCd(output, args, windowId) {
        if (!args[0]) { cwd = '/'; updatePrompt(windowId); return; }
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

        // Check for evidence
        if (Puzzles.checkFileEvidence(node)) {
            appendOutput(output, `\n<span class="output-success">>>> EVIDENCE FLAG DISCOVERED <<<</span>`);
            appendOutput(output, `<span class="output-success">Use 'evidence' to view all collected flags.</span>`);
        }
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

    return { spawn, cwd: () => cwd };
})();
