
import pool from "../config/db.js"

export async function getAllStaff() {
  const [rows] = await pool.execute(`
    SELECT
      staff_id AS id,
      name,
      role,
      department,
      phone,
      email,
      status
    FROM staff
    ORDER BY staff_id DESC
  `)

  return rows
}

export async function createStaff(data) {
  const [result] = await pool.execute(
    `INSERT INTO staff
      (name, role, department, phone, email, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.name.trim(),
      data.role.trim(),
      data.department?.trim() || null,
      data.phone.trim(),
      data.email?.trim() || null,
      data.status
    ]
  )

  const [rows] = await pool.execute(
    `SELECT
      staff_id AS id,
      name,
      role,
      department,
      phone,
      email,
      status
     FROM staff
     WHERE staff_id = ?`,
    [result.insertId]
  )

  return rows[0]
}

export async function updateStaff(id, data) {
  await pool.execute(
    `UPDATE staff
     SET name = ?,
         role = ?,
         department = ?,
         phone = ?,
         email = ?,
         status = ?
     WHERE staff_id = ?`,
    [
      data.name.trim(),
      data.role.trim(),
      data.department?.trim() || null,
      data.phone.trim(),
      data.email?.trim() || null,
      data.status,
      id
    ]
  )

  const [rows] = await pool.execute(
    `SELECT
      staff_id AS id,
      name,
      role,
      department,
      phone,
      email,
      status
     FROM staff
     WHERE staff_id = ?`,
    [id]
  )

  return rows[0] || null
}

export async function deleteStaff(id) {
  const [result] = await pool.execute(
    "DELETE FROM staff WHERE staff_id = ?",
    [id]
  )

  return result.affectedRows > 0
}
