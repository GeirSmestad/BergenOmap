import numpy as np
import math
from scipy.optimize import minimize_scalar


"""
Rotate points about the center of the image.

Parameters:
- points: list of tuples, each containing the (x, y) coordinates of a point.
- width: int, width of the image.
- height: int, height of the image.
- angle_degrees: float, angle in degrees to rotate the points.

Returns:
- rotated_points: list of tuples, each containing the rotated (x, y) coordinates of a point.
"""
def rotate_points(points, width, height, angle_degrees):

    angle_degrees *= -1 # Rotate counter-clockwise

    # Convert angle from degrees to radians
    angle_radians = np.radians(angle_degrees)
    
    # Calculate the center of the image
    cx = width / 2
    cy = height / 2
    
    # Create rotation matrix
    rotation_matrix = np.array([
        [np.cos(angle_radians), -np.sin(angle_radians)],
        [np.sin(angle_radians),  np.cos(angle_radians)]
    ])
    
    rotated_points = []
    for (x, y) in points:
        # Translate point to origin (center of image)
        translated_x = x - cx
        translated_y = y - cy
        
        # Rotate point
        rotated_x, rotated_y = rotation_matrix.dot([translated_x, translated_y])
        
        # Translate point back to its original position
        new_x = rotated_x + cx
        new_y = rotated_y + cy
        
        rotated_points.append((new_x, new_y))
    
    return rotated_points


"""Given two sets of pixel coordinates on an orienteering map overlay
   (x1, y1), (x2, y2),

   and two sets of real-world (lat, lon) coordinates matching their location
   (lat1, lon1), (lat2, lon2)

   return tuple (scale_lat, scale_lon) to translate between pixel coordinates
   and real-world latitude and longitude.
"""
def getScaleFactors(x1, y1, lat1, lon1, x2, y2, lat2, lon2):
    scale_lat = (lat2 - lat1) / (y2 - y1)
    scale_lon = (lon2 - lon1) / (x2 - x1)
    return (scale_lat, scale_lon)

"""Given a set of pixel coordinates on an orienteering map overlay
   (x1, y1)

   and a sets of real-world (lat, lon) coordinates matching their location
   (lat1, lon1)

   and scale factors to translate between pixel coordinates and real-world
   latitude and longitude,

   return the location (lat, lon) of the north-west corner of the overlay.
"""
def getNorthWestCorner(x1, y1, lat1, lon1, scale_lat, scale_lon):
    lat_nw = lat1 - y1 * scale_lat
    lon_nw = lon1 - x1 * scale_lon
    return (lat_nw, lon_nw)

"""Given a set of pixel coordinates on an orienteering map overlay
   (x1, y1)

   and a sets of real-world (lat, lon) coordinates matching their location
   (lat1, lon1)

   and scale factors to translate between pixel coordinates and real-world
   latitude and longitude,

   and the pixel dimensions of the overlay,

   return the location (lat, lon) of the south-east corner of the overlay.
"""
def getSouthEastCorner(x1, y1, lat1, lon1, scale_lat, scale_lon, width, height):
    lat_se = lat1 + (height - y1) * scale_lat
    lon_se = lon1 + (width - x1) * scale_lon
    return (lat_se, lon_se)


"""Given three sets of pixel coordinates on an orienteering map overlay
   [(x1, y1), (x2, y2), (x3, y3)]

   and three sets of real-world (lat, lon) coordinates matching their location
   [(lat1, lon1), (lat2, lon2), (lat3, lon3)],

   and scale factors for translating between pixel coordinates and (lat, lon) coordinates

   and the pixel dimensions of the overlay,

   calculate the three sets of (lat, lon) coordinates for the north-west and south-east 
   corner of the overlay, that are implied by each of the three sets of coordinates.

   Depending on which set of two coordinate pairs the scale factors are calculated from,
   there will be a discrepancy between some of the returned coordinates if the overlay
   is not oriented towards geographic north. (This is typically the case, which is the 
   essential source of complexity that necessitates overlay registration in the first place).

   Returns six sets of (lat, lon) tuples
   
"""
def calculateOverlayCorners(image_coords, real_coords, scale_lat, scale_lon, width, height):
    x1, y1 = image_coords[0]
    lat1, lon1 = real_coords[0]
    nw1 = getNorthWestCorner(x1, y1, lat1, lon1, scale_lat, scale_lon)
    se1 = getSouthEastCorner(x1, y1, lat1, lon1, scale_lat, scale_lon, width, height)

    x2, y2 = image_coords[1]
    lat2, lon2 = real_coords[1]
    nw2 = getNorthWestCorner(x2, y2, lat2, lon2, scale_lat, scale_lon)
    se2 = getSouthEastCorner(x2, y2, lat2, lon2, scale_lat, scale_lon, width, height)

    x3, y3 = image_coords[2]
    lat3, lon3 = real_coords[2]
    nw3 = getNorthWestCorner(x3, y3, lat3, lon3, scale_lat, scale_lon)
    se3 = getSouthEastCorner(x3, y3, lat3, lon3, scale_lat, scale_lon, width, height)

    return nw1, se1, nw2, se2, nw3, se3


def euclidean_distance(coord1, coord2):
    x1, y1 = coord1
    x2, y2 = coord2
    return math.sqrt((x2 - x1)**2 + (y2 - y1)**2)


