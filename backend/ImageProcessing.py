import fitz  # PyMuPDF
from PIL import Image
import math

floyen_a_pdf = "../maps/pdf/floyen-23-6-24/LoypeA.pdf"
floyen_b_pdf = "../maps/pdf/floyen-23-6-24/LoypeB.pdf"
floyen_c_pdf = "../maps/pdf/floyen-23-6-24/LoypeC.pdf"

floyen_a_png = "../maps/png/floyen-23-6-24/floyen_300_A.png"
floyen_b_png = "../maps/png/floyen-23-6-24/floyen_300_B.png"
floyen_c_png = "../maps/png/floyen-23-6-24/floyen_300_C.png"

munkebotn_a_pdf = "../maps/pdf/munkebotn-21-6-6/LoypeA.pdf"
munkebotn_b_pdf = "../maps/pdf/munkebotn-21-6-6/LoypeB.pdf"

munkebotn_a_png = "../maps/png/munkebotn-21-6-6/LoypeA.png"
munkebotn_b_png = "../maps/png/munkebotn-21-6-6/LoypeB.png"

output_folder = "../maps/png/"

control_symbol_magenta = (208, 74, 148)

"""Convert PDF to hi-res PNG"""
def pdf_to_png(pdf_path, output_folder, output_filename, dpi=300):
    doc = fitz.open(pdf_path)
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        mat = fitz.Matrix(dpi / 72, dpi / 72)  # Scale to DPI
        pix = page.get_pixmap(matrix=mat)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        if len(doc) == 1:
            img.save(f"{output_folder}/{output_filename}.png", "PNG")
        else:
            img.save(f"{output_folder}/{output_filename}_{page_num + 1}.png", "PNG")



"""Convert a lossless PNG image to compressed WebP image."""
def convert_png_to_webp(png_file_path, output_file_path, quality=70):

    image = Image.open(png_file_path).convert("RGBA")
    image.save(output_file_path, "webp", quality=quality, lossless=(quality == 100))



"""Input two images of identical dimensions and map content, output image containing
   only the pixels that are identical in both or all input images."""
def merge_orienteering_maps(output_path, image1_path, image2_path, image3_path=None):
    # Open the images
    image1 = Image.open(image1_path)
    image2 = Image.open(image2_path)

    if image3_path is not None:
        image3 = Image.open(image3_path)

    # Ensure the images are of the same size
    if image1.size != image2.size:
        raise ValueError("Images must have the same dimensions")

    if image3_path is not None and image1.size != image3.size:
        raise ValueError("Images must have the same dimensions")

    # Load the pixel data
    pixels1 = image1.load()
    pixels2 = image2.load()

    if image3_path is not None:
        pixels3 = image3.load()

    # Create a new image for the output
    output_image = Image.new("RGB", image1.size)
    output_pixels = output_image.load()

    # Process each pixel
    if image3_path == None:
        # Compare two images; take furthest color from magenta if pixel values disagree
        for y in range(image1.size[1]):
            for x in range(image1.size[0]):
                if pixels1[x, y] == pixels2[x, y]:
                    output_pixels[x, y] = pixels1[x, y]
                else:
                    output_pixels[x, y] = furthest_color_from_magenta(pixels1[x, y], pixels2[x,y])
    else:
        # TODO: This does not work; there are magenta lines that are common. Need different rule to select the non-magenta one.
        for y in range(image1.size[1]):
            for x in range(image1.size[0]):
                # This takes 30 seconds, but gives a reasonable result.
                output_pixels[x, y] = furthest_color_from_magenta(pixels1[x, y], pixels2[x, y], pixels3[x, y])

    # Save the resulting image
    output_image.save(output_path)



def color_distance(color1, color2):
    return math.sqrt(sum((c1 - c2) ** 2 for c1, c2 in zip(color1, color2)))

def furthest_color_from_magenta(color1, color2, color3=None):
    distance1 = color_distance(color1, control_symbol_magenta)
    distance2 = color_distance(color2, control_symbol_magenta)

    if color3 is None:
        if distance1 >= distance2:
            return color1
        else:
            return color2
    else:
        distance3 = color_distance(color3, control_symbol_magenta)

        maxDistance = max(distance1, distance2, distance3)

        if (maxDistance == distance1):
            return color1
        if (maxDistance == distance2):
            return color2
        else:
            return color3


# def furthest_color_from_magenta(color1, color2, color3):
#     distance1 = color_distance(color1, control_symbol_magenta)
#     distance2 = color_distance(color2, control_symbol_magenta)
#     distance3 = color_distance(color3, control_symbol_magenta)

#     maxDistance = max(distance1, distance2, distance3)
    



def most_common_color(color1, color2, color3):
    if color1 == color2:
        return color1
    if color2 == color3:
        return color2
    if color3 == color1:
        return color3
    return furthest_color_from_magenta(color1, color2, color3)
    



# Example usage
#merge_orienteering_maps(output_folder + 'output_image.png', floyen_a_png, floyen_b_png, floyen_c_png)
#merge_orienteering_maps(output_folder + 'output_image.png', munkebotn_a_png, munkebotn_b_png)


#pdf_to_png(munkebotn_a_pdf, ".", "munkebotn_a")
#pdf_to_png(munkebotn_b_pdf, ".", "munkebotn_b")

#pdf_to_png("../maps/pdf/kokstad-2022/kokstad-LoypeA.pdf", ".", "kokstad-2022")