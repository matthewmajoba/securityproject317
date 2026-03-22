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
                    greeting = `Good work so far, Contractor. I've reviewed what you've sent. Keep digging — Nedry was the sole systems programmer. If he was planning something, it would be on that machine. Check his personal directories carefully.`;
                } else if (count < 5) {
                    greeting = `We're building a strong case. I think there's still more to find, but you're getting close. Don't stop now.`;
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

                // Keyword-aware response system
                setTimeout(() => {
                    const resp = getReevesResponse(playerMsg);
                    typeMessage(resp);
                }, 1000);
            }
        });
        setTimeout(() => talkInput.focus(), 100);
    }

    /* ─────── REEVES KEYWORD INTELLIGENCE ─────── */
    function getReevesResponse(msg) {
        const m = msg.toLowerCase();
        const count = Puzzles.getEvidenceCount();
        const remaining = 5 - count;

        // Keyword → response pools (picks random from matching pool)
        const rules = [
            // Terminal commands & navigation
            { keys: ['how', 'command', 'commands', 'what do i', 'what can i'],
              pool: [
                'Type "help" in the terminal. That\'ll show you what you can work with.',
                'The terminal responds to standard Unix. ls, cd, cat — the basics.',
                'You\'ve got a full shell at your disposal. Start with "help" if you\'re lost.'
              ]},
            { keys: ['ls', 'list', 'files', 'directory', 'folder'],
              pool: [
                'Use "ls" to list contents. And remember — not everything is visible by default.',
                '"ls" shows you what\'s in a directory. Pay attention to what you find.',
                'Some directories have more than what meets the eye. That\'s all I\'ll say.'
              ]},
            { keys: ['hidden', 'invisible', 'can\'t find', 'cant find', 'nothing there', 'empty'],
              pool: [
                'Programmers hide things. It\'s what they do.',
                'If a folder looks empty, maybe you\'re not looking hard enough.',
                'Not everything is out in the open. Think like a systems programmer.'
              ]},
            { keys: ['cd', 'navigate', 'go to', 'move', 'change dir'],
              pool: [
                '"cd" followed by the folder name. Standard stuff.',
                'Navigate with "cd". Use "cd .." to go back up.',
                'You can move through the file system with "cd". Check every level.'
              ]},
            { keys: ['cat', 'read', 'open file', 'view file', 'contents'],
              pool: [
                '"cat" followed by the filename. Read everything — details matter.',
                'Use "cat" to read files. Don\'t skim. Nedry was careful with what he wrote.',
                'Read the files with "cat". Some of them are long but the details are important.'
              ]},
            { keys: ['submit', 'evidence', 'audit', 'submit_audit'],
              pool: [
                remaining > 0
                  ? `We\'re not there yet. I need more before I can close this out.`
                  : 'You\'ve got everything we need. Run "submit_audit" to package your findings.',
                'When you find something incriminating, the system flags it automatically. Just keep reading.',
                'Evidence gets logged when you access the right files. You\'re on the right track.'
              ]},

            // Locations & areas
            { keys: ['root', 'sys/root', 'access denied', 'magic word', 'locked'],
              pool: [
                'That area is locked down tight. Look for access tokens in the comms.',
                'Root access requires authorization. There should be a token somewhere in the system.',
                'Can\'t brute force it. You\'ll need to find legitimate credentials somewhere in the files.'
              ]},
            { keys: ['dock', 'east dock'],
              pool: [
                'The east dock keeps coming up. Footage shows Nedry headed that direction. See what the logs say about why.',
                'Security footage shows Nedry took a vehicle toward the dock the night of the incident. That\'s all we have.',
                'The dock comes up in a few places. I need you to find out why.'
              ]},
            { keys: ['lab', 'embryo', 'cryo', 'cold storage', 'vial'],
              pool: [
                'Cold storage was flagged in the post-incident review. Something may have been accessed or taken.',
                'There\'s a discrepancy in the lab inventory. That\'s part of what you\'re there to document.',
                'If the lab files show unauthorized access, that\'s exactly what I need in the report.'
              ]},

            // Characters & entities
            { keys: ['nedry', 'dennis', 'programmer'],
              pool: [
                'Dennis Nedry. Sole systems programmer. He had access to everything on that system.',
                'Nedry was responsible for the park\'s entire computing infrastructure. That\'s a lot of access for one person.',
                'HR flagged him for workplace complaints months ago. That\'s partly why we\'re auditing his workstation.'
              ]},
            { keys: ['dodgson', 'biosyn', 'competitor', 'lewis'],
              pool: [
                'That name came up in a background check. I need you to find out what the connection is.',
                'BioSyn is a competing genetics firm. If there\'s a link between them and Nedry, that\'s what I need documented.',
                'If you\'re seeing that name in the files, keep digging. That could be significant.'
              ]},
            { keys: ['hammond', 'john', 'ingen', 'boss', 'owner'],
              pool: [
                'Hammond built this place. "Spared no expense" — except on the guy running the entire computer system.',
                'John Hammond. Visionary or reckless, depending on who you ask. Either way, he underpaid Nedry.',
                'InGen\'s management is not our concern. Stay focused on Nedry\'s activities.'
              ]},
            { keys: ['arnold', 'ray', 'chief engineer'],
              pool: [
                'Ray Arnold. Chief engineer. He was on duty during the incident.',
                'Arnold may have left notes or internal messages that give context. Worth checking.',
                'Arnold\'s access logs or emails could show what happened from the operations side.'
              ]},
            { keys: ['muldoon', 'game warden', 'hunter', 'raptor', 'velocir'],
              pool: [
                'Muldoon knew those raptors were trouble from the start. Smart man.',
                'The raptors are not our problem. Stay focused on the financial and digital evidence.',
                'Muldoon\'s reports are in the system somewhere. Might give context but won\'t be evidence.'
              ]},

            // The deal & money
            { keys: ['money', 'cash', 'payment', '$750', 'million', 'paid', 'salary'],
              pool: [
                'Follow the money. If there\'s financial irregularity in those files, I need to know about it.',
                'Any evidence of outside payments or financial arrangements is exactly what we\'re looking for.',
                'If Nedry was being compensated by someone other than InGen, the files should show it.'
              ]},

            // Technical
            { keys: ['backdoor', 'hack', 'bypass', 'virus', 'white_rbt', 'whte_rbt', 'wht_rbt'],
              pool: [
                'If Nedry built a backdoor into the system, it would be disguised as something innocent.',
                'Look for executable files or scripts that don\'t belong on a park management system.',
                'If Nedry built a backdoor, that would explain a lot. Find it and that\'s the case right there.'
              ]},
            { keys: ['camera', 'feed', 'surveillance', 'cctv', 'cam ', 'cams'],
              pool: [
                'The cameras are on a fixed automated loop. You can\'t control them from the terminal.',
                'Camera feeds are automated. They cycle on their own. Nothing you can do about it from here.',
                'Those feeds run on a hardware loop. No software override from this terminal.',
                'Don\'t worry about the cameras. They\'re on autopilot. Focus on the file system.'
              ]},

            // Meta / conversational
            { keys: ['hello', 'hi', 'hey', 'good', 'morning', 'evening'],
              pool: [
                'Reeves. Let\'s stay focused.',
                'Hey. You find something or just checking in?',
                'Contractor. What have you got?'
              ]},
            { keys: ['thanks', 'thank', 'appreciate'],
              pool: [
                'Don\'t thank me yet. Thank me when we close this case.',
                'Save it for the debrief. Keep working.',
                'Noted. Back to work.'
              ]},
            { keys: ['who are you', 'your name', 'about you'],
              pool: [
                'M. Reeves. InGen Security Division. That\'s all you need to know.',
                'Your boss for this contract. That\'s the extent of our relationship.',
                'I\'m the one who reads your report when this is done. Make it worth reading.'
              ]},
            { keys: ['stuck', 'lost', 'confused', 'don\'t know', 'dont know', 'help me', 'what now', 'where'],
              pool: [
                'Explore the file system. Start at the top and work your way through every directory.',
                'You have the whole workstation. Read files, check directories, follow the trail.',
                'Think like an auditor. Financial records, communications, personal files — it\'s all in there.'
              ]},
            { keys: ['hint', 'clue', 'tip'],
              pool: [
                'I\'m not here to hold your hand. You were hired because you\'re good at this.',
                'No hints. Do your job, Contractor.',
                'You\'ve got a full workstation and a shell. That\'s all the help you need.'
              ]},

            // Insults & hostility
            { keys: ['fuck you', 'screw you', 'useless', 'idiot', 'stupid', 'hate you', 'worst', 'suck', 'trash', 'garbage'],
              pool: [
                'That kind of language doesn\'t go in the report. Are you done, or do I need to find someone else for this contract?',
                'I\'ll pretend I didn\'t see that. Get back to work or I\'ll terminate your contract.',
                'You\'re being paid to do a job, not throw a tantrum. Focus.',
                'One more outburst like that and this conversation gets logged to HR. Your call.'
              ]},

            // Fear / panic / dinosaurs
            { keys: ['scared', 'afraid', 'danger', 'safe', 'die', 'kill', 'eaten', 'attack', 'hear something', 'noise'],
              pool: [
                'That\'s not in your job description. You\'re there for the audit. Stay on task.',
                'The island was evacuated. You\'re there because it\'s empty. Do the work.',
                'I didn\'t hire you to panic. I hired you to find evidence.',
                'Stay calm and professional. You have a job to finish.'
              ]},
            { keys: ['dinosaur', 'dino', 'trex', 't-rex', 'raptor', 'velociraptor', 'animal', 'creature'],
              pool: [
                'The animals aren\'t your department. Your department is Nedry\'s file system.',
                'I\'m not a wildlife expert. I\'m your boss. Focus on the audit.',
                'Whatever\'s out there is a security matter, not a forensics matter. Stay on task.'
              ]},

            // Time / urgency
            { keys: ['time', 'hurry', 'rush', 'quick', 'fast', 'deadline', 'how long'],
              pool: [
                'The sooner you finish the audit, the sooner you\'re off the island. Simple.',
                'We don\'t have a hard deadline but I\'d rather not drag this out. Work efficiently.',
                'Move at whatever pace gets results. But don\'t waste time either.'
              ]},

            // Escape / leaving
            { keys: ['leave', 'escape', 'get out', 'go home', 'extract', 'pickup', 'pick up', 'boat'],
              pool: [
                'You leave when the job\'s done. That was the contract.',
                'Transport is arranged for when the audit is complete. Not before.',
                'Finish the work first. Then we\'ll get you off the island.'
              ]},

            // Goodbye / signing off
            { keys: ['bye', 'goodbye', 'good bye', 'signing off', 'later', 'gotta go', 'logging off'],
              pool: [
                'Reeves out. Don\'t go dark for too long.',
                'Copy that. Check back when you\'ve got something.',
                'Understood. Channel stays open when you need it.'
              ]},

            // Other people on the island
            { keys: ['anyone else', 'someone here', 'alone', 'people', 'who else', 'other people', 'team'],
              pool: [
                'The island was evacuated after the incident. That\'s why you\'re there — uninterrupted access.',
                'It\'s just you. That was the whole point of sending one contractor.',
                'You\'re the only person with authorized access right now. Work uninterrupted.'
              ]},

            // Yes / no / ok (low effort messages)
            { keys: ['yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'fine', 'alright', 'copy', 'roger'],
              pool: [
                'Good. Get back to it.',
                'Acknowledged. Keep working.',
                'Then keep going. I need results, not check-ins.'
              ]},
            { keys: ['no', 'nope', 'nah', 'negative'],
              pool: [
                'Then figure out what\'s next and get on it.',
                'Not the answer I was hoping for. Keep looking.',
                'Alright. Keep digging.'
              ]},

            // Power / systems status
            { keys: ['power', 'electric', 'system status', 'systems', 'offline', 'broken', 'working'],
              pool: [
                'Systems are degraded but functional. That\'s why you still have a terminal.',
                'Something knocked out most of the infrastructure the night of the incident. The workstation\'s running though, and that\'s what matters.',
                'If it boots, it works. Don\'t worry about the rest of the park\'s systems.'
              ]},

            // The park / island
            { keys: ['park', 'island', 'isla', 'nublar', 'jurassic', 'theme park', 'where am i'],
              pool: [
                'Isla Nublar. InGen\'s biological preserve. You read the brief — you know where you are.',
                'It\'s an island. With dinosaurs. You\'re here for the files, not the tour.',
                'You\'re at the main operations facility. Everything you need is on this workstation.'
              ]},

            // Storm / weather
            { keys: ['storm', 'weather', 'rain', 'hurricane', 'tropical'],
              pool: [
                'The storm is why we have this window. Everyone\'s gone, systems are vulnerable. Work fast.',
                'Tropical storm knocked out the main grid. Convenient timing for whoever caused the incident.',
                'Weather\'s not your concern. The workstation has backup power. Keep working.'
              ]},

            // Nedry's fate
            { keys: ['dead', 'what happened to nedry', 'nedry die', 'nedry dead', 'killed', 'body'],
              pool: [
                'Nedry didn\'t make it off the island. That\'s all we know. His files are what matter now.',
                'He\'s gone. What he left behind on this system is what we need to recover.',
                'Nedry\'s status is irrelevant to the audit. Focus on what\'s on screen.'
              ]},

            // Asking Reeves to do things
            { keys: ['can you', 'could you', 'look it up', 'check for me', 'run a', 'do it', 'search for', 'find it'],
              pool: [
                'You\'re the one with terminal access. I\'m remote. Do your job.',
                'I can\'t access the system from here. That\'s why you\'re on site.',
                'If I could do it from my end, I wouldn\'t have hired you. Get to it.'
              ]},

            // Player identity
            { keys: ['who am i', 'my name', 'what\'s my job', 'whats my job', 'my role', 'why am i here'],
              pool: [
                'You\'re a contracted forensic auditor. Re-read your briefing if you forgot.',
                'InGen hired you to audit Nedry\'s system activity. Type "brief" if you need the refresher.',
                'You\'re a contractor. You audit. That\'s the arrangement.'
              ]},

            // Non-work chat / small talk
            { keys: ['how are you', 'what\'s up', 'whats up', 'tell me about', 'fun', 'joke', 'bored', 'interesting'],
              pool: [
                'This is a secure channel, not a chat room. Stay on task.',
                'I\'m not here for conversation. Report findings or get back to work.',
                'We can talk about whatever you want at the debrief. Right now — the audit.'
              ]},

            // General profanity (not directed at Reeves)
            { keys: ['fuck', 'shit', 'damn', 'hell', 'crap', 'wtf', 'what the'],
              pool: [
                'Keep the comms professional, Contractor.',
                'Noted. Channel that energy into the audit.',
                'Save the commentary. Just report what you find.'
              ]},

            // Compliments
            { keys: ['helpful', 'you\'re good', 'nice', 'smart', 'great job', 'love'],
              pool: [
                'I\'m not here to be liked. I\'m here to get results. Back to work.',
                'Save the performance review for after the audit.',
                'Flattery doesn\'t move the needle. Evidence does.'
              ]}
        ];

        // Check each rule
        for (const rule of rules) {
            if (rule.keys.some(k => m.includes(k))) {
                return rule.pool[Math.floor(Math.random() * rule.pool.length)];
            }
        }

        // Fallback — generic in-character responses
        const fallback = [
            'Copy that. Keep searching.',
            'Understood. Stay on task.',
            'Roger. Focus on the evidence.',
            'Noted. Keep digging through those files.',
            'I hear you. Let me know when you find something concrete.',
            'Stay sharp. If there\'s something here, it won\'t be sitting in plain sight.',
            'We\'re on the clock, Contractor.',
            'Acknowledged. Report back when you have something.',
            'Don\'t get sidetracked. Files, records, communications — that\'s your job.',
            'Keep at it. We need this audit wrapped up clean.',
            'You\'re doing fine. Just keep reading.',
            remaining > 0
              ? 'We need more before I can write this up. Keep at it.'
              : 'You\'ve got what we need. Run "submit_audit" to finish this.'
        ];
        return fallback[Math.floor(Math.random() * fallback.length)];
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

    return { spawn, cwd: () => cwd, openTalkReeves, openLedger: cmdLedger };
})();
