from __future__ import annotations

import io
import json
import math
import traceback
from io import BytesIO

from flask import Blueprint, abort, g, jsonify, make_response, request, send_file
from PIL import Image

from bergenomap.config import settings
from bergenomap.repositories.db import get_db
from bergenomap.repositories import map_files_repo, maps_repo
from bergenomap.services.image_service import add_transparent_border_and_rotate_image
from bergenomap.utils.geo import haversine, meters_per_pixel_xy, rectangular_area_from_bounds
from bergenomap.utils.pdf import pdf_bytes_to_png
from OptimizeRotation import getOverlayCoordinatesWithOptimalRotation


bp = Blueprint("maps", __name__)


# Example request:
# http://127.0.0.1:5000/transform?angle=3.22247&border=150
@bp.route("/api/transform", methods=["GET"])
def transform_image():
    image_path = request.args.get("path")  # Path to the image file
    if image_path is None:
        image_path = settings.default_overlay_path

    print(image_path)

    rotation_angle = float(request.args.get("angle", 0))  # Rotation angle
    border_size = int(request.args.get("border", 10))  # Border size

    if not image_path:
        return "Path to the image is required", 400

    try:
        # Open an image file
        with Image.open(image_path) as img:
            rotated_image = add_transparent_border_and_rotate_image(img, border_size, rotation_angle)

            # Save the transformed image to a BytesIO object
            img_io = io.BytesIO()
            rotated_image.save(img_io, "PNG")
            img_io.seek(0)

            # Send the transformed image as a response
            return send_file(img_io, mimetype="image/png")

    except Exception as e:
        return str(e), 500


@bp.route("/api/processDroppedImage", methods=["POST"])
def process_dropped_image():
    # Check if the request contains a file
    if "file" not in request.files:
        return "No file part", 400

    file = request.files["file"]

    # Check if the file is an image
    if file.filename == "":
        return "No selected file", 400

    # Open the image using PIL
    image = Image.open(file.stream)

    originalWidth, originalHeight = image.width, image.height

    border_size = int(max(image.width, image.height) * settings.default_border_percentage)

    processed_image = add_transparent_border_and_rotate_image(image, border_size, 0)

    print(
        f"Transformed image of dimensions ({originalWidth}, {originalHeight}) to image of dimensions "
        f"({processed_image.width}, {processed_image.height}), border size {border_size}"
    )

    # Save the processed image to a BytesIO object
    img_io = io.BytesIO()
    processed_image.save(img_io, "PNG")
    img_io.seek(0)

    return send_file(img_io, mimetype="image/png")


@bp.route("/api/convertPdfToImage", methods=["POST"])
def convert_pdf_to_image():
    if "file" not in request.files:
        return "No file part", 400

    file = request.files["file"]
    if file.filename == "":
        return "No selected file", 400

    try:
        pdf_bytes = file.read()
        if not pdf_bytes:
            return "Empty PDF file", 400

        png_io = pdf_bytes_to_png(pdf_bytes)
    except Exception as e:
        traceback.print_exc()
        return str(e), 500

    png_io.seek(0)
    return send_file(png_io, mimetype="image/png")


"""This endpoint accepts an un-treated image overlay and data about how it should be placed on a real-world map.
It then transforms the overlay by adding transparent borders and rotating it to match this data, then
stores both the original and transformed overlay, along with the supplied registration data, to the database."""
@bp.route("/api/transformAndStoreMapData", methods=["POST"])
def transform_and_store_map():
    # Check if the request contains a file and a data JSON object
    if "file" not in request.files or "imageRegistrationData" not in request.form:
        return "Did not receive file or imageRegistrationData", 401

    file = request.files["file"]
    imageRegistrationData = request.form["imageRegistrationData"]

    try:
        imageRegistrationData_json = json.loads(imageRegistrationData)
        rotation_angle = float(imageRegistrationData_json.get("optimal_rotation_angle"))
    except (ValueError, KeyError, TypeError):
        return "Invalid image registration data format or missing optimal_rotation_angle", 402

    if file.filename == "":
        return "Did not receive file", 403

    image = Image.open(file.stream)

    originalWidth, originalHeight = image.width, image.height

    border_size = int(max(image.width, image.height) * settings.default_border_percentage)

    processed_image = add_transparent_border_and_rotate_image(image, border_size, rotation_angle)

    print(
        f"Transformed image of dimensions ({originalWidth}, {originalHeight}) to image of dimensions "
        f"({processed_image.width}, {processed_image.height}), border size {border_size}"
    )

    transformed_map_io = io.BytesIO()
    processed_image.save(transformed_map_io, "PNG")
    transformed_map_io.seek(0)

    original_map_io = io.BytesIO()
    image.save(original_map_io, "PNG")
    original_map_io.seek(0)

    db = get_db()

    map_registration_data = json.loads(imageRegistrationData)

    try:
        map_id = maps_repo.insert_map(db, g.username, map_registration_data)
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 409
    map_files_repo.insert_original(db, map_id, original_map_io.getvalue())
    map_files_repo.insert_final(db, map_id, transformed_map_io.getvalue())

    print(f"Registered map \"{map_registration_data['map_name']}\" added to database with id {map_id}.")

    # OCR + AI metadata extraction (DISABLED by default)
    #
    # This is intentionally commented out while we tune OCR parameters + prompts.
    # The intended workflow is to run `scripts/run_map_ocr_ai_backfill.py` against
    # selected maps, inspect the debug outputs, and only then enable this block.
    #
    # IMPORTANT: Do not expose OpenAI calls via public API endpoints.
    #
    # try:
    #     from bergenomap.services.map_metadata_ocr_pipeline import run_map_metadata_pipeline
    #
    #     result = run_map_metadata_pipeline(processed_image)
    #     maps_repo.update_map_metadata_if_default(
    #         db,
    #         username=g.username,
    #         map_id=map_id,
    #         metadata=result.metadata,
    #     )
    # except Exception:
    #     traceback.print_exc()

    return send_file(transformed_map_io, mimetype="image/png")


