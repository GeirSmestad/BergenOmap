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






"""This endpoint uses a novel way of calculating the rotation and position of the overlay based on
   three sets of matching pixel and geo coordinates"""
def compute_rotation_and_bounds(width, height, pixel_points, geo_points):
    """
    width, height: enlarged image size in pixels
    pixel_points: [(x, y), ...] in pixels, origin top-left, y down
    geo_points: [(lat_deg, lon_deg), ...] in degrees, same length as pixel_points

    Returns dict with:
      theta_deg: rotation angle (CCW, math coords)
      nw: (lat_deg, lon_deg) of north-west corner of rotated image
      se: (lat_deg, lon_deg) of south-east corner of rotated image
      scale: meters per pixel-unit in centered coordinates
      rms_deg_error: RMS error between fitted and input control lat/lon
    """
    W, H = float(width), float(height)
    pixel_points = np.asarray(pixel_points, dtype=float)
    geo_points = np.asarray(geo_points, dtype=float)  # (lat, lon)
    if pixel_points.shape[0] != geo_points.shape[0] or pixel_points.shape[0] < 3:
        raise ValueError("Need at least 3 matching pixel and geo points")

    # --- 1) Pixels (top-left, y-down) -> centered, y-up coordinates s = (sx, sy)
    # s_x = x - W/2, s_y = H/2 - y
    s_pts = np.empty_like(pixel_points)
    s_pts[:, 0] = pixel_points[:, 0] - W / 2.0
    s_pts[:, 1] = H / 2.0 - pixel_points[:, 1]

    # --- 2) Lat/lon -> local flat XY (meters) via equirectangular around mean
    lats = geo_points[:, 0]
    lons = geo_points[:, 1]
    lat0 = float(np.mean(lats))
    lon0 = float(np.mean(lons))
    R_earth = 6371000.0
    lat0_rad = math.radians(lat0)

    x = (np.radians(lons - lon0)) * math.cos(lat0_rad) * R_earth
    y = np.radians(lats - lat0) * R_earth
    r_pts = np.column_stack([x, y])

    # --- 3) Similarity transform s -> r using Procrustes / Kabsch
    # We want r ≈ scale * R_mat @ s + t_vec
    P = s_pts.T  # 2 x n
    Q = r_pts.T  # 2 x n
    mu_P = P.mean(axis=1, keepdims=True)
    mu_Q = Q.mean(axis=1, keepdims=True)
    X = P - mu_P
    Y = Q - mu_Q

    Hm = X @ Y.T
    U, Svals, Vt = np.linalg.svd(Hm)
    R_mat = Vt.T @ U.T
    # Enforce proper rotation (determinant +1)
    if np.linalg.det(R_mat) < 0:
        Vt[1, :] *= -1
        R_mat = Vt.T @ U.T

    var_P = np.sum(X ** 2)
    scale = float(np.sum(Svals) / var_P)
    t_vec = (mu_Q - scale * R_mat @ mu_P).reshape(2)

    # Rotation angle, CCW, in degrees
    theta_rad = math.atan2(R_mat[1, 0], R_mat[0, 0])
    theta_deg = math.degrees(theta_rad)

    # --- 4) Rotate full image rectangle corners in s-space
    # s-corners: (-W/2,-H/2), (W/2,-H/2), (W/2,H/2), (-W/2,H/2)
    corners_s = np.array([
        [-W / 2.0, -H / 2.0],
        [ W / 2.0, -H / 2.0],
        [ W / 2.0,  H / 2.0],
        [-W / 2.0,  H / 2.0],
    ])
    s_rot = (R_mat @ corners_s.T).T
    xs = s_rot[:, 0]
    ys = s_rot[:, 1]
    minx, maxx = float(xs.min()), float(xs.max())
    miny, maxy = float(ys.min()), float(ys.max())

    # --- 5) NW and SE in local XY
    # NW: (minx, maxy), SE: (maxx, miny)
    r_NW = scale * np.array([minx, maxy]) + t_vec
    r_SE = scale * np.array([maxx, miny]) + t_vec

    # --- 6) Convert back to lat/lon
    lat_NW = lat0 + math.degrees(r_NW[1] / R_earth)
    lon_NW = lon0 + math.degrees(r_NW[0] / (R_earth * math.cos(lat0_rad)))
    lat_SE = lat0 + math.degrees(r_SE[1] / R_earth)
    lon_SE = lon0 + math.degrees(r_SE[0] / (R_earth * math.cos(lat0_rad)))

    # --- 7) Fit error (useful sanity check)
    r_est = (scale * (R_mat @ s_pts.T)).T + t_vec
    lat_est = lat0 + np.degrees(r_est[:, 1] / R_earth)
    lon_est = lon0 + np.degrees(
        r_est[:, 0] / (R_earth * math.cos(lat0_rad))
    )
    residuals = np.sqrt((lat_est - lats) ** 2 + (lon_est - lons) ** 2)
    rms_deg_error = float(np.sqrt(np.mean(residuals ** 2)))

    return {
        "theta_deg": theta_deg,
        "nw": (lat_NW, lon_NW),
        "se": (lat_SE, lon_SE),
        "scale": scale,
        "rms_deg_error": rms_deg_error,
    }








