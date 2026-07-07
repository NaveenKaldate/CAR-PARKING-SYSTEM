import sqlite3

conn = sqlite3.connect("parking.db")
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS parking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_no TEXT,
    owner_name TEXT,
    entry_time TEXT,
    exit_time TEXT,
    charges INTEGER
)
""")

conn.commit()
conn.close()

print("Database and table created successfully!")
