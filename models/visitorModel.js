
import db from "../config/db.js"

const visitorSelect = `
  SELECT
    v.visitor_id AS id,
    v.resident_id AS residentId,
    v.name AS name,
    v.phone AS phone,
    a.apartment_no AS apartment,
    v.purpose AS purpose,
    DATE_FORMAT(
  DATE_ADD(v.entry_time, INTERVAL 330 MINUTE),
  '%Y-%m-%d %H:%i:%s'
) AS entryTime,

DATE_FORMAT(
  DATE_ADD(v.exit_time, INTERVAL 330 MINUTE),
  '%Y-%m-%d %H:%i:%s'
) AS exitTime,
    v.status AS status
  FROM visitor v
  LEFT JOIN resident r ON r.resident_id = v.resident_id
  LEFT JOIN apartment a ON a.apartment_id = r.apartment_id
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
  const {
    residentId,
    name,
    phone,
    purpose
  } = data

  const [result] = await db.query(
    "CALL check_in_visitor(?, ?, ?, ?, ?)",
    [
      residentId,
      name.trim(),
      phone?.trim() || null,
      purpose?.trim() || null,
      null
    ]
  )

  const visitorId = result[0][0].visitor_id

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
    `UPDATE visitor
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
    "DELETE FROM visitor WHERE visitor_id = ?",
    [id]
  )

  return result.affectedRows > 0
}
