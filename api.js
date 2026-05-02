// ═══════════════════════════════════════════════════
//  API.JS — Appels IA, modèles, fallback
//  Ne jamais modifier syst.js pour changer de modèle
//  Modifier uniquement ce fichier
// ═══════════════════════════════════════════════════

const KEYS = {
    google:   'YOUR_GOOGLE_API_KEY',
    cerebras: 'YOUR_CEREBRAS_API_KEY',
    groq:     'YOUR_GROQ_API_KEY',
    mistral:  'YOUR_MISTRAL_API_KEY'
};

// ── FIREBASE CONFIG ──
const FIREBASE_CONFIG = {
    apiKey: "YOUR_GOOGLE_API_KEY8FOR_FIREBASE",
    authDomain: "YOUR_AUTHDOMAIN",
    projectId: "YOUR_PROJECTID",
    storageBucket: "YOUR_STORAGEBUCKET",
    messagingSenderId: "YOUR_MESSAGINGSENDERID",
    appId: "YOUR_APPID",
    measurementId: "YOUR_MEASUREMENTID"
};

const MODELS_CREATE = [
    { provider: 'cerebras', model: 'qwen-3-235b-a22b-instruct-2507' },
    { provider: 'google',   model: 'gemini-3-flash-preview' },
    { provider: 'google',   model: 'gemini-2.5-flash' },
    { provider: 'google',   model: 'gemma-4-31b-it' },
    { provider: 'google',   model: 'gemma-26b-a4b-it' },
    { provider: 'google',   model: 'gemini-3.1-flash-lite-preview' },
    { provider: 'google',   model: 'gemini-2.5-flash-lite-preview-09-2025' },
    { provider: 'google',   model: 'gemma-3-27b-it' },
    { provider: 'groq',     model: 'openai/gpt-oss-20b' },
    { provider: 'mistral',  model: 'pixtral-large-2411' }
];

const MODELS_DEBUG = [
    { provider: 'google',   model: 'gemini-3-flash-preview' },
    { provider: 'google',   model: 'gemini-2.5-flash' },
    { provider: 'google',   model: 'gemma-4-31b-it' },
    { provider: 'google',   model: 'gemma-4-26b-a4b-it' },
    { provider: 'google',   model: 'gemini-3.1-flash-lite-preview' },
    { provider: 'google',   model: 'gemini-2.5-flash-lite-preview-09-2025' },
    { provider: 'google',   model: 'gemma-3-27b-it' },
    { provider: 'groq',     model: 'openai/gpt-oss-20b' },
    { provider: 'mistral',  model: 'pixtral-large-2411' }
];

// Helper pour normaliser le contenu des messages
function normalizeContent(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        // Extraire le texte des éléments de type 'text'
        return content.filter(c => c.type === 'text').map(c => c.text).join('\n');
    }
    return String(content);
}

// Helper pour convertir un message en format Google (avec images)
function msgToGoogleParts(msg) {
    const parts = [];
    if (typeof msg.content === 'string') {
        parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
        msg.content.forEach(c => {
            if (c.type === 'text') {
                parts.push({ text: c.text });
            } else if (c.type === 'image_url' && c.image_url?.url) {
                const match = c.image_url.url.match(/^data:(image\/[^;]+);base64,(.+)$/);
                const mimeType = match ? match[1] : 'image/png';
                const base64 = match ? match[2] : c.image_url.url.replace(/^data:image\/[^;]+;base64,/, '');
                parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
            }
        });
    }
    return parts;
}

async function callGoogle(model, msgs, imgB64) {
    const contents = [];
    const sys = msgs.find(m => m.role === 'system');
    if (sys) {
        contents.push({ role: 'user',  parts: [{ text: sys.content }] });
        contents.push({ role: 'model', parts: [{ text: 'Understood. I am ready.' }] });
    }
    for (const m of msgs) {
        if (m.role === 'system') continue;
        const role = m.role === 'assistant' ? 'model' : 'user';
        contents.push({ role, parts: msgToGoogleParts(m) });
    }
    const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEYS.google}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } })
        }
    );
    if (!r.ok) { const e = await r.text(); throw new Error(`Google ${r.status}: ${e}`); }
    const d = await r.json();
    if (!d.candidates || !d.candidates[0]?.content?.parts) throw new Error('Google: réponse invalide');
    return d.candidates[0].content.parts.map(p => p.text || '').join('');
}

