"""
ImageBackend interface -- the contract every image-generation vendor backend
must satisfy so generate_staging.py can stay vendor-agnostic.

Backends are lazy-imported by name (see generate_staging.py's resolve_backend()):
a user who only has GOOGLE_API_KEY set never needs the `openai` package
installed, and vice versa.
"""
from abc import ABC, abstractmethod
from typing import Optional


class ImageBackend(ABC):
    """One vendor's implementation of the two-phase Architect+Painter pipeline."""

    name: str = "base"

    @abstractmethod
    def analyze_room(self, image_bytes: bytes, prompt: str, schema: dict) -> dict:
        """
        Phase 1 (Architect): analyze an empty room photo and return a dict
        matching `schema` (standard JSON Schema, see assets/analysis_schema.json).
        `prompt` is the backend-agnostic instructions from staging_core.build_architect_prompt().
        """
        raise NotImplementedError

    @abstractmethod
    def generate_staged_image(self, image_bytes: bytes, prompt: str) -> bytes:
        """
        Phase 2 (Painter): given the original empty-room image and the full
        staging prompt (from staging_core.build_painter_prompt()), return the
        raw bytes of the generated staged image (PNG).
        """
        raise NotImplementedError

    @abstractmethod
    def extract_inventory(self, staged_image_bytes: bytes, prompt: str) -> str:
        """
        Analyze a staged image and return a text furniture inventory, used to
        keep multi-angle sessions of the same room consistent. `prompt` is
        staging_core.build_inventory_prompt()'s output.
        """
        raise NotImplementedError
