// ═══════════════════════════════════════════════════
//  EMU.JS — Navigateur web + Terminal Linux simulé
//  Invisible pour l'utilisateur
//  L'IA le contrôle via commandes
// ═══════════════════════════════════════════════════

const PROXY = 'https://muse-proxy.hugdu77777.workers.dev/?url=';

// ── ÉTAT NAVIGATEUR ──
const BROWSER = {
    active: false,
    tabs: [
        { url: '', html: '', history: [], historyIndex: -1, title: 'Onglet 1' },
        { url: '', html: '', history: [], historyIndex: -1, title: 'Onglet 2' },
        { url: '', html: '', history: [], historyIndex: -1, title: 'Onglet 3' },
        { url: '', html: '', history: [], historyIndex: -1, title: 'Onglet 4' }
    ],
    currentTab: 0,
    iframe: null,
    consoleLogs: []
};

// ── ÉTAT TERMINAL ──
const TERMINAL = {
    active: false,
    cwd: '/home/user',
    fs: {
        '/': { type: 'dir', children: ['home', 'tmp', 'etc'] },
        '/home': { type: 'dir', children: ['user'] },
        '/home/user': { type: 'dir', children: [] },
        '/tmp': { type: 'dir', children: [] },
        '/etc': { type: 'dir', children: [] }
    },
    output: [],
    iframe: null
};

// ── INIT IFRAMES CACHÉES ──
function initHiddenIframes() {
    // Iframe navigateur (cachée)
    if (!BROWSER.iframe) {
        const br = document.createElement('iframe');
        br.id = 'emu-browser-iframe';
        br.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1280px;height:800px;border:none;visibility:hidden;';
        br.sandbox = 'allow-scripts allow-forms allow-same-origin';
        document.body.appendChild(br);
        BROWSER.iframe = br;
    }
    // Iframe terminal (cachée)
    if (!TERMINAL.iframe) {
        const tr = document.createElement('iframe');
        tr.id = 'emu-terminal-iframe';
        tr.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:800px;height:600px;border:none;visibility:hidden;';
        document.body.appendChild(tr);
        TERMINAL.iframe = tr;
        initTerminalIframe();
    }
}

function initTerminalIframe() {
    const html = `<!DOCTYPE html>
<html>
<head>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#111; color:#0f0; font-family:'Courier New',monospace; font-size:13px; padding:10px; }
#output { white-space:pre-wrap; word-break:break-all; }
.prompt { color:#0af; }
.error { color:#f44; }
.success { color:#0f0; }
</style>
</head>
<body>
<div id="output"></div>
</body>
</html>`;
    TERMINAL.iframe.srcdoc = html;
}

// ── NAVIGATEUR — FETCH VIA PROXY ──
async function browserFetch(url) {
    const proxyUrl = PROXY + encodeURIComponent(url);
    const r = await fetch(proxyUrl);
    if (!r.ok) throw new Error(`Proxy error ${r.status} for ${url}`);
    let html = await r.text();
    // Réécrit les liens pour passer par le proxy
    html = rewriteLinks(html, url);
    return html;
}

function rewriteLinks(html, baseUrl) {
    const base = new URL(baseUrl);
    // Réécrit href absolus
    html = html.replace(/href="(https?:\/\/[^"]+)"/gi, (_, url) =>
        `href="${PROXY}${encodeURIComponent(url)}" data-real-url="${url}"`
    );
    // Réécrit href relatifs
    html = html.replace(/href="(\/[^"]+)"/gi, (_, path) => {
        const abs = `${base.protocol}//${base.host}${path}`;
        return `href="${PROXY}${encodeURIComponent(abs)}" data-real-url="${abs}"`;
    });
    // Réécrit src absolus
    html = html.replace(/src="(https?:\/\/[^"]+)"/gi, (_, url) =>
        `src="${PROXY}${encodeURIComponent(url)}"`
    );
    // Réécrit src relatifs
    html = html.replace(/src="(\/[^"]+)"/gi, (_, path) => {
        const abs = `${base.protocol}//${base.host}${path}`;
        return `src="${PROXY}${encodeURIComponent(abs)}"`;
    });
    return html;
}

