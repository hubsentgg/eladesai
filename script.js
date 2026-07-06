/* =========================================================
   ELADES AI — script.js
   Enhanced Learning and Decision Expert System (front-end demo)

   NOTE for the developer reading this later:
   Elades first tries to reach a real AI backend at BACKEND_URL
   below (see /server for a ready-made Node/Express proxy to the
   OpenAI API). If that backend isn't running, it quietly falls
   back to `generateReply()`, a local rule-based simulator, so the
   front-end still works standalone. Never put a real API key
   directly in this file — always proxy it through your own server.
   ========================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------
     0. BACKEND CONNECTION
     Point this at your running server/server.js (see README).
     If the backend is unreachable, Elades quietly falls back
     to the local rule-based simulator so the demo still works.
     --------------------------------------------------------- */
  const BACKEND_URL = "http://localhost:3001/api/chat";

  /* ---------------------------------------------------------
     1. I18N — UI strings + Elades' own voice
     --------------------------------------------------------- */
  const STR = {
    en: {
      "hero.eyebrow": "an expert system that learns as it listens",
      "hero.title1": "Enhanced Learning",
      "hero.title2": "& Decision Expert System",
      "hero.cta": "Begin the conversation",
      "footer.tagline": "Elades AI · thinks in two tongues, remembers on your own machine",
      "sidebar.new": "New conversation",
      "chat.status": "ready to think with you",
      "chat.statusThinking": "Elades is thinking…",
      "chat.clear": "Delete this conversation",
      "chat.placeholder": "Ask Elades anything…",
      "chat.untitled": "New conversation",
      "chat.emptyTitle": "What's on your mind?",
      "chat.emptySub": "Elades listens, learns, and decides — ask away.",
      "chat.greeting": "I'm Elades — the Enhanced Learning and Decision Expert System. Ask me anything, in English or Română.",
      "attach.file": "file"
    },
    ro: {
      "hero.eyebrow": "un sistem expert care învață ascultând",
      "hero.title1": "Enhanced Learning",
      "hero.title2": "& Decision Expert System",
      "hero.cta": "Începe conversația",
      "footer.tagline": "Elades AI · gândește în două limbi, își amintește pe calculatorul tău",
      "sidebar.new": "Conversație nouă",
      "chat.status": "gata să gândească alături de tine",
      "chat.statusThinking": "Elades gândește…",
      "chat.clear": "Șterge această conversație",
      "chat.placeholder": "Întreabă-l pe Elades orice…",
      "chat.untitled": "Conversație nouă",
      "chat.emptyTitle": "La ce te gândești?",
      "chat.emptySub": "Elades ascultă, învață și decide — întreabă-l orice.",
      "chat.greeting": "Sunt Elades — Enhanced Learning and Decision Expert System. Întreabă-mă orice, în engleză sau română.",
      "attach.file": "fișier"
    }
  };

  const RHYMES = {
    en: [
      "Ask me deep, ask me wide — Elades thinks before he'll guide.",
      "Where questions spark and thoughts ignite, Elades turns the dark to light.",
      "Not just answers, understanding too — Elades learns, decides, for you.",
      "Enhanced by learning, sharp and keen — the steadiest mind you've ever seen.",
      "Two tongues, one mind, a single aim: to help you think, again, again."
    ],
    ro: [
      "Întreabă-mă orice, eu stau și gândesc — Elades e mintea ce te-nsoțesc.",
      "Din gânduri adânci și cod adunat, răspunsul potrivit ți-e pregătit.",
      "Nu doar răspunsuri, ci-nțelegere clară — Elades învață, decide, te-ajută iară.",
      "O minte trează, mereu în priză — Elades gândește cu fiecare briză.",
      "Două limbi, un singur gând curat: să te-ajut să gândești, ne-ncetat."
    ]
  };

  const CARD_LABELS = {
    en: ["slogan 01", "slogan 02", "slogan 03"],
    ro: ["motto 01", "motto 02", "motto 03"]
  };

  let lang = localStorage.getItem("elades_lang") || "en";

  function t(key) {
    return (STR[lang] && STR[lang][key]) || STR.en[key] || key;
  }

  function applyI18n() {
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
    document.querySelectorAll(".lang-toggle").forEach(tg => {
      tg.querySelectorAll(".lang-toggle__opt").forEach(opt => {
        opt.classList.toggle("is-active", opt.dataset.langOpt === lang);
      });
    });
    renderOracleCards();
    if (!chatStatusThinking) {
      chatStatusEl.textContent = t("chat.status");
    }
  }

  function setLang(next) {
    lang = next;
    localStorage.setItem("elades_lang", lang);
    applyI18n();
    startRhymeTicker();
  }

  /* ---------------------------------------------------------
     2. VIEW ROUTING (landing <-> chat)
     --------------------------------------------------------- */
  const viewLanding = document.getElementById("view-landing");
  const viewChat = document.getElementById("view-chat");

  function showChat() {
    viewLanding.classList.remove("view-active");
    viewChat.classList.add("view-active");
    if (!activeConvoId) {
      const convos = loadConversations();
      if (convos.length) selectConversation(convos[0].id);
      else createConversation();
    }
    focusInput();
  }
  function showLanding() {
    viewChat.classList.remove("view-active");
    viewLanding.classList.add("view-active");
  }

  document.getElementById("btn-enter").addEventListener("click", showChat);
  document.getElementById("btn-back").addEventListener("click", showLanding);

  /* ---------------------------------------------------------
     3. RHYME TICKER + ORACLE CARDS
     --------------------------------------------------------- */
  const rhymeLineEl = document.getElementById("rhyme-line");
  let rhymeIdx = 0;
  let rhymeTimer = null;

  function startRhymeTicker() {
    clearInterval(rhymeTimer);
    rhymeIdx = 0;
    rhymeLineEl.textContent = RHYMES[lang][0];
    rhymeTimer = setInterval(() => {
      rhymeLineEl.classList.add("is-swapping");
      setTimeout(() => {
        rhymeIdx = (rhymeIdx + 1) % RHYMES[lang].length;
        rhymeLineEl.textContent = RHYMES[lang][rhymeIdx];
        rhymeLineEl.classList.remove("is-swapping");
      }, 400);
    }, 4200);
  }

  function renderOracleCards() {
    const wrap = document.getElementById("oracle-cards");
    wrap.innerHTML = "";
    RHYMES[lang].slice(0, 3).forEach((line, i) => {
      const card = document.createElement("div");
      card.className = "oracle-card";
      card.innerHTML = `“${line}”<span>${CARD_LABELS[lang][i]}</span>`;
      wrap.appendChild(card);
    });
  }

  /* ---------------------------------------------------------
     4. LANGUAGE TOGGLES
     --------------------------------------------------------- */
  document.querySelectorAll(".lang-toggle").forEach(tg => {
    tg.addEventListener("click", () => {
      setLang(lang === "en" ? "ro" : "en");
    });
  });

  /* ---------------------------------------------------------
     5. CONVERSATION STORAGE (localStorage "notepad")
     --------------------------------------------------------- */
  const STORAGE_KEY = "elades_conversations";

  function loadConversations() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function saveConversations(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
  function upsertConversation(convo) {
    const list = loadConversations();
    const i = list.findIndex(c => c.id === convo.id);
    if (i >= 0) list[i] = convo; else list.unshift(convo);
    saveConversations(list);
  }
  function deleteConversation(id) {
    saveConversations(loadConversations().filter(c => c.id !== id));
  }
  function getConversation(id) {
    return loadConversations().find(c => c.id === id);
  }

  let activeConvoId = null;

  function createConversation() {
    const convo = {
      id: "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      title: t("chat.untitled"),
      lang,
      createdAt: Date.now(),
      messages: []
    };
    upsertConversation(convo);
    renderSidebar();
    selectConversation(convo.id);
  }

  function selectConversation(id) {
    activeConvoId = id;
    renderSidebar();
    renderMessages();
    clearAttachments();
    focusInput();
  }

  function renderSidebar() {
    const list = loadConversations();
    const wrap = document.getElementById("conversation-list");
    wrap.innerHTML = "";
    list.forEach(c => {
      const item = document.createElement("div");
      item.className = "convo-item" + (c.id === activeConvoId ? " is-active" : "");
      const last = c.messages[c.messages.length - 1];
      const preview = last ? (last.text || (last.attachments && last.attachments.length ? "📎" : "")) : "";
      item.innerHTML = `
        <span class="convo-item__title">${escapeHtml(c.title)}</span>
        <span class="convo-item__meta">${escapeHtml(preview).slice(0, 40)}</span>
      `;
      item.addEventListener("click", () => selectConversation(c.id));
      wrap.appendChild(item);
    });
  }

  document.getElementById("btn-new-chat").addEventListener("click", createConversation);
  document.getElementById("btn-clear").addEventListener("click", () => {
    if (!activeConvoId) return;
    deleteConversation(activeConvoId);
    activeConvoId = null;
    const rest = loadConversations();
    if (rest.length) selectConversation(rest[0].id); else createConversation();
  });

  /* ---------------------------------------------------------
     6. CHAT RENDERING
     --------------------------------------------------------- */
  const messagesEl = document.getElementById("chat-messages");
  const chatStatusEl = document.getElementById("chat-status");
  const orbChatHeader = document.getElementById("orb-chat-header");
  let chatStatusThinking = false;

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function renderMessages() {
    const convo = getConversation(activeConvoId);
    messagesEl.innerHTML = "";
    if (!convo || convo.messages.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "margin:auto;text-align:center;color:var(--text-faint);max-width:360px;";
      empty.innerHTML = `<p style="font-family:var(--font-display);font-size:1.2rem;color:var(--text-dim);margin-bottom:6px;">${t("chat.emptyTitle")}</p><p style="font-size:.85rem;">${t("chat.emptySub")}</p>`;
      messagesEl.appendChild(empty);
      return;
    }
    convo.messages.forEach(m => messagesEl.appendChild(buildMessageEl(m)));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function buildMessageEl(m) {
    const row = document.createElement("div");
    row.className = "msg msg--" + (m.role === "user" ? "user" : "elades");

    const avatar = document.createElement("div");
    if (m.role === "user") {
      avatar.className = "msg__avatar user-avatar";
      avatar.textContent = "You";
      avatar.style.fontSize = ".62rem";
    } else {
      avatar.className = "msg__avatar orb orb--small";
      avatar.innerHTML = `<div class="orb__core"></div><div class="orb__ring orb__ring--1"></div>`;
    }
    row.appendChild(avatar);

    const bubble = document.createElement("div");
    bubble.className = "msg__bubble";
    bubble.textContent = m.text || "";

    if (m.attachments && m.attachments.length) {
      const wrap = document.createElement("div");
      wrap.className = "msg__attachments";
      m.attachments.forEach(a => {
        if (a.isImage) {
          const img = document.createElement("img");
          img.src = a.dataUrl;
          img.alt = a.name;
          wrap.appendChild(img);
        } else {
          const chip = document.createElement("div");
          chip.className = "msg__file-chip";
          chip.textContent = "📄 " + a.name;
          wrap.appendChild(chip);
        }
      });
      bubble.appendChild(wrap);
    }
    row.appendChild(bubble);
    return row;
  }

  function addThinkingBubble() {
    const row = document.createElement("div");
    row.className = "msg msg--elades msg--thinking";
    row.id = "thinking-bubble";
    row.innerHTML = `
      <div class="msg__avatar orb orb--small is-thinking"><div class="orb__core"></div><div class="orb__ring orb__ring--1"></div></div>
      <div class="msg__bubble">
        <span>${t("chat.statusThinking")}</span>
        <span class="think-dots"><span></span><span></span><span></span></span>
      </div>`;
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    setThinkingStatus(true);
  }
  function removeThinkingBubble() {
    const el = document.getElementById("thinking-bubble");
    if (el) el.remove();
    setThinkingStatus(false);
  }
  function setThinkingStatus(on) {
    chatStatusThinking = on;
    chatStatusEl.textContent = on ? t("chat.statusThinking") : t("chat.status");
    chatStatusEl.classList.toggle("is-thinking", on);
    orbChatHeader.classList.toggle("is-thinking", on);
  }

  /* ---------------------------------------------------------
     7. ATTACHMENTS (the "+" button)
     --------------------------------------------------------- */
  let pendingAttachments = [];
  const attachTray = document.getElementById("attach-tray");
  const fileInput = document.getElementById("file-input");

  document.getElementById("btn-plus").addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files || []);
    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      const dataUrl = await readFileAsDataURL(file);
      pendingAttachments.push({ name: file.name, isImage, dataUrl });
    }
    fileInput.value = "";
    renderAttachTray();
  });

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderAttachTray() {
    attachTray.innerHTML = "";
    pendingAttachments.forEach((a, idx) => {
      const chip = document.createElement("div");
      chip.className = "attach-chip";
      chip.innerHTML = a.isImage
        ? `<img src="${a.dataUrl}" alt="${escapeHtml(a.name)}">`
        : `<span>📄</span>`;
      const name = document.createElement("span");
      name.className = "attach-chip__name";
      name.textContent = a.name;
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "attach-chip__remove";
      rm.textContent = "×";
      rm.addEventListener("click", () => {
        pendingAttachments.splice(idx, 1);
        renderAttachTray();
      });
      chip.appendChild(name);
      chip.appendChild(rm);
      attachTray.appendChild(chip);
    });
  }
  function clearAttachments() {
    pendingAttachments = [];
    renderAttachTray();
  }

  /* ---------------------------------------------------------
     8. COMPOSER — sending messages
     --------------------------------------------------------- */
  const composer = document.getElementById("composer");
  const msgInput = document.getElementById("msg-input");

  msgInput.addEventListener("input", () => {
    msgInput.style.height = "auto";
    msgInput.style.height = Math.min(msgInput.scrollHeight, 160) + "px";
  });
  msgInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      composer.requestSubmit();
    }
  });

  function focusInput() {
    setTimeout(() => msgInput.focus(), 300);
  }

  composer.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (!text && pendingAttachments.length === 0) return;
    if (!activeConvoId) createConversation();

    const convo = getConversation(activeConvoId);
    const userMsg = {
      role: "user",
      text,
      attachments: pendingAttachments.slice(),
      ts: Date.now()
    };
    convo.messages.push(userMsg);

    if (convo.title === t("chat.untitled") || convo.messages.length === 1) {
      convo.title = (text || (userMsg.attachments[0] && userMsg.attachments[0].name) || t("chat.untitled")).slice(0, 46);
    }
    upsertConversation(convo);

    msgInput.value = "";
    msgInput.style.height = "auto";
    clearAttachments();
    renderMessages();
    renderSidebar();

    addThinkingBubble();
    document.getElementById("btn-send").disabled = true;

    fetchReply(text, userMsg.attachments, convo).then(reply => {
      removeThinkingBubble();
      const eladesMsg = { role: "elades", text: reply, attachments: [], ts: Date.now() };
      convo.messages.push(eladesMsg);
      upsertConversation(convo);
      renderMessages();
      document.getElementById("btn-send").disabled = false;
      focusInput();
    });
  });

  /* Tries the real OpenAI-backed server first; falls back to the
     local simulator (with a small thinking delay for feel) if the
     backend isn't running or errors out. */
  async function fetchReply(text, attachments, convo) {
    try {
      const history = convo.messages.slice(0, -1); // exclude the message just sent
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, lang, history, attachments })
      });
      if (!res.ok) throw new Error("backend error");
      const data = await res.json();
      if (data.reply) return data.reply;
      throw new Error("empty reply");
    } catch (err) {
      // Backend not running (e.g. plain double-click on index.html) — simulate locally.
      await new Promise(r => setTimeout(r, 700 + Math.random() * 900));
      return generateReply(text, attachments, convo);
    }
  }

  /* ---------------------------------------------------------
     9. REPLY ENGINE (local simulation — see note at top of file)
     --------------------------------------------------------- */
  function generateReply(rawText, attachments, convo) {
    const text = (rawText || "").trim();
    const low = text.toLowerCase();

    if (attachments && attachments.length && !text) {
      return lang === "ro"
        ? `Am primit ${attachments.length} ${attachments.length === 1 ? "fișier" : "fișiere"}. Spune-mi ce vrei să analizez la ${attachments.length === 1 ? "el" : "ele"}.`
        : `I've received ${attachments.length} file${attachments.length === 1 ? "" : "s"}. Tell me what you'd like me to focus on.`;
    }

    const greetingsEn = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"];
    const greetingsRo = ["salut", "buna", "bună", "servus", "noroc", "hei"];
    const thanksEn = ["thanks", "thank you", "thx"];
    const thanksRo = ["multumesc", "mulțumesc", "mersi"];

    const isGreeting = (lang === "ro" ? greetingsRo : greetingsEn).some(g => low.includes(g));
    const isThanks = (lang === "ro" ? thanksRo : thanksEn).some(g => low.includes(g));
    const isQuestion = /\?$/.test(text) || /^(why|how|what|when|where|who|which|de ce|cum|ce|cand|când|unde|cine|care)\b/i.test(text);

    if (!text) {
      return lang === "ro" ? "Sunt aici. Spune-mi ce te frământă." : "I'm here. Tell me what's on your mind.";
    }
    if (isGreeting) {
      return t("chat.greeting");
    }
    if (isThanks) {
      return lang === "ro"
        ? "Cu plăcere — o decizie bună începe mereu cu o întrebare bună."
        : "Anytime — a good decision always starts with a good question.";
    }

    const openersEn = [
      `Let's break that down. Regarding "${text}" — the way I see it:`,
      `Weighing what you've shared, here's my read:`,
      `That's worth thinking through carefully.`,
      `Here's how I'd approach that:`
    ];
    const openersRo = [
      `Hai să descompunem asta. În privința „${text}" — iată cum văd eu lucrurile:`,
      `Cântărind ce mi-ai spus, iată părerea mea:`,
      `Merită gândit cu atenție.`,
      `Iată cum aș aborda asta:`
    ];
    const bodiesEn = [
      "there are usually a few angles worth weighing before settling on one answer — the context you give me shapes which one fits best.",
      "the short version is that it depends on your priorities, but I can lay out the trade-offs if you give me a bit more detail.",
      "I don't have a live connection to the wider internet in this demo, but I can reason through it with you step by step.",
      "if you tell me a bit more about the goal behind the question, I can tailor a sharper answer."
    ];
    const bodiesRo = [
      "de obicei există câteva unghiuri de luat în calcul înainte de un răspuns ferm — contextul pe care mi-l dai contează mult.",
      "pe scurt, depinde de prioritățile tale, dar pot detalia compromisurile dacă îmi dai puțin mai multe detalii.",
      "în această versiune demo nu am o conexiune live la internet, dar putem raționa împreună, pas cu pas.",
      "dacă îmi spui puțin mai mult despre scopul din spatele întrebării, pot da un răspuns mai precis."
    ];

    const opener = pick(lang === "ro" ? openersRo : openersEn);
    const body = pick(lang === "ro" ? bodiesRo : bodiesEn);
    let reply = `${opener} ${body}`;

    if (isQuestion) {
      reply += lang === "ro"
        ? " Vrei să continuăm pe firul ăsta sau schimbăm unghiul?"
        : " Want to keep pulling this thread, or come at it from another angle?";
    }
    return reply;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ---------------------------------------------------------
     10. AMBIENT BACKGROUND — drifting synapse particles
     --------------------------------------------------------- */
  function initBgField() {
    const canvas = document.getElementById("bg-field");
    const ctx = canvas.getContext("2d");
    let particles = [];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    function makeParticles() {
      const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 26000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1.4 + 0.4,
        gold: Math.random() > 0.5
      }));
    }
    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold ? "rgba(232,184,84,0.35)" : "rgba(139,127,214,0.30)";
        ctx.fill();
      });
      if (!reduceMotion) requestAnimationFrame(tick);
    }
    resize();
    makeParticles();
    tick();
    window.addEventListener("resize", () => { resize(); makeParticles(); });
  }

  /* ---------------------------------------------------------
     11. INIT
     --------------------------------------------------------- */
  applyI18n();
  startRhymeTicker();
  renderSidebar();
  initBgField();
})();
