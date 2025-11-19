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
    pointsAfterRotating = rotate_points(image_coords, overlayWidth, overlayHeight, angle_degrees)

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

    bounds = (-180, 180)
    minimization_result = minimize_scalar(errorFunction, bounds=bounds, method='bounded')

    optimal_angle = minimization_result.x

    # Calculate the correct coordinates of overlay corners    
    optimal_rotation_result = rotateAndRegisterOverlay(image_coords, real_coords, optimal_angle, overlayWidth, overlayHeight)
    
    result = {"nw_coords" : optimal_rotation_result["nw_coords"], 
              "se_coords" : optimal_rotation_result["se_coords"], 
              "optimal_rotation_angle" : optimal_angle,
              "selected_pixel_coords": image_coords,
              "selected_realworld_coords": real_coords,
              "overlay_width": overlayWidth,
              "overlay_height": overlayHeight
              }

    return result









def my_compute_rotated_corners_latlon(width, height, rotationAngle, image_coords, real_coords):
    x1 = image_coords[0][0]
    y1 = image_coords[0][1]
    lat1 = real_coords[0][0]
    lon1 = real_coords[0][1]

    x2 = image_coords[1][0]
    y2 = image_coords[1][1]
    lat2 = real_coords[1][0]
    lon2 = real_coords[1][1]

    scaleFactors = getScaleFactors(x1, y1, lat1, lon1, x2, y2, lat2, lon2)

    # scaleFactors = getScaleFactors(
    #     image_coords[0][0], image_coords[0][1], 
    #     real_coords[0][0], real_coords[0][1], 
    #     image_coords[1][0], image_coords[1][1], 
    #     real_coords[1][0], real_coords[1][1])

    nw = getNorthWestCorner(x1, y1, lat1, lon1, scaleFactors[0], scaleFactors[1])
    se = getSouthEastCorner(x1, y1, lat1, lon1, scaleFactors[0], scaleFactors[1], width, height)

    return {"nw" : nw, 
            "se" : se } 

def compute_rotated_corners_latlon(width, height, angle_deg, control_points):
    """
    Compute geodetic coordinates of the NW and SE corners of an image
    after rotation around its center with overflow clipped (same canvas size).

    Parameters
    ----------
    width, height : int
        Image size in pixels (unrotated and rotated; they stay the same).
    angle_deg : float
        Rotation angle in degrees, counter-clockwise.
        Positive angle matches e.g. PIL.Image.rotate(angle, expand=False).
    control_points : list of 3 tuples
        [(x, y, lat, lon), ...] for the UNROTATED image.
        The 3 points must not be collinear in (x, y).

    Returns
    -------
    dict
        {
          "nw": (lat_nw, lon_nw),
          "se": (lat_se, lon_se),
        }
    """

    if len(control_points) != 3:
        raise ValueError("Need exactly 3 control points")

    # 1) Fit affine transforms lat(x,y), lon(x,y)
    A = []
    lat_vec = []
    lon_vec = []
    for x, y, lat, lon in control_points:
        A.append([x, y, 1.0])
        lat_vec.append(lat)
        lon_vec.append(lon)

    A = np.array(A, dtype=float)
    lat_vec = np.array(lat_vec, dtype=float)
    lon_vec = np.array(lon_vec, dtype=float)

    # Solve A * [a; b; c] = lat_vec and lon_vec
    a_lat, b_lat, c_lat = np.linalg.solve(A, lat_vec)
    a_lon, b_lon, c_lon = np.linalg.solve(A, lon_vec)

    def img_to_latlon(x, y):
        lat = a_lat * x + b_lat * y + c_lat
        lon = a_lon * x + b_lon * y + c_lon
        return float(lat), float(lon)

    # 2) Geometry of rotation
    cx = (width - 1) / 2.0
    cy = (height - 1) / 2.0

    theta = np.deg2rad(angle_deg)
    cos_t = np.cos(theta)
    sin_t = np.sin(theta)

    def rotated_to_original(xp, yp):
        """
        Map point (xp, yp) in the rotated image back to (x, y) in the original.
        """
        dxp = xp - cx
        dyp = yp - cy

        # Inverse rotation = R^T
        dx =  cos_t * dxp + sin_t * dyp
        dy = -sin_t * dxp + cos_t * dyp

        x = cx + dx
        y = cy + dy
        return x, y

    # 3) All four image corners AFTER rotation+clipping
    rotated_corners = [
        (0.0,           0.0          ),  # top-left
        (width - 1.0,   0.0          ),  # top-right
        (width - 1.0,   height - 1.0),  # bottom-right
        (0.0,           height - 1.0),  # bottom-left
    ]

    world_corners = []
    for xp, yp in rotated_corners:
        x, y = rotated_to_original(xp, yp)
        lat, lon = img_to_latlon(x, y)
        world_corners.append((lat, lon))

    # 4) Pick NW (max lat, min lon) and SE (min lat, max lon)
    lats = [c[0] for c in world_corners]

    max_lat = max(lats)
    nw_candidates = [c for c in world_corners if abs(c[0] - max_lat) < 1e-9]
    nw = min(nw_candidates, key=lambda c: c[1])  # smallest lon among max-lat

    min_lat = min(lats)
    se_candidates = [c for c in world_corners if abs(c[0] - min_lat) < 1e-9]
    se = max(se_candidates, key=lambda c: c[1])  # largest lon among min-lat

    return {"nw": nw, "se": se}







