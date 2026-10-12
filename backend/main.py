"""FastAPI backend: validates requests and calls Gemma 4 through the Gemini API."""
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import errors, types
from pydantic import BaseModel, Field

import config
from files import file_to_parts

app = FastAPI(title="Gemma Lens API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)

_client: Optional[genai.Client] = None


def get_client() -> genai.Client:
    global _client
    if not config.GOOGLE_API_KEY or config.GOOGLE_API_KEY.startswith("PASTE_"):
        raise HTTPException(503, "GOOGLE_API_KEY is not set. Add it to backend/.env and restart the server.")
    if _client is None:
        _client = genai.Client(api_key=config.GOOGLE_API_KEY)
    return _client


class FilePayload(BaseModel):
    name: str = Field(max_length=255)
    mime_type: str
    data: str  # base64


class Msg(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(max_length=30_000)


class ChatRequest(BaseModel):
    conversation_id: str = Field(max_length=100)
    prompt: str = Field(min_length=1, max_length=8000)
    history: list[Msg] = []  # earlier turns of THIS conversation only
    file: Optional[FilePayload] = None


class ChatResponse(BaseModel):
    reply: str
    model: str


@app.get("/api/health")
def health():
    return {"ok": True, "model": config.GEMMA_MODEL,
            "key_configured": bool(config.GOOGLE_API_KEY) and not config.GOOGLE_API_KEY.startswith("PASTE_")}


def build_contents(req: ChatRequest) -> list[types.Content]:
    """First user turn carries the file + instructions; the rest is trimmed history."""
    history = list(req.history)
    if len(history) > config.MAX_HISTORY_MESSAGES + 1:
        history = history[:1] + history[-config.MAX_HISTORY_MESSAGES:]
    turns = [(m.role, m.text) for m in history] + [("user", req.prompt)]

    # Gemini API requires alternating roles starting with user.
    merged: list[tuple[str, str]] = []
    for role, text in turns:
        if merged and merged[-1][0] == role:
            merged[-1] = (role, merged[-1][1] + "\n\n" + text)
        else:
            merged.append((role, text))
    if merged[0][0] != "user":
        merged.insert(0, ("user", "(conversation continued)"))

    file_parts = file_to_parts(req.file.name, req.file.mime_type, req.file.data) if req.file else []
    contents: list[types.Content] = []
    for i, (role, text) in enumerate(merged):
        if i == 0:
            parts = [types.Part.from_text(text=config.SYSTEM_PREAMBLE), *file_parts,
                     types.Part.from_text(text=text)]
            contents.append(types.Content(role="user", parts=parts))
        else:
            contents.append(types.Content(
                role="user" if role == "user" else "model",
                parts=[types.Part.from_text(text=text)]))
    return contents


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    client = get_client()
    contents = build_contents(req)
    try:
        resp = client.models.generate_content(model=config.GEMMA_MODEL, contents=contents)
    except errors.APIError as e:
        code = getattr(e, "code", 502) or 502
        if code in (401, 403):
            raise HTTPException(502, "Google rejected the API key or this model is not enabled for it.")
        if code == 404:
            raise HTTPException(502, f"Model '{config.GEMMA_MODEL}' was not found. Check GEMMA_MODEL in backend/.env.")
        if code == 429:
            raise HTTPException(429, "Rate limit reached. Wait a moment and try again.")
        raise HTTPException(502, f"Gemini API error ({code}): {getattr(e, 'message', str(e))}")
    except Exception as e:  # network, SDK errors
        raise HTTPException(502, f"Could not reach the Gemini API: {e}")

    text = (resp.text or "").strip()
    if not text:
        raise HTTPException(502, "The model returned no text. Try rephrasing your question.")
    return ChatResponse(reply=text, model=config.GEMMA_MODEL)
