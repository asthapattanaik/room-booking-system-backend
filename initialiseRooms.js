const db = require("./firebase");

async function resetAndInitializeRooms() {
  const roomsCollection = db.collection("rooms");

  const snapshot = await roomsCollection.get();
  const batchDelete = db.batch();

  snapshot.forEach((doc) => {
    batchDelete.delete(doc.ref);
  });

  await batchDelete.commit();
  console.log("All existing rooms deleted!");

  const rooms = [];
  for (let floor = 1; floor <= 9; floor++) {
    for (let i = 1; i <= 10; i++) {
      rooms.push({ roomNumber: floor * 100 + i, floorNumber: floor, isBooked: false });
    }
  }
  for (let i = 1; i <= 7; i++) {
    rooms.push({ roomNumber: 1000 + i, floorNumber: 10, isBooked: false });
  }

  const batch = db.batch();
  rooms.forEach((room) => {
    const docRef = roomsCollection.doc();
    batch.set(docRef, room);
  });

  await batch.commit();
  console.log("All rooms reinitialized successfully!");
  process.exit();
}

resetAndInitializeRooms().catch((error) => {
  console.error("Error resetting rooms:", error);
  process.exit(1);
});