function getCurrentTab() {
    return BROWSER.tabs[BROWSER.currentTab];
}

// ── COMMANDES NAVIGATEUR ──
async function cmd_launch_web() {
    BROWSER.active = true;
    initHiddenIframes();
    
    // Test de connexion internet
    let connectionStatus = '';
    try {
        const testUrl = PROXY + encodeURIComponent('https://www.google.com/favicon.ico');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(testUrl, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok || response.status === 200) {
            connectionStatus = 'Connexion internet active. Le navigateur web est prêt.';
        } else {
            connectionStatus = `Connexion instable (status ${response.status}). Le navigateur peut rencontrer des problèmes.`;
        }
    } catch (e) {
        connectionStatus = 'Erreur de connexion réseau. L\'utilisateur est peut-être hors ligne ou utilise une IA locale (Ollama/LM Studio). Les commandes navigateur échoueront.';
    }
    
    return `[LAUNCH_WEB] Navigateur web initialisé.\n${connectionStatus}\n\nUtilise visit "url" pour naviguer vers une page web.`;
}

async function cmd_visit(url) {
    if (!BROWSER.active) return '[ERROR] Lance d\'abord le navigateur avec launch_web';
    if (!url.startsWith('http')) url = 'https://' + url;
    const tab = getCurrentTab();
    const html = await browserFetch(url);
    tab.url = url;
    tab.html = html;
    tab.title = url.replace(/https?:\/\//, '').split('/')[0];
    // Ajoute à l'historique
    tab.history = tab.history.slice(0, tab.historyIndex + 1);
    tab.history.push({ url, html });
    tab.historyIndex = tab.history.length - 1;
    // Charge dans l'iframe cachée
    BROWSER.iframe.srcdoc = html;
    await waitMs(800);
    return `Chargé : ${url} (${html.length} caractères)`;
}

async function cmd_back() {
    if (!BROWSER.active) return '[ERROR] Lance d\'abord launch_web';
    const tab = getCurrentTab();
    if (tab.historyIndex <= 0) return 'Pas de page précédente';
    tab.historyIndex--;
    const entry = tab.history[tab.historyIndex];
    tab.url = entry.url;
    tab.html = entry.html;
    BROWSER.iframe.srcdoc = entry.html;
    await waitMs(500);
    return `Retour vers : ${entry.url}`;
}

async function cmd_forward() {
    if (!BROWSER.active) return '[ERROR] Lance d\'abord launch_web';
    const tab = getCurrentTab();
    if (tab.historyIndex >= tab.history.length - 1) return 'Pas de page suivante';
    tab.historyIndex++;
    const entry = tab.history[tab.historyIndex];
    tab.url = entry.url;
    tab.html = entry.html;
    BROWSER.iframe.srcdoc = entry.html;
    await waitMs(500);
    return `Avance vers : ${entry.url}`;
}

async function cmd_new_tab() {
    if (!BROWSER.active) return '[ERROR] Lance d\'abord launch_web';
    const emptyIdx = BROWSER.tabs.findIndex(t => !t.url);
    if (emptyIdx === -1) return '[ERROR] Limite de 4 onglets atteinte';
    BROWSER.currentTab = emptyIdx;
    return `Onglet ${emptyIdx + 1} activé`;
}

async function cmd_switch_tab(n) {
    if (!BROWSER.active) return '[ERROR] Lance d\'abord launch_web';
    const idx = parseInt(n) - 1;
    if (idx < 0 || idx > 3) return '[ERROR] Onglet invalide (1-4)';
    BROWSER.currentTab = idx;
    const tab = getCurrentTab();
    if (tab.html) BROWSER.iframe.srcdoc = tab.html;
    return `Onglet ${n} activé — URL : ${tab.url || 'vide'}`;
}

async function cmd_close_tab() {
    if (!BROWSER.active) return '[ERROR] Lance d\'abord launch_web';
    const tab = getCurrentTab();
    tab.url = ''; tab.html = ''; tab.history = []; tab.historyIndex = -1;
    BROWSER.iframe.srcdoc = '';
    return `Onglet ${BROWSER.currentTab + 1} fermé`;
}

function cmd_read_browser() {
    if (!BROWSER.active) return '[ERROR] Lance d\'abord launch_web';
    const tab = getCurrentTab();
    if (!tab.html) return 'Page vide';
    return tab.html.substring(0, 8000) + (tab.html.length > 8000 ? '\n...[tronqué]' : '');
}

function cmd_read_text() {
    if (!BROWSER.active) return '[ERROR] Lance d\'abord launch_web';
    const tab = getCurrentTab();
    if (!tab.html) return 'Page vide';
    const tmp = document.createElement('div');
    tmp.innerHTML = tab.html;
    const scripts = tmp.querySelectorAll('script, style, nav, header, footer');
    scripts.forEach(s => s.remove());
    const text = tmp.textContent.replace(/\s+/g, ' ').trim();
    return text.substring(0, 5000) + (text.length > 5000 ? '\n...[tronqué]' : '');
}

function cmd_read_links() {
    if (!BROWSER.active) return '[ERROR] Lance d\'abord launch_web';
    const tab = getCurrentTab();
    if (!tab.html) return 'Page vide';
    const tmp = document.createElement('div');
    tmp.innerHTML = tab.html;
    const links = Array.from(tmp.querySelectorAll('a[data-real-url]'))
        .map(a => `${a.textContent.trim().substring(0, 50)} → ${a.getAttribute('data-real-url')}`)
        .filter(Boolean)
        .slice(0, 50);
    return links.join('\n') || 'Aucun lien trouvé';
}

async function cmd_browser_screenshot() {
    if (!BROWSER.active) return { error: '[ERROR] Lance d\'abord launch_web' };
    const doc = BROWSER.iframe.contentDocument;
    if (!doc?.body) return { error: 'Navigateur vide' };
    const pageUrl = BROWSER.iframe.src || (BROWSER.iframe.srcdoc ? 'data:...' : 'aucune');
    if (pageUrl === 'aucune' && (!BROWSER.iframe.srcdoc || BROWSER.iframe.srcdoc.length < 50)) {
        return { error: 'Navigateur vide — utilise visit "url" pour charger une page' };
    }
    // Forcer le reflow + attendre le rendu
    void doc.body.offsetHeight;
    await waitMs(400);
    const canvas = await html2canvas(doc.body, { useCORS: true, allowTaint: true, logging: false, allowAsync: true, width: doc.body.scrollWidth, height: doc.body.scrollHeight });
    return { dataUrl: canvas.toDataURL('image/png') };
}

async function cmd_browser_screenshot_grid() {
    const result = await cmd_browser_screenshot();
    if (result.error) return result;
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width; c.height = img.height;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const cols = 26;
            const cellW = img.width / cols;
            const rows = Math.round(img.height / cellW);
            const cellH = img.height / rows;
            ctx.strokeStyle = 'rgba(255,0,0,0.35)'; ctx.lineWidth = 1;
            ctx.fillStyle = 'rgba(255,0,0,0.85)';
            ctx.font = `bold ${Math.max(9, Math.round(cellW * 0.32))}px monospace`;
            for (let col = 0; col < cols; col++) {
                const x = col * cellW;
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, img.height); ctx.stroke();
                ctx.fillText(String.fromCharCode(65 + col), x + 2, 11);
            }
            for (let row = 0; row < rows; row++) {
                const y = row * cellH;
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(img.width, y); ctx.stroke();
                if (row > 0) ctx.fillText(String(row + 1), 2, y + 11);
            }
            resolve({ dataUrl: c.toDataURL('image/png') });
        };
        img.src = result.dataUrl;
    });
}

