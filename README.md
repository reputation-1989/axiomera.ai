# Room AI

Multi-LLM Debate & Collaboration Engine.

## Overview
Room AI is a web application that leverages multiple LLMs (via OpenRouter) to debate and synthesize answers to complex queries. It features a "Council" of specialized personas (Architect, Auditor, Synthesizer).

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, Firebase
- **Backend:** Node.js, Express, OpenRouter API

## Setup Instructions

### Backend
1. Navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Create `.env` file with `OPENROUTER_API_KEY` and `TAVILY_API_KEY` (optional).
4. Start the server:
   ```bash
   npm start
   ```
   Runs on `http://localhost:3000`.

### Frontend
1. Navigate to `frontend/`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Copy `.env.example` to `.env` and fill in Firebase credentials.
4. Start the development server:
   ```bash
   npm run dev
   ```
   Runs on `http://localhost:5173`.

## Environment Variables

### Backend
- `OPENROUTER_API_KEY`: API key for OpenRouter.
- `TAVILY_API_KEY`: API key for Tavily Search (optional).

### Frontend
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