"""Given three sets of pixel coordinates on an orienteering map overlay
   [(x1, y1), (x2, y2), (x3, y3)]

   and three sets of real-world (lat, lon) coordinates matching their location
   [(lat1, lon1), (lat2, lon2), (lat3, lon3)],

   and an angle of counter-clockwise rotation,

   rotate the pixel coordinates, then register the pixel coordinates onto real-world
   coordinates. Use the third set of coordinates to calculate the degree of error
   between this registration and the optimal one.

   Return the northwest and southeast (lat, lon) coordinates of this registration,
   and the error.
"""
def rotateAndRegisterOverlay(image_coords, real_coords, angle_degrees, overlayWidth, overlayHeight):
    pointsAfterRotating = rotate_points(image_coords, width, height, angle_degrees)

    x1, y1 = pointsAfterRotating[0]
    x2, y2 = pointsAfterRotating[1]

    lat1, lon1 = real_coords[0]
    lat2, lon2 = real_coords[1]

    scale_lat, scale_lon = getScaleFactors(x1, y1, lat1, lon1, x2, y2, lat2, lon2)

    overlayCorners = calculateOverlayCorners(pointsAfterRotating, real_coords, scale_lat, scale_lon, overlayWidth, overlayHeight)
    nw1, se1, nw2, se2, nw3, se3 = overlayCorners

    """
    The scale factors are calculated from (x1, y1) and (lat1, lon1) and determine the location of the overlay 
    corners nw1 and se1.
    
    nw3, however, is calculated from (x3, y3) and (lat3, lon3), and will only be at the same location as nw1 if the
    overlay happens to be rotated such that its north corresponds to geographic north.
    
    The square of the distance between nw1 and nw3 is therefore a good measure of how closely
    this particular rotation is to the one that matches geographic north.
    """

    error = euclidean_distance(nw1, nw3) ** 2

    result = {"nw_coords" : nw1, "se_coords" : se1, "error" : error}

    return result

"""Given three sets of pixel coordinates on an orienteering map overlay
   [(x1, y1), (x2, y2), (x3, y3)]

   and three sets of real-world (lat, lon) coordinates matching their location
   [(lat1, lon1), (lat2, lon2), (lat3, lon3)],

   and the pixel dimensions of the overlay,

   return the coordinates 
   
   (lat_nw, lon_nw); north-west corner,
   (lat_se, lon_se); south-east corner, 
   the counter-clockwise map rotation in degrees
   
   that most closely register the overlay onto real-world terrain.

   We need to do this because orienteering maps are oriented to magnetic north (which varies by
   location and date of map creation), while the reference map we're using for determining position
   is oriented to geographic north.

   For best results, the three points should be close to different map edges, form a triangle
   with significant angles and be accurately placed.
"""
def getOverlayCoordinatesWithOptimalRotation(image_coords, real_coords, overlayWidth, overlayHeight):
    """
    Algorithm overview:
    - Rotate the provided pixel coordinates by some chosen angle
    - Using the two first sets of coordinates, calculate the scale factors to convert between pixel-
      and real-world coordinates
    - Calculate the north-west and south-east corners of the overlay implied by these
    - Using the third set of coordinates, which was not used for getting the scale factor, calculate
      the north-west overlay corner position implied by *that*
    - This yields a discrepancy in the implied location of the north-west corner, which is caused by
      the overlay not being correctly rotated to match geographic north.

    - Repeat the steps above, varying the initial rotation angle each time, until the discrepancy is
      minimized
    - Return the north-west and south-east corners, plus the counter-clockwise rotation that yields
      the smallest discrepancy.
    """

    # Optimize overlay rotation    
    def errorFunction(rotationAngle):
        rotationAngle = rotationAngle[0] if isinstance(rotationAngle, np.ndarray) else rotationAngle
        rotation_result = rotateAndRegisterOverlay(image_coords, real_coords, rotationAngle, overlayWidth, overlayHeight)

        return rotation_result["error"]

    initial_guess = 0

    bounds = (-180, 180)
    minimization_result = minimize_scalar(errorFunction, bounds=bounds, method='bounded')

    optimal_angle = minimization_result.x

    # Calculate the correct coordinates of overlay corners    
    optimal_rotation_result = rotateAndRegisterOverlay(image_coords, real_coords, optimal_angle, overlayWidth, overlayHeight)
    
    result = {"nw_coords" : optimal_rotation_result["nw_coords"], "se_coords" : optimal_rotation_result["se_coords"], "optimal_rotation_angle" : optimal_angle}

    return result


# Manually-collected sample input -- must fetch this from the webapp in the future
image_coords = [(238, 1337.7000122070312), (844, 319.6999969482422), (414, 403.6999969482422)]
real_coords = [(60.39113388285876, 5.3435611724853525), (60.40450336375729, 5.357653498649598), (60.40313627352001, 5.346728861331941)]


# Dimensions of the overlay image
width, height = 1325 , 1709


# Check that output still makes sense after refactoring
""" Should be something like

{'nw_coords': (60.40845319707709, 5.33672273549868), 'se_coords': (60.386702210916575, 5.370807726609491), 'optimal_rotation_angle': 3.2224726220246245}
{'nw_coords': (60.408453197075374, 5.33672273548746), 'se_coords': (60.386702210919736, 5.370807726626327), 'optimal_rotation_angle': 3.2224726466196616}
"""

print(getOverlayCoordinatesWithOptimalRotation(image_coords, real_coords, width, height))