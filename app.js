/* ============================================================
   APP.JS — Main Application Coordinator
   Project 713: The Nedry Audit
   Pixel-Perfect Match to Reference Images
   ============================================================ */

const App = (() => {
    let audioInitialized = false;
    let telemetryInterval = null;

    async function init() {
        setupLogin();
    }

    function initAudio() {
        if (audioInitialized) return;
        audioInitialized = true;
        AudioEngine.init();
    }

    /* ═══════════════ LOGIN SCREEN (Image 3) ═══════════════ */
    function setupLogin() {
        const loginBtn = document.getElementById('login-btn');
        const userInput = document.getElementById('login-user');
        const passInput = document.getElementById('login-pass');

        setTimeout(() => userInput.focus(), 200);

        function doLogin() {
            initAudio();
            AudioEngine.playKeystroke();
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

    /* ═══════════════ BOOT SEQUENCE ═══════════════ */
    async function startBoot() {
        const bootScreen = document.getElementById('boot-screen');
        bootScreen.classList.remove('hidden');
        await Boot.run();
        showDesktop();
    }

    /* ═══════════════ DESKTOP ═══════════════ */
    function showDesktop() {
        const desktop = document.getElementById('desktop');
        desktop.classList.remove('hidden');
        setupDesktopIcons();
        startClock();
        AudioEngine.startServerHum();

        // Open windows in exact positions matching Image 1
        // Image 1 layout:
        //   Explorer: top-left, wide, showing /sys/jurassic/park/ folders
        //   Terminal: bottom-center-right, overlapping slightly  
        //   Camera: top-right corner, small
        //   Alert: bottom-right corner (triggered separately)

        setTimeout(() => openExplorerImageStyle(), 200);
        setTimeout(() => openTerminalImageStyle(), 500);
        setTimeout(() => openCameraFeedImageStyle(), 700);
    }

    function setupDesktopIcons() {
        document.querySelectorAll('.desktop-icon').forEach(icon => {
            icon.addEventListener('dblclick', () => {
                const action = icon.dataset.action;
                switch (action) {
                    case 'open-terminal': openTerminalImageStyle(); break;
                    case 'open-explorer': openExplorerGeneric(icon.dataset.path || '/'); break;
                    case 'open-telemetry': openTelemetry(); break;
                }
            });
        });
    }

    /* ═══════════════ EXPLORER — Image 1 exact match ═══════════════ 
       Light gray bg, yellow 3D folder icons, file doc icons
       Title: "Irix-Explorer: /sys/jurassic/park/"
       Shows: Control/, Fences/, Power/ (folders), nedry.exe, white_rbt.obj (files)
    */
    function openExplorerImageStyle() {
        const win = WindowManager.createWindow('Irix-Explorer: /sys/jurassic/park/', 'explorer', {
            width: 450, height: 280, titleIcon: '📁'
        });
        const el = document.getElementById(win.id);
        // Position: Image 1 = left side, slightly below top
        el.style.left = '100px';
        el.style.top = '40px';

        const body = WindowManager.getBody(win.id);
        renderExplorerContents(body, '/sys/park', win.id);
    }

    function openExplorerGeneric(path) {
        const win = WindowManager.createWindow(`Irix-Explorer: ${path}/`, 'explorer', {
            width: 450, height: 280, titleIcon: '📁'
        });
        const body = WindowManager.getBody(win.id);
        renderExplorerContents(body, path, win.id);
    }

    function renderExplorerContents(body, path, winId) {
        const node = VFS.resolvePath(path);
        if (!node || node.type !== VFS.DIR) return;

        if (path.startsWith('/sys/root') && !Puzzles.canAccessRoot()) {
            Puzzles.triggerMagicWord();
            return;
        }

        // Force light background (Image 1)
        body.style.background = '#e8e8e0';
        body.style.padding = '0';

        const entries = VFS.listDir(node);
        const dirs = entries.filter(e => e.type === VFS.DIR);
        const files = entries.filter(e => e.type === VFS.FILE);

        // Build items with yellow folder icons (Image 1 style)
        const dirItems = dirs.map(d =>
            `<div class="exp-item" data-path="${path === '/' ? '' : path}/${d.name}" data-type="dir">
                <div class="exp-folder-icon"></div>
                <div class="exp-label">${d.name}/</div>
            </div>`
        ).join('');

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

        // Double-click handlers
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

    /* ═══════════════ FILE NAVIGATOR — Image 2 exact match ═══════════════
       Navy title bar: "FILE NAVIGATOR - [D:\INGEN_CENTRAL\INTERNAL_DRIVES]"
       Menu bar: File  Edit  View  Options  Window  Help
       Search bar: [⬆ Up] [🔍 Project 713]
       Left sidebar: (C:) System tree with folders
       Center: document viewer header [DOCUMENT VIEWER - [filename]]  Ln 1, Col 1
       Content: dark bg, green text, classified header
       Status bar: Ready | 8 items found | Free: 1.44MB | CAPS | NUM
    */
    function openFileNavigator(path) {
        const node = VFS.resolvePath(path);
        if (!node || node.type === VFS.DIR) return;
        const filename = path.split('/').pop();

        const win = WindowManager.createWindow('FILE NAVIGATOR - [D:\\INGEN_CENTRAL\\INTERNAL_DRIVES]', 'docviewer', {
            width: 750, height: 550,
            titlebarClass: 'navy', titleIcon: '📋'
        });
        const el = document.getElementById(win.id);
        el.style.left = '30px';
        el.style.top = '30px';

        const body = WindowManager.getBody(win.id);

        // Build content
        let docContent;
        if (node.corrupted) {
            docContent = `<span class="output-warning">${escapeHtml(node.content)}</span>`;
        } else {
            docContent = formatDocContent(node.content == null ? '' : node.content);
            if (Puzzles.checkFileEvidence(node)) {
                docContent += `\n\n<span class="output-success">>>> EVIDENCE FLAG DISCOVERED <<<</span>`;
            }
        }

        // Build sidebar tree — matching Image 2
        const sidebarTree = buildSidebarTree(path);

        // Count items in parent dir
        const parentPath = path.split('/').slice(0, -1).join('/') || '/';
        const parentNode = VFS.resolvePath(parentPath);
        const itemCount = parentNode ? VFS.listDir(parentNode).length : 0;

        body.innerHTML = `
            <div class="fn-menubar">
                <span class="fn-menu-item"><u>F</u>ile</span>
                <span class="fn-menu-item"><u>E</u>dit</span>
                <span class="fn-menu-item"><u>V</u>iew</span>
                <span class="fn-menu-item"><u>O</u>ptions</span>
                <span class="fn-menu-item"><u>W</u>indow</span>
                <span class="fn-menu-item"><u>H</u>elp</span>
            </div>
            <div class="fn-toolbar">
                <button class="fn-toolbar-btn">⬆ Up</button>
                <div class="fn-searchbar">
                    <span class="fn-search-icon">🔍</span>
                    <input class="fn-search-input" value="Project 713" readonly>
                </div>
            </div>
            <div class="fn-main">
                <div class="fn-sidebar">${sidebarTree}</div>
                <div class="fn-doc-area">
                    <div class="fn-doc-header">
                        <span>DOCUMENT VIEWER - [${escapeHtml(filename.toUpperCase())}]</span>
                        <span>Ln 1, Col 1</span>
                    </div>
                    <div class="fn-doc-content">${docContent}</div>
                </div>
            </div>
            <div class="fn-statusbar">
                <span class="fn-status-cell fn-status-flex">Ready</span>
                <span class="fn-status-cell fn-status-green">${itemCount} items found</span>
                <span class="fn-status-cell">Free: 1.44MB</span>
                <span class="fn-status-cell">CAPS</span>
                <span class="fn-status-cell">NUM</span>
            </div>`;

        // Sidebar click handlers
        body.querySelectorAll('.fn-sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                body.querySelectorAll('.fn-sidebar-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    function formatDocContent(content) {
        let html = escapeHtml(content);
        // Add classified header styling if it contains TOP SECRET
        html = html.replace(
            /(\*{3}\s*TOP SECRET.*?\*{3})/g,
            '<span class="doc-classified">$1</span>'
        );
        return html;
    }

    function buildSidebarTree(currentPath) {
        // Build tree like Image 2 left sidebar:
        // 💻 (C:) System
        //   📁 InGen_Inter...
        //   📁 DNA_Sequenc...
        //   📄 theropod_...
        //   📁 Security_O... (highlighted)
        //   📄 nedry_bac...
        //   📁 Personal_Fi...
        //   📁 Vacation_...
        const rootEntries = VFS.listDir(VFS.fs);
        let html = '<div class="fn-sidebar-item fn-sidebar-root"><span class="fn-sidebar-icon">💻</span>(C:) System</div>';

        rootEntries.forEach(e => {
            const isActive = currentPath.startsWith('/' + e.name);
            const icon = e.type === VFS.DIR ? '📁' : '📄';
            const truncName = e.name.length > 12 ? e.name.substring(0, 11) + '_' : e.name;
            html += `<div class="fn-sidebar-item${isActive ? ' active' : ''}" data-path="/${e.name}">
                <span class="fn-sidebar-icon">${icon}</span>${truncName}
            </div>`;

            // If active, show children
            if (isActive && e.type === VFS.DIR) {
                const children = VFS.resolvePath('/' + e.name);
                if (children && children.children) {
                    const childEntries = VFS.listDir(children);
                    childEntries.slice(0, 5).forEach(c => {
                        const cIcon = c.type === VFS.DIR ? '📁' : '📄';
                        const cName = c.name.length > 10 ? c.name.substring(0, 9) + '_' : c.name;
                        html += `<div class="fn-sidebar-item fn-sidebar-child" data-path="/${e.name}/${c.name}">
                            <span class="fn-sidebar-icon">${cIcon}</span>${cName}
                        </div>`;
                    });
                }
            }
        });

        return html;
    }

    /* ═══════════════ TERMINAL — Image 1 exact match ═══════════════
       Dark gray title bar: "root@jp-server: /usr/bin/tcsh"
       Position: bottom-center-right, overlapping explorer slightly
       Content shows boot messages + prompt
    */
    function openTerminalImageStyle() {
        const win = WindowManager.createWindow('root@jp-server: /usr/bin/tcsh', 'terminal', {
            width: 520, height: 260,
            singleInstance: 'terminal',
            titlebarClass: 'dark', titleIcon: '▣'
        });
        const el = document.getElementById(win.id);
        // Image 1 position: bottom-center, slightly right
        el.style.left = '340px';
        el.style.top = '360px';

        // Terminal.spawn sets up its own HTML and welcome message
        Terminal.spawn(win.id);

        // After spawn, prepend boot messages matching Image 1
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

    /* ═══════════════ CAMERA FEED — Image 1 exact match ═══════════════
       Title: "FEED: EAST DOCK - CAM 01" (teal title bar with camera icon)
       Position: top-right corner
       Content: dark camera image with "REC ●" indicator
    */
    function openCameraFeedImageStyle() {
        const win = WindowManager.createWindow('FEED: EAST DOCK - CAM 01', 'camera', {
            width: 240, height: 160, titleIcon: '📹'
        });
        const el = document.getElementById(win.id);
        // Image 1 position: top-right
        el.style.left = (window.innerWidth - 260) + 'px';
        el.style.top = '10px';

        const body = WindowManager.getBody(win.id);
        body.innerHTML = `<div class="cam-body">
            <img src="camera_feed.png" alt="East Dock Camera" class="cam-image">
            <div class="cam-rec">REC ●</div>
        </div>`;
    }

    /* ═══════════════ TELEMETRY ═══════════════ */
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

        const paddocks = [
            { name: 'T-Rex', id: 'P01', status: 'OK', cls: 'active' },
            { name: 'Brachio', id: 'P02', status: 'OK', cls: 'active' },
            { name: 'Trike', id: 'P03', status: 'ILL', cls: 'active' },
            { name: 'Dilopho', id: 'P04', status: 'OK', cls: 'active' },
            { name: 'Galli', id: 'P05', status: '???', cls: 'breach' },
            { name: 'Stego', id: 'P06', status: 'OK', cls: 'active' },
            { name: 'Para', id: 'P07', status: 'OK', cls: 'active' },
            { name: 'Compy', id: 'P08', status: 'BREACH', cls: 'breach' },
            { name: 'Pteran', id: 'P09', status: 'OK', cls: 'active' },
            { name: 'Herrera', id: 'P10', status: 'OK', cls: 'active' },
            { name: 'Othni', id: 'P11', status: 'OK', cls: 'active' },
            { name: 'Raptor', id: 'P12', status: 'ALERT', cls: 'breach' },
        ];
        document.getElementById('tel-paddocks').innerHTML = paddocks.map(p =>
            `<div class="paddock-cell ${p.cls}"><div class="paddock-name">${p.id}: ${p.name}</div><div class="paddock-status">${p.status}</div></div>`
        ).join('');

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
            const ts = new Date().toLocaleTimeString('en-US',{hour12:false});
            const entry = document.createElement('div');
            entry.className='feed-entry';
            entry.innerHTML=`<span class="feed-timestamp">[${ts}]</span>${feedMsgs[idx%feedMsgs.length]}`;
            feedEl.appendChild(entry); feedEl.scrollTop=feedEl.scrollHeight;
            while(feedEl.children.length>30) feedEl.removeChild(feedEl.firstChild);
            idx++;
        }
        addFeed();
        telemetryInterval = setInterval(addFeed, 4000);

        const winObj = WindowManager.getWindow(win.id);
        if (winObj) winObj.cleanup = () => { if (telemetryInterval) clearInterval(telemetryInterval); };

        setInterval(() => {
            const c = document.getElementById('tel-count');
            if (c) { const f=Math.random()>0.7; c.textContent=f?'292':'238*'; c.className=f?'telemetry-value critical':'telemetry-value warning'; }
        }, 3000);
    }

    /* ═══════════════ CLOCK — Image 1 shows "21:04 PM" ═══════════════ */
    function startClock() {
        const el = document.getElementById('taskbar-clock');
        let h=21, m=4;
        function up() { el.textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} PM`; }
        up();
        setInterval(()=>{m++;if(m>=60){m=0;h++;}if(h>=24)h=0;up();},30000);
    }

    function escapeHtml(s) {
        return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    document.addEventListener('DOMContentLoaded', init);
    return { init };
})();
