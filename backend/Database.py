import sqlite3
import json

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
            map_filename TEXT,
            mapfile_original BLOB,
            mapfile_rotated BLOB
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
            map_filename, mapfile_original, mapfile_rotated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    item['map_filename'],
                    None,  # Placeholder for mapfile_original
                    None   # Placeholder for mapfile_rotated
                ))
        self.connection.commit()

    def insert_map(self, map_data):
        insert_sql = '''
        INSERT INTO maps (
            map_name, nw_coords_lat, nw_coords_lon, 
            se_coords_lat, se_coords_lon, 
            optimal_rotation_angle, 
            map_filename, mapfile_original, mapfile_rotated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        '''
        self.cursor.execute('SELECT 1 FROM maps WHERE map_name = ?', (map_data['map_name'],))
        if self.cursor.fetchone() is None:
            self.cursor.execute(insert_sql, (
                map_data['map_name'],
                map_data['nw_coords'][0], map_data['nw_coords'][1],
                map_data['se_coords'][0], map_data['se_coords'][1],
                map_data['optimal_rotation_angle'],
                map_data['map_filename'],
                None,  # Placeholder for mapfile_original
                None   # Placeholder for mapfile_rotated
            ))
            self.connection.commit()

    def list_maps(self):
        self.cursor.execute('SELECT * FROM maps')
        rows = self.cursor.fetchall()
        maps = []
        for row in rows:
            map_name, nw_lat, nw_lon, se_lat, se_lon, angle, filename, _, _ = row
            maps.append({
                "map_name": map_name,
                "nw_coords": [nw_lat, nw_lon],
                "se_coords": [se_lat, se_lon],
                "optimal_rotation_angle": angle,
                "map_filename": filename
            })
        return maps

    def print_all_maps(self):
        self.cursor.execute('SELECT * FROM maps')
        rows = self.cursor.fetchall()
        for row in rows:
            map_name, nw_lat, nw_lon, se_lat, se_lon, angle, filename, _, _ = row
            print(f"Map Name: {map_name}")
            print(f"  NW Coordinates: ({nw_lat}, {nw_lon})")
            print(f"  SE Coordinates: ({se_lat}, {se_lon})")
            print(f"  Optimal Rotation Angle: {angle}")
            print(f"  Filename: {filename}")
            print()


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
