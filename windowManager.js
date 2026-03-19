/* ============================================================
   WINDOW MANAGER — Draggable & Resizable Windows
   Windows 3.1 style with teal accents
   ============================================================ */

const WindowManager = (() => {
    let windows = [];
    let windowIdCounter = 0;
    let highestZ = 100;
    const container = () => document.getElementById('window-container');
    const tabsEl = () => document.getElementById('taskbar-tabs');

    function createWindow(title, type, opts = {}) {
        const id = 'win-' + (++windowIdCounter);
        const existing = windows.find(w => w.opts && w.opts.singleInstance && w.opts.singleInstance === (opts.singleInstance || null));
        if (existing) { focusWindow(existing.id); return existing; }

        const w = document.createElement('div');
        w.className = 'irix-window';
        w.id = id;
        w.dataset.type = type;
        w.style.width = (opts.width || 600) + 'px';
        w.style.height = (opts.height || 420) + 'px';
        w.style.left = (80 + (windowIdCounter % 6) * 30) + 'px';
        w.style.top = (30 + (windowIdCounter % 6) * 25) + 'px';
        w.style.zIndex = ++highestZ;

        // Icon char based on opts or type
        const iconChar = opts.titleIcon || ({ terminal: '▣', explorer: '📁', docviewer: '📄', telemetry: '↯', ledger: '📋', vitals: '♥', camera: '📹' }[type] || '▣');
        const titlebarClass = opts.titlebarClass ? ` ${opts.titlebarClass}` : '';

        w.innerHTML = `
            <div class="window-titlebar${titlebarClass}" data-winid="${id}">
                <div class="window-titlebar-icon">${iconChar}</div>
                <div class="window-title">${title}</div>
                <div class="window-controls">
                    <button class="window-btn win-minimize" data-winid="${id}" title="Minimize">_</button>
                    <button class="window-btn win-maximize" data-winid="${id}" title="Maximize">□</button>
                    <button class="window-btn win-close" data-winid="${id}" title="Close">X</button>
                </div>
            </div>
            <div class="window-body" id="${id}-body"></div>
            <div class="resize-handle resize-r" data-dir="r"></div>
            <div class="resize-handle resize-b" data-dir="b"></div>
            <div class="resize-handle resize-br" data-dir="br"></div>
            <div class="resize-handle resize-l" data-dir="l"></div>
            <div class="resize-handle resize-t" data-dir="t"></div>
            <div class="resize-handle resize-bl" data-dir="bl"></div>
            <div class="resize-handle resize-tr" data-dir="tr"></div>
            <div class="resize-handle resize-tl" data-dir="tl"></div>
        `;

        container().appendChild(w);

        // Add taskbar tab
        const tab = document.createElement('div');
        tab.className = 'taskbar-tab active';
        tab.dataset.winid = id;
        tab.textContent = title.length > 20 ? title.substring(0, 18) + '…' : title;
        tab.addEventListener('click', () => {
            const win = document.getElementById(id);
            if (win.classList.contains('hidden')) {
                win.classList.remove('hidden');
            }
            focusWindow(id);
        });
        tabsEl().appendChild(tab);

        const winObj = { id, title, type, el: w, tab, opts, minimized: false, maximized: false, prevBounds: null };
        windows.push(winObj);

        // Drag setup
        setupDrag(w, id);
        
        // Resize setup
        setupResize(w, id);

        // Close / minimize / maximize buttons
        w.querySelector('.win-close').addEventListener('click', (e) => {
            e.stopPropagation();
            closeWindow(id);
        });
        w.querySelector('.win-minimize').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMinimize(id);
        });
        w.querySelector('.win-maximize').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMaximize(id);
        });

        // Focus on click
        w.addEventListener('mousedown', () => focusWindow(id));

        focusWindow(id);
        return winObj;
    }

    function setupDrag(el, winId) {
        const titlebar = el.querySelector('.window-titlebar');
        let isDragging = false, offsetX = 0, offsetY = 0;

        titlebar.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('window-btn')) return;
            // Don't drag if maximized
            const win = windows.find(w => w.id === winId);
            if (win && win.maximized) return;
            isDragging = true;
            offsetX = e.clientX - el.offsetLeft;
            offsetY = e.clientY - el.offsetTop;
            focusWindow(winId);
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            // Constrain to viewport
            newX = Math.max(0, Math.min(newX, window.innerWidth - 100));
            newY = Math.max(0, Math.min(newY, window.innerHeight - 60));
            el.style.left = newX + 'px';
            el.style.top = newY + 'px';
        });

        document.addEventListener('mouseup', () => { isDragging = false; });
    }

    function setupResize(el, winId) {
        const handles = el.querySelectorAll('.resize-handle');
        let isResizing = false, startX, startY, startW, startH, startL, startT, dir;

        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                const win = windows.find(w => w.id === winId);
                if (win && win.maximized) return;
                isResizing = true;
                dir = handle.dataset.dir;
                startX = e.clientX;
                startY = e.clientY;
                startW = el.offsetWidth;
                startH = el.offsetHeight;
                startL = el.offsetLeft;
                startT = el.offsetTop;
                focusWindow(winId);
                e.preventDefault();
                e.stopPropagation();
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const minW = 200, minH = 120;

            if (dir.includes('r')) {
                el.style.width = Math.max(minW, startW + dx) + 'px';
            }
            if (dir.includes('b')) {
                el.style.height = Math.max(minH, startH + dy) + 'px';
            }
            if (dir.includes('l')) {
                const newW = Math.max(minW, startW - dx);
                if (newW > minW || dx < 0) {
                    el.style.width = newW + 'px';
                    el.style.left = (startL + startW - newW) + 'px';
                }
            }
            if (dir.includes('t')) {
                const newH = Math.max(minH, startH - dy);
                if (newH > minH || dy < 0) {
                    el.style.height = newH + 'px';
                    el.style.top = (startT + startH - newH) + 'px';
                }
            }
        });

        document.addEventListener('mouseup', () => { isResizing = false; });
    }

    function focusWindow(id) {
        windows.forEach(w => {
            w.el.classList.remove('focused');
            w.tab.classList.remove('active');
        });
        const win = windows.find(w => w.id === id);
        if (win) {
            win.el.style.zIndex = ++highestZ;
            win.el.classList.add('focused');
            win.tab.classList.add('active');
        }
    }

    function closeWindow(id) {
        const idx = windows.findIndex(w => w.id === id);
        if (idx === -1) return;
        const win = windows[idx];
        win.el.remove();
        win.tab.remove();
        if (win.cleanup) win.cleanup();
        windows.splice(idx, 1);
    }

    function toggleMinimize(id) {
        const win = windows.find(w => w.id === id);
        if (!win) return;
        win.minimized = !win.minimized;
        if (win.minimized) {
            win.el.classList.add('hidden');
            win.tab.classList.remove('active');
        } else {
            win.el.classList.remove('hidden');
            focusWindow(id);
        }
    }

    function toggleMaximize(id) {
        const win = windows.find(w => w.id === id);
        if (!win) return;
        win.maximized = !win.maximized;
        if (win.maximized) {
            // Save current bounds
            win.prevBounds = {
                left: win.el.style.left,
                top: win.el.style.top,
                width: win.el.style.width,
                height: win.el.style.height
            };
            win.el.style.left = '0px';
            win.el.style.top = '0px';
            win.el.style.width = '100%';
            win.el.style.height = 'calc(100vh - 32px)';
            win.el.classList.add('maximized');
        } else {
            if (win.prevBounds) {
                win.el.style.left = win.prevBounds.left;
                win.el.style.top = win.prevBounds.top;
                win.el.style.width = win.prevBounds.width;
                win.el.style.height = win.prevBounds.height;
            }
            win.el.classList.remove('maximized');
        }
    }

    function getBody(id) {
        return document.getElementById(id + '-body');
    }

    function getWindow(id) {
        return windows.find(w => w.id === id);
    }

    return { createWindow, closeWindow, focusWindow, getBody, getWindow };
})();
