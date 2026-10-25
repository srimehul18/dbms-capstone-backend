
import pool from "../config/db.js";

export async function getAllResidents() {
  const [rows] = await pool.query(`
    SELECT
      r.resident_id AS id,
      r.name,
      a.apartment_no AS apartment,
      r.phone,
      r.email,
      r.role,
      r.status
    FROM Resident r
    JOIN Apartment a
      ON r.apartment_id = a.apartment_id
    ORDER BY r.resident_id
  `);

  return rows;
}

export async function createResident(data) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [apartments] = await connection.execute(
      `SELECT apartment_id
       FROM Apartment
       WHERE apartment_no = ?`,
      [data.apartment.trim()]
    );

    if (apartments.length === 0) {
      const error = new Error("Apartment number does not exist.");
      error.code = "APARTMENT_NOT_FOUND";
      throw error;
    }

    const [result] = await connection.execute(
      `INSERT INTO Resident
       (apartment_id, name, phone, email, role, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        apartments[0].apartment_id,
        data.name.trim(),
        data.phone.trim(),
        data.email?.trim() || null,
        data.role,
        data.status,
      ]
    );

    await connection.commit();

    const [rows] = await connection.execute(
      `SELECT
         r.resident_id AS id,
         r.name,
         a.apartment_no AS apartment,
         r.phone,
         r.email,
         r.role,
         r.status
       FROM Resident r
       JOIN Apartment a
         ON r.apartment_id = a.apartment_id
       WHERE r.resident_id = ?`,
      [result.insertId]
    );

    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}


export async function updateResident(id, data) {
  const [result] = await pool.execute(
    `UPDATE Resident
     SET apartment_id = (
       SELECT apartment_id
       FROM Apartment
       WHERE apartment_no = ?
     ),
     name = ?,
     phone = ?,
     email = ?,
     role = ?,
     status = ?
     WHERE resident_id = ?
     AND EXISTS (
       SELECT 1
       FROM Apartment
       WHERE apartment_no = ?
     )`,
    [
      data.apartment.trim(),
      data.name.trim(),
      data.phone.trim(),
      data.email?.trim() || null,
      data.role,
      data.status,
      id,
      data.apartment.trim()
    ]
  )

  if (result.affectedRows === 0) {
    const [rows] = await pool.execute(
      "SELECT resident_id FROM Resident WHERE resident_id = ?",
      [id]
    )

    if (rows.length === 0) return null

    const error = new Error("Apartment number does not exist")
    error.code = "APARTMENT_NOT_FOUND"
    throw error
  }

  const [rows] = await pool.execute(
    `SELECT
      r.resident_id AS id,
      r.name,
      a.apartment_no AS apartment,
      r.phone,
      r.email,
      r.role,
      r.status
     FROM Resident r
     JOIN Apartment a ON r.apartment_id = a.apartment_id
     WHERE r.resident_id = ?`,
    [id]
  )

  return rows[0] || null
}

export async function deleteResident(id) {
  const [result] = await pool.execute(
    "DELETE FROM Resident WHERE resident_id = ?",
    [id]
  )

  return result.affectedRows > 0
}

