from flask import Flask, send_file, request, jsonify, make_response
from flask_cors import CORS
from PIL import Image, ImageOps, ImageDraw
import io
from OptimizeRotation import getOverlayCoordinatesWithOptimalRotation

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

    print(f"Transformed image of dimensions ({originalWidth}, {originalHeight}) to image of dimensions ({processed_image.width}, {processed_image.height})")

    # Save the processed image to a BytesIO object
    img_io = io.BytesIO()
    processed_image.save(img_io, 'PNG')
    img_io.seek(0)

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

        # Call the function with the provided parameters
        result = getOverlayCoordinatesWithOptimalRotation(image_coords, real_coords, overlay_width, overlay_height)

        # Return the result as a JSON response
        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500



from Database import Database
db = Database()

# Database interface. Unsure if you'll actually want to expose them like this, but you have the option.
@app.route('/dal/insert_map', methods=['POST'])
def insert_map():
    map_data = request.json
    db.insert_map(map_data)
    return jsonify({'message': 'Map added successfully'}), 201

@app.route('/dal/list_maps', methods=['GET'])
def list_maps():
    maps = db.list_maps()
    return jsonify(maps)



def add_transparent_border_and_rotate_image(image, border_size, rotation_angle):
    image = image.convert("RGBA")
            
    # Add a transparent border around the image
    bordered_image = add_transparent_border(image, border_size)

    # Rotate the image
    rotated_image = bordered_image.rotate(rotation_angle, expand=False)

    return rotated_image





if __name__ == '__main__':
    app.run(debug=True)
