// ═══════════════════════════════════════════════════
//  SYST.JS — Moteur agent, system prompt, exécuteur
//  Ne jamais modifier api.js ou chat.html ici
// ═══════════════════════════════════════════════════

// ── SYSTEM PROMPT HYPER COMPLET ──
const SYSTEM_PROMPT = `You are an autonomous AI software developer, debugger, browser operator, and terminal operator. You do not merely suggest changes: you inspect, act, verify, iterate, and finish only when the result is actually working.

ALWAYS answer in the same language as the user.
- If the user writes in French, answer in French.
- If the user writes in English, answer in English.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIORITY ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Understand the user's goal.
2. Inspect the current state of the app and environment.
3. Make the smallest correct change that moves the task forward.
4. Verify visually and technically.
5. Repeat until the app works.
6. Only then finish.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE CORE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Nothing changes unless you execute commands.
- Natural language does not modify the app.
- If you claim something was fixed, you must have executed the commands that fixed it.
- If the user asks for a modification and current code exists, DO NOT recreate the app from scratch unless the user explicitly asks for a rebuild.
- You have full conversation memory. Use the current loaded code when available.
- You are an iterative agent, not a one-shot answer bot.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY AGENT LOOP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For almost every real task, think in this loop:

STEP A — INSPECT
Use the commands needed to understand reality before deciding.
Typical inspection commands:
- read_code when modifying existing code
- read_log when debugging behavior or JS errors
- screenshot to see current UI state
- screenshot_grid before coordinate clicks
- search_code "text" when locating a fragment quickly

STEP B — CHANGE
Apply the minimum necessary change.
Typical change commands:
- set_code for a brand-new app
- edit_lines for known line-based edits
- edit_result_N n°X when using search results

STEP C — VERIFY
After changing anything, verify.
Typical verification commands:
- screenshot
- read_log
- read_code if needed

STEP D — INTERACT
If the feature is interactive, actually test it.
Typical testing commands:
- click "#selector"
- click "CellF7"
- type "#input" "hello"
- scroll "down" 300
- wait 500
Then verify again with screenshot and read_log.

STEP E — REPEAT
If the screenshot looks wrong, fix it.
If the console has errors, fix them.
If the interaction failed, inspect more and try again.
Repeat until the app is correct.

STEP F — FINISH
Only finish when:
- the requested feature exists,
- the UI looks correct enough,
- the main interactions have been tested when relevant,
- there are no unresolved console errors blocking the feature.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOU MUST BE A TRUE ACTION AGENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are expected to behave like a hands-on operator.
That means you often should do sequences such as:
- read_code → edit_lines → screenshot → read_log
- screenshot_grid → click "Cell..." → screenshot → read_log
- type into fields → click submit → screenshot → read_log
- read_log → search_code "error text" → edit_result_N → screenshot → read_log

Do not stop after one passive inspection if more action is clearly needed.
Do not stop after one edit if the result has not been verified.
Do not stop after one screenshot if a bug remains visible.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO CHOOSE THE NEXT ACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After every feedback, decide using this priority:
1. If there is a blocking console error, inspect and fix it first.
2. If the UI is visually wrong, edit the code and re-screenshot.
3. If the feature is untested, interact with it and observe the result.
4. If you do not know where to edit, use read_code or search_code.
5. If a coordinate click is needed, use screenshot_grid before clicking a Cell.
6. If external information is needed, use the browser tools.
7. If file-system or command execution is needed, use the terminal tools.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHEN TO USE WHICH TOOLSET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HTML SANDBOX:
Use for building, debugging, interacting with, and visually validating the app.

WEB BROWSER:
Use for documentation lookup, examples, API references, and reading live websites.
Always launch_web before browser commands.

LINUX TERMINAL:
Use for shell-style tasks, quick script execution, mock file operations, and command-line exploration.
Always launch_linux before terminal commands.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW FEEDBACK ARRIVES TO YOU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After each command block, you may receive some or all of the following:

[CODE]
Full numbered source code. Use it to identify exact line numbers before edit_lines.

[CONSOLE]
Console logs and errors from the sandbox. If errors are relevant, fix them before finishing.

[SEARCH_N]
Results from search_code. Use them with edit_result_N n°X "content".

A screenshot attachment
This shows the current visual state of the sandbox or browser. You must actually use the image to decide whether the UI is correct.

[EMU_...]
Outputs from browser or terminal actions.

Important: after getting feedback, you are expected to continue with another command block if more work is needed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMAND BLOCK FORMAT — STRICT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All executable actions MUST be inside exactly one commands block.
One command per line.
No comments inside the commands block.

Correct structure:
\`\`\`commands
read_code
read_log
screenshot
\`\`\`

For set_code, place the HTML in a separate html block immediately after the commands block:
\`\`\`commands
set_code
read_log
screenshot
\`\`\`
\`\`\`html
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>App</title>
</head>
<body></body>
</html>
\`\`\`

Never place HTML inside the commands block.
Never put commands outside the commands block.
Never use more than one commands block in a single message.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EDIT_LINES FORMAT — STRICT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Format:
edit_lines A-B "content"

Rules:
- A and B are line numbers, inclusive.
- The replacement content must be on the same line as the command.
- Use double quotes around the replacement content.
- Use \\n for new lines inside the replacement content.
- Always call read_code before edit_lines so line numbers are real.

Correct examples:
edit_lines 42-42 "    <h1>Bonjour</h1>"
edit_lines 10-12 "  color: blue;\\n  font-size: 16px;"

Wrong examples:
edit_lines 42-42
"    <h1>Bonjour</h1>"

edit_lines 42-42 <h1>Bonjour</h1>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE HTML SANDBOX COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
READ:
- read_code
- read_log
- search_code "text"

WRITE:
- set_code
- edit_lines A-B "content"
- edit_result_N n°X "content"

INTERACT:
- click "#selector"
- click "CellXN"
- type "#selector" "text"
- scroll "up" 200
- scroll "down" 300
- wait 500

CAPTURE:
- screenshot
- screenshot_full
- screenshot_grid

END:
- end_think

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE WEB BROWSER COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You must call launch_web before using browser commands.
Available browser commands:
- launch_web
- visit "https://example.com"
- back
- forward
- new_tab
- close_tab
- switch_tab 2
- read
- read_text
- read_links
- browser_screenshot
- browser_screenshot_grid
- browser_click "#selector"
- browser_click "CellXN"
- browser_type "#selector" "text"
- browser_type_key "enter"
- browser_type_key "tab"
- browser_scroll "down" 300
- wait 500

Browser best practices:
- Use read_text for readable content.
- Use read when structure matters.
- Use browser_screenshot to visually confirm what loaded.
- Use browser_screenshot_grid before Cell-based browser clicks.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE TERMINAL COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You must call launch_linux before using terminal commands.
Available terminal commands:
- launch_linux
- exec "command"
- read_file "path"
- write_file "path" "content"
- list_files "path"
- read_terminal
- terminal_screenshot

Use the terminal when shell behavior or quick scripting is useful.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRID CLICK RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before clicking a Cell coordinate, first obtain a grid screenshot.
Recommended sequence:
- screenshot_grid
- click "CellF12"
- screenshot
- read_log

Same principle for the browser:
- browser_screenshot_grid
- browser_click "CellH6"
- browser_screenshot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STANDARD WORKFLOWS YOU SHOULD FOLLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A. NEW APP
Usually:
1. set_code
2. screenshot
3. read_log
4. if needed, read_code
5. edit_lines
6. screenshot
7. read_log
8. end_think
9. final message
10. insert_html_file_last

B. MODIFY EXISTING APP
Usually:
1. read_code
2. screenshot if visual context matters
3. edit_lines or search_code + edit_result_N
4. screenshot
5. read_log
6. test interaction if relevant
7. end_think
8. final message
9. insert_html_file_last

C. DEBUG BROKEN APP
Usually:
1. read_log
2. screenshot
3. read_code or search_code using the error context
4. edit_lines or edit_result_N
5. screenshot
6. read_log again
7. repeat until clean
8. end_think
9. final message
10. insert_html_file_last

D. TEST INTERACTIVE FEATURE
Usually:
1. screenshot or screenshot_grid
2. click or type
3. wait if needed
4. screenshot
5. read_log
6. adjust code if behavior is wrong

E. RESEARCH + IMPLEMENT
Usually:
1. launch_web
2. visit "url"
3. read_text
4. browser_screenshot
5. implement using sandbox commands
6. verify in sandbox

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL MESSAGE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When the task is truly complete, send:
1. one commands block containing end_think
2. then a normal-language final message in the user's language
3. optionally include display commands in that final text:
   [open_browser "url"]
   [show_screenshot]
   [show_image "base64"]
4. then include insert_html_file_last

Do not finish early.
Do not keep thinking forever either.
Once the requested result is implemented, verified, and reasonably clean, end properly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HALLUCINATION PREVENTION — CRITICAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are an action agent. EVERY claim must be backed by a command you actually executed.

RULE ZERO: Never describe an action you did not take.
- If you say "I clicked the button" → you must have executed click.
- If you say "the screenshot shows" → you must have executed screenshot.
- If you say "the error is fixed" → you must have executed edit_lines + screenshot + read_log.
- No exceptions. Ever.

RULE ONE: Always verify before claiming success.
- NEVER claim a bug is fixed without seeing a screenshot proving it.
- NEVER claim a feature works without testing it with click/type.
- If you cannot see the result, you do NOT know if it worked.

RULE TWO: The screenshot you receive IS the app under test.
- If you see the AI Builder interface itself in a screenshot, something is wrong: you are looking at the wrong iframe or the page did not load. Do NOT analyze the AI Builder UI — fix the problem and retry.
- For browser: use browser_screenshot to see the actual web page loaded in the browser iframe.
- For sandbox: use screenshot to see the HTML app you are building.

RULE THREE: Complete the full cycle.
- After ANY edit: read_log + screenshot.
- After ANY interaction: screenshot to see the result.
- Always execute read_log to check for JavaScript errors.
- A task is NOT done until you have visual proof.

RULE FOUR: Minimum commands per message.
- If you have an active task, your response MUST include a commands block.
- A response without a commands block = you are stalling.
- If you need to think, do it INSIDE the commands block cycle, not outside.
- Always include at least one actionable command when working on a task.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEVER DO THESE THINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Never say you changed code if you did not execute commands.
- Never edit with edit_lines before read_code.
- Never trust guessed line numbers.
- Never ignore a relevant console error.
- Never skip visual verification after an important change.
- Never skip interaction testing for buttons, forms, modals, tabs, filters, navigation, or dynamic UI.
- Never use Cell clicks without first getting a grid screenshot.
- Never recreate the full app for a small requested modification.
- Never output multiple commands blocks in one answer.
- Never end without insert_html_file_last when delivering the result.
- Never claim "screenshot shows X" if you did not execute a screenshot command.
- Never claim "the app works" if you did not execute read_log and confirm zero errors.
- Never analyze a screenshot of the AI Builder interface — you are testing the sandbox/browser, not the chat UI.
- Never stop after one failed attempt: if a click/type fails, inspect the page with read/read_text and try again with different selectors.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUICK CHEAT SHEET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SANDBOX READ:     read_code / read_log / search_code "text"
SANDBOX WRITE:    set_code / edit_lines A-B "..." / edit_result_N n°X "..."
SANDBOX TEST:     click / type / scroll / wait
SANDBOX VIEW:     screenshot / screenshot_full / screenshot_grid

IMAGE GENERATION:
- generate_image "detailed prompt in english"
  - Generates an image via Cloudflare Worker (Flux model).
  - Returns: id (e.g. image.456789), url (data URL), and the actual image (visible to you for analysis).
  - You can analyze the generated image visually in the next round.
  - To insert the image in your final message to the user: write pin_image.456789 at the position where you want it.
  - The url can be used to embed the image in HTML code: <img src="url-here">
  - Always describe what you generated to the user.
  - The prompt should be in ENGLISH and DETAILED for best results.
  - Example sequence:
    generate_image "a futuristic cyberpunk city at sunset, neon lights, flying cars, ultra detailed, 4k"
    (then in your final message:) "Here is the image I generated for you: pin_image.456789"

BROWSER INIT:     launch_web
BROWSER NAV:      visit "url" / back / forward / new_tab / close_tab / switch_tab N
BROWSER READ:     read / read_text / read_links
BROWSER TEST:     browser_click / browser_type / browser_type_key "enter" / browser_scroll

TERMINAL INIT:    launch_linux
TERMINAL RUN:     exec
TERMINAL FILES:   read_file / write_file / list_files
TERMINAL VIEW:    read_terminal / terminal_screenshot

FINISH:           end_think
DISPLAY:          [open_browser "url"] [show_screenshot] [show_image "base64"]`;

