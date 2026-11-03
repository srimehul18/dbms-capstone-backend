
import db from "../config/db.js"

const validStatuses = [
  "Successful",
  "Pending",
  "Failed",
  "Refunded"
]

const paymentSelect = `
  SELECT
    p.payment_id AS id,
    p.bill_id AS billId,
    (
      SELECT r.name
      FROM Resident r
      JOIN MaintenanceBill mb2
        ON mb2.apartment_id = r.apartment_id
      WHERE mb2.bill_id = p.bill_id
      ORDER BY r.resident_id
      LIMIT 1
    ) AS resident,
    DATE_FORMAT(p.pay_date, '%Y-%m-%d') AS payDate,
    p.amount_paid AS amount,
    p.method AS method,
    p.reference_no AS referenceNo,
    p.status AS status
  FROM Payment p
`

const getPaymentByIdWithConnection = async (connection, id) => {
  const [rows] = await connection.query(
    `${paymentSelect} WHERE p.payment_id = ?`,
    [id]
  )

  return rows[0] || null
}

const lockBills = async (connection, billIds) => {
  const ids = [...new Set(billIds.map(Number))]
    .sort((a, b) => a - b)

  for (const billId of ids) {
    const [rows] = await connection.query(
      `SELECT bill_id, amount, late_fee
       FROM MaintenanceBill
       WHERE bill_id = ?
       FOR UPDATE`,
      [billId]
    )

    if (!rows.length) {
      throw new Error(`Maintenance bill ${billId} does not exist.`)
    }
  }
}

const validatePaymentData = ({
  billId,
  amount,
  payDate,
  method,
  status
}) => {
  if (!Number.isInteger(Number(billId)) || Number(billId) <= 0) {
    throw new Error("A valid bill ID is required.")
  }

  if (
    amount === undefined ||
    amount === null ||
    amount === "" ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0
  ) {
    throw new Error("Payment amount must be greater than zero.")
  }

  if (!payDate || Number.isNaN(Date.parse(payDate))) {
    throw new Error("A valid payment date is required.")
  }

  if (!method) {
    throw new Error("Payment method is required.")
  }

  if (!validStatuses.includes(status)) {
    throw new Error("Select a valid payment status.")
  }
}

const validateSuccessfulPayment = async (
  connection,
  { billId, amount, payDate },
  excludePaymentId = null
) => {
  const [dateRows] = await connection.query(
    "SELECT CAST(? AS DATETIME) > CURRENT_TIMESTAMP AS is_future",
    [payDate]
  )

  if (Number(dateRows[0].is_future) === 1) {
    throw new Error(
      "A future-dated payment cannot be recorded as successful."
    )
  }

  const [billRows] = await connection.query(
    `SELECT amount, late_fee
     FROM MaintenanceBill
     WHERE bill_id = ?`,
    [billId]
  )

  if (!billRows.length) {
    throw new Error(`Maintenance bill ${billId} does not exist.`)
  }

  const [paymentRows] = await connection.query(
    `SELECT COALESCE(SUM(amount_paid), 0) AS total_paid
     FROM Payment
     WHERE bill_id = ?
       AND status = 'Successful'
       AND pay_date <= CURRENT_TIMESTAMP
       AND (? IS NULL OR payment_id <> ?)`,
    [billId, excludePaymentId, excludePaymentId]
  )

  const totalDue =
    Number(billRows[0].amount) +
    Number(billRows[0].late_fee)

  const totalPaid = Number(paymentRows[0].total_paid)
  const remaining = Math.round((totalDue - totalPaid) * 100) / 100
  const paymentAmount = Math.round(Number(amount) * 100) / 100

  if (remaining <= 0) {
    throw new Error(
      "This bill has no outstanding balance. The payment would exceed the amount due."
    )
  }

  if (paymentAmount > remaining) {
    throw new Error(
      `Payment exceeds the remaining balance of ${remaining.toFixed(2)}.`
    )
  }
}

export const getAllPayments = async () => {
  const [rows] = await db.query(`
    ${paymentSelect}
    ORDER BY p.payment_id DESC
  `)

  return rows
}

export const getPaymentById = async (id) => {
  const [rows] = await db.query(
    `${paymentSelect} WHERE p.payment_id = ?`,
    [id]
  )

  return rows[0] || null
}

export const createPayment = async (data) => {
  const payment = {
    ...data,
    status: data.status || "Pending"
  }

  validatePaymentData(payment)

  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    await lockBills(connection, [payment.billId])

    if (payment.status === "Successful") {
      await validateSuccessfulPayment(connection, payment)
    }

    const [result] = await connection.query(
      `INSERT INTO Payment
        (bill_id, amount_paid, pay_date, method, reference_no, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        payment.billId,
        payment.amount,
        payment.payDate,
        payment.method,
        payment.referenceNo || null,
        payment.status
      ]
    )

    const created = await getPaymentByIdWithConnection(
      connection,
      result.insertId
    )

    await connection.commit()

    return created
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export const updatePayment = async (id, data) => {
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const [existingRows] = await connection.query(
      `SELECT *
       FROM Payment
       WHERE payment_id = ?
       FOR UPDATE`,
      [id]
    )

    if (!existingRows.length) {
      await connection.rollback()
      return null
    }

    const existing = existingRows[0]

    if (existing.status === "Successful") {
      throw new Error(
        "Successful payments cannot be edited. Use a controlled correction or refund process."
      )
    }

    const payment = {
      billId: data.billId,
      amount: data.amount,
      payDate: data.payDate,
      method: data.method,
      referenceNo: data.referenceNo,
      status: data.status || existing.status
    }

    validatePaymentData(payment)

    await lockBills(connection, [
      existing.bill_id,
      payment.billId
    ])

    if (payment.status === "Successful") {
      await validateSuccessfulPayment(
        connection,
        payment,
        Number(id)
      )
    }

    await connection.query(
      `UPDATE Payment
       SET bill_id = ?,
           amount_paid = ?,
           pay_date = ?,
           method = ?,
           reference_no = ?,
           status = ?
       WHERE payment_id = ?`,
      [
        payment.billId,
        payment.amount,
        payment.payDate,
        payment.method,
        payment.referenceNo || null,
        payment.status,
        id
      ]
    )

    const updated = await getPaymentByIdWithConnection(
      connection,
      id
    )

    await connection.commit()

    return updated
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export const deletePayment = async (id) => {
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const [rows] = await connection.query(
      `SELECT payment_id, bill_id, status
       FROM Payment
       WHERE payment_id = ?
       FOR UPDATE`,
      [id]
    )

    if (!rows.length) {
      await connection.rollback()
      return false
    }

    const payment = rows[0]

    if (payment.status === "Successful") {
      throw new Error(
        "Successful payments cannot be deleted. Use a controlled correction or refund process."
      )
    }

    await lockBills(connection, [payment.bill_id])

    await connection.query(
      "DELETE FROM Payment WHERE payment_id = ?",
      [id]
    )

    await connection.commit()

    return true
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
