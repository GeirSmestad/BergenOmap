from flask import (
    Flask,
    send_file,
    send_from_directory,
    request,
    jsonify,
    make_response,
    g,
    abort,
    render_template_string,
    session,
    redirect,
    url_for,
)
from flask_cors import CORS
from PIL import Image, ImageOps, ImageDraw
import io
from OptimizeRotation import getOverlayCoordinatesWithOptimalRotation
import json
from io import BytesIO
import traceback
import math
import fitz
from datetime import timedelta
import os

# Constants
default_border_percentage = 0.13 # Width of each side border, as percentage of longest dimension
default_overlay_path = "../maps/floyen-2-cropped.png"
database_export_js_output_dir = '../aws-package/js'
database_export_final_maps_output_dir = '../aws-package/map-files'
database_export_original_maps_output_dir = '../maps/registered_maps_originals'

# Munkebotn: http://127.0.0.1:5000/transform?angle=3.225405991892112&border=465&path=../maps/munkebotn_combined.png   w: 2481 h: 3508
# Åstveitskogen: http://127.0.0.1:5000/transform?angle=0&border=465&path=../maps/png/tur-o-2024/2024-astveitskogen-tur-o.png

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

app = Flask(__name__)
app.secret_key = os.environ.get('BO_APP_SECRET', 'change-this-secret')
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=365)
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config.setdefault('SESSION_COOKIE_HTTPONLY', True)

# Use cross-origin resource sharing in return headers, to tell browser to allow responses from different origin
CORS(app)

VALID_USERS = {
    'geir.smestad': {
        'id': 'geir.smestad',
        'full_name': 'Geir Smestad',
    }
}


def is_authenticated():
    return 'user_id' in session


def authenticate(full_name: str):
    if not full_name:
        return None
    wanted = full_name.strip().lower()
    for user in VALID_USERS.values():
        if user['full_name'].lower() == wanted:
            return user
    return None


@app.route('/', methods=['GET'])
def landing_page():
    if is_authenticated():
        return redirect(url_for('protected_map'))
    return send_from_directory(PROJECT_ROOT, 'index.html')


@app.route('/map.html', methods=['GET'])
def protected_map():
    if not is_authenticated():
        return redirect(url_for('landing_page'))
    return send_from_directory(PROJECT_ROOT, 'map.html')


@app.route('/api/login', methods=['POST'])
def login():
    payload = request.get_json(silent=True) or request.form or {}
    full_name = (payload.get('fullName') or '').strip()
    user = authenticate(full_name)
    if not user:
        return jsonify({'message': 'Feil navn'}), 401
    session.permanent = True
    session['user_id'] = user['id']
    session['full_name'] = user['full_name']
    response = jsonify({'message': 'OK'})
    response.headers['Cache-Control'] = 'no-store'
    return response


@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    response = jsonify({'message': 'Logget ut'})
    response.headers['Cache-Control'] = 'no-store'
    return response

def add_transparent_border(image, border_size):
    # Create a new image with transparent background
    new_size = (image.width + 2 * border_size, image.height + 2 * border_size)
    new_image = Image.new("RGBA", new_size, (0, 0, 0, 0))
    
    # Paste the original image in the center
    new_image.paste(image, (border_size, border_size))
    return new_image

# Example request:
# http://127.0.0.1:5000/transform?angle=3.22247&border=150
@app.route('/api/transform', methods=['GET'])
def transform_image():
    image_path = request.args.get('path')  # Path to the image file
    if image_path == None:
        image_path=default_overlay_path

    print(image_path)

    rotation_angle = float(request.args.get('angle', 0))  # Rotation angle
    border_size = int(request.args.get('border', 10))  # Border size

    if not image_path:
        return "Path to the image is required", 400

    try:
        # Open an image file
        with Image.open(image_path) as img:
            # Ensure the image has an alpha channel
            """
            img = img.convert("RGBA")
            
            # Add a transparent border around the image
            bordered_image = add_transparent_border(img, border_size)

            # Rotate the image
            rotated_image = bordered_image.rotate(rotation_angle, expand=False)
            """

            rotated_image = add_transparent_border_and_rotate_image(img, border_size, rotation_angle)

            # Save the transformed image to a BytesIO object
            img_io = io.BytesIO()
            rotated_image.save(img_io, 'PNG')
            img_io.seek(0)

            # Send the transformed image as a response
            return send_file(img_io, mimetype='image/png')

    except Exception as e:
        return str(e), 500


