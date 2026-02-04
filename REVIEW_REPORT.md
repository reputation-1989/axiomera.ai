# Codebase Review & Analysis

## Overview
The repository contains a functional prototype of a "Multi-LLM Debate & Collaboration Engine" (`room-ai`). It is split into a generic Node.js backend and a React/Vite frontend.

## Key Findings

### 1. Backend Architecture ("Split Brain")
The backend currently has two competing implementations of the core logic:

*   **Active Implementation (`backend/src/index.js`):**
    *   **Logic:** Inline implementations of the "Council" workflow (Grounding -> Architect -> Auditor -> Synthesizer).
    *   **Prompts:** Uses sophisticated Persona Presets (`PRESETS` constant) for specific domains (Coding, Academic, Research).
    *   **Search:** Inline implementation of Tavily search (redundant).
    *   **Status:** **ACTIVE**. This is what runs when you start the server.

*   **Dormant Implementation (`backend/src/engines/DynamicCouncilEngine.js`):**
    *   **Logic:** A class-based, iterative "Research -> Solution -> Debate Loop -> Synthesis" workflow.
    *   **Prompts:** Uses generic roles ("Logic Verifier") rather than the rich Presets found in `index.js`.
    *   **Search:** Modular import from `../search.js`.
    *   **Status:** **UNUSED**. It is not imported or used by `index.js`.

**Recommendation:**
Refactor `index.js` to use a unified Engine class. The Engine class should be updated to support the `PRESETS` (Personas) from `index.js`, combining the structural cleanliness of the Engine with the superior prompting of the active code.

### 2. Frontend Architecture (Monolithic State)
The frontend relies heavily on a single file (`App.jsx`) for all concerns:

*   **State Management:** `App.jsx` defines a local Zustand store that includes UI state (theme), Data state (conversations), and Auth state (user).
*   **Persistence:** Firebase Firestore logic is tightly coupled within `useEffect` hooks inside `App.jsx`.
*   **Redundancy:** A separate `frontend/src/state/chatStore.js` exists but is **completely unused**. It appears to be a local-only (non-Firebase) version of the state logic.

**Recommendation:**
The `chatStore.js` file is currently dead code. Unless there is a plan to decouple Firebase, it should be deleted to avoid confusion, or the Firebase logic should be migrated into it to clean up `App.jsx`.

### 3. Dependencies & Cleanup
*   **Search Logic:** `backend/src/search.js` is a clean, reusable module. `backend/src/index.js` ignores it and re-implements the same logic inline.
*   **Unused Engines:** `SimpleCouncilEngine.js` and `AdvancedDebateEngine.js` appear to be unused artifacts.
*   **Firebase:** The backend relies on `openai` and `axios` for logic but lists `firebase` in `package.json`. If the backend does not access Firestore directly (which `index.js` does not seem to do), this dependency might be removable or is there for future server-side admin tasks.

## Proposed Action Plan
1.  **Backend Refactor:** Update `DynamicCouncilEngine` to accept `PRESETS` and match the logic of `index.js`. Then, switch `index.js` to use this class.
2.  **Code Cleanup:** Remove inline search from `index.js` in favor of `search.js`.
3.  **Frontend Cleanup:** Decide on either deleting `chatStore.js` or refactoring `App.jsx` to use it.
