from __future__ import annotations

from PIL import Image


def add_transparent_border(image: Image.Image, border_size: int) -> Image.Image:
    # Create a new image with transparent background
    new_size = (image.width + 2 * border_size, image.height + 2 * border_size)
    new_image = Image.new("RGBA", new_size, (0, 0, 0, 0))

    # Paste the original image in the center
    new_image.paste(image, (border_size, border_size))
    return new_image


def add_transparent_border_and_rotate_image(
    image: Image.Image, border_size: int, rotation_angle: float
) -> Image.Image:
    image = image.convert("RGBA")

    # Add a transparent border around the image
    bordered_image = add_transparent_border(image, border_size)

    # Rotate the image
    rotated_image = bordered_image.rotate(rotation_angle, expand=False)

    return rotated_image