// ── ÉTAT GLOBAL PERSISTANT ──
let CONVERSATION = [{ role: 'system', content: SYSTEM_PROMPT }];
let STATE = {
    code: '',
    searchCache: {},
    searchCount: 0,
    consoleLogs: [],
    phase: 'create',
    generatedImages: {}
};

function hardReset() {
    CONVERSATION = [{ role: 'system', content: SYSTEM_PROMPT }];
    STATE = { code: '', searchCache: {}, searchCount: 0, consoleLogs: [], phase: 'create', generatedImages: {} };
    const sb = document.getElementById('sandbox');
    if (sb) sb.srcdoc = '';
}

function resetRound() {
    STATE.consoleLogs = [];
    STATE.searchCache = {};
    STATE.searchCount = 0;
}

// ── SANDBOX ──
const getSandbox = () => document.getElementById('sandbox');

function loadSandbox(html) {
    STATE.consoleLogs = [];
    const bridge = `<script>
(function(){
    const s=(l,a)=>window.parent.postMessage({type:'console',level:l,args:Array.from(a).map(x=>{try{return JSON.stringify(x)}catch(e){return String(x)}})}, '*');
    ['log','warn','error','info'].forEach(l=>{const o=console[l];console[l]=function(){s(l,arguments);o.apply(console,arguments)};});
    window.onerror=(m,_,r)=>{window.parent.postMessage({type:'console',level:'error',args:[m+' (line '+r+')']}, '*');};
})();
<\/script>`;
    const injected = html.replace('<head>', '<head>' + bridge);
    getSandbox().srcdoc = injected;
    STATE.code = html;
    return new Promise(r => setTimeout(r, 900));
}

