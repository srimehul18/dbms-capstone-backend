
import express from "express"
import {
  getBookings,
  getBooking,
  addBooking,
  editBooking,
  removeBooking
} from "../controllers/amenityBookingController.js"

const router = express.Router()

router.get("/", getBookings)
router.get("/:id", getBooking)
router.post("/", addBooking)
router.put("/:id", editBooking)
router.delete("/:id", removeBooking)

export default router
