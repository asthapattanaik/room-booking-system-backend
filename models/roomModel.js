const db = require("../firebase");

const ROOMS_COLLECTION = "rooms";

// Fetch all rooms
async function getAllRooms() {
  const snapshot = await db.collection(ROOMS_COLLECTION).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Update room booking status
async function updateRoomStatus(roomIds, status) {
  const batch = db.batch();
  roomIds.forEach((roomId) => {
    const roomRef = db.collection(ROOMS_COLLECTION).doc(roomId);
    batch.update(roomRef, { isBooked: status });
  });
  await batch.commit();
}

module.exports = { getAllRooms, updateRoomStatus };
