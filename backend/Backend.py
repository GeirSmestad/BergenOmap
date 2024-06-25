from flask import Flask, send_file, request, jsonify, make_response, g, abort, render_template_string
from flask_cors import CORS
from PIL import Image, ImageOps, ImageDraw
import io
from OptimizeRotation import getOverlayCoordinatesWithOptimalRotation
import json
from io import BytesIO

default_border_percentage = 0.13 # Width of each side border, as percentage of longest dimension
default_overlay_path = "../maps/floyen-2-cropped.png"

# Munkebotn: http://127.0.0.1:5000/transform?angle=3.225405991892112&border=465&path=../maps/munkebotn_combined.png   w: 2481 h: 3508
# Åstveitskogen: http://127.0.0.1:5000/transform?angle=0&border=465&path=../maps/png/tur-o-2024/2024-astveitskogen-tur-o.png

app = Flask(__name__)

# Use cross-origin resource sharing in return headers, to tell browser to allow responses from different origin
CORS(app)

def add_transparent_border(image, border_size):
    # Create a new image with transparent background
    new_size = (image.width + 2 * border_size, image.height + 2 * border_size)
    new_image = Image.new("RGBA", new_size, (0, 0, 0, 0))
    
    # Paste the original image in the center
    new_image.paste(image, (border_size, border_size))
    return new_image

# Example request:
# http://127.0.0.1:5000/transform?angle=3.22247&border=150
@app.route('/transform', methods=['GET'])
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


@app.route('/processDroppedImage', methods=['POST'])
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



@app.route('/transformPostedImage', methods=['POST'])
def transform_posted_image():
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

    img_io = io.BytesIO()
    processed_image.save(img_io, 'PNG')
    img_io.seek(0)

    # You can likely do all the following by using the get_db object below. See database prompts from yesterday.

    original_map_binary = file.read()

    original_image_io = io.BytesIO()
    image.save(original_image_io, 'PNG')
    original_image_io.seek(0)

    db = get_db()

    print()
    print(imageRegistrationData)
    print()

    map_data = json.loads(imageRegistrationData)

    db.insert_map(map_data)


    db.insert_mapfile_original(map_data["map_name"], original_image_io.getvalue())
    #db.insert_mapfile_original(map_data["map_name"], original_map_binary)
    db.insert_mapfile_final(map_data["map_name"], img_io.getvalue())

    # TODO: Save input to database
    # TODO: Save original image to database
    # TODO: Save transformed image to database

    # TODO: Tror jeg har en bug hvor database-filen blir skrevet til feil plass på disken. database_file_location i backend-katalogen.

    return send_file(img_io, mimetype='image/png')

    

@app.route('/getOverlayCoordinates', methods=['POST'])
def get_overlay_coordinates():
    try:
        # Parse the required parameters from the request JSON
        data = request.get_json()
        image_coords = data.get('image_coords')
        real_coords = data.get('real_coords')
        overlay_width = data.get('overlayWidth')
        overlay_height = data.get('overlayHeight')

        # Ensure inputs are correctly formatted
        if len(image_coords) != 3 or len(real_coords) != 3:
            return jsonify({'error': 'Invalid input: Must provide exactly 3 image and 3 real coordinates'}), 400

        result = getOverlayCoordinatesWithOptimalRotation(image_coords, real_coords, overlay_width, overlay_height)

        # Return the result as a JSON response
        return make_response(json.dumps(result, sort_keys=False))

    except Exception as e:
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


@app.route('/dal/insert_map', methods=['POST'])
def insert_map():
    map_data = request.json
    db = get_db()
    db.insert_map(map_data)
    return jsonify({'message': 'Map added successfully'}), 201

@app.route('/dal/list_maps', methods=['GET'])
def list_maps():
    db = get_db()
    maps = db.list_maps()
    return jsonify(maps)

@app.route('/dal/mapfile/original/<map_name>', methods=['GET'])
def get_mapfile_original(map_name):
    db = get_db()
    image_data = db.get_mapfile_original(map_name)
    if image_data is not None:
        return send_file(BytesIO(image_data), mimetype='image/*')
    else:
        abort(404, description="Map not found")

@app.route('/dal/mapfile/final/<map_name>', methods=['GET'])
def get_mapfile_final(map_name):
    db = get_db()
    image_data = db.get_mapfile_final(map_name)
    if image_data is not None:
        return send_file(BytesIO(image_data), mimetype='image/*')
# End database interface


# Database visualization
# To view, query http://127.0.0.1:5000/viewDatabase
@app.route('/viewDatabase')
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
                <th>Attribution</th>
                <th>Selected Pixel Coords</th>
                <th>Selected Realworld Coords</th>
                <th>Map Filename</th>
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
                <td>{{ map.attribution }}</td>
                <td>{{ map.selected_pixel_coords }}</td>
                <td>{{ map.selected_realworld_coords }}</td>
                <td>{{ map.map_filename }}</td>
                <td><img src="/dal/mapfile/original/{{ map.map_name }}" alt="Original Map"></td>
                <td><img src="/dal/mapfile/final/{{ map.map_name }}" alt="Final Map"></td>
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





if __name__ == '__main__':
    print("Example request to transform map: http://127.0.0.1:5000/transform?angle=0&border=465&path=../maps/png/tur-o-2024/2024-astveitskogen-tur-o.png")
    app.run(debug=True)
