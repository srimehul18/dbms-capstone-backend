
import pool from "../config/db.js"

export async function getAllComplaints() {
  const [rows] = await pool.execute(`
    SELECT
      c.complaint_id AS id,
      c.resident_id AS residentId,
      r.name AS resident,
      c.staff_id AS staffId,
      s.name AS assignedStaff,
      c.title,
      c.description,
      c.category,
      c.priority,
      c.status,
      c.created_date AS createdDate,
      c.resolved_date AS resolvedDate
    FROM Complaint c
    JOIN Resident r ON c.resident_id = r.resident_id
    LEFT JOIN Staff s ON c.staff_id = s.staff_id
    ORDER BY c.complaint_id DESC
  `)

  return rows
}

export async function createComplaint(data) {
  const [result] = await pool.execute(
    `INSERT INTO Complaint
      (
        resident_id,
        staff_id,
        title,
        description,
        category,
        priority,
        status
      )
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.residentId,
      data.staffId ?? null,
      data.title.trim(),
      data.description?.trim() || null,
      data.category.trim(),
      data.priority,
      data.status
    ]
  )

  const [rows] = await pool.execute(
    `SELECT
      c.complaint_id AS id,
      c.resident_id AS residentId,
      r.name AS resident,
      c.staff_id AS staffId,
      s.name AS assignedStaff,
      c.title,
      c.description,
      c.category,
      c.priority,
      c.status,
      c.created_date AS createdDate,
      c.resolved_date AS resolvedDate
     FROM Complaint c
     JOIN Resident r ON c.resident_id = r.resident_id
     LEFT JOIN Staff s ON c.staff_id = s.staff_id
     WHERE c.complaint_id = ?`,
    [result.insertId]
  )

  return rows[0]
}

export async function updateComplaint(id, data) {
  await pool.execute(
    `UPDATE Complaint
     SET resident_id = ?,
         staff_id = ?,
         title = ?,
         description = ?,
         category = ?,
         priority = ?,
         status = ?,
         resolved_date = CASE
           WHEN ? = 'Resolved' THEN COALESCE(resolved_date, CURRENT_TIMESTAMP)
           WHEN ? IN ('Open', 'In Progress') THEN NULL
           ELSE resolved_date
         END
     WHERE complaint_id = ?`,
    [
      data.residentId,
      data.staffId ?? null,
      data.title.trim(),
      data.description?.trim() || null,
      data.category.trim(),
      data.priority,
      data.status,
      data.status,
      data.status,
      id
    ]
  )

  const [rows] = await pool.execute(
    `SELECT
      c.complaint_id AS id,
      c.resident_id AS residentId,
      r.name AS resident,
      c.staff_id AS staffId,
      s.name AS assignedStaff,
      c.title,
      c.description,
      c.category,
      c.priority,
      c.status,
      c.created_date AS createdDate,
      c.resolved_date AS resolvedDate
     FROM Complaint c
     JOIN Resident r ON c.resident_id = r.resident_id
     LEFT JOIN Staff s ON c.staff_id = s.staff_id
     WHERE c.complaint_id = ?`,
    [id]
  )

  return rows[0] || null
}

export async function deleteComplaint(id) {
  const [result] = await pool.execute(
    "DELETE FROM Complaint WHERE complaint_id = ?",
    [id]
  )

  return result.affectedRows > 0
}