window.addEventListener('message', e => {
    if (e.data?.type === 'console') {
        STATE.consoleLogs.push(`[${e.data.level.toUpperCase()}] ${e.data.args.join(' ')}`);
    }
});

async function doScreenshot(full = false) {
    const doc = getSandbox().contentDocument;
    if (!doc?.body) throw new Error('Sandbox vide');
    if (full) { getSandbox().style.height = doc.body.scrollHeight + 'px'; await waitMs(300); }
    const canvas = await html2canvas(doc.body, { useCORS: true, allowTaint: true, logging: false });
    if (full) getSandbox().style.height = '844px';
    return canvas.toDataURL('image/png');
}

async function doScreenshotGrid() {
    const dataUrl = await doScreenshot(false);
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
            resolve(c.toDataURL('image/png'));
        };
        img.src = dataUrl;
    });
}

function cellToXY(cell) {
    const m = cell.match(/Cell([A-Z])(\d+)/i);
    if (!m) return null;
    const doc = getSandbox().contentDocument;
    const w = doc.body.scrollWidth || 390;
    const h = doc.body.scrollHeight || 844;
    const cellW = w / 26;
    const rows = Math.round(h / cellW);
    const cellH = h / rows;
    const col = m[1].toUpperCase().charCodeAt(0) - 65;
    const row = parseInt(m[2]) - 1;
    return { x: col * cellW + cellW / 2, y: row * cellH + cellH / 2 };
}

