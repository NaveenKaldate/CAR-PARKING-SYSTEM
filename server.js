const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();

// ================= CONFIG =================
const PORT = 5000;
const MAX_SLOTS = 10;
const RATE_PER_HOUR = 20; // ₹ per hour

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ================= HELPER FUNCTIONS =================

// Get current IST time in "YYYY-MM-DD HH:MM:SS" format
function getCurrentISTTime() {
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const year = ist.getFullYear();
  const month = String(ist.getMonth() + 1).padStart(2, "0");
  const day = String(ist.getDate()).padStart(2, "0");
  const hours = String(ist.getHours()).padStart(2, "0");
  const minutes = String(ist.getMinutes()).padStart(2, "0");
  const seconds = String(ist.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Calculate parking fee based on duration
function calculateFee(entryTime, exitTime) {
  const entry = new Date(entryTime);
  const exit = new Date(exitTime);

  const durationMs = exit - entry;
  const durationHours = Math.ceil(durationMs / (1000 * 60 * 60)) || 1;

  return {
    durationHours,
    fee: durationHours * RATE_PER_HOUR,
  };
}

// ================= DATABASE =================
const db = new sqlite3.Database("./parking.db", (err) => {
  if (err) console.error("Database Error:", err.message);
  else console.log("Connected to SQLite DB ✅");
});

// Ensure required columns exist
db.serialize(() => {
  // Create table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_number TEXT NOT NULL,
      entry_time TEXT NOT NULL
    )
  `);

  // Add exit_time column if missing
  db.run(`ALTER TABLE cars ADD COLUMN exit_time TEXT`, (err) => {
    if (err && !err.message.includes("duplicate column name")) {
      console.error("Error adding exit_time column:", err.message);
    } else {
      console.log("Column 'exit_time' is ready ✅");
    }
  });

  // Add fee column if missing
  db.run(`ALTER TABLE cars ADD COLUMN fee INTEGER`, (err) => {
    if (err && !err.message.includes("duplicate column name")) {
      console.error("Error adding fee column:", err.message);
    } else {
      console.log("Column 'fee' is ready ✅");
    }
  });
});

// Create table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    car_number TEXT NOT NULL,
    entry_time TEXT NOT NULL,
    exit_time TEXT,
    fee INTEGER
  )
`);
db.run(
  `UPDATE cars
   SET exit_time = NULL
   WHERE exit_time = '' OR exit_time = 'Still Parked'`,
  function (err) {
    if (err) {
      console.error("Error updating exit_time:", err.message);
    } else {
      console.log("Database cleaned: exit_time values set to NULL");
    }
  }
);

// ================= ROUTES =================

// Home Route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🚗 Park Car
app.post("/park", (req, res) => {
  console.log("Request Body:", req.body);

  const { car_number } = req.body;

  if (!car_number || car_number.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Car number is required!",
    });
  }

  // Check available slots
  db.get(
    "SELECT COUNT(*) AS count FROM cars WHERE exit_time IS NULL",
    [],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Database error while checking slots.",
        });
      }

      if (row.count >= MAX_SLOTS) {
        return res.json({
          success: false,
          message: "Parking Full!",
        });
      }

      const entryTime = getCurrentISTTime();

      db.run(
        "INSERT INTO cars (car_number, entry_time) VALUES (?, ?)",
        [car_number.trim(), entryTime],
        function (err) {
          if (err) {
            return res.status(500).json({
              success: false,
              message: "Failed to park the car.",
            });
          }

          res.json({
            success: true,
            message: "Car Parked Successfully!",
            id: this.lastID,
            entry_time: entryTime,
          });
        }
      );
    }
  );
});

// 🚙 Exit Car with Fee Calculation
app.post("/exit", (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Car ID is required!",
    });
  }

  db.get(
    "SELECT entry_time FROM cars WHERE id = ? AND exit_time IS NULL",
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Database error.",
        });
      }

      if (!row) {
        return res.status(404).json({
          success: false,
          message: "Car not found or already exited!",
        });
      }

      const exitTime = getCurrentISTTime();
      const { durationHours, fee } = calculateFee(
        row.entry_time,
        exitTime
      );

      db.run(
        "UPDATE cars SET exit_time = ?, fee = ? WHERE id = ?",
        [exitTime, fee, id],
        function (err) {
          if (err) {
            return res.status(500).json({
              success: false,
              message: "Failed to exit car.",
            });
          }

          res.json({
            success: true,
            message: "Car Exited Successfully!",
            exit_time: exitTime,
            duration_hours: durationHours,
            parking_fee: fee,
          });
        }
      );
    }
  );
});

// ✏️ Update Car Number
app.post("/update", (req, res) => {
  const { id, car_number } = req.body;

  if (!id || !car_number) {
    return res.status(400).json({
      success: false,
      message: "ID and Car Number are required.",
    });
  }

  db.run(
    "UPDATE cars SET car_number = ? WHERE id = ?",
    [car_number.trim(), id],
    function (err) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Failed to update car.",
        });
      }

      res.json({
        success: true,
        message: "Car Updated Successfully!",
      });
    }
  );
});

// 📊 Get Currently Parked Cars
// 📊 Get Currently Parked Cars
app.get("/cars", (req, res) => {
  db.all(
    "SELECT * FROM cars WHERE exit_time IS NULL ORDER BY entry_time DESC",
    [],
    (err, rows) => {
      if (err) {
        console.error("Error fetching cars:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// 📊 Full Parking Report
app.get("/report", (req, res) => {
  db.all(
    "SELECT * FROM cars ORDER BY entry_time DESC",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch report.",
        });
      }
      res.json(rows);
    }
  );
});

// 📊 Slot Information
// 📊 Slot Information
app.get("/slots", (req, res) => {
  db.get(
    "SELECT COUNT(*) AS occupied FROM cars WHERE exit_time IS NULL",
    [],
    (err, row) => {
      if (err) {
        console.error("Error fetching slots:", err.message);
        return res.status(500).json({ error: err.message });
      }

      const occupied = row ? row.occupied : 0;
      const available = MAX_SLOTS - occupied;

      res.json({
        total: MAX_SLOTS,
        occupied,
        available,
      });
    }
  );
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});