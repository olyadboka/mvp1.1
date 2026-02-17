# Chat MVP

A real-time chat app: sign up, log in, message other users, and try **Chat with AI**.

## Prerequisites

- **Node.js** (v18+)
- **PostgreSQL** (for the database)
- **OpenAI API key** (optional; only needed for the AI chat feature)

## Setup

1. **Clone and install**

   ```bash
   cd mvp1.1
   npm install
   ```

2. **Environment**

   Create `.env.local` in the project root with at least:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
   JWT_SECRET="your-secret-at-least-32-characters-long"
   ```

   Optional:

   ```env
   OPENAI_API_KEY="sk-..."          # For Chat with AI
   NEXT_PUBLIC_API_URL="http://localhost:4000"
   NEXT_PUBLIC_WS_URL="ws://localhost:4001"
   WS_PORT=4001
   ```

3. **Database**

   ```bash
   npm run setup
   ```

   Or: `npx prisma generate` then `npx prisma db push`.

## Run

```bash
npm run dev
```

- **App:** http://localhost:4000  
- **WebSocket server:** runs on port 4001 (real-time messages)

## How to use

1. Open http://localhost:4000.
2. **Sign up** (Get started free) or **Log in**.
3. After login you’re in the chat view:
   - **Sidebar:** your conversations and a way to start a new chat.
   - **Main area:** select a conversation to see and send messages.
   - **Chat with AI:** use the AI chat option to talk to the bot (needs `OPENAI_API_KEY`).
4. Messages are delivered in real time; you can see who’s online and chat with other users.

---

*MVP — more features may be added later.*
