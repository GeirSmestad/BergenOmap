import sqlite3
import json
import os 

database_file_location = '../data/database.db'

class Database:
    def __init__(self, db_name=database_file_location):
        self.connection = sqlite3.connect(db_name)
        self.cursor = self.connection.cursor()

    def create_table(self):
        create_table_sql = '''
        CREATE TABLE IF NOT EXISTS maps (
            map_name TEXT PRIMARY KEY,
            nw_coords_lat REAL,
            nw_coords_lon REAL,
            se_coords_lat REAL,
            se_coords_lon REAL,
            optimal_rotation_angle REAL,
            overlay_width INTEGER,
            overlay_height INTEGER,
            attribution TEXT,
            selected_pixel_coords TEXT,
            selected_realworld_coords TEXT,
            map_filename TEXT,
            map_area TEXT,
            map_event TEXT,
            map_date TEXT,
            map_course TEXT,
            map_club TEXT,
            map_course_planner TEXT,
            map_attribution TEXT,
            mapfile_original BLOB,
            mapfile_final BLOB
        )
        '''
        self.cursor.execute(create_table_sql)
        self.connection.commit()

    def insert_data(self, data):
        insert_sql = '''
        INSERT INTO maps (
            map_name, nw_coords_lat, nw_coords_lon, 
            se_coords_lat, se_coords_lon, 
            optimal_rotation_angle, 
            overlay_width, overlay_height, 
            attribution, selected_pixel_coords, selected_realworld_coords, 
            map_filename, map_area, map_event, map_date, map_course,
            map_club, map_course_planner, map_attribution,
            mapfile_original, mapfile_final
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        '''
        for item in data:
            # Check if the record already exists
            self.cursor.execute('SELECT 1 FROM maps WHERE map_name = ?', (item['map_name'],))
            if self.cursor.fetchone() is None:
                # Record does not exist, insert new record
                self.cursor.execute(insert_sql, (
                    item['map_name'],
                    item['nw_coords'][0], item['nw_coords'][1],
                    item['se_coords'][0], item['se_coords'][1],
                    item['optimal_rotation_angle'],
                    item.get('overlay_width', ''), item.get('overlay_height', ''),
                    item.get('attribution', ''),
                    json.dumps(item.get('selected_pixel_coords', '')),
                    json.dumps(item.get('selected_realworld_coords', '')),
                    item['map_filename'],
                    item.get('map_area', ''),
                    item.get('map_event', ''),
                    item.get('map_date', ''),
                    item.get('map_course', ''),
                    item.get('map_club', ''),
                    item.get('map_course_planner', ''),
                    item.get('map_attribution', ''),
                    None,  # Placeholder for mapfile_original
                    None   # Placeholder for mapfile_final
                ))
        self.connection.commit()

    def insert_map(self, map_data):

        nw_lat = round(map_data['nw_coords'][0], 6)
        nw_lon = round(map_data['nw_coords'][1], 6)
        se_lat = round(map_data['se_coords'][0], 6)
        se_lon = round(map_data['se_coords'][1], 6)
        angle = round(map_data['optimal_rotation_angle'], 2)

        insert_or_replace_sql = '''
            INSERT OR REPLACE INTO maps (
                map_name, 
                nw_coords_lat, nw_coords_lon, 
                se_coords_lat, se_coords_lon, 
                optimal_rotation_angle, 
                overlay_width, overlay_height, 
                attribution, 
                selected_pixel_coords, selected_realworld_coords, 
                map_filename,
                map_area,
                map_event,
                map_date,
                map_course,
                map_club,
                map_course_planner,
                map_attribution
                )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            '''
        self.cursor.execute(insert_or_replace_sql, (
            map_data['map_name'],
            nw_lat, nw_lon,
            se_lat, se_lon,
            angle,
            map_data['overlay_width'], map_data['overlay_height'],
            map_data['attribution'],
            json.dumps([[int(x), int(y)] for (x, y) in map_data['selected_pixel_coords']]),
            json.dumps([[round(lat, 6), round(lon, 6)] for (lat, lon) in map_data['selected_realworld_coords']]),
            map_data['map_filename'],
            map_data.get('map_area', ''),
            map_data.get('map_event', ''),
            map_data.get('map_date', ''),
            map_data.get('map_course', ''),
            map_data.get('map_club', ''),
            map_data.get('map_course_planner', ''),
            map_data.get('map_attribution', '')
        ))
        self.connection.commit()


    def list_maps(self):
        self.cursor.execute('SELECT * FROM maps')
        rows = self.cursor.fetchall()
        maps = []
        for row in rows:
            (map_name, nw_lat, nw_lon, se_lat, se_lon, angle, 
            overlay_width, overlay_height, attribution, 
            selected_pixel_coords, selected_realworld_coords, 
            filename, map_area, map_event, map_date, map_course,
            map_club, map_course_planner, map_attribution,
            _, _) = row
            maps.append({
                "map_name": map_name,
                "nw_coords": [nw_lat, nw_lon],
                "se_coords": [se_lat, se_lon],
                "optimal_rotation_angle": angle,
                "overlay_width": overlay_width,
                "overlay_height": overlay_height,
                "attribution": attribution,
                "selected_pixel_coords": json.loads(selected_pixel_coords),
                "selected_realworld_coords": json.loads(selected_realworld_coords),
                "map_filename": filename,
                "map_area": map_area,
                "map_event": map_event,
                "map_date": map_date,
                "map_course": map_course,
                "map_club": map_club,
                "map_course_planner": map_course_planner,
                "map_attribution": map_attribution
            })
        return maps
    
    def insert_mapfile_original(self, map_name, mapfile_original):
        insert_sql = '''
        UPDATE maps 
        SET mapfile_original = ?
        WHERE map_name = ?
        '''
        self.cursor.execute(insert_sql, (mapfile_original, map_name))
        self.connection.commit()

    def insert_mapfile_final(self, map_name, mapfile_final):
        insert_sql = '''
        UPDATE maps 
        SET mapfile_final = ?
        WHERE map_name = ?
        '''
        self.cursor.execute(insert_sql, (mapfile_final, map_name))
        self.connection.commit()

    def get_mapfile_original(self, map_name):
        select_sql = '''
        SELECT mapfile_original 
        FROM maps 
        WHERE map_name = ?
        '''
        self.cursor.execute(select_sql, (map_name,))
        result = self.cursor.fetchone()
        return result[0] if result else None

    def get_mapfile_final(self, map_name):
        select_sql = '''
        SELECT mapfile_final 
        FROM maps 
        WHERE map_name = ?
        '''
        self.cursor.execute(select_sql, (map_name,))
        result = self.cursor.fetchone()
        return result[0] if result else None

    def output_map_data_to_disk(self, js_output_dir, final_maps_output_dir, original_maps_output_dir, include_original=False, overwrite=False):
        # Ensure the output directories exist
        os.makedirs(js_output_dir, exist_ok=True)
        os.makedirs(final_maps_output_dir, exist_ok=True)
        if include_original:
            os.makedirs(original_maps_output_dir, exist_ok=True)
        
        # Fetch map data
        maps = self.list_maps()
        
        # Prepare the data for the JSON file
        map_definitions = []
        for map_entry in maps:
            if map_entry["map_name"] == '':
                continue

            map_def = {
                "nw_coords": map_entry["nw_coords"],
                "se_coords": map_entry["se_coords"],
                "map_name": map_entry["map_name"],
                "map_filename": map_entry["map_filename"],
                "attribution": map_entry["attribution"],
                "map_area": map_entry["map_area"],
                "map_event": map_entry["map_event"],
                "map_date": map_entry["map_date"],
                "map_course": map_entry["map_course"],
                "map_club": map_entry["map_club"],
                "map_course_planner": map_entry["map_course_planner"],
                "map_attribution": map_entry["map_attribution"]
            }
            map_definitions.append(map_def)
            
            # Write the final map image
            final_image_blob = self.get_mapfile_final(map_entry["map_name"])
            final_image_filename = os.path.join(final_maps_output_dir, map_entry["map_filename"])

            if (final_image_blob is not None) and (overwrite or not os.path.exists(final_image_filename)):
                with open(final_image_filename, 'wb') as f:
                    f.write(final_image_blob)
            
            # Optionally write the original map image
            if include_original:
                original_image_blob = self.get_mapfile_original(map_entry["map_name"])
                if original_image_blob:
                    original_image_filename = os.path.join(original_maps_output_dir, f"Original_{map_entry['map_filename']}")
                    if overwrite or not os.path.exists(original_image_filename):
                        with open(original_image_filename, 'wb') as f:
                            f.write(original_image_blob)
    
        # Write the map definitions to a JS file
        map_definitions_js = "const mapDefinitions = " + json.dumps(map_definitions, indent=2, ensure_ascii=False) + ";"
        js_filepath = os.path.join(js_output_dir, 'mapDefinitions.js')
        
        with open(js_filepath, 'w', encoding='utf-8') as f:
            f.write(map_definitions_js)

    def print_all_maps(self):
        self.cursor.execute('SELECT * FROM maps')
        rows = self.cursor.fetchall()
        for row in rows:
            (map_name, nw_lat, nw_lon, se_lat, se_lon, angle, 
            overlay_width, overlay_height, attribution, 
            selected_pixel_coords, selected_realworld_coords, 
            filename, map_area, map_event, map_date, map_course,
            map_club, map_course_planner, map_attribution,
            _, _) = row
            print(f"Map Name: {map_name}")
            print(f"  NW Coordinates: ({nw_lat}, {nw_lon})")
            print(f"  SE Coordinates: ({se_lat}, {se_lon})")
            print(f"  Optimal Rotation Angle: {angle}")
            print(f"  Overlay Width: {overlay_width}")
            print(f"  Overlay Height: {overlay_height}")
            print(f"  Attribution: {attribution}")
            print(f"  Metadata: area={map_area}, event={map_event}, date={map_date}, course={map_course}, club={map_club}, planner={map_course_planner}, map_attr={map_attribution}")
            print(f"  Selected Pixel Coordinates: {json.loads(selected_pixel_coords)}")
            print(f"  Selected Realworld Coordinates: {json.loads(selected_realworld_coords)}")
            print(f"  Filename: {filename}")
            print()
    
    """Helper method to load maps from disk into existing map entry"""
    def insert_mapfile_original_from_local_file(self, map_name, filename):
        with open(filename, 'rb') as file:
            mapfile_original = file.read()
            self.insert_mapfile_original(map_name, mapfile_original)

    """Helper method to load maps from disk into existing map entry"""
    def insert_mapfile_final_from_local_file(self, map_name, filename):
        with open(filename, 'rb') as file:
            mapfile_final = file.read()
            self.insert_mapfile_final(map_name, mapfile_final)

    def setup_database(self, json_data):
        self.create_table()
        self.insert_data(json_data)

    def open(self):
        self.connection = sqlite3.connect(self.db_name)
        self.cursor = self.connection.cursor()

    def close(self):
        self.connection.close()

