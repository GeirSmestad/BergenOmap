from flask import Flask, send_file, request
from PIL import Image, ImageOps, ImageDraw
import io

app = Flask(__name__)

def add_transparent_border(image, border_size):
    # Create a new image with transparent background
    new_size = (image.width + 2 * border_size, image.height + 2 * border_size)
    new_image = Image.new("RGBA", new_size, (0, 0, 0, 0))
    
    # Paste the original image in the center
    new_image.paste(image, (border_size, border_size))
    return new_image

@app.route('/transform', methods=['GET'])
def transform_image():
    #image_path = request.args.get('path')  # Path to the image file
    image_path = "../maps/floyen-1.JPG"
    rotation_angle = int(request.args.get('angle', 0))  # Rotation angle
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

            # # Rotate the image
            # rotated_image = img.rotate(rotation_angle, expand=True)
            
            # # Add a transparent border around the image
            # bordered_image = add_transparent_border(rotated_image, border_size)

            # Save the transformed image to a BytesIO object
            img_io = io.BytesIO()
            rotated_image.save(img_io, 'PNG')
            img_io.seek(0)

            # Send the transformed image as a response
            return send_file(img_io, mimetype='image/png')

    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    app.run(debug=True)
