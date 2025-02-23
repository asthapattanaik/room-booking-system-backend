require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { bookRooms, getBookings, resetBookings, generateRandomOccupancy } = require("./controller/bookingController");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => res.send("Hotel Room Reservation System"));

app.post("/bookRooms", bookRooms);  // API to book the entered number of rooms
app.get("/getBookings", getBookings); // API to get all the bookings
app.delete("/resetBookings", resetBookings); // API to delete existing bookings
app.get("/randomOccupancy", generateRandomOccupancy); // API to generate random bookings

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
