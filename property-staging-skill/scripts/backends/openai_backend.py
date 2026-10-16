"""
OpenAI backend for property-staging-skill.

Second concrete backend so the script fallback path isn't single-vendor
locked. Requires OPENAI_API_KEY and the `openai` package.

- Architect phase: a vision-capable chat model (gpt-4o) with strict JSON
  Schema structured output, using the same standard-cased schema from
  assets/analysis_schema.json (no translation needed -- OpenAI's structured
  outputs use standard JSON Schema casing directly).
- Painter phase: gpt-image-1's image edit endpoint, given the original room
  photo + the full staging prompt from staging_core.build_painter_prompt().
"""
import base64
import io
import json

from backends.base import ImageBackend

ARCHITECT_MODEL = "gpt-4o"
PAINTER_MODEL = "gpt-image-1"


class OpenAIBackend(ImageBackend):
    name = "openai"

    def __init__(self, api_key: str):
        from openai import OpenAI  # lazy import: only required when this backend is selected

        self.client = OpenAI(api_key=api_key)

    def analyze_room(self, image_bytes: bytes, prompt: str, schema: dict) -> dict:
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        response = self.client.chat.completions.create(
            model=ARCHITECT_MODEL,
            temperature=0.1,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}},
                    ],
                }
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "room_analysis",
                    "schema": schema,
                    "strict": True,
                },
            },
        )
        return json.loads(response.choices[0].message.content)

    def generate_staged_image(self, image_bytes: bytes, prompt: str) -> bytes:
        image_file = io.BytesIO(image_bytes)
        image_file.name = "room.png"
        response = self.client.images.edit(
            model=PAINTER_MODEL,
            image=image_file,
            prompt=prompt,
        )
        b64_data = response.data[0].b64_json
        if not b64_data:
            raise RuntimeError("OpenAI painter returned no image. Check quota or model availability.")
        return base64.b64decode(b64_data)

    def extract_inventory(self, staged_image_bytes: bytes, prompt: str) -> str:
        b64_image = base64.b64encode(staged_image_bytes).decode("utf-8")
        response = self.client.chat.completions.create(
            model=ARCHITECT_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_image}"}},
                    ],
                }
            ],
        )
        return response.choices[0].message.content.strip()