async function callCerebras(model, msgs) {
    // Cerebras ne supporte pas les images, on normalise le contenu
    const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${KEYS.cerebras}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages: msgs.map(m => ({ role: m.role, content: normalizeContent(m.content) })),
            temperature: 0.7, max_tokens: 8192
        })
    });
    if (!r.ok) { const e = await r.text(); throw new Error(`Cerebras ${r.status}: ${e}`); }
    const d = await r.json();
    return d.choices[0].message.content || '';
}

async function callGroq(model, msgs, imgB64) {
    const messages = msgs.map((m, i) => {
        const isLastUser = m.role === 'user' && i === msgs.length - 1;
        // Si le contenu est déjà un array (multimodal), on l'utilise tel quel
        if (Array.isArray(m.content)) {
            return { role: m.role, content: m.content };
        }
        // Sinon, si c'est le dernier message user et qu'on a une image, on l'ajoute
        if (imgB64 && isLastUser) {
            return { role: 'user', content: [
                { type: 'text', text: String(m.content) },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${imgB64}` } }
            ]};
        }
        return { role: m.role, content: String(m.content) };
    });
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${KEYS.groq}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 8192 })
    });
    if (!r.ok) { const e = await r.text(); throw new Error(`Groq ${r.status}: ${e}`); }
    const d = await r.json();
    return d.choices[0].message?.content || '';
}

async function callMistral(model, msgs, imgB64) {
    const messages = msgs.map((m, i) => {
        const isLastUser = m.role === 'user' && i === msgs.length - 1;
        // Si le contenu est déjà un array (multimodal), on l'utilise tel quel
        if (Array.isArray(m.content)) {
            // Mistral veut image_url: { url: ... } pas image_url: '...'
            const adapted = m.content.map(c => {
                if (c.type === 'image_url' && typeof c.image_url === 'string') {
                    return { type: 'image_url', image_url: { url: c.image_url } };
                }
                return c;
            });
            return { role: m.role, content: adapted };
        }
        // Sinon, si c'est le dernier message user et qu'on a une image, on l'ajoute
        if (imgB64 && isLastUser) {
            return { role: 'user', content: [
                { type: 'text', text: String(m.content) },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${imgB64}` } }
            ]};
        }
        return { role: m.role, content: String(m.content) };
    });
    const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${KEYS.mistral}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 8192 })
    });
    if (!r.ok) { const e = await r.text(); throw new Error(`Mistral ${r.status}: ${e}`); }
    const d = await r.json();
    return d.choices[0].message?.content || '';
}

async function callAPI(provider, model, msgs, imgB64) {
    if (provider === 'google')   return callGoogle(model, msgs, imgB64);
    if (provider === 'cerebras') return callCerebras(model, msgs);
    if (provider === 'groq')     return callGroq(model, msgs, imgB64);
    if (provider === 'mistral')  return callMistral(model, msgs, imgB64);
    throw new Error(`Provider inconnu: ${provider}`);
}

async function callWithFallback(modelList, msgs, imgB64, thinkBody) {
    for (const { provider, model } of modelList) {
        const stepEl = window.AgentChat.addStep(thinkBody, `${provider} ${model}`, 'run');
        try {
            const result = await Promise.race([
                callAPI(provider, model, msgs, imgB64),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Temps d\'attente dépassé (timeout 200s)')), 200000))
            ]);
            window.AgentChat.updateStep(stepEl, `${provider} ${model}`, 'ok');
            return result;
        } catch(e) {
            window.AgentChat.updateStep(stepEl, `${provider} ${model} : ${e.message}`, 'err');
        }
    }
    throw new Error('Tous les providers ont échoué.');
}

window.AgentAPI = {
    MODELS_CREATE,
    MODELS_DEBUG,
    callWithFallback
};
