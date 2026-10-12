# Gemma Lens

Upload an image, screenshot or PDF, ask your own question, and get an answer from **Gemma 4** via the Gemini API. Follow-ups keep the same file in context.

Stack: React + Vite (frontend), FastAPI (backend), Google Gen AI SDK.

## Run it

**1. Backend** (terminal 1)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then paste your key into GOOGLE_API_KEY
uvicorn main:app --reload --port 8000
```

**2. Frontend** (terminal 2)
```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

Check `http://localhost:8000/api/health`: it should show `"key_configured": true`.

## Model

Set in `backend/.env` only (`GEMMA_MODEL`). Gemma 4 IDs listed in Google's Gemini API docs: `gemma-4-26b-a4b-it` (default) and `gemma-4-31b-it`. There is no fallback to any Gemini model: a wrong ID returns a clear error.

## Tests

```bash
cd backend && pytest
```
Backend tests mock the Gemini call (no key needed). A real end-to-end test needs your key.

## Notes

- Images: JPG, PNG, WEBP. PDFs: text is extracted; scanned PDFs are rendered to images (first 6 pages). Max 10 MB.
- Conversations are in localStorage; file bytes in IndexedDB, so follow-ups work after refresh.
- The API key stays on the backend. Never put it in frontend code.
- Gemma models on the Gemini API can have low free-tier rate limits; a 429 shows a retry message.
