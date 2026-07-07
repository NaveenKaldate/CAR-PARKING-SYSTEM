const express = require("express");
const router = express.Router();
const db = require("../db");

// Function to get current IST time in MySQL DATETIME format
function getCurrentISTTime() {
  const now = new Date();
  const istTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const year = istTime.getFullYear();
  const month = String(istTime.getMonth() + 1).padStart(2, "0");
  const day = String(istTime.getDate()).padStart(2, "0");
  const hours = String(istTime.getHours()).padStart(2, "0");
  const minutes = String(istTime.getMinutes()).padStart(2, "0");
  const seconds = String(istTime.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// ✅ Get all parking records
router.get("/records", (req, res) => {
  db.query("SELECT * FROM PARKING_RECORD", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// ✅ Vehicle Entry Route (PUT THE UPDATED CODE HERE)
router.post("/entry", (req, res) => {
  const { vehicle_no, slot_id } = req.body;

  // Validate input
  if (!vehicle_no || !slot_id) {
    return res
      .status(400)
      .json({ error: "Vehicle number and slot ID are required" });
  }

  // Get current IST time
  const entryTime = getCurrentISTTime();

  // Insert record into database
  db.query(
    "INSERT INTO PARKING_RECORD (VEHICLE_NO, SLOT_ID, ENTRY_TIME) VALUES (?, ?, ?)",
    [vehicle_no, slot_id, entryTime],
    (err, result) => {
      if (err) {
        console.error("DB ERROR:", err);
        return res.status(500).json({ error: err.message });
      }

      // Update slot status to occupied
      db.query(
        "UPDATE PARKING_SLOT SET IS_OCCUPIED = TRUE WHERE SLOT_ID = ?",
        [slot_id]
      );

      res.json({
        message: "Vehicle Entered Successfully",
        entry_time: entryTime,
      });
    }
  );
});

// ✅ Vehicle Exit Route with Fee Calculation
router.put("/exit/:id", (req, res) => {
  const recordId = req.params.id;
  const exitTime = getCurrentISTTime();

  db.query(
    "SELECT ENTRY_TIME, SLOT_ID FROM PARKING_RECORD WHERE RECORD_ID = ?",
    [recordId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(500).json({ error: "Record not found" });
      }

      const entryTime = new Date(results[0].ENTRY_TIME);
      const slotId = results[0].SLOT_ID;
      const exitDate = new Date(exitTime);

      // Calculate duration in hours
      const durationHours = Math.ceil(
        (exitDate - entryTime) / (1000 * 60 * 60)
      );

      const ratePerHour = 20; // ₹20 per hour
      const fee = durationHours * ratePerHour;

      db.query(
        "UPDATE PARKING_RECORD SET EXIT_TIME = ?, FEE = ? WHERE RECORD_ID = ?",
        [exitTime, fee, recordId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Mark slot as free
          db.query(
            "UPDATE PARKING_SLOT SET IS_OCCUPIED = FALSE WHERE SLOT_ID = ?",
            [slotId]
          );

          res.json({
            message: "Vehicle Exited Successfully",
            exit_time: exitTime,
            duration_hours: durationHours,
            fee: fee,
          });
        }
      );
    }
  );
});

module.exports = router;