@app.route('/api/processDroppedImage', methods=['POST'])
def process_dropped_image():
    # Check if the request contains a file
    if 'file' not in request.files:
        return 'No file part', 400

    file = request.files['file']

    # Check if the file is an image
    if file.filename == '':
        return 'No selected file', 400

    # Open the image using PIL
    image = Image.open(file.stream)

    originalWidth, originalHeight = image.width, image.height  

    border_size = int(max(image.width, image.height) * default_border_percentage)

    # Process the image (e.g., convert to grayscale)
    processed_image = add_transparent_border_and_rotate_image(image, border_size, 0)

    print(f"Transformed image of dimensions ({originalWidth}, {originalHeight}) to image of dimensions ({processed_image.width}, {processed_image.height}), border size {border_size}")

    # Save the processed image to a BytesIO object
    img_io = io.BytesIO()
    processed_image.save(img_io, 'PNG')
    img_io.seek(0)

    return send_file(img_io, mimetype='image/png')


@app.route('/api/convertPdfToImage', methods=['POST'])
def convert_pdf_to_image():
    if 'file' not in request.files:
        return 'No file part', 400

    file = request.files['file']
    if file.filename == '':
        return 'No selected file', 400

    try:
        pdf_bytes = file.read()
        if not pdf_bytes:
            return 'Empty PDF file', 400

        png_io = pdf_bytes_to_png(pdf_bytes)
    except Exception as e:
        traceback.print_exc()
        return str(e), 500

    png_io.seek(0)
    return send_file(png_io, mimetype='image/png')


"""This endpoint accepts an un-treated image overlay and data about how it should be placed on a real-world map.
   It then transforms the overlay by adding transparent borders and rotating it to match this data, then
   stores both the original and transformed overlay, along with the supplied registration data, to the database."""
@app.route('/api/transformAndStoreMapData', methods=['POST'])
def transform_and_store_map():
    # Check if the request contains a file and a data JSON object
    if 'file' not in request.files or 'imageRegistrationData' not in request.form:
        return 'Did not receive file or imageRegistrationData', 401

    file = request.files['file']
    imageRegistrationData = request.form['imageRegistrationData']

    try:
        imageRegistrationData_json = json.loads(imageRegistrationData)
        rotation_angle = float(imageRegistrationData_json.get('optimal_rotation_angle'))
    except (ValueError, KeyError, TypeError) as e:
        return 'Invalid image registration data format or missing optimal_rotation_angle', 402

    if file.filename == '':
        return 'Did not receive file', 403

    image = Image.open(file.stream)

    originalWidth, originalHeight = image.width, image.height

    border_size = int(max(image.width, image.height) * default_border_percentage)

    processed_image = add_transparent_border_and_rotate_image(image, border_size, rotation_angle)

    print(f"Transformed image of dimensions ({originalWidth}, {originalHeight}) to image of dimensions ({processed_image.width}, {processed_image.height}), border size {border_size}")

    transformed_map_io = io.BytesIO()
    processed_image.save(transformed_map_io, 'PNG')
    transformed_map_io.seek(0)

    original_map_io = io.BytesIO()
    image.save(original_map_io, 'PNG')
    original_map_io.seek(0)

    db = get_db()

    map_registration_data = json.loads(imageRegistrationData)

    map_id = db.insert_map(map_registration_data)
    db.insert_mapfile_original(map_id, original_map_io.getvalue())
    db.insert_mapfile_final(map_id, transformed_map_io.getvalue())

    print(f"Registered map \"{map_registration_data['map_name']}\" added to database with id {map_id}.")

    return send_file(transformed_map_io, mimetype='image/png')



