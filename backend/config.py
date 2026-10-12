"""All model/config settings live here. Change GEMMA_MODEL in .env, not in code."""
import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "").strip()
GEMMA_MODEL = os.getenv("GEMMA_MODEL", "gemma-4-26b-a4b-it").strip()
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").strip()

MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_HISTORY_MESSAGES = 12      # recent turns kept after the first one
MAX_PDF_PAGES = 20             # pages read for text extraction
MAX_SCANNED_PAGES = 6          # pages rendered as images for scanned PDFs
MAX_PDF_TEXT_CHARS = 60_000

SYSTEM_PREAMBLE = (
    "You are a multimodal understanding assistant. Answer using the attached "
    "file (image or document) and the user's questions. Base every statement on "
    "what is visible or written in the file; never invent details. If something "
    "is unclear, unreadable or missing, say so plainly. Use clear Markdown: short "
    "paragraphs, bullet lists, numbered steps, and fenced code blocks for code or "
    "commands. Match the user's requested level (e.g. beginner-friendly)."
)