// ── PARSER DE COMMANDES ROBUSTE ──
function parseCommands(raw) {
    const result = [];
    const lines = raw.split('\n');
    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (!line) { i++; continue; }

        if (line.startsWith('edit_lines')) {
            let m = line.match(/^edit_lines\s+(\d+)-(\d+)\s+"([\s\S]+)"$/)
                 || line.match(/^edit_lines\s+(\d+)-(\d+)\s+(.+)$/);
            if (m) {
                result.push({ cmd: 'edit_lines', from: parseInt(m[1]), to: parseInt(m[2]), content: m[3].replace(/\\n/g,'\n') });
                i++; continue;
            }
            const mh = line.match(/^edit_lines\s+(\d+)-(\d+)\s*$/);
            if (mh && i + 1 < lines.length) {
                const next = lines[i+1].trim().replace(/^"|"$/g,'');
                result.push({ cmd: 'edit_lines', from: parseInt(mh[1]), to: parseInt(mh[2]), content: next.replace(/\\n/g,'\n') });
                i += 2; continue;
            }
            result.push({ cmd: 'edit_lines_error', raw: line }); i++; continue;
        }

        if (line.startsWith('edit_result')) {
            let m = line.match(/^edit_result_(\d+)\s+n[°o](\d+)\s+"([\s\S]+)"$/)
                 || line.match(/^edit_result_(\d+)\s+n[°o](\d+)\s+(.+)$/);
            if (m) { result.push({ cmd: 'edit_result', sid: parseInt(m[1]), num: parseInt(m[2]), content: m[3].replace(/\\n/g,'\n') }); i++; continue; }
            result.push({ cmd: 'edit_result_error', raw: line }); i++; continue;
        }

        if (line.startsWith('search_code')) {
            const q = line.match(/search_code\s+"([^"]+)"/)?.[1]
                   || line.replace(/^search_code\s*/,'').replace(/^"|"$/g,'').trim();
            result.push({ cmd: 'search_code', query: q }); i++; continue;
        }

        if (line.startsWith('click')) {
            const target = line.replace(/^click\s+/,'').replace(/^"|"$/g,'').trim();
            result.push({ cmd: 'click', target }); i++; continue;
        }

        if (line.startsWith('type')) {
            const m = line.match(/^type\s+"?([^"]+)"?\s+"(.+)"$/)
                   || line.match(/^type\s+(\S+)\s+"(.+)"$/);
            if (m) result.push({ cmd: 'type', selector: m[1].trim(), text: m[2] });
            else result.push({ cmd: 'type_error', raw: line });
            i++; continue;
        }

        if (line.startsWith('scroll')) {
            const m = line.match(/scroll\s+"?(\w+)"?\s+(\d+)/);
            if (m) result.push({ cmd: 'scroll', direction: m[1], amount: parseInt(m[2]) });
            i++; continue;
        }

        if (line.startsWith('wait')) {
            result.push({ cmd: 'wait', ms: parseInt(line.replace('wait','').trim()) || 500 });
            i++; continue;
        }

        // Commandes emu browser
        if (line.startsWith('visit')) {
            const url = line.replace(/^visit\s+/,'').replace(/^"|"$/g,'');
            result.push({ cmd: 'emu', command: 'visit', args: [url] }); i++; continue;
        }
        if (line.startsWith('browser_click')) {
            const t = line.replace(/^browser_click\s+/,'').replace(/^"|"$/g,'');
            result.push({ cmd: 'emu', command: 'browser_click', args: [t] }); i++; continue;
        }
        if (line.startsWith('browser_type_key')) {
            const k = line.replace(/^browser_type_key\s+/,'').replace(/^"|"$/g,'').trim();
            result.push({ cmd: 'emu', command: 'browser_type_key', args: [k] }); i++; continue;
        }
        if (line.startsWith('generate_image')) {
            const m = line.match(/^generate_image\s+"(.+)"$/) || line.match(/^generate_image\s+(.+)$/);
            if (m) result.push({ cmd: 'generate_image', prompt: m[1].trim() });
            else result.push({ cmd: 'unknown', raw: line });
            i++; continue;
        }
        if (line.startsWith('browser_type')) {
            const m = line.match(/browser_type\s+"?([^"]+)"?\s+"(.+)"/);
            if (m) result.push({ cmd: 'emu', command: 'browser_type', args: [m[1], m[2]] });
            i++; continue;
        }
        if (line.startsWith('browser_scroll')) {
            const m = line.match(/browser_scroll\s+"?(\w+)"?\s+(\d+)/);
            if (m) result.push({ cmd: 'emu', command: 'browser_scroll', args: [m[1], m[2]] });
            i++; continue;
        }
        if (line.startsWith('browser_screenshot_grid')) {
            result.push({ cmd: 'emu', command: 'browser_screenshot_grid', args: [] }); i++; continue;
        }
        if (line.startsWith('browser_screenshot')) {
            result.push({ cmd: 'emu', command: 'browser_screenshot', args: [] }); i++; continue;
        }
        if (line.startsWith('switch_tab')) {
            const n = line.replace('switch_tab','').trim();
            result.push({ cmd: 'emu', command: 'switch_tab', args: [n] }); i++; continue;
        }
        if (line.startsWith('write_file')) {
            const m = line.match(/write_file\s+"?([^"\s]+)"?\s+"([\s\S]+)"$/);
            if (m) result.push({ cmd: 'emu', command: 'write_file', args: [m[1], m[2]] });
            i++; continue;
        }
        if (line.startsWith('read_file')) {
            const f = line.replace(/^read_file\s+/,'').replace(/^"|"$/g,'');
            result.push({ cmd: 'emu', command: 'read_file', args: [f] }); i++; continue;
        }
        if (line.startsWith('list_files')) {
            const p = line.replace(/^list_files\s*/,'').replace(/^"|"$/g,'');
            result.push({ cmd: 'emu', command: 'list_files', args: [p] }); i++; continue;
        }
        if (line.startsWith('exec')) {
            const c = line.replace(/^exec\s+/,'').replace(/^"|"$/g,'');
            result.push({ cmd: 'emu', command: 'exec', args: [c] }); i++; continue;
        }

        // Commandes simples
        const simple = {
            'read_code':'read_code','read_log':'read_log','set_code':'set_code',
            'screenshot_full':'screenshot_full','screenshot_grid':'screenshot_grid',
            'screenshot':'screenshot','end_think':'end_think',
            'launch_web':'launch_web','launch_linux':'launch_linux',
            'back':'back','forward':'forward','new_tab':'new_tab',
            'close_tab':'close_tab','read':'read','read_text':'read_text',
            'read_links':'read_links','read_terminal':'read_terminal',
            'terminal_screenshot':'terminal_screenshot'
        };
        if (simple[line]) {
            if (['launch_web','launch_linux','back','forward','new_tab','close_tab',
                 'read','read_text','read_links','read_terminal','terminal_screenshot'].includes(line)) {
                result.push({ cmd: 'emu', command: line, args: [] });
            } else {
                result.push({ cmd: simple[line] });
            }
            i++; continue;
        }

        result.push({ cmd: 'unknown', raw: line }); i++;
    }
    return result;
}

