# Elades AI — OpenAI backend

This tiny server is the only place your OpenAI API key should live.
The front-end (`script.js`) calls it at `http://localhost:3001/api/chat`
instead of talking to OpenAI directly.

## Setup

1. Get an API key from https://platform.openai.com/api-keys
2. In this `server/` folder:
   ```
   npm install
   cp .env.example .env
   ```
3. Open `.env` and paste your real key in place of `sk-your-real-key-here`.
4. Start the server:
   ```
   npm start
   ```
   You should see: `Elades AI backend running on http://localhost:3001`
5. Open `index.html` (the front-end) as usual — Elades will now use real
   OpenAI replies. If the server isn't running, it silently falls back
   to the built-in simulator, so nothing breaks.

## Notes

- `OPENAI_MODEL` in `.env` defaults to `gpt-4o-mini` (cheap + supports
  images). Swap in any chat-completion-compatible model you have access to.
- Image attachments are sent to the model as vision input automatically.
- Never commit your real `.env` file or share it — it contains your key.
- This is a local dev setup. For a public website, deploy `server.js`
  somewhere (Render, Railway, Fly.io, a VPS, etc.) and update
  `BACKEND_URL` in `script.js` to that server's public address.
