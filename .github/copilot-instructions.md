# Braj Travel Companion

- Frontend: React, TypeScript, and Vite in `frontend/`.
- Backend: Flask API in `backend/app.py`; dependencies are in `backend/requirements.txt`.
- Keep `GEMINI_API_KEY` in `backend/.env`. Never expose it in frontend code or commit `.env`.
- Chat history is stored in browser local storage and sent to `POST /api/chat`.
- Run frontend checks from `frontend/` with `npm run build` and `npm run lint`.