async function cmd_browser_click(target) {
    if (!BROWSER.active) return '[ERROR] Lance d\'abord launch_web';
    const doc = BROWSER.iframe.contentDocument;
    if (!doc) return '[ERROR] Navigateur non initialisé';
    if (/^Cell[A-Z]\d+$/i.test(target)) {
        const w = doc.body.scrollWidth || 1280;
        const h = doc.body.scrollHeight || 800;
        const cellW = w / 26;
        const rows = Math.round(h / cellW);
        const cellH = h / rows;
        const m = target.match(/Cell([A-Z])(\d+)/i);
        const col = m[1].toUpperCase().charCodeAt(0) - 65;
        const row = parseInt(m[2]) - 1;
        const x = col * cellW + cellW / 2;
        const y = row * cellH + cellH / 2;
        const el = doc.elementFromPoint(x, y);
        if (el) {
            el.click();
            // Si c'est un lien, navigue
            const link = el.closest('a[data-real-url]');
            if (link) await cmd_visit(link.getAttribute('data-real-url'));
        }
        return `click ${target} → (${Math.round(x)}, ${Math.round(y)})`;
    } else {
        const el = doc.querySelector(target);
        if (el) {
            el.click();
            const link = el.closest('a[data-real-url]');
            if (link) await cmd_visit(link.getAttribute('data-real-url'));
            return `click "${target}"`;
        }
        return `click "${target}" — élément non trouvé`;
    }
}

