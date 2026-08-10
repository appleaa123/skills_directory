"""
Gemini backend for property-staging-skill.

Ported from the original single-vendor generate_staging.py, unchanged in
model choice and API usage -- just moved behind the ImageBackend interface
so it's one of several selectable backends instead of the only option.
Requires GOOGLE_API_KEY and the `google-genai` package.
"""
import json
from typing import Optional

from backends.base import ImageBackend

ARCHITECT_MODEL = "gemini-2.5-pro"
PAINTER_MODEL = "gemini-2.5-flash-preview-05-20"


def _to_gemini_schema(schema: dict) -> dict:
    """
    Translate a standard JSON Schema (lowercase "type": "object"/"string"/"array")
    into Gemini's dict-based response_schema format (uppercase "type": "OBJECT").
    assets/analysis_schema.json is the single source of truth in standard
    casing; this is the only place that needs to know Gemini wants it uppercase.
    """
    if not isinstance(schema, dict):
        return schema
    out = {}
    for key, value in schema.items():
        if key == "type" and isinstance(value, str):
            out[key] = value.upper()
        elif key == "properties" and isinstance(value, dict):
            out[key] = {k: _to_gemini_schema(v) for k, v in value.items()}
        elif key == "items" and isinstance(value, dict):
            out[key] = _to_gemini_schema(value)
        else:
            out[key] = value
    return out


class GeminiBackend(ImageBackend):
    name = "gemini"

    def __init__(self, api_key: str):
        # Lazy import: only required when this backend is selected.
        from google import genai
        from google.genai import types

        self._genai = genai
        self._types = types
        self.client = genai.Client(api_key=api_key)

    def analyze_room(self, image_bytes: bytes, prompt: str, schema: dict) -> dict:
        types = self._types
        response = self.client.models.generate_content(
            model=ARCHITECT_MODEL,
            contents=[prompt, types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_to_gemini_schema(schema),
                temperature=0.1,
            ),
        )
        return json.loads(response.text)

    def generate_staged_image(self, image_bytes: bytes, prompt: str) -> bytes:
        types = self._types
        response = self.client.models.generate_content(
            model=PAINTER_MODEL,
            contents=[prompt, types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                temperature=0.4,
            ),
        )
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if part.inline_data:
                    return part.inline_data.data
        raise RuntimeError("Gemini painter returned no image. Check quota or model availability.")

    def extract_inventory(self, staged_image_bytes: bytes, prompt: str) -> str:
        types = self._types
        response = self.client.models.generate_content(
            model=ARCHITECT_MODEL,
            contents=[prompt, types.Part.from_bytes(data=staged_image_bytes, mime_type="image/png")],
        )
        return response.text.strip()
