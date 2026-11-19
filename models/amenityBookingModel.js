
import db from "../config/db.js"

const bookingSelect = `
  SELECT
    ab.booking_id AS id,
    ab.resident_id AS residentId,
    r.name AS resident,
    ab.amenity_id AS amenityId,
    a.name AS amenity,
    ab.start_time AS startTime,
    ab.end_time AS endTime,
    ab.purpose AS purpose,
    ab.amount_paid AS amountPaid,
    ab.status AS status
  FROM amenitybooking ab
  JOIN resident r ON r.resident_id = ab.resident_id
  JOIN amenity a ON a.amenity_id = ab.amenity_id
`

export const getAllBookings = async () => {
  const [rows] = await db.query(`
    ${bookingSelect}
    ORDER BY ab.booking_id DESC
  `)

  return rows
}

export const getBookingById = async (id) => {
  const [rows] = await db.query(
    `${bookingSelect} WHERE ab.booking_id = ?`,
    [id]
  )

  return rows[0] || null
}

export const createBooking = async (data) => {
  const {
    residentId,
    amenityId,
    startTime,
    endTime,
    purpose,
    amountPaid,
    status
  } = data

  const connection = await db.getConnection()

  try {
    const [results] = await connection.query(
      "CALL create_amenity_booking(?, ?, ?, ?, ?, ?, ?)",
      [
        residentId,
        amenityId,
        startTime,
        endTime,
        purpose,
        amountPaid ?? 0,
        status
      ]
    )

    const bookingId = results?.[0]?.[0]?.bookingId

    if (!bookingId) {
      throw new Error(
        "The booking procedure did not return a booking ID."
      )
    }

    const [rows] = await connection.query(
      `${bookingSelect} WHERE ab.booking_id = ?`,
      [bookingId]
    )

    return rows[0] || null
  } finally {
    connection.release()
  }
}

export const updateBooking = async (id, data) => {
  const {
    residentId,
    amenityId,
    startTime,
    endTime,
    purpose,
    amountPaid,
    status
  } = data

  const [result] = await db.query(
    `UPDATE amenitybooking
     SET resident_id = ?,
         amenity_id = ?,
         start_time = ?,
         end_time = ?,
         purpose = ?,
         amount_paid = ?,
         status = ?
     WHERE booking_id = ?`,
    [
      residentId,
      amenityId,
      startTime,
      endTime,
      purpose,
      amountPaid ?? 0,
      status,
      id
    ]
  )

  if (result.affectedRows === 0) {
    const existing = await getBookingById(id)
    if (!existing) return null
  }

  return getBookingById(id)
}

export const deleteBooking = async (id) => {
  const [result] = await db.query(
    "DELETE FROM amenitybooking WHERE booking_id = ?",
    [id]
  )

  return result.affectedRows > 0
}