"""This endpoint will add margins and rotate the original image, and return the result. No DB storage."""
@bp.route("/api/transformMap", methods=["POST"])
def transform_map():
    # Check if the request contains a file and a data JSON object
    if "file" not in request.files or "imageRegistrationData" not in request.form:
        return "Did not receive file or imageRegistrationData", 401

    file = request.files["file"]
    imageRegistrationData = request.form["imageRegistrationData"]

    try:
        print(f"Image registration data for transform_map is: {imageRegistrationData}")
        imageRegistrationData_json = json.loads(imageRegistrationData)
        rotation_angle = float(imageRegistrationData_json.get("optimal_rotation_angle"))
    except (ValueError, KeyError, TypeError):
        return "Invalid image registration data format or missing optimal_rotation_angle", 402

    if file.filename == "":
        return "Did not receive file", 403

    image = Image.open(file.stream)

    border_size = int(max(image.width, image.height) * settings.default_border_percentage)

    processed_image = add_transparent_border_and_rotate_image(image, border_size, rotation_angle)

    print(
        f"Transformed image of dimensions ({image.width}, {image.height}) to image of dimensions "
        f"({processed_image.width}, {processed_image.height}), border size {border_size}"
    )

    transformed_map_io = io.BytesIO()
    processed_image.save(transformed_map_io, "PNG")
    transformed_map_io.seek(0)

    # Keep legacy behavior: we parse but do not use beyond validation.
    _map_registration_data = json.loads(imageRegistrationData)

    return send_file(transformed_map_io, mimetype="image/png")


@bp.route("/api/getOverlayCoordinates", methods=["POST"])
def get_overlay_coordinates():
    try:
        # Parse the required parameters from the request JSON
        data = request.get_json()
        image_coords = data.get("image_coords")
        real_coords = data.get("real_coords")
        overlay_width = data.get("overlayWidth")
        overlay_height = data.get("overlayHeight")

        print(f"Received request to calculate registration with parameters: {data}")

        # Ensure inputs are correctly formatted
        if len(image_coords) != 3 or len(real_coords) != 3:
            return jsonify({"error": "Invalid input: Must provide exactly 3 image and 3 real coordinates"}), 400

        rotationAndBounds = getOverlayCoordinatesWithOptimalRotation(
            image_coords, real_coords, overlay_width, overlay_height
        )

        print(f"Calculated required map rotation, result is: {rotationAndBounds}")

        metersPerPixel = meters_per_pixel_xy(image_coords, real_coords)
        _areaOfRegisteredArea = rectangular_area_from_bounds(rotationAndBounds["nw_coords"], rotationAndBounds["se_coords"])

        _pixelWidthEstimate = metersPerPixel[0] * overlay_width
        _pixelHeightEstimate = metersPerPixel[1] * overlay_height

        # Compare aspect ratios between input pixels and fitted lat/lon bounds
        input_aspect_ratio = overlay_width / overlay_height
        nw_lat, nw_lon = rotationAndBounds["nw_coords"]
        se_lat, se_lon = rotationAndBounds["se_coords"]
        ns_height_m = haversine(nw_lat, nw_lon, se_lat, nw_lon)
        mid_lat = (nw_lat + se_lat) / 2.0
        ew_width_m = haversine(mid_lat, nw_lon, mid_lat, se_lon)
        output_aspect_ratio = ew_width_m / ns_height_m

        print(
            f"Aspect ratio (width/height): input overlay {input_aspect_ratio:.6f}, registered bounds {output_aspect_ratio:.6f} "
            f"(width {ew_width_m:.1f} m, height {ns_height_m:.1f} m)"
        )

        result = {
            "nw_coords": rotationAndBounds["nw_coords"],
            "se_coords": rotationAndBounds["se_coords"],
            "optimal_rotation_angle": rotationAndBounds["optimal_rotation_angle"],
            "selected_pixel_coords": image_coords,
            "selected_realworld_coords": real_coords,
            "overlay_width": overlay_width,
            "overlay_height": overlay_height,
        }
        print(f"Result is: {result}")

        # Return the result as a JSON response (legacy behavior)
        return make_response(json.dumps(result, sort_keys=False))

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@bp.route("/api/dal/list_maps", methods=["GET"])
def list_maps():
    db = get_db()
    maps = maps_repo.list_maps(db, g.username)
    return jsonify(maps)


@bp.route("/api/dal/mapfile/original/<map_name>", methods=["GET"])
def get_mapfile_original(map_name: str):
    db = get_db()
    image_data = map_files_repo.get_original_by_name(db, g.username, map_name)
    if image_data is not None:
        return send_file(BytesIO(image_data), mimetype="image/*")
    abort(404, description="Map not found")


@bp.route("/api/dal/mapfile/final/<map_name>", methods=["GET"])
def get_mapfile_final(map_name: str):
    db = get_db()
    image_data = map_files_repo.get_final_by_name(db, g.username, map_name)
    if image_data is not None:
        return send_file(
            BytesIO(image_data),
            mimetype="image/*",
            as_attachment=False,
            download_name=f"{map_name}.webp",
        )
    abort(404, description="Map not found")


