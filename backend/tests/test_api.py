import base64
import io
import sys
from pathlib import Path
from types import SimpleNamespace

import fitz
import pytest
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config  # noqa: E402
import main  # noqa: E402

client = TestClient(main.app)
b64 = lambda b: base64.b64encode(b).decode()


def png_bytes():
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), "yellow").save(buf, "PNG")
    return buf.getvalue()


def pdf_bytes(text):
    d = fitz.open()
    d.new_page().insert_text((72, 72), text)
    return d.tobytes()


class FakeModels:
    def __init__(self): self.calls = []
    def generate_content(self, model, contents):
        self.calls.append((model, contents))
        return SimpleNamespace(text="Real-looking reply")


@pytest.fixture
def fake(monkeypatch):
    fm = FakeModels()
    monkeypatch.setattr(main, "get_client", lambda: SimpleNamespace(models=fm))
    return fm


def body(**kw):
    base = {"conversation_id": "c1", "prompt": "What is this?", "history": []}
    base.update(kw)
    return base


def test_health():
    assert client.get("/api/health").json()["model"] == config.GEMMA_MODEL


def test_missing_key_returns_503(monkeypatch):
    monkeypatch.setattr(config, "GOOGLE_API_KEY", "")
    monkeypatch.setattr(main, "_client", None)
    assert client.post("/api/chat", json=body()).status_code == 503


def test_image_chat_uses_configured_model(fake):
    f = {"name": "a.png", "mime_type": "image/png", "data": b64(png_bytes())}
    r = client.post("/api/chat", json=body(file=f))
    assert r.status_code == 200 and r.json()["reply"] == "Real-looking reply"
    model, contents = fake.calls[0]
    assert model == config.GEMMA_MODEL
    assert any(p.inline_data for p in contents[0].parts)


def test_followup_keeps_history_and_image(fake):
    f = {"name": "a.png", "mime_type": "image/png", "data": b64(png_bytes())}
    hist = [{"role": "user", "text": "first"}, {"role": "assistant", "text": "answer"}]
    client.post("/api/chat", json=body(file=f, history=hist, prompt="why?"))
    contents = fake.calls[0][1]
    assert [c.role for c in contents] == ["user", "model", "user"]
    assert any(p.inline_data for p in contents[0].parts)


def test_history_is_trimmed(fake):
    hist = []
    for i in range(30):
        hist += [{"role": "user", "text": f"q{i}"}, {"role": "assistant", "text": f"a{i}"}]
    client.post("/api/chat", json=body(history=hist))
    contents = fake.calls[0][1]
    assert len(contents) <= config.MAX_HISTORY_MESSAGES + 3
    assert "q0" in contents[0].parts[-1].text


def test_corrupted_image(fake):
    f = {"name": "a.png", "mime_type": "image/png", "data": b64(b"not an image")}
    assert client.post("/api/chat", json=body(file=f)).status_code == 400


def test_unsupported_type(fake):
    f = {"name": "a.gif", "mime_type": "image/gif", "data": b64(b"GIF89a")}
    assert client.post("/api/chat", json=body(file=f)).status_code == 415


def test_oversize(fake, monkeypatch):
    monkeypatch.setattr(config, "MAX_FILE_BYTES", 10)
    f = {"name": "a.png", "mime_type": "image/png", "data": b64(png_bytes())}
    assert client.post("/api/chat", json=body(file=f)).status_code == 413


def test_text_pdf_sends_text(fake):
    f = {"name": "n.pdf", "mime_type": "application/pdf",
         "data": b64(pdf_bytes("Exam fee deadline is 20 November. " * 5))}
    assert client.post("/api/chat", json=body(file=f)).status_code == 200
    parts = fake.calls[0][1][0].parts
    assert any(p.text and "20 November" in p.text for p in parts)


def test_scanned_pdf_sends_images(fake):
    f = {"name": "s.pdf", "mime_type": "application/pdf", "data": b64(pdf_bytes("hi"))}
    assert client.post("/api/chat", json=body(file=f)).status_code == 200
    assert any(p.inline_data for p in fake.calls[0][1][0].parts)


def test_corrupted_pdf(fake):
    f = {"name": "n.pdf", "mime_type": "application/pdf", "data": b64(b"%PDF-garbage")}
    assert client.post("/api/chat", json=body(file=f)).status_code == 400


def test_empty_prompt_rejected():
    assert client.post("/api/chat", json=body(prompt="")).status_code == 422