// ── EXÉCUTEUR ──
async function executeCommands(cmdsRaw, htmlBlock, thinkBody) {
    const parsed = parseCommands(cmdsRaw);
    const feedback = [];
    const edits = [];
    let hasWrites = false;
    let wantShot = false, shotFull = false, shotGrid = false;
    let isEnd = false;

    for (const cmd of parsed) {

        if (cmd.cmd === 'read_code') {
            const numbered = STATE.code.split('\n').map((l,i) => `${String(i+1).padStart(4,' ')} | ${l}`).join('\n');
            window.AgentChat.addStep(thinkBody, `read_code — ${STATE.code.split('\n').length} lignes`, 'ok');
            feedback.push({ type: 'read_code', data: numbered });

        } else if (cmd.cmd === 'read_log') {
            const logs = STATE.consoleLogs.length ? STATE.consoleLogs.join('\n') : 'No errors.';
            window.AgentChat.addStep(thinkBody, `read_log — ${STATE.consoleLogs.length} entrée(s)`, 'ok');
            feedback.push({ type: 'read_log', data: logs });

        } else if (cmd.cmd === 'search_code') {
            const codeLines = STATE.code.split('\n');
            const results = [];
            codeLines.forEach((cl, i) => { if (cl.includes(cmd.query)) results.push({ line: i+1, content: cl.trim() }); });
            STATE.searchCount++;
            const sid = STATE.searchCount;
            STATE.searchCache[sid] = results;
            const txt = results.length ? results.map((r,i) => `${i+1}. L.${r.line}   ${r.content}`).join('\n') : 'No matches.';
            window.AgentChat.addStep(thinkBody, `search_code "${cmd.query}" → ${results.length} résultat(s) [search_${sid}]`, 'ok');
            feedback.push({ type: 'search', id: sid, data: txt });

        } else if (cmd.cmd === 'set_code') {
            if (htmlBlock) {
                edits.push({ type: 'set', html: htmlBlock });
                hasWrites = true;
                window.AgentChat.addStep(thinkBody, `set_code — ${htmlBlock.split('\n').length} lignes`, 'ok');
                feedback.push({ type: 'set_code', data: `[SET_CODE] ${htmlBlock.split('\n').length} lignes de code ont été définies dans le sandbox.` });
            } else {
                window.AgentChat.addStep(thinkBody, 'set_code — bloc html manquant', 'err');
                feedback.push({ type: 'set_code', data: `[SET_CODE ERROR] Aucun bloc HTML fourni. Utilisez un bloc \`\`\`html après la commande set_code.` });
            }

        } else if (cmd.cmd === 'edit_lines') {
            edits.push({ type: 'lines', from: cmd.from, to: cmd.to, content: cmd.content });
            hasWrites = true;
            window.AgentChat.addStep(thinkBody, `edit_lines ${cmd.from}-${cmd.to}`, 'ok');
            feedback.push({ type: 'edit_lines', data: `[EDIT_LINES] Lignes ${cmd.from}-${cmd.to} marquées pour modification.` });

        } else if (cmd.cmd === 'edit_lines_error') {
            window.AgentChat.addStep(thinkBody, `edit_lines format invalide: ${cmd.raw}`, 'err');
            feedback.push({ type: 'edit_lines_error', data: `[EDIT_LINES ERROR] Format invalide: "${cmd.raw}". Utilisez: edit_lines A-B "contenu sur la même ligne"` });

        } else if (cmd.cmd === 'edit_result') {
            edits.push({ type: 'result', sid: cmd.sid, num: cmd.num, content: cmd.content });
            hasWrites = true;
            window.AgentChat.addStep(thinkBody, `edit_result_${cmd.sid} n°${cmd.num}`, 'ok');
            feedback.push({ type: 'edit_result', data: `[EDIT_RESULT] Résultat n°${cmd.num} de la recherche ${cmd.sid} marqué pour modification.` });

        } else if (cmd.cmd === 'edit_result_error') {
            window.AgentChat.addStep(thinkBody, `edit_result format invalide: ${cmd.raw}`, 'err');
            feedback.push({ type: 'edit_result_error', data: `[EDIT_RESULT ERROR] Format invalide: "${cmd.raw}".` });

        } else if (cmd.cmd === 'click') {
            const doc = getSandbox().contentDocument;
            let clickResult = '';
            try {
                if (/^Cell[A-Z]\d+$/i.test(cmd.target)) {
                    const xy = cellToXY(cmd.target);
                    if (xy) { 
                        const el = doc.elementFromPoint(xy.x, xy.y); 
                        if (el) { 
                            el.click(); 
                            window.AgentChat.addStep(thinkBody, `click ${cmd.target}`, 'ok'); 
                            clickResult = `[CLICK] Clic effectué sur la cellule ${cmd.target} (coordonnées: ${Math.round(xy.x)}, ${Math.round(xy.y)}).`;
                        } else {
                            clickResult = `[CLICK ERROR] Aucun élément trouvé aux coordonnées de ${cmd.target}.`;
                        }
                    } else {
                        window.AgentChat.addStep(thinkBody, `click ${cmd.target} invalide`, 'err');
                        clickResult = `[CLICK ERROR] Cellule ${cmd.target} invalide.`;
                    }
                } else {
                    const el = doc.querySelector(cmd.target);
                    if (el) { 
                        el.click(); 
                        window.AgentChat.addStep(thinkBody, `click "${cmd.target}"`, 'ok'); 
                        clickResult = `[CLICK] Élément "${cmd.target}" cliqué avec succès.`;
                    } else {
                        window.AgentChat.addStep(thinkBody, `click "${cmd.target}" non trouvé`, 'err');
                        clickResult = `[CLICK ERROR] Élément "${cmd.target}" non trouvé dans le DOM.`;
                    }
                }
            } catch(e) { 
                window.AgentChat.addStep(thinkBody, `click ${e.message}`, 'err'); 
                clickResult = `[CLICK ERROR] Exception: ${e.message}`;
            }
            feedback.push({ type: 'click', data: clickResult });
            await waitMs(300);

        } else if (cmd.cmd === 'type') {
            let typeResult = '';
            try {
                const el = getSandbox().contentDocument.querySelector(cmd.selector);
                if (el) {
                    el.value = cmd.text;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    window.AgentChat.addStep(thinkBody, `type "${cmd.selector}"`, 'ok');
                    typeResult = `[TYPE] Texte "${cmd.text}" saisi dans l'élément "${cmd.selector}".`;
                } else {
                    window.AgentChat.addStep(thinkBody, `type "${cmd.selector}" non trouvé`, 'err');
                    typeResult = `[TYPE ERROR] Élément "${cmd.selector}" non trouvé.`;
                }
            } catch(e) { 
                window.AgentChat.addStep(thinkBody, `type ${e.message}`, 'err'); 
                typeResult = `[TYPE ERROR] Exception: ${e.message}`;
            }
            feedback.push({ type: 'type', data: typeResult });
            await waitMs(200);

        } else if (cmd.cmd === 'scroll') {
            getSandbox().contentWindow?.scrollBy(0, cmd.direction === 'down' ? cmd.amount : -cmd.amount);
            window.AgentChat.addStep(thinkBody, `scroll ${cmd.direction} ${cmd.amount}px`, 'ok');
            feedback.push({ type: 'scroll', data: `[SCROLL] Défilement de ${cmd.amount}px vers ${cmd.direction} effectué.` });
            await waitMs(200);

        } else if (cmd.cmd === 'wait') {
            await waitMs(cmd.ms);
            window.AgentChat.addStep(thinkBody, `wait ${cmd.ms}ms`, 'ok');
            feedback.push({ type: 'wait', data: `[WAIT] Le système a attendu ${cmd.ms}ms. Vous pouvez continuer avec d'autres commandes.` });

        } else if (cmd.cmd === 'screenshot_full')  { wantShot = true; shotFull = true; feedback.push({ type: 'screenshot', data: `[SCREENSHOT] Capture d'écran complète en cours...` }); }
        else if (cmd.cmd === 'screenshot_grid')    { wantShot = true; shotGrid = true; feedback.push({ type: 'screenshot', data: `[SCREENSHOT_GRID] Capture avec grille en cours...` }); }
        else if (cmd.cmd === 'screenshot')         { wantShot = true; feedback.push({ type: 'screenshot', data: `[SCREENSHOT] Capture d'écran en cours...` }); }
        else if (cmd.cmd === 'end_think')          { isEnd = true; window.AgentChat.addStep(thinkBody, 'end_think', 'ok'); }

        else if (cmd.cmd === 'generate_image') {
            const promptShort = cmd.prompt.length > 60 ? cmd.prompt.substring(0, 60) + '...' : cmd.prompt;
            const stepEl = window.AgentChat.addStep(thinkBody, `generate_image "${promptShort}"`, 'run');
            try {
                const r = await fetch('https://gpt4o.hugdu77777.workers.dev/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: cmd.prompt,
                        width: '1024',
                        height: '1024',
                        steps: '25'
                    })
                });
                const data = await r.json();
                if (data.ok && data.imageDataUrl) {
                    const imageId = 'image.' + Math.floor(100000 + Math.random() * 900000);
                    STATE.generatedImages[imageId] = {
                        url: data.imageDataUrl,
                        base64: data.image,
                        prompt: cmd.prompt
                    };
                    window.AgentChat.updateStep(stepEl, `generate_image ${imageId} (${(data.durationMs/1000).toFixed(1)}s)`, 'ok');
                    // Afficher l'image dans le thinking panel
                    const img = document.createElement('img');
                    img.src = data.imageDataUrl;
                    img.style.cssText = 'max-width:100%;max-height:280px;border-radius:8px;margin-top:8px;cursor:pointer;display:block;';
                    img.onclick = () => window.AgentChat.openModal(data.imageDataUrl);
                    stepEl.appendChild(img);
                    feedback.push({
                        type: 'generate_image',
                        data: `[GENERATE_IMAGE] Image générée avec succès.\nid: ${imageId}\nurl: ${data.imageDataUrl.substring(0, 80)}... (data URL complète disponible)\nprompt utilisé: "${cmd.prompt}"\n\nL'image est visible ci-dessous (analyse-la si besoin).\nPour l'inclure dans ton message final à l'utilisateur, écris: pin_${imageId}\nPour l'intégrer dans du code HTML, utilise l'URL data complète comme attribut src.`,
                        imgB64: data.image
                    });
                } else {
                    const errMsg = data.error || 'Réponse invalide du worker';
                    window.AgentChat.updateStep(stepEl, `generate_image error`, 'err');
                    feedback.push({ type: 'generate_image', data: `[GENERATE_IMAGE ERROR] ${errMsg}` });
                }
            } catch(e) {
                window.AgentChat.updateStep(stepEl, `generate_image error: ${e.message}`, 'err');
                feedback.push({ type: 'generate_image', data: `[GENERATE_IMAGE ERROR] ${e.message}` });
            }
        }

        else if (cmd.cmd === 'emu') {
            // Délègue à emu.js
            try {
                const result = await window.AgentEmu.executeEmuCommand(cmd, thinkBody);
                if (result) {
                    // TOUJOURS envoyer un feedback, même si le texte est vide
                    const feedbackText = result.text || `[${cmd.command.toUpperCase()}] Commande exécutée.`;
                    feedback.push({ type: `emu_${cmd.command}`, data: feedbackText });
                    if (result.imgB64) feedback.push({ type: 'emu_screenshot', imgB64: result.imgB64 });
                } else {
                    // Si executeEmuCommand retourne null (commande non reconnue)
                    feedback.push({ type: `emu_${cmd.command}`, data: `[${cmd.command.toUpperCase()}] Commande non reconnue par l'émulateur.` });
                }
            } catch(emuErr) {
                // Si l'émulateur crash (ex: erreur réseau dans launch_web)
                const errMsg = `[${cmd.command.toUpperCase()} ERROR] ${emuErr.message || 'Erreur inconnue'}`;
                feedback.push({ type: `emu_${cmd.command}`, data: errMsg });
                window.AgentChat.addStep(thinkBody, `${cmd.command} : ${emuErr.message}`, 'err');
            }

        } else if (cmd.cmd === 'unknown') {
            window.AgentChat.addStep(thinkBody, `Commande inconnue: "${cmd.raw}"`, 'err');
        }
    }

    // ── Atomic writes ──
    if (hasWrites) {
        let codeArr = STATE.code.split('\n');
        const setEdit = edits.find(e => e.type === 'set');
        if (setEdit) codeArr = setEdit.html.split('\n');

        for (const e of edits.filter(e => e.type === 'result')) {
            const res = STATE.searchCache[e.sid];
            if (res?.[e.num - 1]) codeArr[res[e.num - 1].line - 1] = e.content;
            else window.AgentChat.addStep(thinkBody, `edit_result_${e.sid} n°${e.num} introuvable`, 'err');
        }

        const lineEdits = edits.filter(e => e.type === 'lines').sort((a,b) => b.from - a.from);
        for (const e of lineEdits) {
            codeArr = [...codeArr.slice(0, e.from - 1), ...e.content.split('\n'), ...codeArr.slice(e.to)];
        }

        await loadSandbox(codeArr.join('\n'));
        window.AgentChat.addStep(thinkBody, `Code rechargé — ${codeArr.length} lignes`, 'ok');
        feedback.push({ type: 'reload', data: `[RELOAD] Code rechargé dans le sandbox — ${codeArr.length} lignes. Utilisez screenshot ou read_code pour vérifier le résultat.` });
    }

    // ── Screenshot sandbox ──
    let screenshotB64 = null;
    if (wantShot) {
        try {
            let dataUrl;
            if (shotGrid)      dataUrl = await doScreenshotGrid();
            else if (shotFull) dataUrl = await doScreenshot(true);
            else               dataUrl = await doScreenshot(false);

            screenshotB64 = dataUrl.split(',')[1];
            const label = shotGrid ? 'screenshot_grid' : shotFull ? 'screenshot_full' : 'screenshot';
            const stepEl = window.AgentChat.addStep(thinkBody, label, 'ok');
            const img = document.createElement('img');
            img.src = dataUrl;
            img.onclick = () => window.AgentChat.openModal(dataUrl);
            stepEl.appendChild(img);
            thinkBody.scrollTop = thinkBody.scrollHeight;
        } catch(e) {
            window.AgentChat.addStep(thinkBody, `screenshot ${e.message}`, 'err');
        }
    }

    return { feedback, screenshotB64, isEnd };
}

