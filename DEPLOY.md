# Deployment: Vercel & Railway

## Railway (full app including WebSocket)

- **Build:** `npm run build` (default)
- **Start:** `npm start` → `node server.js`
- Single `PORT` is used for both Next.js and WebSocket at `/ws`.

**Required env vars:** `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`  
Optional: `NEXT_PUBLIC_WS_URL` (leave unset to use same host for WebSocket).

---

## Vercel (Next.js only, no custom server)

- Vercel runs the standard Next.js serverless build. The custom server and **WebSocket are not used** on Vercel.
- **Build:** `npm run build` (via `vercel.json`)
- Set env vars in the Vercel dashboard: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`.
- **Do not set** `NEXT_PUBLIC_WS_URL` on Vercel (or leave it empty). Setting it to `ws://localhost:4001` would make the app try to connect to the user's localhost.

Real-time chat (WebSocket) will not work on Vercel; use Railway for full functionality including WebSockets.