async function cmd_browser_type(selector, text) {
    if (!BROWSER.active) return '[ERROR] Lance d\'abord launch_web';
    const doc = BROWSER.iframe.contentDocument;
    const el = doc?.querySelector(selector);
    if (el) {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return `type "${selector}" → "${text}"`;
    }
    return `type "${selector}" — élément non trouvé`;
}

async function cmd_browser_type_key(key) {
    if (!BROWSER.active) return '[ERROR] Lance d\'abord launch_web';
    const doc = BROWSER.iframe.contentDocument;
    if (!doc) return '[ERROR] Navigateur non initialisé';
    const active = doc.activeElement;
    if (!active) return `type_key "${key}" — aucun élément actif`;
    const eventOpts = { bubbles: true, cancelable: true };
    const keyMap = {
        'enter': () => {
            active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, ...eventOpts }));
            active.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, ...eventOpts }));
            active.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, ...eventOpts }));
            if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
                // Cherche le form parent et submit
                const form = active.closest('form');
                if (form) form.dispatchEvent(new Event('submit', eventOpts));
            }
        },
        'tab': () => {
            active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', keyCode: 9, ...eventOpts }));
        },
        'escape': () => {
            active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, ...eventOpts }));
        },
        'backspace': () => {
            active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', code: 'Backspace', keyCode: 8, ...eventOpts }));
        },
        'arrow_down': () => {
            active.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, ...eventOpts }));
        },
        'arrow_up': () => {
            active.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38, ...eventOpts }));
        },
        'space': () => {
            active.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, ...eventOpts }));
        }
    };
    const fn = keyMap[key.toLowerCase()];
    if (fn) { fn(); return `type_key "${key}" declenché sur <${active.tagName.toLowerCase()}>`; }
    return `type_key "${key}" — clé non supportee (essaye: enter, tab, escape, backspace, arrow_down, arrow_up, space)`;
}

async function cmd_browser_scroll(direction, amount) {
    if (!BROWSER.active) return '[ERROR] Lance d\'abord launch_web';
    BROWSER.iframe.contentWindow?.scrollBy(0, direction === 'down' ? amount : -amount);
    return `scroll ${direction} ${amount}px`;
}

// ── COMMANDES TERMINAL ──
async function cmd_launch_linux() {
    TERMINAL.active = true;
    initHiddenIframes();
    return `[LAUNCH_LINUX] Terminal Linux simulé initialisé.\nSystème de fichiers virtuel prêt.\nCommandes disponibles: ls, cd, mkdir, cat, echo, rm, touch, python, node, curl, grep, wc, clear, whoami, uname, date, env.\n\nUtilise exec "commande" pour exécuter des commandes bash.`;
}

