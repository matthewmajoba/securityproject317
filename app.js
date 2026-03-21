/* ============================================================
   APP.JS — Main Application Coordinator
   Project 713: The Nedry Audit
   
   SECTIONS:
   1. INITIALIZATION & AUDIO
   2. LOGIN SCREEN
   3. BOOT SEQUENCE
   4. DESKTOP SHELL
   5. EXPLORER WINDOW
   6. FILE NAVIGATOR / DOC VIEWER
   7. TERMINAL WINDOW
   8. CAMERA FEED (Frame Cycling)
   9. TELEMETRY
   10. CLOCK & UTILITIES
   ============================================================ */

const App = (() => {
    let audioInitialized = false;
    let telemetryInterval = null;
    let cameraInterval = null;

    /* ══════════════════════════════════════════════════════════
       1. INITIALIZATION & AUDIO
       ══════════════════════════════════════════════════════════ */

    async function init() {
        renderRetroLogo();
        setupLogin();
    }

    /* --- Render logo as low-res green monochrome bitmap --- */
    function renderRetroLogo() {
        const canvas = document.getElementById('login-logo');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Preserve aspect ratio
            const aspect = img.width / img.height;
            const tinyH = 120;
            const tinyW = Math.round(tinyH * aspect);

            // Size visible canvas to match aspect ratio
            const displayH = 240;
            const displayW = Math.round(displayH * aspect);
            canvas.width = displayW;
            canvas.height = displayH;
            canvas.style.width = displayW + 'px';
            canvas.style.height = displayH + 'px';

            // Step 1: Draw to a tiny offscreen canvas (low res)
            const offscreen = document.createElement('canvas');
            offscreen.width = tinyW;
            offscreen.height = tinyH;
            const offCtx = offscreen.getContext('2d');
            offCtx.drawImage(img, 0, 0, tinyW, tinyH);

            // Step 2: Read pixels and remap to green monochrome
            const imageData = offCtx.getImageData(0, 0, tinyW, tinyH);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                const lum = (r * 0.299 + g * 0.587 + b * 0.114);
                data[i]     = lum * 0.15;
                data[i + 1] = lum * 0.55;
                data[i + 2] = lum * 0.15;
                data[i + 3] = a;
            }
            offCtx.putImageData(imageData, 0, 0);

            // Step 3: Draw tiny version onto visible canvas (nearest-neighbor upscale)
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
        };
        img.src = 'jp_logo.png';
    }

    function initAudio() {
        if (audioInitialized) return;
        audioInitialized = true;
        AudioEngine.init();
    }

    /* ══════════════════════════════════════════════════════════
       2. LOGIN SCREEN (Image 3 match)
       - Green CRT text on dark bg
       - JP logo, username/password fields
       - ACCESS SYSTEM button triggers boot
       ══════════════════════════════════════════════════════════ */

    function setupLogin() {
        const loginBtn = document.getElementById('login-btn');
        const userInput = document.getElementById('login-user');
        const passInput = document.getElementById('login-pass');
        let loginAttempts = 0;

        setTimeout(() => userInput.focus(), 200);

        function doLogin() {
            initAudio();
            AudioEngine.playKeystroke();

            const user = userInput.value.trim();
            const pass = passInput.value;

            // Validate credentials
            if (user !== 'admin' || (pass !== 'Themagicword' && pass !== 'NaughtyDog2026')) {
                loginAttempts++;
                // Show error feedback
                const warning = document.getElementById('login-warning');
                const origText = warning.textContent;
                warning.style.color = 'var(--crt-red)';
                warning.style.textShadow = '0 0 8px rgba(255, 50, 50, 0.5)';
                if (loginAttempts >= 3) {
                    warning.textContent = 'ACCESS DENIED — REPEATED FAILURES LOGGED';
                } else {
                    warning.textContent = 'ACCESS DENIED — INVALID CREDENTIALS';
                }
                passInput.value = '';
                userInput.style.borderColor = 'var(--crt-red)';
                passInput.style.borderColor = 'var(--crt-red)';
                // Reset after 2 seconds
                setTimeout(() => {
                    warning.textContent = origText;
                    warning.style.color = '';
                    warning.style.textShadow = '';
                    userInput.style.borderColor = '';
                    passInput.style.borderColor = '';
                }, 2000);
                return;
            }

            // Successful login
            const loginScreen = document.getElementById('login-screen');
            loginScreen.style.transition = 'opacity 0.6s ease';
            loginScreen.style.opacity = '0';
            setTimeout(() => {
                loginScreen.classList.add('hidden');
                startBoot();
            }, 600);
        }

        loginBtn.addEventListener('click', doLogin);
        passInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doLogin();
            else { initAudio(); AudioEngine.playKeystroke(); }
        });
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') passInput.focus();
            else { initAudio(); AudioEngine.playKeystroke(); }
        });
    }

    /* ══════════════════════════════════════════════════════════
       3. BOOT SEQUENCE
       - Runs Boot.run() which shows system startup messages
       - Transitions to desktop on completion
       ══════════════════════════════════════════════════════════ */

    async function startBoot() {
        const bootScreen = document.getElementById('boot-screen');
        bootScreen.classList.remove('hidden');
        await Boot.run();
        showDesktop();
    }

    /* ══════════════════════════════════════════════════════════
       4. DESKTOP SHELL
       - Teal textured background with JP watermark
       - Desktop icons (left side)
       - Opens 3 initial windows: Explorer, Terminal, Camera
       - Starts taskbar clock
       ══════════════════════════════════════════════════════════ */

    function showDesktop() {
        const desktop = document.getElementById('desktop');
        desktop.classList.remove('hidden');
        setupDesktopIcons();
        setupSystemMenu();
        startClock();
        AudioEngine.startServerHum();

        // Open windows matching Image 1 layout:
        //   Explorer: top-left, showing /sys/park/ folders
        //   Terminal: bottom-center-right
        //   Camera:   top-right corner, small
        setTimeout(() => openExplorerImageStyle(), 200);
        setTimeout(() => openTerminalImageStyle(), 500);
        setTimeout(() => openCameraFeedImageStyle(), 700);

        // Show mission briefing after desktop is fully loaded
        setTimeout(() => Puzzles.showMissionBriefing(), 1500);

        // Auto-open talk window after 5 minutes if player hasn't used it
        setTimeout(() => {
            // Check if a talk window already exists by looking for its title
            const allTitles = document.querySelectorAll('.window-title');
            let talkExists = false;
            allTitles.forEach(t => { if (t.textContent.includes('Reeves')) talkExists = true; });
            if (!talkExists) {
                Terminal.openTalkReeves();
            }
        }, 5 * 60 * 1000);
    }

    function setupDesktopIcons() {
        document.querySelectorAll('.desktop-icon').forEach(icon => {
            icon.addEventListener('dblclick', () => {
                const action = icon.dataset.action;
                switch (action) {
                    case 'open-terminal': openTerminalImageStyle(); break;
                    case 'open-explorer': openExplorerGeneric(icon.dataset.path || '/'); break;
                    case 'open-telemetry': openTelemetry(); break;
                    case 'open-security': openSecurityToolkit(); break;
                }
            });
        });
    }

    /* ── System Menu ── */
    function setupSystemMenu() {
        const startBtn = document.getElementById('start-button');
        let menuEl = null;

        startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Toggle
            if (menuEl) { menuEl.remove(); menuEl = null; return; }

            menuEl = document.createElement('div');
            menuEl.className = 'system-menu';
            menuEl.innerHTML = `
                <div class="sys-menu-item" data-action="terminal">▣ Terminal</div>
                <div class="sys-menu-item" data-action="camera">📹 Camera Feed</div>
                <div class="sys-menu-item" data-action="explorer">📁 File Explorer</div>
                <div class="sys-menu-divider"></div>
                <div class="sys-menu-item" data-action="talk">💬 Talk to Reeves</div>`;
            document.getElementById('taskbar').appendChild(menuEl);

            menuEl.querySelectorAll('.sys-menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    const action = item.dataset.action;
                    if (action === 'terminal') openTerminalImageStyle();
                    else if (action === 'camera') openCameraFeedImageStyle();
                    else if (action === 'explorer') openExplorerGeneric('/');
                    else if (action === 'talk') Terminal.openTalkReeves();
                    menuEl.remove(); menuEl = null;
                });
            });
        });

        // Close menu on outside click
        document.addEventListener('click', () => {
            if (menuEl) { menuEl.remove(); menuEl = null; }
        });
    }

    /* ── InGen Security Toolkit ── */
    function openSecurityToolkit() {
        const win = WindowManager.createWindow('InGen Security — Toolkit', 'security', {
            width: 340, height: 300, titleIcon: '🛡️', singleInstance: 'security-toolkit'
        });
        const body = WindowManager.getBody(win.id);
        body.classList.add('security-toolkit-body');
        body.innerHTML = `
            <div class="sec-toolkit-header">INGEN SECURITY DIVISION</div>
            <div class="sec-toolkit-sub">Forensic Audit Tools</div>
            <div class="sec-toolkit-grid">
                <button class="sec-btn" data-tool="brief">📋<span>Mission Brief</span></button>
                <button class="sec-btn" data-tool="evidence">🔍<span>Evidence Tracker</span></button>
                <button class="sec-btn" data-tool="talk">💬<span>Contact Reeves</span></button>
                <button class="sec-btn" data-tool="ledger">📓<span>Audit Ledger</span></button>
            </div>
            <div class="sec-toolkit-footer">Authorized Personnel Only</div>`;

        body.querySelectorAll('.sec-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                if (tool === 'brief') Puzzles.showMissionBriefing();
                else if (tool === 'evidence') Puzzles.openEvidenceTracker();
                else if (tool === 'talk') Terminal.openTalkReeves();
                else if (tool === 'ledger') Terminal.openLedger();
            });
        });
    }

    /* ══════════════════════════════════════════════════════════
       5. EXPLORER WINDOW (Image 1 match)
       - Light white/gray background
       - Yellow 3D folder icons, white file icons
       - Path bar with "Up" button
       - Double-click navigates directories
       - Double-click files opens File Navigator
       ══════════════════════════════════════════════════════════ */

    function openExplorerImageStyle() {
        const win = WindowManager.createWindow('Irix-Explorer: /sys/park/', 'explorer', {
            width: 650, height: 420, titleIcon: '📁'
        });
        const el = document.getElementById(win.id);
        el.style.left = '100px';
        el.style.top = '40px';

        const body = WindowManager.getBody(win.id);
        renderExplorerContents(body, '/sys/park', win.id);
    }

    function openExplorerGeneric(path) {
        const win = WindowManager.createWindow(`Irix-Explorer: ${path}/`, 'explorer', {
            width: 650, height: 420, titleIcon: '📁'
        });
        const body = WindowManager.getBody(win.id);
        renderExplorerContents(body, path, win.id);
    }

    /**
     * renderExplorerContents — Populates an explorer window body
     * @param {HTMLElement} body - The window body element
     * @param {string} path - VFS path to display
     * @param {string} winId - Window ID for event binding
     */
    function renderExplorerContents(body, path, winId) {
        const node = VFS.resolvePath(path);
        if (!node || node.type !== VFS.DIR) return;

        // Root access requires magic word
        if (path.startsWith('/sys/root') && !Puzzles.canAccessRoot()) {
            Puzzles.triggerMagicWord();
            return;
        }

        // Explorer uses light background
        body.style.background = '#fff';
        body.style.padding = '0';

        const entries = VFS.listDir(node);
        const dirs = entries.filter(e => e.type === VFS.DIR);
        const files = entries.filter(e => e.type === VFS.FILE);

        // Yellow folder icons
        const dirItems = dirs.map(d =>
            `<div class="exp-item" data-path="${path === '/' ? '' : path}/${d.name}" data-type="dir">
                <div class="exp-folder-icon"></div>
                <div class="exp-label">${d.name}/</div>
            </div>`
        ).join('');

        // White doc file icons
        const fileItems = files.map(f =>
            `<div class="exp-item" data-path="${path === '/' ? '' : path}/${f.name}" data-type="file">
                <div class="exp-file-icon"></div>
                <div class="exp-label">${f.name}</div>
            </div>`
        ).join('');

        const upBtn = path !== '/' ? `<div class="exp-pathbar-up" id="${winId}-up">⬆ Up</div>` : '';

        body.innerHTML = `
            <div class="exp-pathbar">
                ${upBtn}
                <span class="exp-pathbar-text">📁 ${path}/</span>
            </div>
            <div class="exp-content">
                ${dirItems}${fileItems}
                ${(!dirItems && !fileItems) ? '<span class="exp-empty">(empty directory)</span>' : ''}
            </div>`;

        // Double-click: navigate dirs, open files
        body.querySelectorAll('.exp-item').forEach(item => {
            item.addEventListener('dblclick', () => {
                const itemPath = item.dataset.path;
                if (item.dataset.type === 'dir') {
                    if (itemPath.startsWith('/sys/root') && !Puzzles.canAccessRoot()) {
                        Puzzles.triggerMagicWord();
                        return;
                    }
                    renderExplorerContents(body, itemPath, winId);
                    const titleEl = document.querySelector(`#${winId} .window-title`);
                    if (titleEl) titleEl.textContent = `Irix-Explorer: ${itemPath}/`;
                } else {
                    openFileNavigator(itemPath);
                }
            });
        });

        // Up button handler
        const upEl = document.getElementById(`${winId}-up`);
        if (upEl) {
            upEl.addEventListener('click', () => {
                const parent = path.split('/').slice(0, -1).join('/') || '/';
                renderExplorerContents(body, parent, winId);
                const titleEl = document.querySelector(`#${winId} .window-title`);
                if (titleEl) titleEl.textContent = `Irix-Explorer: ${parent}/`;
            });
        }
    }

    /* ══════════════════════════════════════════════════════════
       6. FILE NAVIGATOR / DOCUMENT VIEWER
       ══════════════════════════════════════════════════════════ */

    function openFileNavigator(path) {
        const win = WindowManager.createWindow('FILE NAVIGATOR - [D:\\\\INGEN_CENTRAL\\\\INTERNAL_DRIVES]', 'docviewer', {
            width: 700, height: 480,
            titlebarClass: 'navy', titleIcon: '📋'
        });
        const el = document.getElementById(win.id);
        el.style.left = '30px';
        el.style.top = '30px';

        const body = WindowManager.getBody(win.id);

        let currentPath = '/';
        const initNode = VFS.resolvePath(path);
        if (initNode) {
            currentPath = path;
        }

        // Simple shell: path bar + content area + statusbar
        body.innerHTML = `
            <div class="fn-toolbar">
                <button class="fn-toolbar-btn" id="${win.id}-up-btn">⬆ Up</button>
                <div class="fn-searchbar">
                    <span class="fn-search-icon">📂</span>
                    <input class="fn-search-input" id="${win.id}-pathbar" value="" readonly>
                </div>
            </div>
            <div class="fn-doc-area" id="${win.id}-doc-area" style="flex:1;"></div>
            <div class="fn-statusbar">
                <span class="fn-status-cell fn-status-flex" id="${win.id}-status">Ready</span>
                <span class="fn-status-cell fn-status-green" id="${win.id}-itemcount"></span>
                <span class="fn-status-cell">Free: 1.44MB</span>
                <span class="fn-status-cell">CAPS</span>
                <span class="fn-status-cell">NUM</span>
            </div>`;

        // Up button
        document.getElementById(`${win.id}-up-btn`).addEventListener('click', () => {
            const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
            navigateTo(parentPath);
        });

        function navigateTo(navPath) {
            const node = VFS.resolvePath(navPath);
            if (!node) return;

            currentPath = navPath || '/';

            // Update path bar
            const displayPath = currentPath === '/' ? 'C:\\' : 'C:\\' + currentPath.replace(/^\//, '').replace(/\//g, '\\');
            document.getElementById(`${win.id}-pathbar`).value = displayPath;

            // Render doc area
            const docArea = document.getElementById(`${win.id}-doc-area`);
            if (node.type === VFS.DIR) {
                renderFolderContents(node, navPath, docArea);
            } else {
                renderFileContent(node, navPath, docArea);
            }
        }

        function renderFolderContents(node, folderPath, docArea) {
            const entries = VFS.listDir(node);
            const itemCount = entries ? entries.length : 0;
            document.getElementById(`${win.id}-itemcount`).textContent = `${itemCount} items`;

            let html = `<div class="fn-doc-header">
                <span>${escapeHtml((folderPath === '/' ? 'C:\\' : folderPath.split('/').pop().toUpperCase()))}</span>
                <span>${itemCount} items</span>
            </div>
            <div class="fn-detail-list">
                <div class="fn-detail-header-row">
                    <span class="fn-detail-name">Name</span>
                    <span class="fn-detail-size">Size</span>
                    <span class="fn-detail-date">Modified</span>
                    <span class="fn-detail-type">Type</span>
                </div>`;

            // Parent directory entry
            if (folderPath !== '/') {
                html += `<div class="fn-detail-row" data-path="__parent__" data-type="dir">
                    <span class="fn-detail-name">..</span>
                    <span class="fn-detail-size"></span>
                    <span class="fn-detail-date"></span>
                    <span class="fn-detail-type">&lt;DIR&gt;</span>
                </div>`;
            }

            if (entries) {
                entries.forEach(entry => {
                    const entryPath = folderPath === '/' ? '/' + entry.name : folderPath + '/' + entry.name;
                    const typeLabel = entry.type === VFS.DIR ? '<DIR>' : 'FILE';
                    const size = entry.type === VFS.DIR ? '' : (entry.size || '—');
                    const modified = entry.modified || '';
                    html += `<div class="fn-detail-row" data-path="${escapeHtml(entryPath)}" data-type="${entry.type}">
                        <span class="fn-detail-name">${escapeHtml(entry.name)}</span>
                        <span class="fn-detail-size">${size}</span>
                        <span class="fn-detail-date">${modified}</span>
                        <span class="fn-detail-type">${typeLabel}</span>
                    </div>`;
                });
            }

            html += '</div>';
            docArea.innerHTML = html;

            // Wire up double-click to navigate
            docArea.querySelectorAll('.fn-detail-row').forEach(item => {
                item.addEventListener('dblclick', () => {
                    const clickPath = item.dataset.path;
                    if (clickPath === '__parent__') {
                        const parentPath = folderPath.split('/').slice(0, -1).join('/') || '/';
                        navigateTo(parentPath);
                    } else {
                        navigateTo(clickPath);
                    }
                });
                // Single click highlights
                item.addEventListener('click', () => {
                    docArea.querySelectorAll('.fn-detail-row').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                });
            });
        }

        function renderFileContent(node, filePath, docArea) {
            const filename = filePath.split('/').pop();
            const parentPath = filePath.split('/').slice(0, -1).join('/') || '/';
            const parentNode = VFS.resolvePath(parentPath);
            const itemCount = parentNode ? VFS.listDir(parentNode).length : 0;
            document.getElementById(`${win.id}-itemcount`).textContent = `${itemCount} items`;

            let docContent;
            if (node.corrupted) {
                docContent = `<span class="output-warning">${escapeHtml(node.content)}</span>`;
            } else {
                docContent = formatDocContent(node.content == null ? '' : node.content);
            }

            docArea.innerHTML = `
                <div class="fn-doc-header">
                    <span>DOCUMENT VIEWER - [${escapeHtml(filename.toUpperCase())}]</span>
                    <span>Ln 1, Col 1</span>
                </div>
                <div class="fn-doc-content">${docContent}</div>`;
        }

        // Initial navigation
        navigateTo(currentPath);
    }

    /** Format document content with classified header styling */
    function formatDocContent(content) {
        let html = escapeHtml(content);
        html = html.replace(
            /(\*{3}\s*TOP SECRET.*?\*{3})/g,
            '<span class="doc-classified">$1</span>'
        );
        return html;
    }

    /* ══════════════════════════════════════════════════════════
       7. TERMINAL WINDOW (Image 1 match)
       - Dark title bar: "root@jp-server: /usr/bin/tcsh"
       - Pre-filled with boot compilation messages
       - Terminal.spawn() sets up interactive shell
       ══════════════════════════════════════════════════════════ */

    function openTerminalImageStyle() {
        const win = WindowManager.createWindow('root@jp-server: /usr/bin/tcsh', 'terminal', {
            width: 950, height: 580,
            singleInstance: 'terminal',
            titlebarClass: 'dark', titleIcon: '▣'
        });
        const el = document.getElementById(win.id);
        el.style.left = '80px';
        el.style.top = '130px';

        // Terminal.spawn sets up interactive shell (creates its own HTML)
        Terminal.spawn(win.id);

        // Prepend boot messages above the terminal welcome text
        const output = document.getElementById(`${win.id}-output`);
        if (output) {
            const bootMsgs = `<span class="output-header">Jurassic Park (TM) System Compilation</span>
<span class="text-amber">Loading core modules...</span>
<span class="text-green">&gt; initializing tour_program.vax</span>
<span class="text-green">&gt; loading perimeter_fence_control.sys <span class="output-success">[OK]</span></span>
<span class="text-green">&gt; status check: all systems operational</span>
<span class="text-amber">&gt; compiling local subroutines...</span>
<span class="output-error">&gt; error: command 'nedry' not found</span>
`;
            output.innerHTML = bootMsgs + output.innerHTML;
        }
    }

    /* ══════════════════════════════════════════════════════════
       8. CAMERA FEED — Frame Cycling System
       - 7 base frames: dock at night, subtle foliage movement
       - 1 dinosaur shadow frame: shows at position 24 of 30
       - Cycles at ~3fps (333ms interval)
       - Random static noise overlay every 8-15 frames
       - Timestamp updates with each frame
       ══════════════════════════════════════════════════════════ */

    const CAM_FRAMES = [
        'cam_frame_01.png', 'cam_frame_02.png', 'cam_frame_03.png',
        'cam_frame_04.png', 'cam_frame_05.png', 'cam_frame_06.png',
        'cam_frame_07.png'
    ];
    const CAM_RAPTOR_FRAME_1 = 'cam_frame_raptor1.png';
    const CAM_RAPTOR_FRAME_2 = 'cam_frame_raptor2.png';
    const CAM_CYCLE_LENGTH = 46;      // Total frames in one full cycle
    const CAM_RAPTOR_POS_1 = 23;      // Frame 23: first raptor shadow
    const CAM_RAPTOR_POS_2 = 46;      // Frame 46: second raptor shadow
    const CAM_FRAME_RATE_MS = 6000;   // 1 frame every 6 seconds
    let camFrameIndex = 0;
    let nextStaticFrame = Math.floor(Math.random() * 8) + 8;
    let camWindowId = null;  // Store for title updates

    // Camera labels — each frame can show a different camera
    const CAM_LABELS = [
        'RAPTOR PADDOCK — CAM 01',
        'EAST DOCK — CAM 02',
        'VISITOR CENTER — CAM 03',
        'T-REX PADDOCK — CAM 04',
        'PERIMETER GATE — CAM 05',
        'JUNGLE ROAD — CAM 06',
        'MAINT SHED — CAM 07'
    ];

    function openCameraFeedImageStyle() {
        const win = WindowManager.createWindow('FEED: RAPTOR PADDOCK — CAM 01', 'camera', {
            width: 560, height: 420, titleIcon: '📹'
        });
        const el = document.getElementById(win.id);
        el.style.left = (window.innerWidth - 580) + 'px';
        el.style.top = '10px';

        const body = WindowManager.getBody(win.id);
        body.innerHTML = `<div class="cam-body">
            <img src="${CAM_FRAMES[0]}" alt="Security Camera" class="cam-image" id="cam-feed-img">
            <div class="cam-interlace"></div>
            <div class="cam-grain"></div>
            <div class="cam-static" id="cam-static"></div>
            <div class="cam-rec">REC ●</div>
            <div class="cam-timestamp" id="cam-timestamp">06/12/1993 21:04:00</div>
        </div>`;

        // Preload all frames for smooth cycling
        CAM_FRAMES.forEach(f => { const img = new Image(); img.src = f; });
        const r1 = new Image(); r1.src = CAM_RAPTOR_FRAME_1;
        const r2 = new Image(); r2.src = CAM_RAPTOR_FRAME_2;

        // Start frame cycling
        camFrameIndex = 0;
        camWindowId = win.id;
        startCameraCycling();

        // Clean up interval on window close
        const winObj = WindowManager.getWindow(win.id);
        if (winObj) winObj.cleanup = () => { if (cameraInterval) clearInterval(cameraInterval); };
    }

    function startCameraCycling() {
        if (cameraInterval) clearInterval(cameraInterval);

        cameraInterval = setInterval(() => {
            const imgEl = document.getElementById('cam-feed-img');
            const staticEl = document.getElementById('cam-static');
            const tsEl = document.getElementById('cam-timestamp');
            if (!imgEl) { clearInterval(cameraInterval); return; }

            camFrameIndex++;

            // Determine which frame to show
            const cyclePos = camFrameIndex % CAM_CYCLE_LENGTH;
            if (cyclePos === CAM_RAPTOR_POS_1) {
                // Subtle raptor shadow — first appearance
                imgEl.src = CAM_RAPTOR_FRAME_1;
            } else if (cyclePos === 0 && camFrameIndex > 0) {
                // Position 46 (cycle reset) — second raptor shadow
                imgEl.src = CAM_RAPTOR_FRAME_2;
            } else {
                // Pick a base frame (cycle through the 7 locations)
                const baseIdx = cyclePos % CAM_FRAMES.length;
                imgEl.src = CAM_FRAMES[baseIdx];
            }

            // Random static noise burst
            if (staticEl) {
                if (camFrameIndex >= nextStaticFrame) {
                    staticEl.classList.add('active');
                    // Static lasts 1-2 frames
                    setTimeout(() => staticEl.classList.remove('active'), CAM_FRAME_RATE_MS * (1 + Math.random()));
                    nextStaticFrame = camFrameIndex + Math.floor(Math.random() * 15) + 8;
                }
            }

            // Update timestamp (advancing 6 seconds per frame to match frame rate)
            if (tsEl) {
                const totalSeconds = camFrameIndex * 6; // 6 seconds per frame
                const baseMinute = 4; // start at 21:04:00
                const secs = totalSeconds % 60;
                const mins = (baseMinute + Math.floor(totalSeconds / 60)) % 60;
                const hrs = 21 + Math.floor((baseMinute + Math.floor(totalSeconds / 60)) / 60);
                tsEl.textContent = `06/12/1993 ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }

            // Update window title to match current camera
            if (camWindowId) {
                const titleEl = document.querySelector(`#${camWindowId} .window-title`);
                if (titleEl) {
                    const labelIdx = cyclePos % CAM_LABELS.length;
                    titleEl.textContent = `FEED: ${CAM_LABELS[labelIdx]}`;
                }
            }

        }, CAM_FRAME_RATE_MS);
    }

    /* ══════════════════════════════════════════════════════════
       9. TELEMETRY — Live park systems dashboard
       - Grid: Fences, Animal Count, Power, Backup, Cams, Sensors
       - Paddock status grid (12 paddocks)
       - Live feed with rotating alert messages
       ══════════════════════════════════════════════════════════ */

    function openTelemetry() {
        const win = WindowManager.createWindow('Live-Telemetry: Park Systems', 'telemetry', {
            width: 560, height: 500, singleInstance: 'telemetry', titleIcon: '↯'
        });
        const body = WindowManager.getBody(win.id);
        body.classList.add('telemetry-body');
        body.innerHTML = `
            <div class="telemetry-header">⚡ Isla Nublar — Real-Time Park Telemetry</div>
            <div class="telemetry-grid">
                <div class="telemetry-cell"><div class="telemetry-label">Perimeter Fences</div><div class="telemetry-value critical" id="tel-fences">OFFLINE</div></div>
                <div class="telemetry-cell"><div class="telemetry-label">Animal Count</div><div class="telemetry-value warning" id="tel-count">238*</div></div>
                <div class="telemetry-cell"><div class="telemetry-label">Main Power</div><div class="telemetry-value critical" id="tel-power">DISRUPTED</div></div>
                <div class="telemetry-cell"><div class="telemetry-label">Backup Gen.</div><div class="telemetry-value warning" id="tel-backup">STANDBY</div></div>
                <div class="telemetry-cell"><div class="telemetry-label">Security Cams</div><div class="telemetry-value warning" id="tel-cams">7/12 LOOPED</div></div>
                <div class="telemetry-cell"><div class="telemetry-label">Motion Sensors</div><div class="telemetry-value warning" id="tel-sensors">92% (3 off)</div></div>
            </div>
            <div class="telemetry-header" style="margin-top:1px">Paddock Status Grid</div>
            <div class="telemetry-paddock-grid" id="tel-paddocks"></div>
            <div class="telemetry-feed" id="tel-feed"></div>`;

        // Paddock data
        const paddocks = [
            { name: 'T-Rex',    id: 'P01', status: 'OK',     cls: 'active' },
            { name: 'Brachio',  id: 'P02', status: 'OK',     cls: 'active' },
            { name: 'Trike',    id: 'P03', status: 'ILL',    cls: 'active' },
            { name: 'Dilopho',  id: 'P04', status: 'OK',     cls: 'active' },
            { name: 'Galli',    id: 'P05', status: '???',    cls: 'breach' },
            { name: 'Stego',    id: 'P06', status: 'OK',     cls: 'active' },
            { name: 'Para',     id: 'P07', status: 'OK',     cls: 'active' },
            { name: 'Compy',    id: 'P08', status: 'BREACH', cls: 'breach' },
            { name: 'Pteran',   id: 'P09', status: 'OK',     cls: 'active' },
            { name: 'Herrera',  id: 'P10', status: 'OK',     cls: 'active' },
            { name: 'Othni',    id: 'P11', status: 'OK',     cls: 'active' },
            { name: 'Raptor',   id: 'P12', status: 'ALERT',  cls: 'breach' },
        ];
        document.getElementById('tel-paddocks').innerHTML = paddocks.map(p =>
            `<div class="paddock-cell ${p.cls}"><div class="paddock-name">${p.id}: ${p.name}</div><div class="paddock-status">${p.status}</div></div>`
        ).join('');

        // Live feed messages
        const feedEl = document.getElementById('tel-feed');
        const feedMsgs = [
            'PERIMETER: Fence Circuit 07-A voltage nominal',
            'CENSUS: Automated count discrepancy detected',
            'SECURITY: Camera feed loop detected — Sectors 1,2,3,5,7,8,12',
            'ALERT: Motion detected outside Paddock 05 perimeter',
            'MAINT: Explorer 09 proximity sensor — unresolved',
            'POWER: Generator #03 transfer switch delay: 12.2s',
            'SECURITY: Unauthorized door access — Embryo Storage',
            'ALERT: Raptor Paddock 12 — fence test detected',
            'WEATHER: Tropical storm approaching — ETA 6 hours',
            'CENSUS: Free-range count exceeds manifest by 54',
        ];
        let idx = 0;
        function addFeed() {
            const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
            const entry = document.createElement('div');
            entry.className = 'feed-entry';
            entry.innerHTML = `<span class="feed-timestamp">[${ts}]</span>${feedMsgs[idx % feedMsgs.length]}`;
            feedEl.appendChild(entry);
            feedEl.scrollTop = feedEl.scrollHeight;
            while (feedEl.children.length > 30) feedEl.removeChild(feedEl.firstChild);
            idx++;
        }
        addFeed();
        telemetryInterval = setInterval(addFeed, 4000);

        // Cleanup on close
        const winObj = WindowManager.getWindow(win.id);
        if (winObj) winObj.cleanup = () => { if (telemetryInterval) clearInterval(telemetryInterval); };

        // Flickering animal count
        setInterval(() => {
            const c = document.getElementById('tel-count');
            if (c) {
                const anomaly = Math.random() > 0.7;
                c.textContent = anomaly ? '292' : '238*';
                c.className = anomaly ? 'telemetry-value critical' : 'telemetry-value warning';
            }
        }, 3000);
    }

    /* ══════════════════════════════════════════════════════════
       10. CLOCK & UTILITIES
       ══════════════════════════════════════════════════════════ */

    /** Taskbar clock — starts at 21:04 (Image 1) */
    function startClock() {
        const el = document.getElementById('taskbar-clock');
        let h = 21, m = 4;
        function up() {
            el.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} PM`;
        }
        up();
        setInterval(() => { m++; if (m >= 60) { m = 0; h++; } if (h >= 24) h = 0; up(); }, 30000);
    }

    /** HTML-safe escape */
    function escapeHtml(s) {
        return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    document.addEventListener('DOMContentLoaded', init);
    return { init };
})();
