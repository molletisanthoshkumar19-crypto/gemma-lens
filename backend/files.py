"""File validation and conversion into Gemini API parts."""
import base64
import binascii
import io

import fitz  # PyMuPDF
from fastapi import HTTPException
from google.genai import types
from PIL import Image

import config

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED = IMAGE_TYPES | {"application/pdf"}


def _bad(msg: str, code: int = 400):
    raise HTTPException(status_code=code, detail=msg)


def decode_file(mime_type: str, data_b64: str) -> bytes:
    if mime_type not in ALLOWED:
        _bad("Unsupported file type. Use JPG, PNG, WEBP or PDF.", 415)
    try:
        raw = base64.b64decode(data_b64, validate=True)
    except (binascii.Error, ValueError):
        _bad("The file could not be decoded. Try uploading it again.")
    if not raw:
        _bad("The file is empty.")
    if len(raw) > config.MAX_FILE_BYTES:
        _bad(f"File is larger than {config.MAX_FILE_BYTES // (1024 * 1024)} MB.", 413)
    return raw


def _image_part(raw: bytes, mime_type: str) -> types.Part:
    try:
        with Image.open(io.BytesIO(raw)) as img:
            img.verify()
            fmt = (img.format or "").upper()
    except Exception:
        _bad("This image appears to be corrupted or is not a valid image.")
    expected = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}[mime_type]
    if fmt != expected:
        _bad(f"File content does not match its type ({mime_type}).")
    return types.Part.from_bytes(data=raw, mime_type=mime_type)


def _pdf_parts(raw: bytes, name: str) -> list[types.Part]:
    try:
        doc = fitz.open(stream=raw, filetype="pdf")
    except Exception:
        _bad("This PDF appears to be corrupted.")
    if doc.needs_pass:
        _bad("This PDF is password protected.")
    if len(doc) == 0:
        _bad("This PDF has no pages.")

    pages = min(len(doc), config.MAX_PDF_PAGES)
    chunks, total_chars = [], 0
    for i in range(pages):
        text = doc[i].get_text().strip()
        total_chars += len(text)
        chunks.append(f"[Page {i + 1}]\n{text}")

    # Text-based PDF: send the extracted text.
    if total_chars >= 40 * pages:
        body = "\n\n".join(chunks)[: config.MAX_PDF_TEXT_CHARS]
        note = f" (first {pages} of {len(doc)} pages)" if len(doc) > pages else ""
        return [types.Part.from_text(text=f"Extracted text of the PDF '{name}'{note}:\n\n{body}")]

    # Scanned PDF: render pages as images so the model can read them visually.
    n = min(len(doc), config.MAX_SCANNED_PAGES)
    parts = [types.Part.from_text(
        text=f"The PDF '{name}' is scanned. Rendered page images follow ({n} of {len(doc)} pages).")]
    for i in range(n):
        png = doc[i].get_pixmap(matrix=fitz.Matrix(1.6, 1.6)).tobytes("png")
        parts.append(types.Part.from_bytes(data=png, mime_type="image/png"))
    return parts


def file_to_parts(name: str, mime_type: str, data_b64: str) -> list[types.Part]:
    raw = decode_file(mime_type, data_b64)
    if mime_type == "application/pdf":
        return _pdf_parts(raw, name)
    return [_image_part(raw, mime_type)]
