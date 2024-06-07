import numpy as np
from scipy.optimize import minimize
import matplotlib.pyplot as plt
import math

def transformation_matrix(theta):
    return np.array([
        [np.cos(theta), -np.sin(theta)],
        [np.sin(theta), np.cos(theta)]
    ])

def transform_points_center(params, x, y, width, height):
    theta, t_x, t_y = params
    # Translate to center
    x_centered, y_centered = x - width / 2, y - height / 2
    # Apply rotation
    matrix = transformation_matrix(theta)
    x_rotated, y_rotated = np.dot(matrix, np.array([x_centered, y_centered]))
    # Translate back
    x_transformed, y_transformed = x_rotated + width / 2 + t_x, y_rotated + height / 2 + t_y
    return x_transformed, y_transformed

def objective_function(params, image_coords, real_coords, width, height):
    errors = []
    for (x, y), (lat, lon) in zip(image_coords, real_coords):
        x_transformed, y_transformed = transform_points_center(params, x, y, width, height)
        errors.append((x_transformed - lat) ** 2 + (y_transformed - lon) ** 2)
    return np.sum(errors)

# Example usage
image_coords = [(269, 1361.6999969482422), (811, 306.70001220703125), (387, 418.70001220703125)]
real_coords = [(60.39113388285876, 5.3435611724853525), (60.40450336375729, 5.357653498649598), (60.40313627352001, 5.346728861331941)]

# Initial guess for parameters: theta, t_x, t_y
initial_guess = [0, 0, 0]

# Dimensions of the overlay image
width, height = 1325 , 1709

"""
# Minimize the objective function
result = minimize(objective_function, initial_guess, args=(image_coords, real_coords, width, height))

theta, t_x, t_y = result.x

# Calculate NW and SE corners
# Transform NW corner (0, 0)
nw_corner = transform_points_center([theta, t_x, t_y], 0, 0, width, height)

# Transform SE corner (width, height)
se_corner = transform_points_center([theta, t_x, t_y], width, height, width, height)

print("NW Corner (lat, lon):", nw_corner)
print("SE Corner (lat, lon):", se_corner)
print("Optimal rotation angle (degrees):", np.degrees(theta))
"""

def rotate_points(points, width, height, angle_degrees):
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

print("Points to be rotated: ", image_coords)

angle_degrees = 3
pointsAfterRotating = rotate_points(image_coords, width, height, angle_degrees)
print("Rotating points about the center of image: ", pointsAfterRotating)


"""

Roter tre sett med koordinater med et antall grader theta

Beregn skala-faktorer for å konvertere bildekoordinater til kart-koordinater basert på
to koordinat-par

Prøv å transformere alle de tre koordinat-parene til nordvestlig og sørøstlig hjørne
basert på skala-faktoren

Forventningen er at de to du beregnet skala-faktoren fra skal gi samme resultat, mens det tredje
vil ha en feil.

La denne feilen være feil-funksjon for optimisering av theta.

Optimiser for beste theta.

"""


def getScaleLatLon(x1, y1, lat1, lon1, x2, y2, lat2, lon2):
    scale_lat = (lat2 - lat1) / (y2 - y1)
    scale_lon = (lon2 - lon1) / (x2 - x1)
    return (scale_lat, scale_lon)

def getNorthWestCorner(x1, y1, lat1, lon1, scale_lat, scale_lon):
    lat_nw = lat1 - y1 * scale_lat
    lon_nw = lon1 - x1 * scale_lon
    return (lat_nw, lon_nw)

def getSouthEastCorner(x1, y1, lat1, lon1, scale_lat, scale_lon):
    lat_se = lat1 + (height - y1) * scale_lat
    lon_se = lon1 + (width - x1) * scale_lon
    return (lat_se, lon_se)


"""Given three points on the image and three real-life coordinates, return the three sets of (lat,lon)
   coordinates implied for the north-east and south-east corners."""
def transformPointsToLatLonCorners(image_coords, real_coords, scale_lat, scale_lon):
    x1, y1 = image_coords[0]
    lat1, lon1 = real_coords[0]
    nw1 = getNorthWestCorner(x1, y1,  lat1, lon1, scale_lat, scale_lon)
    ne1 = getSouthEastCorner(x1, y1,  lat1, lon1, scale_lat, scale_lon)

    # TODO: ne1, ne2, ne3 need to be renamed in this function to se*

    x2, y2 = image_coords[1]
    lat2, lon2 = real_coords[1]
    nw2 = getNorthWestCorner(x2, y2,  lat2, lon2, scale_lat, scale_lon)
    ne2 = getSouthEastCorner(x2, y2,  lat2, lon2, scale_lat, scale_lon)

    x3, y3 = image_coords[2]
    lat3, lon3 = real_coords[2]
    nw3 = getNorthWestCorner(x3, y3,  lat3, lon3, scale_lat, scale_lon)
    ne3 = getSouthEastCorner(x3, y3,  lat3, lon3, scale_lat, scale_lon)
    # TODO: Calculate difference between nw corner calculated from points 1, 2 and 3, and see how
    # they differ. Expectation is that 1 and 2 should be identical, 3 should be displaced
    # by a varying amount depending on how close rotation is to reality.

    return nw1, ne1, nw2, ne2, nw3, ne3