def georeference_three_points(image_coords, real_coords, overlay_width, overlay_height):
    """
    image_coords: list of 3 (x, y) pixel tuples, origin at top-left, y down
    real_coords:  list of 3 (lat, lon) tuples in degrees
    overlay_width, overlay_height: image size in pixels

    Returns:
        {
          "nw_coords": (lat_nw, lon_nw),
          "se_coords": (lat_se, lon_se),
          "rotation_deg": theta_ccw,
          "rmse_meters": rmse
        }
    """

    R_EARTH = 6378137.0  # meters, WGS84

    # --- 1) Prepare numpy arrays ---
    img = np.array(image_coords, dtype=float)  # shape (3, 2)
    lats = np.array([lat for (lat, lon) in real_coords], dtype=float)
    lons = np.array([lon for (lat, lon) in real_coords], dtype=float)

    # Flip y so that y goes up (mathematical convention)
    img_yup = img.copy()
    img_yup[:, 1] = -img_yup[:, 1]

    # --- 2) Lat/lon -> local (X, Y) meters (simple equirectangular local projection) ---
    lat0 = lats.mean()
    lon0 = lons.mean()
    deg2rad = math.pi / 180.0

    # X east, Y north (meters), relative to (lat0, lon0)
    dlon = (lons - lon0) * deg2rad
    dlat = (lats - lat0) * deg2rad
    x_m = R_EARTH * dlon * math.cos(lat0 * deg2rad)
    y_m = R_EARTH * dlat
    world = np.stack([x_m, y_m], axis=1)  # shape (3, 2)

    # --- 3) Solve similarity transform: w = s * R * p + t ---
    # Umeyama-like solution in 2D
    src = img_yup
    dst = world
    n = src.shape[0]

    mu_src = src.mean(axis=0)
    mu_dst = dst.mean(axis=0)
    src_c = src - mu_src
    dst_c = dst - mu_dst

    var_src = (src_c**2).sum() / n

    # Covariance
    Sigma = (dst_c.T @ src_c) / n  # 2x2
    U, D, Vt = np.linalg.svd(Sigma)
    S = np.eye(2)
    if np.linalg.det(U) * np.linalg.det(Vt) < 0:
        S[-1, -1] = -1

    R = U @ S @ Vt
    s = np.trace(np.diag(D) @ S) / var_src
    t = mu_dst - s * (R @ mu_src)

    # --- 4) Compute RMS reprojection error (diagnostics) ---
    world_pred = (s * (R @ src.T)).T + t
    residuals = world - world_pred
    rmse = math.sqrt((residuals**2).sum() / n)

    # --- 5) Transform image corners (in y-up pixels) ---
    W = float(overlay_width)
    H = float(overlay_height)

    # Image corners in y-up coords:
    # NW: (0, 0)
    # SE: (W, -H)
    p_nw = np.array([0.0, 0.0])
    p_se = np.array([W, -H])

    w_nw = s * (R @ p_nw) + t   # shape (2,)
    w_se = s * (R @ p_se) + t

    # --- 6) Convert back to lat/lon ---
    def xy_to_latlon(w):
        X, Y = w[0], w[1]
        rad2deg = 180.0 / math.pi
        lat = Y / R_EARTH * rad2deg + lat0
        lon = X / (R_EARTH * math.cos(lat0 * deg2rad)) * rad2deg + lon0
        return (lat, lon)

    lat_nw, lon_nw = xy_to_latlon(w_nw)
    lat_se, lon_se = xy_to_latlon(w_se)

    # --- 7) Extract rotation angle (counter-clockwise, degrees) ---
    # R = [[cosθ, -sinθ],
    #      [sinθ,  cosθ]]
    theta_rad = math.atan2(R[1, 0], R[0, 0])
    theta_deg = theta_rad * 180.0 / math.pi

    return {
        "nw_coords": (lat_nw, lon_nw),
        "se_coords": (lat_se, lon_se),
        "rotation_deg": theta_deg,
        "rmse_meters": rmse,
        "selected_pixel_coords": image_coords,
        "selected_realworld_coords": real_coords,
        "overlay_width": overlay_width,
        "overlay_height": overlay_height,
    }