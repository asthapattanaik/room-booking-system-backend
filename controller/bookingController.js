const { getAllRooms, updateRoomStatus } = require("../models/roomModel");

async function getAvailableRooms() {
  const rooms = await getAllRooms();
  const floorMap = new Map();

  rooms.filter((room) => !room.isBooked).forEach((room) => {
    if (!floorMap.has(room.floorNumber)) {
      floorMap.set(room.floorNumber, []);
    }
    floorMap.get(room.floorNumber).push(room);
  });

  for (let rooms of floorMap.values()) {
    rooms.sort((a, b) => a.roomNumber - b.roomNumber);
  }

  return floorMap;
}

// Calculates the total travel time for a given set of rooms.
function calculateTravelTime(rooms) {
  let totalTime = 0;

  for (const room of rooms) {
    const horizontalTime = room.roomNumber % 100; // Room number's last two digits represent its position on the floor
    const verticalTime = (room.floorNumber - 1) * 2; // Each floor transition adds 2 units of time
    totalTime += horizontalTime + verticalTime;
  }

  return totalTime;
}

// Finds the optimal set of rooms for booking that minimizes travel time.
function findBestRooms(floorMap, numRooms) {
  let bestChoice = null;
  let minTravelTime = Infinity;

  // Iterate through each floor
  for (let [floor, rooms] of floorMap.entries()) {
    if (rooms.length < numRooms) continue; // Skip floors with insufficient available rooms

    // Check all possible consecutive room groupings of size numRooms
    for (let i = 0; i <= rooms.length - numRooms; i++) {
      const selectedRooms = rooms.slice(i, i + numRooms);
      const travelTime = calculateTravelTime(selectedRooms);

      // Select the group with the lowest travel time
      if (travelTime < minTravelTime) {
        minTravelTime = travelTime;
        bestChoice = selectedRooms;
      }
    }
  }

  return bestChoice;
}

async function generateRandomOccupancy() {
  // Reset all room bookings before generating new ones
  await updateRoomStatus((await getAllRooms()).map((r) => r.id), false);

  // Fetch the latest list of unbooked rooms
  const availableRooms = (await getAllRooms()).filter(room => !room.isBooked);

  if (availableRooms.length === 0) {
    return { message: "No available rooms to book." };
  }

  // Randomly determine the number of rooms to book (at least 1, at most 97 or available count)
  let numRoomsToBook = Math.floor(Math.random() * Math.min(97, availableRooms.length)) + 1;

  // Shuffle available rooms and pick the first `numRoomsToBook` rooms
  const shuffledRooms = availableRooms.sort(() => Math.random() - 0.5);
  const selectedRooms = shuffledRooms.slice(0, numRoomsToBook);

  await updateRoomStatus(selectedRooms.map(room => room.id), true);

  return {
    message: `Randomly booked ${numRoomsToBook} rooms.`,
    bookedRooms: selectedRooms,
  };
}

// Handles room booking requests.
exports.bookRooms = async (req, res) => {
  const { numRooms } = req.body;

  // Validate request (only 1-5 rooms can be booked at a time)
  if (numRooms < 1 || numRooms > 5) {
    return res.status(400).json({ error: "Invalid number of rooms. Must be between 1 and 5." });
  }

  // Fetch updated room availability
  const floorMap = await getAvailableRooms(); 
  console.log("Updated available rooms per floor:", [...floorMap.entries()]);

  // Find the best possible room selection
  const bestRooms = findBestRooms(floorMap, numRooms);
  if (!bestRooms) {
    return res.status(400).json({ error: "No suitable rooms available" });
  }

  const refreshedRooms = (await getAllRooms()).filter(room => !room.isBooked);
  const stillAvailable = bestRooms.every(room => refreshedRooms.some(r => r.id === room.id));

  if (!stillAvailable) {
    return res.status(400).json({ error: "Some selected rooms were booked in the meantime. Try again." });
  }

  // Mark the selected rooms as booked
  await updateRoomStatus(bestRooms.map((r) => r.id), true);
  return res.json({ message: "Rooms booked successfully", rooms: bestRooms });
};

// Retrieves all currently booked rooms.
exports.getBookings = async (req, res) => {
  const rooms = await getAllRooms();
  res.json(rooms.filter((room) => room.isBooked));
};


// Resets all room bookings, making all rooms available again.
exports.resetBookings = async (req, res) => {
  await updateRoomStatus((await getAllRooms()).map((r) => r.id), false);
  res.json({ message: "All bookings cleared!" });
};

// Generates random room bookings and returns the result.
exports.generateRandomOccupancy = async (req, res) => {
  try {
    const result = await generateRandomOccupancy();
    res.json(result);
  } catch (error) {
    console.error("Error generating random occupancy:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