def printLatLonCornerDifferences(nw1, se1, nw2, se2, nw3, se3):
    print("North-west corner coordinates follow:")
    print(nw1)
    print(nw2)
    print(nw3)
    print("South-east corner coordinates follow:")
    print(se1)
    print(se2)
    print(se3)
    print("Distance nw1-nw2: ", euclidean_distance(nw1, nw2))
    print("Distance nw2-nw3: ", euclidean_distance(nw2, nw3))
    print("Distance nw3-nw1: ", euclidean_distance(nw3, nw1))
    print("Distance se1-se2: ", euclidean_distance(se1, se2))
    print("Distance se2-se3: ", euclidean_distance(se2, se3))
    print("Distance se3-se1: ", euclidean_distance(se3, se1))
    print("Total sum of squares for nw coordinates: ", total_sum_of_squares(nw1, nw2, nw3))

def euclidean_distance(coord1, coord2):
    x1, y1 = coord1
    x2, y2 = coord2
    return math.sqrt((x2 - x1)**2 + (y2 - y1)**2)


def sum_of_squares(coord1, coord2):
    x1, y1 = coord1
    x2, y2 = coord2
    return (x2 - x1)**2 + (y2 - y1)**2

def total_sum_of_squares(coords1, coords2, coords3):    
    s1 = sum_of_squares(coords1, coords2)
    s2 = sum_of_squares(coords2, coords3)
    s3 = sum_of_squares(coords3, coords1)
    
    return s1 + s2 + s3



def getSumOfSquares_whenRegisteringRotatedCoordinates(image_coords, real_coords, angle_degrees):
    pointsAfterRotating = rotate_points(image_coords, width, height, angle_degrees)

    # We will use the first sets of two points to calculate the placement of the overlay, then 
    # use the third to calibrate how accurate the rotation was for correctly registering the coordinates.

    x1, y1 = pointsAfterRotating[0]
    x2, y2 = pointsAfterRotating[1]
    x3, y3 = pointsAfterRotating[2]

    lat1, lon1 = real_coords[0]
    lat2, lon2 = real_coords[1]
    lat3, lon3 = real_coords[2]

    scale_lat, scale_lon = getScaleLatLon(x1, y1, lat1, lon1, x2, y2, lat2, lon2)

    latLonCorners = transformPointsToLatLonCorners(pointsAfterRotating, real_coords, scale_lat, scale_lon)
    nw1, se1, nw2, se2, nw3, se3 = latLonCorners
    sumOfSquares = total_sum_of_squares(nw1, nw2, nw3)

    #print("Sum of squares for this rotation: ", sumOfSquares)
    return sumOfSquares

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

    # TODO: Return a dictionary
    pass

# Dette er tre punkter på et ikke-rotert kart.
#Clicked the following image coordinates: (844, 319.6999969482422) app.js:23:13
#Clicked the following image coordinates: (238, 1337.7000122070312) app.js:23:13
#Clicked the following image coordinates: (414, 403.6999969482422)


#image_coords = [(269, 1361.6999969482422), (811, 306.70001220703125), (387, 418.70001220703125)]
image_coords = [(238, 1337.7000122070312), (844, 319.6999969482422), (414, 403.6999969482422)]
real_coords = [(60.39113388285876, 5.3435611724853525), (60.40450336375729, 5.357653498649598), (60.40313627352001, 5.346728861331941)]

x1, y1 = image_coords[0]
x2, y2 = image_coords[1]

lat1, lon1 = real_coords[0]
lat2, lon2 = real_coords[1]

scaleLatLon = getScaleLatLon(x1, y1, lat1, lon1, x2, y2, lat2, lon2)
print("scaleLatLon: ", scaleLatLon)
print()

latLonCorners = transformPointsToLatLonCorners(image_coords, real_coords, scaleLatLon[0], scaleLatLon[1])
print("latLonCorners: ", latLonCorners)
print()

nw1, se1, nw2, se2, nw3, se3 = latLonCorners
printLatLonCornerDifferences(nw1, se1, nw2, se2, nw3, se3)
print()

scaleLat, scaleLon = scaleLatLon
#getSumOfSquares_whenRegisteringRotatedCoordinates(image_coords, real_coords, scaleLat, scaleLon, 10)

i = -2.0
while i <= 5.0:
    print(getSumOfSquares_whenRegisteringRotatedCoordinates(image_coords, real_coords, i), round(i, 1))
    i += 0.2


def visualize_rotation(width, height, original_points, rotated_points):
    """
    Visualize the original and rotated points on an image with given width and height.
    
    Parameters:
    - width: int, width of the image.
    - height: int, height of the image.
    - original_points: list of tuples, each containing the (x, y) coordinates of original points.
    - rotated_points: list of tuples, each containing the (x, y) coordinates of rotated points.
    """
    fig, ax = plt.subplots()
    ax.set_aspect('equal')

    # Original points
    original_x, original_y = zip(*original_points)
    ax.scatter(original_x, original_y, color='blue', label='Original Points')

    # Rotated points
    rotated_x, rotated_y = zip(*rotated_points)
    ax.scatter(rotated_x, rotated_y, color='red', label='Rotated Points')

    # Center of the image
    cx = width / 2
    cy = height / 2
    ax.scatter([cx], [cy], color='green', label='Center of Image')

    # Setting up the plot
    ax.set_xlim(0, width)
    ax.set_ylim(height, 0)  # Inverting y-axis to match image coordinates
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_title('Original and Rotated Points')
    ax.legend()
    plt.grid(True)
    plt.show()


# visualize_rotation(width, height, image_coords, pointsAfterRotating)