
import db from "../config/db.js"

const visitorSelect = `
  SELECT
    v.visitor_id AS id,
    v.resident_id AS residentId,
    v.name AS name,
    v.phone AS phone,
    a.apartment_no AS apartment,
    v.purpose AS purpose,
    DATE_FORMAT(v.entry_time, '%Y-%m-%d %H:%i:%s') AS entryTime,
    DATE_FORMAT(v.exit_time, '%Y-%m-%d %H:%i:%s') AS exitTime,
    v.status AS status
  FROM Visitor v
  LEFT JOIN Resident r ON r.resident_id = v.resident_id
  LEFT JOIN Apartment a ON a.apartment_id = r.apartment_id
`

export const getAllVisitors = async () => {
  const [rows] = await db.query(`
    ${visitorSelect}
    ORDER BY v.visitor_id DESC
  `)

  return rows
}

export const getVisitorById = async (id) => {
  const [rows] = await db.query(
    `${visitorSelect} WHERE v.visitor_id = ?`,
    [id]
  )

  return rows[0] || null
}

export const createVisitor = async (data) => {
  const connection = await db.getConnection()
  let visitorId

  try {
    await connection.beginTransaction()

    const {
      residentId,
      name,
      phone,
      purpose
    } = data

    const [visitorResult] = await connection.query(
      `INSERT INTO Visitor
        (resident_id, name, phone, purpose, entry_time, exit_time, status)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, NULL, 'Inside')`,
      [
        residentId,
        name.trim(),
        phone?.trim() || null,
        purpose?.trim() || null
      ]
    )

    visitorId = visitorResult.insertId

    const [visitorRows] = await connection.query(
      `SELECT entry_time
       FROM Visitor
       WHERE visitor_id = ?
       FOR UPDATE`,
      [visitorId]
    )

    if (!visitorRows.length) {
      throw new Error("The visitor record could not be retrieved.")
    }

    const entryTime = visitorRows[0].entry_time

    const [existingLogs] = await connection.query(
      `SELECT log_id
       FROM securitylog
       WHERE visitor_id = ?
       LIMIT 1
       FOR UPDATE`,
      [visitorId]
    )

    if (existingLogs.length > 0) {
      throw new Error("A security log already exists for this visitor.")
    }

    await connection.query(
      `INSERT INTO securitylog
        (visitor_id, staff_id, entry_time, exit_time, remarks)
       VALUES (?, NULL, ?, NULL, ?)`,
      [
        visitorId,
        entryTime,
        "Visitor registered and checked in"
      ]
    )

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  return getVisitorById(visitorId)
}

export const updateVisitor = async (id, data) => {
  const {
    residentId,
    name,
    phone,
    purpose,
    entryTime,
    exitTime,
    status
  } = data

  const [result] = await db.query(
    `UPDATE Visitor
     SET resident_id = ?,
         name = ?,
         phone = ?,
         purpose = ?,
         entry_time = ?,
         exit_time = ?,
         status = ?
     WHERE visitor_id = ?`,
    [
      residentId,
      name.trim(),
      phone || null,
      purpose || null,
      entryTime || null,
      exitTime || null,
      status,
      id
    ]
  )

  if (result.affectedRows === 0) {
    const existing = await getVisitorById(id)
    if (!existing) return null
  }

  return getVisitorById(id)
}

export const deleteVisitor = async (id) => {
  const [result] = await db.query(
    "DELETE FROM Visitor WHERE visitor_id = ?",
    [id]
  )

  return result.affectedRows > 0
}