"""This endpoint will add margins and rotate the original image, and return the result. No DB storage."""
@app.route('/api/transformMap', methods=['POST'])
def transform_map():
    # Check if the request contains a file and a data JSON object
    if 'file' not in request.files or 'imageRegistrationData' not in request.form:
        return 'Did not receive file or imageRegistrationData', 401

    file = request.files['file']
    imageRegistrationData = request.form['imageRegistrationData']

    try:
        print(f"Image registration data for transform_map is: {imageRegistrationData}")
        imageRegistrationData_json = json.loads(imageRegistrationData)
        rotation_angle = float(imageRegistrationData_json.get('optimal_rotation_angle'))
    except (ValueError, KeyError, TypeError) as e:
        return 'Invalid image registration data format or missing optimal_rotation_angle', 402

    if file.filename == '':
        return 'Did not receive file', 403

    image = Image.open(file.stream)

    border_size = int(max(image.width, image.height) * default_border_percentage)

    processed_image = add_transparent_border_and_rotate_image(image, border_size, rotation_angle)

    print(f"Transformed image of dimensions ({image.width}, {image.height}) to image of dimensions ({processed_image.width}, {processed_image.height}), border size {border_size}")

    transformed_map_io = io.BytesIO()
    processed_image.save(transformed_map_io, 'PNG')
    transformed_map_io.seek(0)

    map_registration_data = json.loads(imageRegistrationData)

    return send_file(transformed_map_io, mimetype='image/png')


@app.route('/api/getOverlayCoordinates', methods=['POST'])
def get_overlay_coordinates():
    try:
        # Parse the required parameters from the request JSON
        data = request.get_json()
        image_coords = data.get('image_coords')
        real_coords = data.get('real_coords')
        overlay_width = data.get('overlayWidth')
        overlay_height = data.get('overlayHeight')

        print(f"Received request to calculate registration with parameters: {data}")

        # Ensure inputs are correctly formatted
        if len(image_coords) != 3 or len(real_coords) != 3:
            return jsonify({'error': 'Invalid input: Must provide exactly 3 image and 3 real coordinates'}), 400

        rotationAndBounds = getOverlayCoordinatesWithOptimalRotation(image_coords, real_coords, overlay_width, overlay_height)

        print(f"Calculated required map rotation, result is: {rotationAndBounds}")

        metersPerPixel = meters_per_pixel_xy(image_coords, real_coords)
        areaOfRegisteredArea = rectangular_area_from_bounds(rotationAndBounds["nw_coords"], rotationAndBounds["se_coords"])

        pixelWidthEstimate = metersPerPixel[0]*overlay_width
        pixelHeightEstimate = metersPerPixel[1]*overlay_height

        # Compare aspect ratios between input pixels and fitted lat/lon bounds
        input_aspect_ratio = overlay_width / overlay_height
        nw_lat, nw_lon = rotationAndBounds["nw_coords"]
        se_lat, se_lon = rotationAndBounds["se_coords"]
        ns_height_m = haversine(nw_lat, nw_lon, se_lat, nw_lon)
        mid_lat = (nw_lat + se_lat) / 2.0
        ew_width_m = haversine(mid_lat, nw_lon, mid_lat, se_lon)
        output_aspect_ratio = ew_width_m / ns_height_m

        print(f"Aspect ratio (width/height): input overlay {input_aspect_ratio:.6f}, registered bounds {output_aspect_ratio:.6f} "
              f"(width {ew_width_m:.1f} m, height {ns_height_m:.1f} m)")

        result = {"nw_coords" : rotationAndBounds["nw_coords"], 
              "se_coords" : rotationAndBounds["se_coords"], 
              "optimal_rotation_angle" : rotationAndBounds["optimal_rotation_angle"],
              "selected_pixel_coords": image_coords,
              "selected_realworld_coords": real_coords,
              "overlay_width": overlay_width,
              "overlay_height": overlay_height
              }
        print(f"Result is: {result}")

        # Return the result as a JSON response
        return make_response(json.dumps(result, sort_keys=False))

    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500






