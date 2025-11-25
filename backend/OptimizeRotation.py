import numpy as np
import math
from scipy.optimize import minimize_scalar

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
    - Receive original orienterring map overlay
    - Receive control points that have been registered on a version of this overlay that is padded with extra margins
    - Use least-squares similarity (Procrustes) registration to find optimal rotation to geographic north
    - Pad the orienteering map overlay with transparent margins, then rotate it (discarding overflowing pixels)
    - Use least-squares to find the best fit for north-west corner and scale factors matching control points
    - Return the required lat/lon of the north-western and south-eastern corner of the overlay to match this fit
    """

    similarity_transform = compute_procrustes_registration(overlayWidth, overlayHeight, image_coords, real_coords)
    optimal_angle = similarity_transform["optimal_rotation_angle"] # The rotation is correct with ChatGPT's also, but nothing else

    # Calculate the correct coordinates of overlay corners    
    optimal_overlay_boundaries = rotateAndRegisterOverlay(image_coords, real_coords, optimal_angle, overlayWidth, overlayHeight)
    
    result = {"nw_coords" : optimal_overlay_boundaries["nw_coords"], 
              "se_coords" : optimal_overlay_boundaries["se_coords"], 
              "optimal_rotation_angle" : optimal_angle,
              "selected_pixel_coords": image_coords,
              "selected_realworld_coords": real_coords,
              "overlay_width": overlayWidth,
              "overlay_height": overlayHeight,
              "least_squares_error": optimal_overlay_boundaries["error"]
              }

    return result

"""Given three sets of pixel coordinates on an orienteering map overlay
   [(x1, y1), (x2, y2), (x3, y3)]

   and three sets of real-world (lat, lon) coordinates matching their location
   [(lat1, lon1), (lat2, lon2), (lat3, lon3)],

   and an angle of counter-clockwise rotation,

   find the best rotation to geographic north, then register the pixel coordinates onto
   real-world coordinates by least-squares fitting the north-western corner and the scale
   factors of latitude and longitude required to make the control points fit.

   Return the northwest and southeast (lat, lon) coordinates of this registration,
   and the error.
"""
def rotateAndRegisterOverlay(image_coords, real_coords, angle_degrees, overlayWidth, overlayHeight):
    # 1. Rotate control points
    pointsAfterRotating = rotate_points(image_coords, overlayWidth, overlayHeight, angle_degrees)

    # Extract arrays for LS fit
    xs = np.array([p[0] for p in pointsAfterRotating], dtype=float)
    ys = np.array([p[1] for p in pointsAfterRotating], dtype=float)
    lats = np.array([p[0] for p in real_coords], dtype=float)
    lons = np.array([p[1] for p in real_coords], dtype=float)

    # 2. Fit lat = a + b * y  (a = lat_nw, b = scale_lat)
    y_mean = ys.mean()
    lat_mean = lats.mean()
    denom_y = np.sum((ys - y_mean) ** 2)
    if denom_y == 0:
        raise ValueError("Cannot determine vertical scale: all y are equal")

    scale_lat = np.sum((ys - y_mean) * (lats - lat_mean)) / denom_y
    lat_nw = lat_mean - scale_lat * y_mean

    # 3. Fit lon = c + d * x  (c = lon_nw, d = scale_lon)
    x_mean = xs.mean()
    lon_mean = lons.mean()
    denom_x = np.sum((xs - x_mean) ** 2)
    if denom_x == 0:
        raise ValueError("Cannot determine horizontal scale: all x are equal")

    scale_lon = np.sum((xs - x_mean) * (lons - lon_mean)) / denom_x
    lon_nw = lon_mean - scale_lon * x_mean

    # 4. Compute overlay corners from NW + scales
    nw = (lat_nw, lon_nw)
    se = (
        lat_nw + overlayHeight * scale_lat,
        lon_nw + overlayWidth * scale_lon,
    )

    # 5. Compute error: how well do we hit the three control points?
    #    (using squared Euclidean in lat/lon space)
    errors_sq = []
    for xi, yi, (lat_true, lon_true) in zip(xs, ys, real_coords):
        lat_pred = lat_nw + yi * scale_lat
        lon_pred = lon_nw + xi * scale_lon
        err = euclidean_distance((lat_pred, lon_pred), (lat_true, lon_true))
        errors_sq.append(err ** 2)

    # Mean squared error
    error = sum(errors_sq) / len(errors_sq)

    result = {"nw_coords": nw, "se_coords": se, "error": error}
    return result


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


"""Calculate rotation and geographical corners of map overlay, using Least-squares
   similarity (Procrustes) registration on a local equirectangular map.
   
   Note that this does not fit well with Leaflet's model for drawing image overlays
   on its Mercator projection, but it does get the rotation right."""
def compute_procrustes_registration(width, height, pixel_points, geo_points):
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
        "optimal_rotation_angle": theta_deg,
        "nw_coords": (lat_NW, lon_NW),
        "se_coords": (lat_SE, lon_SE),
        "scale": scale,
        "rms_deg_error": rms_deg_error,
    }