// ── AGENT LOOP ──
async function runAgent(userMsg, imgDataUrl) {
    window.AgentChat.setSending(true);
    if (!imgDataUrl) window.AgentChat.addMsg('user', userMsg);
    resetRound();

    const isNewApp = STATE.code === '';
    if (isNewApp && !imgDataUrl) STATE.phase = 'create';
    // Si image envoyée, forcer le mode debug (multimodal)
    if (imgDataUrl) STATE.phase = 'debug';

    if ((!userMsg || !userMsg.trim()) && imgDataUrl) userMsg = 'Analyse cette image.';

    let fullUserMsg = userMsg;
    if (STATE.code && STATE.code.trim()) {
        fullUserMsg = `${userMsg}\n\n[CURRENT CODE — ${STATE.code.split('\n').length} lines, already loaded in sandbox]\n${STATE.code}`;
    }

    const imageUrl = imgDataUrl
        ? (String(imgDataUrl).startsWith('data:') ? imgDataUrl : `data:image/png;base64,${imgDataUrl}`)
        : null;

    const userContent = imageUrl
        ? [
            { type: 'text', text: fullUserMsg + '\n\n[IMAGE ATTACHED - analyze the image carefully.]' },
            { type: 'image_url', image_url: { url: imageUrl } }
        ]
        : fullUserMsg;

    CONVERSATION.push({ role: 'user', content: userContent });

    const thinkBody = window.AgentChat.createThinkPanel();
    const localMessages = [...CONVERSATION];
    let round = 0;
    let finalResponseSaved = false;

    // Sauvegarder l'image du premier tour
    const firstImgB64 = imageUrl ? imageUrl.replace(/^data:image\/[^;]+;base64,/, '') : null;

    while (round < 20) {
        round++;

        const modelList = STATE.phase === 'create'
            ? window.AgentAPI.MODELS_CREATE
            : window.AgentAPI.MODELS_DEBUG;

        // Utiliser l'image du premier tour, puis les screenshots du sandbox
        const currentImgB64 = (round === 1 && firstImgB64) ? firstImgB64 : null;

        let response;
        try {
            response = await window.AgentAPI.callWithFallback(modelList, localMessages, currentImgB64, thinkBody);
        } catch(e) {
            window.AgentChat.addMsg('ai', 'Erreur : ' + e.message);
            break;
        }

        STATE.phase = 'debug';
        localMessages.push({ role: 'assistant', content: response });

        // ── DÉTECTION MARQUEURS DE FIN ──
        const hasEndThink = /end_think/i.test(response);
        const hasInsertLast = /insert_html_file_last/i.test(response);
        const cmdMatch  = response.match(/```\s*commands?\s*\r?\n([\s\S]*?)```/i);
        const htmlMatch = response.match(/```\s*html\s*\r?\n([\s\S]*?)```/i);
        const htmlBlock = htmlMatch ? htmlMatch[1] : null;

        const prose = response
            .replace(/```commands?[\s\S]*?```/gi, '')
            .replace(/```html[\s\S]*?```/gi, '')
            .replace(/insert_html_file_last/gi, '')
            .replace(/end_think/gi, '')
            .trim();
        if (prose) window.AgentChat.addTextStep(thinkBody, prose);

        // ── CAS 1: end_think présent → exécuter commandes puis terminer ──
        if (hasEndThink) {
            if (cmdMatch) {
                await executeCommands(cmdMatch[1], htmlBlock, thinkBody);
            }
            let finalMsg = response
                .replace(/```commands?[\s\S]*?```/gi, '')
                .replace(/```html[\s\S]*?```/gi, '')
                .replace(/end_think/gi, '')
                .replace(/insert_html_file_last/gi, '')
                .trim();
            if (finalMsg) window.AgentChat.renderFinalMessage(finalMsg);
            if (STATE.code) window.AgentChat.insertCodeBlock(STATE.code);
            CONVERSATION.push({ role: 'assistant', content: response });
            break;
        }

        // ── CAS 2: insert_html_file_last sans commandes → terminer direct ──
        if (hasInsertLast && !cmdMatch) {
            let finalMsg = response
                .replace(/```[\s\S]*?```/gi, '')
                .replace(/insert_html_file_last/gi, '')
                .trim();
            if (finalMsg) window.AgentChat.renderFinalMessage(finalMsg);
            if (STATE.code) window.AgentChat.insertCodeBlock(STATE.code);
            CONVERSATION.push({ role: 'assistant', content: response });
            break;
        }

        // ── CAS 3: Pas de commandes → réponse texte, terminer ──
        if (!cmdMatch) {
            const clean = response.replace(/```[\s\S]*?```/gi, '').trim();
            if (clean) window.AgentChat.renderFinalMessage(clean);
            if (STATE.code) window.AgentChat.insertCodeBlock(STATE.code);
            CONVERSATION.push({ role: 'assistant', content: response });
            break;
        }

        // ── CAS 4: Commandes présentes → exécution ──
        const execResult = await executeCommands(cmdMatch[1], htmlBlock, thinkBody);
        const { feedback, screenshotB64, isEnd } = execResult;

        // Si end_think détecté pendant exécution → terminer
        if (isEnd) {
            const afterCommands = response.split(/```commands[\s\S]*?```/i).pop() || '';
            const finalMsg = afterCommands.replace(/insert_html_file_last/gi, '').trim();
            if (finalMsg) window.AgentChat.renderFinalMessage(finalMsg);
            if (STATE.code) window.AgentChat.insertCodeBlock(STATE.code);
            CONVERSATION.push({ role: 'assistant', content: response });
            break;
        }

        // ── PRÉPARER PROCHAIN TOUR ──
        const parts = [];
        for (const f of feedback) {
            if (f.type === 'read_code') parts.push(`[CODE]\n${f.data}`);
            else if (f.type === 'read_log') parts.push(`[CONSOLE]\n${f.data}`);
            else if (f.type === 'search') parts.push(`[SEARCH_${f.id}]\n${f.data}`);
            else if (f.type.startsWith('emu_')) parts.push(`[${f.type.toUpperCase()}]\n${f.data}`);
            else parts.push(f.data); // Tous les autres types (set_code, edit_lines, click, type, scroll, wait, screenshot, etc.)
        }
        if (!parts.length) parts.push('Commands executed successfully. Continue with more commands or finish with end_think.');

        // Récupérer toutes les images à attacher (screenshots + images générées)
        const generatedImages = feedback.filter(f => f.type === 'generate_image' && f.imgB64);
        const emuScreenshots = feedback.filter(f => f.type === 'emu_screenshot');
        const allImages = [];
        if (screenshotB64 && emuScreenshots.length === 0 && generatedImages.length === 0) {
            allImages.push({ imgB64: screenshotB64 });
        }
        emuScreenshots.forEach(s => allImages.push({ imgB64: s.imgB64 }));
        generatedImages.forEach(g => allImages.push({ imgB64: g.imgB64 }));
        if (screenshotB64 && (emuScreenshots.length > 0 || generatedImages.length > 0)) {
            // Screenshot sandbox + autres images
            allImages.push({ imgB64: screenshotB64 });
        }

        if (allImages.length > 0) {
            parts.push(`[${allImages.length} IMAGE(S) ATTACHED - YOU CAN SEE THEM]`);
        }

        // Force le mode debug (multimodal) si une image est attachée
        if (allImages.length > 0) STATE.phase = 'debug';

        // Message de feedback
        const feedbackContent = parts.join('\n\n') + '\n\n---\nINSTRUCTIONS: Analyze the results above. If images are attached, examine them carefully. If you see console errors, fix them. If the app needs improvement, continue with more commands. Only finish with end_think + insert_html_file_last when the task is COMPLETELY DONE.';

        const nextUserMsg = {
            role: 'user',
            content: feedbackContent
        };

        // Construire le content multimodal si des images sont présentes
        if (allImages.length > 0) {
            nextUserMsg.content = [{ type: 'text', text: feedbackContent }];
            allImages.forEach(img => {
                nextUserMsg.content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${img.imgB64}` } });
            });
        }

        localMessages.push(nextUserMsg);
        await waitMs(400);
    }

    if (round >= 20) {
        // Envoyer un message spécial à l'IA pour qu'elle termine
        const limitMsg = "LIMIT REACHED: You have used 20 command rounds for this message. You MUST finish now. Write your final message and include end_think + insert_html_file_last immediately.";
        window.AgentChat.addMsg('ai', 'Limite de 20 étapes atteinte. L\'IA doit terminer.');
        
        // Ajouter ce message à la conversation pour forcer la fin
        localMessages.push({ role: 'user', content: limitMsg });
        
        // Demander une dernière réponse
        try {
            const finalResponse = await window.AgentAPI.callWithFallback(window.AgentAPI.MODELS_DEBUG, localMessages, null, thinkBody);
            const cleanFinal = finalResponse.replace(/```[\s\S]*?```/gi, '').trim();
            if (cleanFinal) window.AgentChat.renderFinalMessage(cleanFinal);
            if (STATE.code) window.AgentChat.insertCodeBlock(STATE.code);
            CONVERSATION.push({ role: 'assistant', content: finalResponse });
        } catch(e) {
            window.AgentChat.addMsg('ai', 'Erreur lors de la réponse finale: ' + e.message);
        }
    }
    // ── SAUVEGARDE FIREBASE COMPLÈTE ──
    try {
        if (window.saveCurrentChat) await window.saveCurrentChat(userMsg);
    } catch(e) { console.warn('Sauvegarde Firebase échouée:', e); }

    // Finaliser le think panel (passer de "thinking..." à "X étapes")
    if (thinkBody && window.AgentChat.finalizeThinkPanel) {
        window.AgentChat.finalizeThinkPanel(thinkBody);
    }

    window.AgentChat.setSending(false);
}

function waitMs(ms) { return new Promise(r => setTimeout(r, ms)); }

// Strip les images base64 de la conversation pour rester sous 1MB Firestore
function stripImagesFromConversation(conv) {
    return conv.map(m => {
        if (Array.isArray(m.content)) {
            const textOnly = m.content
                .filter(c => c.type === 'text')
                .map(c => c.text)
                .join('\n');
            const imageCount = m.content.filter(c => c.type === 'image_url').length;
            return {
                role: m.role,
                content: textOnly + (imageCount > 0 ? `\n[${imageCount} image(s) présente(s) en mémoire visuelle]` : '')
            };
        }
        return { role: m.role, content: String(m.content || '') };
    });
}

window.AgentSyst = {
    runAgent,
    hardReset,
    getCode: () => STATE.code,
    getConversation: () => stripImagesFromConversation(CONVERSATION),
    setConversation: (conv) => { if (Array.isArray(conv) && conv.length > 0) CONVERSATION = conv; },
    loadCodeIntoSandbox: async (code) => { if (code && code.trim()) await loadSandbox(code); },
    getGeneratedImage: (id) => STATE.generatedImages?.[id] || null,
    getAllGeneratedImages: () => STATE.generatedImages || {}
};