# Database interface. Unsure if you'll actually want to expose them over HTTP like this, but you have the option.
# I'm thinking I'll most likely access it through other HTTP methods, not exposing the db directly.
from Database import Database

def get_db():
    if 'db' not in g:
        g.db = Database()
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()


@app.route('/api/dal/insert_map', methods=['POST'])
def insert_map():
    if not is_local_request():
        abort(404)

    map_data = request.json
    db = get_db()
    map_id = db.insert_map(map_data)
    return jsonify({'message': 'Map added successfully', 'map_id': map_id}), 201

@app.route('/api/dal/list_maps', methods=['GET'])
def list_maps():
    db = get_db()
    maps = db.list_maps()
    return jsonify(maps)

@app.route('/api/dal/mapfile/original/<map_name>', methods=['GET'])
def get_mapfile_original(map_name):
    if not is_local_request():
        abort(404)

    db = get_db()
    image_data = db.get_mapfile_original(map_name)
    if image_data is not None:
        return send_file(BytesIO(image_data), mimetype='image/*')
    else:
        abort(404, description="Map not found")

@app.route('/api/dal/mapfile/final/<map_name>', methods=['GET'])
def get_mapfile_final(map_name):
    if not is_local_request():
        abort(404)

    db = get_db()
    image_data = db.get_mapfile_final(map_name)
    if image_data is not None:
        return send_file(BytesIO(image_data), mimetype='image/*', as_attachment=False, download_name=f"{map_name}.webp",)
    else:
        abort(404, description="Map not found")


