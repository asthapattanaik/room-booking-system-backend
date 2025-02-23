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

function calculateTravelTime(rooms) {
  let totalTime = 0;
  for (const room of rooms) {
    const horizontalTime = room.roomNumber % 100;
    const verticalTime = (room.floorNumber - 1) * 2;
    totalTime += horizontalTime + verticalTime;
  }
  return totalTime;
}

function findBestRooms(floorMap, numRooms) {
  let bestChoice = null;
  let minTravelTime = Infinity;

  for (let [floor, rooms] of floorMap.entries()) {
    if (rooms.length < numRooms) continue;

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

async function generateRandomOccupancy() {
  // Clear all previous bookings first
  await updateRoomStatus((await getAllRooms()).map((r) => r.id), false);

  // Get updated available rooms
  const availableRooms = (await getAllRooms()).filter(room => !room.isBooked);

  if (availableRooms.length === 0) {
    return { message: "No available rooms to book." };
  }

  // Select random number of rooms (between 1 and available count)
  let numRoomsToBook = Math.floor(Math.random() * Math.min(97, availableRooms.length)) + 1;

  // Shuffle and pick random rooms
  const shuffledRooms = availableRooms.sort(() => Math.random() - 0.5);
  const selectedRooms = shuffledRooms.slice(0, numRoomsToBook);

  // Book the selected rooms
  await updateRoomStatus(selectedRooms.map(room => room.id), true);

  return {
    message: `Randomly booked ${numRoomsToBook} rooms.`,
    bookedRooms: selectedRooms,
  };
}


// exports.bookRooms = async (req, res) => {
//   const { numRooms } = req.body;
//   if (numRooms < 1 || numRooms > 5) {
//     return res.status(400).json({ error: "Invalid number of rooms. Must be between 1 and 5." });
//   }

//   const floorMap = await getAvailableRooms();
//   console.log("Available rooms per floor:", [...floorMap.entries()]);

//   const bestRooms = findBestRooms(floorMap, numRooms);
//   if (!bestRooms) return res.status(400).json({ error: "No suitable rooms available" });

//   await updateRoomStatus(bestRooms.map((r) => r.id), true);
//   return res.json({ message: "Rooms booked successfully", rooms: bestRooms });
// };

exports.bookRooms = async (req, res) => {
  const { numRooms } = req.body;
  if (numRooms < 1 || numRooms > 5) {
    return res.status(400).json({ error: "Invalid number of rooms. Must be between 1 and 5." });
  }

  // Fetch updated room availability **AFTER** random occupancy
  const floorMap = await getAvailableRooms(); 
  console.log("Updated available rooms per floor:", [...floorMap.entries()]);

  const bestRooms = findBestRooms(floorMap, numRooms);
  if (!bestRooms) return res.status(400).json({ error: "No suitable rooms available" });

  // Double-check if rooms are still available before booking
  const refreshedRooms = (await getAllRooms()).filter(room => !room.isBooked);
  const stillAvailable = bestRooms.every(room => refreshedRooms.some(r => r.id === room.id));

  if (!stillAvailable) {
    return res.status(400).json({ error: "Some selected rooms were booked in the meantime. Try again." });
  }

  await updateRoomStatus(bestRooms.map((r) => r.id), true);
  return res.json({ message: "Rooms booked successfully", rooms: bestRooms });
};


exports.getBookings = async (req, res) => {
  const rooms = await getAllRooms();
  res.json(rooms.filter((room) => room.isBooked));
};

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