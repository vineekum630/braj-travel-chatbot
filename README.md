# Braj Travel Companion

A Mathura and Vrindavan travel-planning chat app. The React frontend stores conversation history in the browser; a Flask API sends it to Google's Gemini API. The API key stays on the backend and is never sent to the browser.

See [ARCHITECTURE.md](ARCHITECTURE.md) for high-level components, low-level request flow, API contract, and security boundaries.
See [DEPLOYMENT.md](DEPLOYMENT.md) for the free Render hosting plan, GitHub Actions CI, and deployment steps.

## Requirements

- Node.js 20.19+ or 22.12+
- Python 3.9+
- A Gemini API key from Google AI Studio

## Run locally

1. In the first terminal, install and configure the backend:

   ```sh
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   ```

2. Add your Gemini key as `GEMINI_API_KEY` in `backend/.env`, then start Flask:

   ```sh
   python app.py
   ```

3. In a second terminal from the project root, start the frontend:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

4. Open the local URL printed by Vite, usually `http://localhost:5173`.

The API health check is at `http://localhost:5000/api/health`. The default model is `gemini-3.8-flash`; to change it, edit `GEMINI_MODEL` in `backend/.env`. Gemini's free-tier availability and limits can change, so check Google's current pricing and rate-limit pages. Never commit `.env` or expose the API key in frontend code.

## Build the frontend

```sh
cd frontend
npm run build
```