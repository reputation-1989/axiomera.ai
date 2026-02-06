# Codebase Analysis

## Architecture Overview

The application is a "Multi-LLM Debate & Collaboration Engine" composed of a React frontend and an Express backend.

### Backend (`backend/`)
- **Runtime**: Node.js / Express
- **Entry Point**: `src/index.js`
- **Key Dependencies**: `openai` (for OpenRouter), `axios` (for Tavily search).
- **Architecture Issue ("Split Brain")**:
  - The active logic resides entirely inline within `src/index.js`.
  - A directory `src/engines/` exists with sophisticated classes (`DynamicCouncilEngine`, `AdvancedDebateEngine`, `SimpleCouncilEngine`) but they are **unused** by the main application.
  - `src/index.js` implements a "Council" flow (Architect -> Auditor -> Synthesizer) which duplicates the *intent* of the engines but uses hardcoded logic.
- **Search Logic**:
  - `src/index.js` contains an inline `performWebSearch` function.
  - `src/search.js` contains a nearly identical `performWebSearch` function (unused).

### Frontend (`frontend/`)
- **Runtime**: Vite / React
- **Entry Point**: `src/main.jsx` -> `src/App.jsx`
- **Structure**:
  - Monolithic `App.jsx` (approx 200 lines) handling:
    - UI Rendering (Tailwind CSS)
    - State Management (Zustand)
    - Firebase Auth & Firestore Logic
    - API Communication (`/api/debate`)
- **Design**: "Command Center" / Forensics Trace aesthetic.

## Findings & Recommendations

1.  **Code Duplication**: Search logic is duplicated. The `index.js` version should be replaced with `search.js`.
2.  **Dormant Code**: The `engines/` directory contains valuable logic that is ignored. The inline logic in `index.js` should be refactored into a class (e.g., `LiveCouncilEngine`) to align with the project structure.
3.  **Frontend Monolith**: `App.jsx` handles too many responsibilities. Future work should split this into components (`Sidebar`, `ChatInterface`, `TraceView`) and separate Firebase logic into a service/hook.
4.  **Configuration**: Model lists and Presets are hardcoded in both frontend and backend. These should ideally be shared or served via an endpoint.

## Proposed Resolution

Refactor `backend/src/index.js` to delegating logic to a new `LiveCouncilEngine` class, unifying the backend architecture and removing inline complexity.
