# Room AI - Developer Guide for AI Agents

## Architecture Overview

**Frontend** (`frontend/`)
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS (configured via `postcss.config.js` and `tailwind.config.js`)
- **State Management:** Zustand (`useStore` in `App.jsx`)
- **Persistence:** Firebase (Firestore + Auth)
- **Icons:** Lucide React
- **Entry Point:** `frontend/src/App.jsx` (Currently monolithic)

**Backend** (`backend/`)
- **Framework:** Node.js + Express
- **LLM Provider:** OpenRouter (OpenAI compatible client)
- **Search:** Tavily API
- **Entry Point:** `backend/src/index.js`

## Core Logic
The application facilitates a "Council" of AI agents debating a topic.
1. **User Input:** Sent to `/api/debate`.
2. **Search:** Optional web search via Tavily.
3. **Drafting:** "Architect" model generates initial response.
4. **Auditing:** "Auditor" model critiques the draft.
5. **Synthesis:** "Synthesizer" model combines draft and audit.
6. **Result:** Returned to frontend with transcript.

## Development Guidelines
- **Frontend Code Quality:** Maintain zero ESLint errors/warnings.
- **State Management:** Use the existing Zustand store in `App.jsx`.
- **Environment Variables:**
  - Frontend: `frontend/.env` (prefixed with `VITE_`)
  - Backend: `backend/.env`
- **File Structure:** Keep logic within `frontend/src` and `backend/src`. Do not create root-level source files.

## Environment Setup
See `README.md` for setup instructions.