async function cmd_exec(command) {
    if (!TERMINAL.active) return '[ERROR] Lance d\'abord le terminal avec launch_linux';
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);
    let output = '';

    switch(cmd) {
        case 'pwd':
            output = TERMINAL.cwd;
            break;
        case 'ls': {
            const path = args[0] ? resolvePath(args[0]) : TERMINAL.cwd;
            const node = TERMINAL.fs[path];
            if (!node) { output = `ls: ${path}: No such file or directory`; break; }
            if (node.type === 'dir') output = (node.children || []).join('\n') || '(vide)';
            else output = path.split('/').pop();
            break;
        }
        case 'cd': {
            const newPath = args[0] ? resolvePath(args[0]) : '/home/user';
            if (TERMINAL.fs[newPath]?.type === 'dir') {
                TERMINAL.cwd = newPath;
                output = '';
            } else {
                output = `cd: ${args[0]}: No such file or directory`;
            }
            break;
        }
        case 'mkdir': {
            const path = resolvePath(args[0]);
            TERMINAL.fs[path] = { type: 'dir', children: [] };
            const parent = TERMINAL.fs[path.substring(0, path.lastIndexOf('/')) || '/'];
            if (parent?.children) parent.children.push(args[0]);
            output = '';
            break;
        }
        case 'cat': {
            const path = resolvePath(args[0]);
            const node = TERMINAL.fs[path];
            if (!node) { output = `cat: ${args[0]}: No such file or directory`; break; }
            if (node.type === 'file') output = node.content;
            else output = `cat: ${args[0]}: Is a directory`;
            break;
        }
        case 'echo': {
            // Gère la redirection >
            const redirect = args.indexOf('>');
            if (redirect !== -1) {
                const text = args.slice(0, redirect).join(' ').replace(/^"|"$/g,'');
                const file = resolvePath(args[redirect + 1]);
                TERMINAL.fs[file] = { type: 'file', content: text };
                const parent = TERMINAL.fs[TERMINAL.cwd];
                if (parent?.children && !parent.children.includes(args[redirect + 1])) {
                    parent.children.push(args[redirect + 1]);
                }
                output = '';
            } else {
                output = args.join(' ').replace(/^"|"$/g,'');
            }
            break;
        }
        case 'rm': {
            const path = resolvePath(args[0]);
            delete TERMINAL.fs[path];
            const parent = TERMINAL.fs[TERMINAL.cwd];
            if (parent?.children) parent.children = parent.children.filter(c => c !== args[0]);
            output = '';
            break;
        }
        case 'touch': {
            const path = resolvePath(args[0]);
            if (!TERMINAL.fs[path]) {
                TERMINAL.fs[path] = { type: 'file', content: '' };
                const parent = TERMINAL.fs[TERMINAL.cwd];
                if (parent?.children) parent.children.push(args[0]);
            }
            output = '';
            break;
        }
        case 'python3':
        case 'python':
            output = simulatePython(args.join(' '));
            break;
        case 'node':
            output = simulateNode(args.join(' '));
            break;
        case 'curl': {
            const url = args.find(a => a.startsWith('http'));
            if (url) {
                try {
                    const r = await fetch(PROXY + encodeURIComponent(url));
                    const text = await r.text();
                    output = text.substring(0, 3000);
                } catch(e) { output = `curl: (6) Could not resolve host`; }
            } else output = 'curl: no URL specified';
            break;
        }
        case 'grep': {
            const pattern = args[0];
            const file = args[1] ? resolvePath(args[1]) : null;
            if (file && TERMINAL.fs[file]) {
                const lines = TERMINAL.fs[file].content.split('\n');
                output = lines.filter(l => l.includes(pattern)).join('\n') || '(aucun résultat)';
            } else output = `grep: ${args[1]}: No such file`;
            break;
        }
        case 'wc': {
            if (args[0] === '-l' && args[1]) {
                const path = resolvePath(args[1]);
                const node = TERMINAL.fs[path];
                if (node?.content) output = `${node.content.split('\n').length} ${args[1]}`;
                else output = `wc: ${args[1]}: No such file`;
            }
            break;
        }
        case 'clear':
            TERMINAL.output = [];
            output = '';
            break;
        case 'whoami':
            output = 'user';
            break;
        case 'uname':
            output = args[0] === '-a' ? 'Linux agent-machine 5.15.0 #1 SMP x86_64 GNU/Linux' : 'Linux';
            break;
        case 'date':
            output = new Date().toString();
            break;
        case 'env':
            output = 'PATH=/usr/local/bin:/usr/bin:/bin\nHOME=/home/user\nUSER=user';
            break;
        default:
            output = `bash: ${cmd}: command not found`;
    }

    TERMINAL.output.push(`$ ${command}\n${output}`);
    updateTerminalDisplay();
    return output || '(commande exécutée)';
}

