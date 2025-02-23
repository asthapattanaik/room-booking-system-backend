require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { bookRooms, getBookings, resetBookings, generateRandomOccupancy } = require("./controller/bookingController");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => res.send("Hotel Room Reservation System"));

app.post("/bookRooms", bookRooms);
app.get("/getBookings", getBookings);
app.delete("/resetBookings", resetBookings);
app.get("/randomOccupancy", generateRandomOccupancy);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
