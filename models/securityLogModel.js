import db from "../config/db.js"

const logSelect = `
  SELECT
    sl.log_id AS id,
    sl.visitor_id AS visitorId,
    sl.staff_id AS staffId,
    v.name AS visitorName,
    v.phone AS visitorPhone,
    v.purpose AS purpose,
    r.name AS residentName,
    a.apartment_no AS apartment,
    sl.entry_time AS entryTime,
    sl.exit_time AS exitTime,
    sl.remarks AS remarks,
    v.status AS visitorStatus
  FROM securitylog sl
  JOIN visitor v ON v.visitor_id = sl.visitor_id
  JOIN resident r ON r.resident_id = v.resident_id
  LEFT JOIN apartment a ON a.apartment_id = r.apartment_id
`

export const getAllSecurityLogs = async () => {
  const [rows] = await db.query(`
    ${logSelect}
    ORDER BY sl.entry_time DESC, sl.log_id DESC
  `)

  return rows
}

export const getSecurityLogById = async (id) => {
  const [rows] = await db.query(
    `${logSelect} WHERE sl.log_id = ?`,
    [id]
  )

  return rows[0] || null
}

export const checkInVisitor = async ({
  visitorId,
  staffId,
  remarks
}) => {
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const [visitors] = await connection.query(
      `SELECT visitor_id, status
       FROM visitor
       WHERE visitor_id = ?
       FOR UPDATE`,
      [visitorId]
    )

    if (!visitors.length) {
      const error = new Error("Visitor not found.")
      error.statusCode = 404
      throw error
    }

    if (visitors[0].status !== "Expected") {
      const error = new Error(
        "Only visitors with Expected status can check in."
      )
      error.statusCode = 409
      throw error
    }

    const [activeLogs] = await connection.query(
      `SELECT log_id
       FROM securitylog
       WHERE visitor_id = ? AND exit_time IS NULL
       LIMIT 1`,
      [visitorId]
    )

    if (activeLogs.length) {
      const error = new Error(
        "This visitor already has an active security log."
      )
      error.statusCode = 409
      throw error
    }

    const [result] = await connection.query(
      `INSERT INTO securitylog
        (visitor_id, staff_id, entry_time, remarks)
       VALUES (?, ?, CURRENT_TIMESTAMP, ?)`,
      [visitorId, staffId ?? null, remarks || null]
    )

    await connection.query(
      `UPDATE visitor
       SET entry_time = CURRENT_TIMESTAMP,
           exit_time = NULL,
           status = 'Inside'
       WHERE visitor_id = ?`,
      [visitorId]
    )

    await connection.commit()

    return await getSecurityLogById(result.insertId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}


export const checkOutVisitor = async (logId) => {
  const [logs] = await db.query(
    `SELECT visitor_id AS visitorId, exit_time AS exitTime
     FROM securitylog
     WHERE log_id = ?`,
    [logId]
  )

  if (!logs.length) {
    const error = new Error("Security log not found.")
    error.statusCode = 404
    throw error
  }

  if (logs[0].exitTime !== null) {
    const error = new Error(
      "This security log has already been checked out."
    )
    error.statusCode = 409
    throw error
  }

  try {
    await db.query(
      "CALL check_out_visitor(?)",
      [logs[0].visitorId]
    )
  } catch (error) {
    if (error.code === "ER_SIGNAL_EXCEPTION") {
      error.statusCode = 409
    }

    throw error
  }

  return getSecurityLogById(logId)
}