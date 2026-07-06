/* =========================================================
   ELADES AI — backend proxy for the Google Gemini API
   This is the ONLY place the API key should ever live.
   ========================================================= */
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // 10mb so pasted images fit

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

if (!GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY is missing. Create a .env file (see .env.example).");
}

const SYSTEM_PROMPTS = {
  en: "You are Elades AI — the Enhanced Learning and Decision Expert System. Answer clearly and helpfully in English. Keep a thoughtful, calm, slightly sage tone.",
  ro: "Ești Elades AI — Enhanced Learning and Decision Expert System. Răspunde clar și util, în limba română. Păstrează un ton reflexiv, calm, ușor înțelept."
};

// Splits a "data:image/png;base64,AAAA..." string into its mime type and raw base64 payload.
function splitDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || "");
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

app.post("/api/chat", async (req, res) => {
  try {
    const { message, lang = "en", history = [], attachments = [] } = req.body;

    if (!message && attachments.length === 0) {
      return res.status(400).json({ error: "Empty message." });
    }

    // Build this turn's parts: text plus any image attachments (Gemini vision input)
    const currentParts = [];
    if (message) currentParts.push({ text: message });
    attachments.forEach(a => {
      if (a.isImage && a.dataUrl) {
        const split = splitDataUrl(a.dataUrl);
        if (split) currentParts.push({ inlineData: split });
      }
    });

    // Gemini has no "system" role inside contents — prior turns must alternate user/model.
    const contents = [
      ...history.slice(-10).map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text || "" }]
      })),
      { role: "user", parts: currentParts }
    ];

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS.en }] },
        contents,
        generationConfig: { maxOutputTokens: 600, temperature: 0.8 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", errText);
      return res.status(502).json({ error: "Gemini request failed." });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.map(p => p.text).join("").trim() || "";
    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Elades AI backend running on http://localhost:${PORT}`));
