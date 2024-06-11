from flask import Flask, send_file, request, jsonify
from PIL import Image, ImageOps, ImageDraw
import io
from OptimizeRotation import getOverlayCoordinatesWithOptimalRotation

default_overlay_path = "../maps/floyen-2-cropped.png"

# Munkebotn: http://127.0.0.1:5000/transform?angle=3.22247&border=465&path=../maps/munkebotn_combined.png   w: 2481 h: 3508

app = Flask(__name__)

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
            img = img.convert("RGBA")
            
            # Add a transparent border around the image
            bordered_image = add_transparent_border(img, border_size)

            # Rotate the image
            rotated_image = bordered_image.rotate(rotation_angle, expand=False)

            # Save the transformed image to a BytesIO object
            img_io = io.BytesIO()
            rotated_image.save(img_io, 'PNG')
            img_io.seek(0)

            # Send the transformed image as a response
            return send_file(img_io, mimetype='image/png')

    except Exception as e:
        return str(e), 500


# Example request:
# http://127.0.0.1:5000/getOverlayCoordinates?image_coords=[(238,1337.7),(844,319.7),(414,403.7)]&real_coords=[(60.39113388285876,5.3435611724853525),(60.40450336375729,5.357653498649598),(60.40313627352001,5.346728861331941)]&overlayWidth=1325&overlayHeight=1709
@app.route('/getOverlayCoordinates', methods=['GET'])
def get_overlay_coordinates():
    try:
        # Parse the required parameters from the request
        image_coords_str = request.args.get('image_coords')
        real_coords_str = request.args.get('real_coords')
        overlay_width = int(request.args.get('overlayWidth'))
        overlay_height = int(request.args.get('overlayHeight'))

        # Convert the comma-separated string inputs into lists of tuples
        image_coords = eval(image_coords_str)
        real_coords = eval(real_coords_str)

        # Ensure inputs are correctly formatted
        if len(image_coords) != 3 or len(real_coords) != 3:
            return jsonify({'error': 'Invalid input: Must provide exactly 3 image and 3 real coordinates'}), 400

        # Call the function with the provided parameters
        result = getOverlayCoordinatesWithOptimalRotation(image_coords, real_coords, overlay_width, overlay_height)

        # Return the result as a JSON response
        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500




if __name__ == '__main__':
    app.run(debug=True)
