import db from "../config/db.js"

export const getAllAmenities = async () => {
  const [rows] = await db.query(`
    SELECT
      amenity_id AS id,
      name,
      description,
      location,
      capacity,
      booking_fee AS fee,
      status
    FROM Amenity
    ORDER BY amenity_id DESC
  `)

  return rows
}

export const createAmenity = async (data) => {
  const {
    name,
    description,
    location,
    capacity,
    fee,
    status
  } = data

  const [result] = await db.query(
    `INSERT INTO Amenity
      (name, description, location, capacity, booking_fee, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      name,
      description || null,
      location || null,
      capacity,
      fee ?? 0,
      status || "Available"
    ]
  )

  const [rows] = await db.query(
    `SELECT
       amenity_id AS id,
       name,
       description,
       location,
       capacity,
       booking_fee AS fee,
       status
     FROM Amenity
     WHERE amenity_id = ?`,
    [result.insertId]
  )

  return rows[0]
}

export const updateAmenity = async (id, data) => {
  const {
    name,
    description,
    location,
    capacity,
    fee,
    status
  } = data

  const [result] = await db.query(
    `UPDATE Amenity
     SET name = ?,
         description = ?,
         location = ?,
         capacity = ?,
         booking_fee = ?,
         status = ?
     WHERE amenity_id = ?`,
    [
      name,
      description || null,
      location || null,
      capacity,
      fee ?? 0,
      status,
      id
    ]
  )

  if (result.affectedRows === 0) {
    const [existing] = await db.query(
      "SELECT amenity_id FROM Amenity WHERE amenity_id = ?",
      [id]
    )

    if (existing.length === 0) return null
  }

  const [rows] = await db.query(
    `SELECT
       amenity_id AS id,
       name,
       description,
       location,
       capacity,
       booking_fee AS fee,
       status
     FROM Amenity
     WHERE amenity_id = ?`,
    [id]
  )

  return rows[0]
}

export const deleteAmenity = async (id) => {
  const [result] = await db.query(
    "DELETE FROM Amenity WHERE amenity_id = ?",
    [id]
  )

  return result.affectedRows > 0
}