R_EARTH = 6378137.0  # WGS84

def latlon_to_webmerc(lat_deg, lon_deg):
    lat = math.radians(lat_deg)
    lon = math.radians(lon_deg)
    x = R_EARTH * lon
    y = R_EARTH * math.log(math.tan(math.pi/4 + lat/2))
    return x, y

def webmerc_to_latlon(x, y):
    lon = x / R_EARTH
    lat = 2 * math.atan(math.exp(y / R_EARTH)) - math.pi/2
    return math.degrees(lat), math.degrees(lon)


"""This endpoint uses a DIFFERENT novel way of calculating the rotation and position of the overlay based on
   three sets of matching pixel and geo coordinates"""
def georeference_three_points_webmerc(image_coords, real_coords, overlay_width, overlay_height):
    """
    image_coords: list of 3 (x, y) pixel coords in the EXACT image Leaflet will draw (bordered etc.), y down.
    real_coords:  list of 3 (lat, lon) WGS84 coords for those pixels.
    overlay_width, overlay_height: dimensions of that same image in pixels.

    Returns: dict with nw_coords, se_coords, rotation_deg, rmse_meters, ...
    """

    # --- 1) Prepare numpy arrays ---
    img = np.array(image_coords, dtype=float)       # (3,2)
    lats = np.array([lat for (lat, lon) in real_coords], dtype=float)
    lons = np.array([lon for (lat, lon) in real_coords], dtype=float)

    # Convert y to "up" for the math
    img_yup = img.copy()
    img_yup[:, 1] = -img_yup[:, 1]

    # --- 2) Lat/lon -> Web Mercator (Leaflet's CRS) ---
    wx, wy = [], []
    for lat, lon in zip(lats, lons):
        x, y = latlon_to_webmerc(lat, lon)
        wx.append(x)
        wy.append(y)
    world = np.stack([wx, wy], axis=1)  # (3,2)

    # --- 3) Solve similarity transform w = s * R * p + t ---
    src = img_yup
    dst = world
    n = src.shape[0]

    mu_src = src.mean(axis=0)
    mu_dst = dst.mean(axis=0)
    src_c = src - mu_src
    dst_c = dst - mu_dst

    var_src = (src_c**2).sum() / n
    Sigma = (dst_c.T @ src_c) / n

    U, D, Vt = np.linalg.svd(Sigma)
    S = np.eye(2)
    if np.linalg.det(U) * np.linalg.det(Vt) < 0:
        S[-1, -1] = -1

    Rmat = U @ S @ Vt
    s = np.trace(np.diag(D) @ S) / var_src
    t = mu_dst - s * (Rmat @ mu_src)

    # --- 4) RMS reprojection error in meters (in Web Mercator) ---
    world_pred = (s * (Rmat @ src.T)).T + t
    residuals = world - world_pred
    rmse_m = math.sqrt((residuals**2).sum() / n)

    # --- 5) Map corners of this image in y-up pixels ---
    W = float(overlay_width)
    H = float(overlay_height)
    p_nw = np.array([0.0, 0.0])
    p_se = np.array([W, -H])

    w_nw = s * (Rmat @ p_nw) + t
    w_se = s * (Rmat @ p_se) + t

    # --- 6) Back to lat/lon for Leaflet bounds ---
    lat_nw, lon_nw = webmerc_to_latlon(w_nw[0], w_nw[1])
    lat_se, lon_se = webmerc_to_latlon(w_se[0], w_se[1])

    # --- 7) Rotation angle (diagnostic) ---
    theta_rad = math.atan2(Rmat[1, 0], Rmat[0, 0])
    theta_deg = theta_rad * 180.0 / math.pi

    return {
        "nw_coords": (lat_nw, lon_nw),
        "se_coords": (lat_se, lon_se),
        "rotation_deg": theta_deg,
        "rmse_meters": rmse_m,
        "selected_pixel_coords": image_coords,
        "selected_realworld_coords": real_coords,
        "overlay_width": overlay_width,
        "overlay_height": overlay_height,
    }