@app.route('/api/dal/export_database', methods=['POST'])
def export_database():
    data = request.get_json()

    js_output_dir = database_export_js_output_dir
    final_maps_output_dir = database_export_final_maps_output_dir
    original_maps_output_dir = database_export_original_maps_output_dir
    include_original = False
    overwrite = False

    if not (js_output_dir and final_maps_output_dir and (include_original is False or original_maps_output_dir)):
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        db = get_db()
        db.output_map_data_to_disk(js_output_dir, final_maps_output_dir, original_maps_output_dir, include_original, overwrite)
        return jsonify({"message": "Database exported successfully"}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# End database interface


# Database visualization
# To view, query http://127.0.0.1:5000/viewDatabase
@app.route('/api/viewDatabase')
def visualize_database():
    if not is_local_request():
        abort(404)

    db = get_db()
    maps = db.list_maps()

    html = '''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Maps Database</title>
        <style>
            table {
                width: 100%;
                border-collapse: collapse;
            }
            th, td {
                border: 1px solid black;
                padding: 8px;
                text-align: left;
            }
            th {
                background-color: #f2f2f2;
            }
            img {
                width: 100px;
                height: auto;
            }
        </style>
    </head>
    <body>
        <h1>Maps Database</h1>
        <table>
            <tr>
                <th>Map Name</th>
                <th>NW Coords (Lat, Lon)</th>
                <th>SE Coords (Lat, Lon)</th>
                <th>Optimal Rotation Angle</th>
                <th>Overlay Dimensions (WxH)</th>
                <th>Selected Pixel Coords</th>
                <th>Selected Realworld Coords</th>
                <th>Original Map</th>
                <th>Final Map</th>
            </tr>
            {% for map in maps %}
            <tr>
                <td>{{ map.map_name }}</td>
                <td>{{ map.nw_coords[0] }}, {{ map.nw_coords[1] }}</td>
                <td>{{ map.se_coords[0] }}, {{ map.se_coords[1] }}</td>
                <td>{{ map.optimal_rotation_angle }}</td>
                <td>{{ map.overlay_width }} x {{ map.overlay_height }}</td>
                <td>{{ map.selected_pixel_coords }}</td>
                <td>{{ map.selected_realworld_coords }}</td>
                <td><img src="dal/mapfile/original/{{ map.map_name }}" alt="Original Map"></td>
                <td><img src="dal/mapfile/final/{{ map.map_name }}" alt="Final Map"></td>
            </tr>
            {% endfor %}
        </table>
    </body>
    </html>
    '''
    return render_template_string(html, maps=maps)



def is_local_request():
    return request.remote_addr in ['127.0.0.1', 'localhost']

def add_transparent_border_and_rotate_image(image, border_size, rotation_angle):
    image = image.convert("RGBA")
            
    # Add a transparent border around the image
    bordered_image = add_transparent_border(image, border_size)

    # Rotate the image
    rotated_image = bordered_image.rotate(rotation_angle, expand=False)

    return rotated_image


def pdf_bytes_to_png(pdf_bytes, scale=2.0):
    with fitz.open(stream=pdf_bytes, filetype="pdf") as pdf_document:
        if pdf_document.page_count == 0:
            raise ValueError("PDF contains no pages.")

        if pdf_document.page_count > 1:
            app.logger.info(f"convertPdfToImage received multi-page PDF with {pdf_document.page_count} pages; using only the first page.")

        page = pdf_document.load_page(0)
        matrix = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        png_bytes = pix.tobytes("png")

    return BytesIO(png_bytes)



"""Haversine distance in meters"""
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def latlon_to_local_xy(lat, lon, lat0, lon0):
    """
    Convert lat/lon to local tangent-plane x/y meters.
    lat0/lon0 is the reference origin.
    """
    R = 6371000
    dlat = math.radians(lat - lat0)
    dlon = math.radians(lon - lon0)
    x = R * dlon * math.cos(math.radians(lat0))
    y = R * dlat
    return x, y

"""Helper function to estimate the number of meters per pixel from a list of pixel coordinates and
   their associated latitudes and longitudes."""
def meters_per_pixel_xy(pixel_pts, geo_pts):
    # Use the first real-world point as local origin
    lat0, lon0 = geo_pts[0]

    # Convert all geo points to local meter coordinates
    xy = [latlon_to_local_xy(lat, lon, lat0, lon0) for lat, lon in geo_pts]

    ratios_x = []
    ratios_y = []

    n = len(pixel_pts)

    for i in range(n):
        for j in range(i+1, n):
            (px1, py1), (px2, py2) = pixel_pts[i], pixel_pts[j]

            dx_px = px2 - px1
            dy_px = py2 - py1

            x1, y1 = xy[i]
            x2, y2 = xy[j]

            dx_m = x2 - x1
            dy_m = y2 - y1

            # Only compute ratios when movement exists in that axis
            if dx_px != 0:
                ratios_x.append(dx_m / dx_px)
            if dy_px != 0:
                ratios_y.append(dy_m / dy_px)

    m_per_px_x = sum(ratios_x) / len(ratios_x)
    m_per_px_y = sum(ratios_y) / len(ratios_y)

    return abs(m_per_px_x), abs(m_per_px_y)



"""Helper function to calculate the area between the rectangle encompassed by a latitude and longitude"""
def rectangular_area_from_bounds(nw_corner, se_corner):
    """
    nw_corner = [lat, lon] of north-west corner
    se_corner = [lat, lon] of south-east corner
    Returns area in m².
    """
    nw_lat, nw_lon = nw_corner
    se_lat, se_lon = se_corner

    # North–south distance: longitude fixed at NW
    ns_dist = haversine(nw_lat, nw_lon, se_lat, nw_lon)

    # East–west distance: at mid-latitude for accuracy
    mid_lat = (nw_lat + se_lat) / 2
    ew_dist = haversine(mid_lat, nw_lon, mid_lat, se_lon)

    return (ns_dist * ew_dist) / 1000000.0 # Return unit: Square kilometers





if __name__ == '__main__':
    print("Example request to transform map: http://127.0.0.1:5000/transform?angle=0&border=465&path=../maps/png/tur-o-2024/2024-astveitskogen-tur-o.png")
    app.run(debug=True)
