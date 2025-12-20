from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    # Width of each side border, as percentage of longest dimension
    default_border_percentage: float = 0.13

    # Default overlay path for /api/transform when no path is provided.
    default_overlay_path: str = "../maps/floyen-2-cropped.png"

    # Export locations (used by /api/dal/export_database)
    database_export_js_output_dir: str = "../aws-package/js"
    database_export_final_maps_output_dir: str = "../aws-package/map-files"
    database_export_original_maps_output_dir: str = "../maps/registered_maps_originals"


settings = Settings()


