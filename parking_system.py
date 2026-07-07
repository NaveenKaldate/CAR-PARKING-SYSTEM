import sqlite3
from datetime import datetime

def connect_db():
    return sqlite3.connect("parking.db")

def vehicle_entry():
    vno = input("Enter Vehicle Number: ")
    name = input("Enter Owner Name: ")
    time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = connect_db()
    cur = conn.cursor()
    cur.execute("INSERT INTO parking(vehicle_no, owner_name, entry_time) VALUES (?,?,?)",
                (vno, name, time))
    conn.commit()
    conn.close()
    print("Vehicle Parked Successfully!\n")

def view_vehicles():
    conn = connect_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM parking WHERE exit_time IS NULL")
    rows = cur.fetchall()

    print("\nCurrently Parked Vehicles:")
    for row in rows:
        print(row)
    conn.close()
    print()

def vehicle_exit():
    vno = input("Enter Vehicle Number: ")
    exit_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    charge = 50

    conn = connect_db()
    cur = conn.cursor()
    cur.execute("""
        UPDATE parking 
        SET exit_time=?, charges=? 
        WHERE vehicle_no=? AND exit_time IS NULL
    """, (exit_time, charge, vno))

    if cur.rowcount > 0:
        print("Vehicle Exit Successful!")
        print("Parking Charges: ₹", charge)
    else:
        print("Vehicle not found!")

    conn.commit()
    conn.close()
    print()

while True:
    print("---- CAR PARKING MANAGEMENT ----")
    print("1. Vehicle Entry")
    print("2. View Parked Vehicles")
    print("3. Vehicle Exit")
    print("4. Exit")

    choice = input("Enter choice: ")

    if choice == "1":
        vehicle_entry()
    elif choice == "2":
        view_vehicles()
    elif choice == "3":
        vehicle_exit()
    elif choice == "4":
        print("Thank You!")
        break
    else:
        print("Invalid Choice!\n")