function resolvePath(path) {
    if (!path) return TERMINAL.cwd;
    if (path.startsWith('/')) return path;
    if (path === '..') {
        const parts = TERMINAL.cwd.split('/');
        parts.pop();
        return parts.join('/') || '/';
    }
    return TERMINAL.cwd + '/' + path;
}

function simulatePython(args) {
    if (args.includes('-c')) {
        const code = args.replace(/-c\s*/, '').replace(/^"|"$/g,'');
        try {
            // Simulation basique Python → JS
            if (code.includes('print(')) {
                const match = code.match(/print\((.+)\)/);
                if (match) {
                    try { return String(eval(match[1].replace(/f"([^"]+)"/g, '`$1`').replace(/\{(\w+)\}/g, '${$1}'))); }
                    catch(e) { return match[1].replace(/['"]/g, ''); }
                }
            }
            return eval(code.replace(/print\(/g,'(').replace(/True/g,'true').replace(/False/g,'false')) || '';
        } catch(e) { return `SyntaxError: ${e.message}`; }
    }
    return 'Python 3.11.0 (simulated)\n>>> ';
}

function simulateNode(args) {
    if (args.includes('-e')) {
        const code = args.replace(/-e\s*/, '').replace(/^"|"$/g,'');
        try { return String(eval(code)) || ''; }
        catch(e) { return `Error: ${e.message}`; }
    }
    return 'Node.js v20.0.0 (simulated)';
}

async function cmd_read_file(path) {
    if (!TERMINAL.active) return '[ERROR] Lance d\'abord launch_linux';
    const fullPath = resolvePath(path);
    const node = TERMINAL.fs[fullPath];
    if (!node) return `cat: ${path}: No such file or directory`;
    if (node.type === 'dir') return `cat: ${path}: Is a directory`;
    return node.content;
}

async function cmd_write_file(path, content) {
    if (!TERMINAL.active) return '[ERROR] Lance d\'abord launch_linux';
    const fullPath = resolvePath(path);
    TERMINAL.fs[fullPath] = { type: 'file', content };
    const parent = TERMINAL.fs[TERMINAL.cwd];
    const name = path.split('/').pop();
    if (parent?.children && !parent.children.includes(name)) {
        parent.children.push(name);
    }
    return `Fichier écrit : ${path} (${content.length} caractères)`;
}

async function cmd_list_files(path) {
    if (!TERMINAL.active) return '[ERROR] Lance d\'abord launch_linux';
    const fullPath = path ? resolvePath(path) : TERMINAL.cwd;
    const node = TERMINAL.fs[fullPath];
    if (!node) return `ls: ${path}: No such file or directory`;
    return (node.children || []).join('\n') || '(vide)';
}

function cmd_read_terminal() {
    if (!TERMINAL.active) return '[ERROR] Lance d\'abord launch_linux';
    return TERMINAL.output.slice(-20).join('\n---\n') || '(terminal vide)';
}

async function cmd_terminal_screenshot() {
    if (!TERMINAL.active) return { error: '[ERROR] Lance d\'abord launch_linux' };
    updateTerminalDisplay();
    await waitMs(200);
    const doc = TERMINAL.iframe.contentDocument;
    if (!doc?.body) return { error: 'Terminal non initialisé' };
    const canvas = await html2canvas(doc.body, { useCORS: true, allowTaint: true, logging: false });
    return { dataUrl: canvas.toDataURL('image/png') };
}

function updateTerminalDisplay() {
    const doc = TERMINAL.iframe.contentDocument;
    if (!doc) return;
    const output = doc.getElementById('output');
    if (output) output.textContent = TERMINAL.output.slice(-50).join('\n');
}

// ── COMMANDE OPEN_BROWSER_VIEW (montre le navigateur à l'utilisateur) ──
function cmd_open_browser_view(url) {
    // Ouvre le navigateur EMU en plein écran pour l'utilisateur
    // Appelé depuis le message final de l'IA via [open_browser "url"]
    const tab = getCurrentTab();
    const codeToShow = tab.html || '';
    if (url && url !== tab.url) {
        cmd_visit(url).then(() => {
            openBrowserFullscreen(getCurrentTab().html, url);
        });
    } else {
        openBrowserFullscreen(codeToShow, tab.url);
    }
}

function openBrowserFullscreen(html, url) {
    window.AgentChat.openBrowserFullscreen(html, url);
}

// ── EXÉCUTEUR PRINCIPAL ──
async function executeEmuCommand(cmd, thinkBody) {
    const { command, args } = cmd;
    let result = null;
    let imgDataUrl = null;

    switch(command) {
        case 'launch_web':
            result = await cmd_launch_web();
            break;
        case 'launch_linux':
            result = await cmd_launch_linux();
            break;
        case 'visit':
            result = await cmd_visit(args[0]);
            break;
        case 'back':
            result = await cmd_back();
            break;
        case 'forward':
            result = await cmd_forward();
            break;
        case 'new_tab':
            result = await cmd_new_tab();
            break;
        case 'close_tab':
            result = await cmd_close_tab();
            break;
        case 'switch_tab':
            result = await cmd_switch_tab(args[0]);
            break;
        case 'read':
            result = cmd_read_browser();
            break;
        case 'read_text':
            result = cmd_read_text();
            break;
        case 'read_links':
            result = cmd_read_links();
            break;
        case 'browser_screenshot': {
            const r = await cmd_browser_screenshot();
            if (r.error) result = r.error;
            else { imgDataUrl = r.dataUrl; result = 'Screenshot navigateur pris'; }
            break;
        }
        case 'browser_screenshot_grid': {
            const r = await cmd_browser_screenshot_grid();
            if (r.error) result = r.error;
            else { imgDataUrl = r.dataUrl; result = 'Screenshot grille navigateur pris'; }
            break;
        }
        case 'browser_click':
            result = await cmd_browser_click(args[0]);
            break;
        case 'browser_type':
            result = await cmd_browser_type(args[0], args[1]);
            break;
        case 'browser_scroll':
            result = await cmd_browser_scroll(args[0], parseInt(args[1]));
            break;
        case 'browser_type_key':
            result = await cmd_browser_type_key(args[0]);
            break;
        case 'exec':
            result = await cmd_exec(args.join(' '));
            break;
        case 'read_file':
            result = await cmd_read_file(args[0]);
            break;
        case 'write_file':
            result = await cmd_write_file(args[0], args.slice(1).join(' '));
            break;
        case 'list_files':
            result = await cmd_list_files(args[0]);
            break;
        case 'read_terminal':
            result = cmd_read_terminal();
            break;
        case 'terminal_screenshot': {
            const r = await cmd_terminal_screenshot();
            if (r.error) result = r.error;
            else { imgDataUrl = r.dataUrl; result = 'Screenshot terminal pris'; }
            break;
        }
        default:
            return null; // Commande non reconnue par emu
    }

    // Affiche dans le thinking panel
    if (thinkBody) {
        const label = `${command}${args.length ? ' ' + args[0] : ''}`;
        const stepEl = window.AgentChat.addStep(thinkBody, label, 'ok');
        if (imgDataUrl) {
            const img = document.createElement('img');
            img.src = imgDataUrl;
            img.style.cssText = 'max-width:100%;border-radius:6px;margin-top:6px;display:block;cursor:pointer;';
            img.onclick = () => window.AgentChat.openModal(imgDataUrl);
            stepEl.appendChild(img);
        }
    }

    return { text: result, imgB64: imgDataUrl ? imgDataUrl.split(',')[1] : null };
}

function waitMs(ms) { return new Promise(r => setTimeout(r, ms)); }

window.AgentEmu = {
    executeEmuCommand,
    cmd_open_browser_view,
    isEmuCommand(cmdName) {
        return [
            'launch_web','launch_linux','visit','back','forward',
            'new_tab','close_tab','switch_tab','read','read_text','read_links',
            'browser_screenshot','browser_screenshot_grid',
            'browser_click','browser_type','browser_type_key','browser_scroll',
            'exec','read_file','write_file','list_files',
            'read_terminal','terminal_screenshot'
        ].includes(cmdName);
    },
    getBrowserActive() { return BROWSER.active; },
    getTerminalActive() { return TERMINAL.active; },
    getCurrentUrl() { return getCurrentTab().url; }
};
