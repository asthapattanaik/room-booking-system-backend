const { getAllRooms, updateRoomStatus } = require("../models/roomModel");

// 🔹 Get available rooms grouped by floor
async function getAvailableRooms() {
  const rooms = await getAllRooms();
  const floorMap = new Map();

  rooms.filter((room) => !room.isBooked).forEach((room) => {
    if (!floorMap.has(room.floorNumber)) {
      floorMap.set(room.floorNumber, []);
    }
    floorMap.get(room.floorNumber).push(room);
  });

  // Sort rooms on each floor by **proximity to staircase/lift** (lowest room number first)
  for (let rooms of floorMap.values()) {
    rooms.sort((a, b) => a.roomNumber - b.roomNumber);
  }

  return floorMap;
}

// 🔹 Calculate travel time for a given set of rooms
function calculateTravelTime(rooms) {
  let totalTime = 0;
  for (const room of rooms) {
    const horizontalTime = room.roomNumber % 100; // Distance from staircase
    const verticalTime = (room.floorNumber - 1) * 2; // Each floor change = 2 mins
    totalTime += horizontalTime + verticalTime;
  }
  return totalTime;
}

// 🔹 Find the best room set across floors based on **minimum travel time**
function findBestRooms(floorMap, numRooms) {
  let bestChoice = null;
  let minTravelTime = Infinity;

  for (let [floor, rooms] of floorMap.entries()) {
    if (rooms.length < numRooms) continue; // Skip floors that don't have enough rooms

    for (let i = 0; i <= rooms.length - numRooms; i++) {
      const selectedRooms = rooms.slice(i, i + numRooms);
      const travelTime = calculateTravelTime(selectedRooms);

      if (travelTime < minTravelTime) {
        minTravelTime = travelTime;
        bestChoice = selectedRooms;
      }
    }
  }
  return bestChoice;
}

// 🔹 Function to generate random occupancy
async function generateRandomOccupancy() {
  // 1️⃣ Get all available (unbooked) rooms
  const availableRooms = (await getAllRooms()).filter(room => !room.isBooked);

  if (availableRooms.length === 0) {
      return { message: "No available rooms to book." };
  }

  // 2️⃣ Randomly select a number between 1 and the total available rooms (max 97)
  let numRoomsToBook = Math.floor(Math.random() * Math.min(97, availableRooms.length)) + 1;

  // 3️⃣ Shuffle the available rooms randomly and pick `numRoomsToBook` rooms
  const shuffledRooms = availableRooms.sort(() => Math.random() - 0.5);
  const selectedRooms = shuffledRooms.slice(0, numRoomsToBook);

  // 4️⃣ Book the selected rooms
  await updateRoomStatus(selectedRooms.map(room => room.id), true);

  return {
      message: `Randomly booked ${numRoomsToBook} rooms.`,
      bookedRooms: selectedRooms
  };
}

// 🔹 Booking API
exports.bookRooms = async (req, res) => {
  const { numRooms } = req.body;
  if (numRooms < 1 || numRooms > 5) {
    return res.status(400).json({ error: "Invalid number of rooms. Must be between 1 and 5." });
  }

  const floorMap = await getAvailableRooms();
  console.log("Available rooms per floor:", [...floorMap.entries()]);

  // 🔹 Find the best room set **(prioritizing lower travel time)**
  const bestRooms = findBestRooms(floorMap, numRooms);
  if (!bestRooms) return res.status(400).json({ error: "No suitable rooms available" });

  await updateRoomStatus(bestRooms.map((r) => r.id), true);
  return res.json({ message: "Rooms booked successfully", rooms: bestRooms });
};

// 🔹 Get booked rooms
exports.getBookings = async (req, res) => {
  const rooms = await getAllRooms();
  res.json(rooms.filter((room) => room.isBooked));
};

// 🔹 Reset bookings
exports.resetBookings = async (req, res) => {
  await updateRoomStatus((await getAllRooms()).map((r) => r.id), false);
  res.json({ message: "All bookings cleared!" });
};

exports.generateRandomOccupancy = async (req, res) => {
  try {
      const result = await generateRandomOccupancy();
      res.json(result);
  } catch (error) {
      console.error("Error generating random occupancy:", error);
      res.status(500).json({ error: "Internal server error" });
  }
};