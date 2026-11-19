
import pool from "../config/db.js"

export async function getAllApartments() {
  const [rows] = await pool.execute(`
    SELECT
      apartment_id AS id,
      apartment_no AS apartment,
      block,
      floor,
      type,
      area,
      status
    FROM apartment
    ORDER BY block, floor, apartment_no
  `)

  return rows
}

export async function createApartment(data) {
  const [result] = await pool.execute(
    `INSERT INTO apartment
      (apartment_no, block, floor, type, area, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.apartment.trim(),
      data.block.trim(),
      data.floor,
      data.type.trim(),
      data.area ?? null,
      data.status
    ]
  )

  const [rows] = await pool.execute(
    `SELECT
      apartment_id AS id,
      apartment_no AS apartment,
      block,
      floor,
      type,
      area,
      status
     FROM apartment
     WHERE apartment_id = ?`,
    [result.insertId]
  )

  return rows[0]
}

export async function updateApartment(id, data) {
  await pool.execute(
    `UPDATE apartment
     SET apartment_no = ?,
         block = ?,
         floor = ?,
         type = ?,
         area = ?,
         status = ?
     WHERE apartment_id = ?`,
    [
      data.apartment.trim(),
      data.block.trim(),
      data.floor,
      data.type.trim(),
      data.area ?? null,
      data.status,
      id
    ]
  )

  const [rows] = await pool.execute(
    `SELECT
      apartment_id AS id,
      apartment_no AS apartment,
      block,
      floor,
      type,
      area,
      status
     FROM apartment
     WHERE apartment_id = ?`,
    [id]
  )

  return rows[0] || null
}

export async function deleteApartment(id) {
  const [result] = await pool.execute(
    "DELETE FROM apartment WHERE apartment_id = ?",
    [id]
  )

  return result.affectedRows > 0
}
