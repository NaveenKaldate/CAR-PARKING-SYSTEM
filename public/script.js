// 🚗 Park Car
async function parkCar() {
  const car = document.getElementById("carNumber").value.trim();

  if (!car) {
    alert("Enter car number!");
    return;
  }

  try {
    const res = await fetch('/park', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ car_number: car })
    });

    const data = await res.json();
    alert(data.message || "Unexpected server response.");

    if (data.success) {
      document.getElementById("carNumber").value = "";
      loadCars();
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Server error. Please try again.");
  }
}

// 🚙 Exit Car
async function exitCar(id) {
  const res = await fetch('/exit', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });

  const data = await res.json();
  alert(data.message);
  loadCars();
}

// ✏️ Update Car
async function updateCar(id) {
  const newNumber = prompt("Enter new car number:");

  if (!newNumber) return;

  const res = await fetch('/update', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, car_number: newNumber })
  });

  const data = await res.json();
  alert(data.message);
  loadCars();
}

// 📊 Load Parked Cars
async function loadCars() {
  try {
    const res = await fetch('/cars');
    const data = await res.json();

    const list = document.getElementById("list");
    list.innerHTML = "";

    if (data.length === 0) {
      list.innerHTML = "<li>No cars currently parked.</li>";
    } else {
      data.forEach(car => {
        const li = document.createElement("li");
        li.innerHTML = `
          ${car.car_number} (ID: ${car.id}) - Entry: ${car.entry_time}
          <button onclick="updateCar(${car.id})">Update</button>
          <button onclick="exitCar(${car.id})">Exit</button>
        `;
        list.appendChild(li);
      });
    }

    loadSlots();
  } catch (error) {
    console.error("Error loading cars:", error);
  }
}

// Updated Load Slots
async function loadSlots() {
  try {
    const res = await fetch('/slots');
    const data = await res.json();

    document.getElementById("slots").innerText =
      `Total: ${data.total} | Occupied: ${data.occupied} | Available: ${data.available}`;
  } catch (error) {
    console.error("Error loading slots:", error);
    document.getElementById("slots").innerText = "Unable to load slot information.";
  }
}

// 📊 Load Report
async function loadReport() {
  const res = await fetch('/report');
  const data = await res.json();

  const list = document.getElementById("reportList");
  list.innerHTML = "";

  data.forEach(car => {
    const li = document.createElement("li");
    li.innerText = `${car.car_number} | Entry: ${car.entry_time} | Exit: ${car.exit_time || "Still Parked"} | Fee: ₹${car.fee || 0}`;
    list.appendChild(li);
  });
}

// Load data on page start
loadCars();