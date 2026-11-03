
import db from "../config/db.js"

const billSelect = `
  SELECT
    f.bill_id AS id,
    f.apartment_id AS apartmentId,
    a.apartment_no AS apartment,
    (
      SELECT r.name
      FROM Resident r
      WHERE r.apartment_id = f.apartment_id
      ORDER BY r.resident_id
      LIMIT 1
    ) AS resident,
    DATE_FORMAT(f.billing_month, '%Y-%m') AS month,
    f.amount AS amount,
    f.due_date AS dueDate,
    f.effective_status AS status,
    f.late_fee AS lateFee,
    f.gen_date AS genDate,
    f.total_paid AS totalPaid,
    f.total_due AS totalDue,
    f.balance AS balance,
    f.outstanding_balance AS outstandingBalance,
    f.overpayment_amount AS overpaymentAmount,
    f.stored_status AS storedStatus
  FROM v_maintenance_bill_financials f
  JOIN Apartment a
    ON a.apartment_id = f.apartment_id
`

export const getAllBills = async () => {
  const [rows] = await db.query(`
    ${billSelect}
    ORDER BY id DESC
  `)

  return rows
}

export const getBillById = async (id) => {
  const [rows] = await db.query(
    `${billSelect} WHERE f.bill_id = ?`,
    [id]
  )

  return rows[0] || null
}


export const createBill = async (data) => {
  const {
    apartmentId,
    month,
    amount,
    lateFee
  } = data

  const dueDate = `${month}-10`

  const [result] = await db.query(
    `INSERT INTO MaintenanceBill
      (
        apartment_id,
        billing_month,
        amount,
        due_date,
        late_fee
      )
     VALUES (?, ?, ?, ?, ?)`,
    [
      apartmentId,
      `${month}-01`,
      amount,
      dueDate,
      lateFee ?? 0
    ]
  )

  return getBillById(result.insertId)
}



export const updateBill = async (id, data) => {
  const {
    apartmentId,
    month,
    amount,
    lateFee
  } = data

  const dueDate = `${month}-10`

  const [result] = await db.query(
    `UPDATE MaintenanceBill
     SET apartment_id = ?,
         billing_month = ?,
         amount = ?,
         due_date = ?,
         late_fee = ?
     WHERE bill_id = ?`,
    [
      apartmentId,
      `${month}-01`,
      amount,
      dueDate,
      lateFee ?? 0,
      id
    ]
  )

  if (result.affectedRows === 0) {
    const existing = await getBillById(id)

    if (!existing) return null
  }

  return getBillById(id)
}


export const deleteBill = async (id) => {
  const [result] = await db.query(
    "DELETE FROM MaintenanceBill WHERE bill_id = ?",
    [id]
  )

  return result.affectedRows > 0
}
