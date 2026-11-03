
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking
} from "../models/amenityBookingModel.js"

const validId = (value) =>
  Number.isInteger(Number(value)) && Number(value) > 0

const validDateTime = (value) =>
  typeof value === "string" &&
  !Number.isNaN(Date.parse(value)) &&
  value.trim() !== ""

const validateBooking = (data) => {
  const {
    residentId,
    amenityId,
    startTime,
    endTime,
    purpose,
    amountPaid,
    status
  } = data

  if (!validId(residentId)) {
    return "A valid Resident ID is required."
  }

  if (!validId(amenityId)) {
    return "A valid Amenity ID is required."
  }

  if (!validDateTime(startTime) || !validDateTime(endTime)) {
    return "Enter valid booking start and end times."
  }

  if (new Date(endTime) <= new Date(startTime)) {
    return "End time must be later than start time."
  }

  if (!purpose || !purpose.trim()) {
    return "Purpose is required."
  }

  if (
    amountPaid === "" ||
    amountPaid == null ||
    !Number.isFinite(Number(amountPaid)) ||
    Number(amountPaid) < 0
  ) {
    return "Amount paid cannot be negative."
  }

  if (!status || !status.trim()) {
    return "Booking status is required."
  }

  return null
}

const handleDatabaseError = (res, error) => {
  console.error("Amenity booking API error:", error)

  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({
      message: "The specified Resident ID or Amenity ID does not exist."
    })
  }

  if (error.code === "ER_TRUNCATED_WRONG_VALUE" ||
      error.code === "WARN_DATA_TRUNCATED") {
    return res.status(400).json({
      message: "One of the supplied values is not accepted by the database. Check the booking status and date/time values."
    })
  }

  return res.status(500).json({
    message: "A database error occurred while processing the booking."
  })
}


export const getBookings = async (req, res) => {
  try {
    const bookings = await getAllBookings()
    const residentId = req.query.residentId

    if (residentId !== undefined) {
      const id = Number(residentId)

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message: "Invalid resident ID."
        })
      }

      const residentBookings = bookings.filter(
        (booking) => Number(booking.residentId) === id
      )

      return res.status(200).json(residentBookings)
    }

    return res.status(200).json(bookings)
  } catch (error) {
    return handleDatabaseError(res, error)
  }
}


export const getBooking = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid booking ID."
      })
    }

    const booking = await getBookingById(req.params.id)

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found."
      })
    }

    return res.json(booking)
  } catch (error) {
    return handleDatabaseError(res, error)
  }
}

export const addBooking = async (req, res) => {
  try {
    const validationError = validateBooking(req.body)

    if (validationError) {
      return res.status(400).json({
        message: validationError
      })
    }

    const booking = await createBooking(req.body)

    return res.status(201).json(booking)
  } catch (error) {
    return handleDatabaseError(res, error)
  }
}

export const editBooking = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid booking ID."
      })
    }

    const validationError = validateBooking(req.body)

    if (validationError) {
      return res.status(400).json({
        message: validationError
      })
    }

    const booking = await updateBooking(req.params.id, req.body)

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found."
      })
    }

    return res.json(booking)
  } catch (error) {
    return handleDatabaseError(res, error)
  }
}

export const removeBooking = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid booking ID."
      })
    }

    const deleted = await deleteBooking(req.params.id)

    if (!deleted) {
      return res.status(404).json({
        message: "Booking not found."
      })
    }

    return res.json({
      message: "Booking deleted successfully."
    })
  } catch (error) {
    return handleDatabaseError(res, error)
  }
}