"""Helper method; can be deleted if you don't want it."""
def pretty_format_maps(maps):
    for map in maps:
        print(f"Map Name: {map['map_name']}")
        print(f"  NW Coordinates: ({map['nw_coords'][0]}, {map['nw_coords'][1]})")
        print(f"  SE Coordinates: ({map['se_coords'][0]}, {map['se_coords'][1]})")
        print(f"  Optimal Rotation Angle: {map['optimal_rotation_angle']}")
        print(f"  Overlay Width: {map['overlay_width']}")
        print(f"  Overlay Height: {map['overlay_height']}")
        
        attribution_lines = map['attribution'].split('\n')
        print(f"  Attribution: {attribution_lines[0]}")
        for line in attribution_lines[1:]:
            print(f"               {line}")
        
        metadata_summary = ", ".join([
            f"area={map.get('map_area', '')}",
            f"event={map.get('map_event', '')}",
            f"date={map.get('map_date', '')}",
            f"course={map.get('map_course', '')}",
            f"club={map.get('map_club', '')}",
            f"planner={map.get('map_course_planner', '')}",
            f"map_attr={map.get('map_attribution', '')}"
        ])
        print(f"  Metadata: {metadata_summary}")
        
        print(f"  Selected Pixel Coordinates: {map['selected_pixel_coords']}")
        print(f"  Selected Realworld Coordinates: {map['selected_realworld_coords']}")
        print(f"  Filename: {map['map_filename']}")
        print()

if __name__ == '__main__':
    from MapDefinitions import map_definitions

    db = Database()

    print()
    print("Loading initial database from map definitions. Records will not be overwritten if they already exist.")
    print()
    
    db.setup_database(map_definitions)

    print("Maps loaded, outputting maps table to console for testing purposes.")
    print()

    all_maps = db.list_maps()
    pretty_format_maps(all_maps)

    # db.close()
