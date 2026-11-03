import db from "../config/db.js"
import pool from "../config/db.js"
import {
  getAllBills,
  getBillById,
  createBill,
  updateBill,
  deleteBill
} from "../models/maintenanceBillModel.js"

const validStatuses = ["Pending", "Paid", "Overdue"]


const validateBill = (data) => {
  const errors = []
  const apartmentId = Number(data.apartmentId)
  const amount = Number(data.amount)

  const lateFee =
    data.lateFee == null || data.lateFee === ""
      ? 0
      : Number(data.lateFee)

  if (!Number.isInteger(apartmentId) || apartmentId <= 0) {
    errors.push("A valid apartment ID is required")
  }

  if (
    typeof data.month !== "string" ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(data.month)
  ) {
    errors.push("Billing month must use YYYY-MM format")
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push("Amount must be greater than zero")
  }

  if (!Number.isFinite(lateFee) || lateFee < 0) {
    errors.push("Late fee must be a non-negative number")
  }

  if (!validStatuses.includes(data.status || "Pending")) {
    errors.push("Invalid maintenance bill status")
  }

  return {
    errors,
    values: {
      apartmentId,
      month: data.month,
      amount,
      dueDate:
        typeof data.month === "string" &&
        /^\d{4}-(0[1-9]|1[0-2])$/.test(data.month)
          ? `${data.month}-10`
          : null,
      status: data.status || "Pending",
      lateFee
    }
  }
}


const handleDatabaseError = (res, error, action) => {
  console.error(`Maintenance bill ${action} error:`, error)

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: "A bill already exists for this apartment and billing month"
    })
  }

  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({
      message: "The selected apartment does not exist"
    })
  }

  if (error.code === "ER_ROW_IS_REFERENCED_2") {
    return res.status(409).json({
      message: "This bill is linked to existing payment records"
    })
  }

  return res.status(500).json({
    message: `Failed to ${action} maintenance bill`
  })
}

const getResidentApartmentId = async (residentId) => {
  const id = Number(residentId)

  if (!Number.isInteger(id) || id <= 0) {
    return null
  }

  const [rows] = await pool.execute(
    `SELECT apartment_id
     FROM Resident
     WHERE resident_id = ?
       AND status = 'Active'`,
    [id]
  )

  return rows.length ? rows[0].apartment_id : null
}

const denyResidentWrite = (req, res) => {
  if (req.query.residentId !== undefined) {
    res.status(403).json({
      message: "Residents cannot create, edit, or delete maintenance bills"
    })
    return true
  }

  return false
}

export const getBills = async (req, res) => {
  try {
    const residentId = req.query.residentId

    if (residentId !== undefined) {
      const id = Number(residentId)

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message: "Invalid resident ID"
        })
      }

      const [residents] = await db.query(
        `SELECT apartment_id
         FROM Resident
         WHERE resident_id = ?`,
        [id]
      )

      if (!residents.length) {
        return res.status(200).json([])
      }

      const apartmentId = residents[0].apartment_id
      const bills = await getAllBills()

      const residentBills = bills.filter(
        (bill) => Number(bill.apartmentId) === Number(apartmentId)
      )

      return res.status(200).json(residentBills)
    }

    const bills = await getAllBills()

    return res.status(200).json(bills)
  } catch (error) {
    return handleDatabaseError(res, error, "fetch")
  }
}

export const getBill = async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid bill ID" })
  }

  try {
    const bill = await getBillById(id)

    if (!bill) {
      return res.status(404).json({
        message: "Maintenance bill not found"
      })
    }

    const residentId = req.query.residentId

    if (residentId !== undefined) {
      const apartmentId = await getResidentApartmentId(residentId)

      if (!apartmentId) {
        return res.status(404).json({
          message: "Active resident not found"
        })
      }

      if (Number(bill.apartmentId) !== Number(apartmentId)) {
        return res.status(403).json({
          message: "You cannot access another apartment's maintenance bill"
        })
      }
    }

    return res.status(200).json(bill)
  } catch (error) {
    return handleDatabaseError(res, error, "fetch")
  }
}

export const addBill = async (req, res) => {
  if (denyResidentWrite(req, res)) return

  const { errors, values } = validateBill(req.body)

  if (errors.length) {
    return res.status(400).json({ message: errors.join(", ") })
  }

  try {
    const bill = await createBill(values)

    return res.status(201).json({
      message: "Maintenance bill created successfully",
      bill
    })
  } catch (error) {
    return handleDatabaseError(res, error, "create")
  }
}

export const editBill = async (req, res) => {
  if (denyResidentWrite(req, res)) return

  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid bill ID" })
  }

  const { errors, values } = validateBill(req.body)

  if (errors.length) {
    return res.status(400).json({ message: errors.join(", ") })
  }

  try {
    const bill = await updateBill(id, values)

    if (!bill) {
      return res.status(404).json({
        message: "Maintenance bill not found"
      })
    }

    return res.status(200).json({
      message: "Maintenance bill updated successfully",
      bill
    })
  } catch (error) {
    return handleDatabaseError(res, error, "update")
  }
}

export const removeBill = async (req, res) => {
  if (denyResidentWrite(req, res)) return

  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid bill ID" })
  }

  try {
    const deleted = await deleteBill(id)

    if (!deleted) {
      return res.status(404).json({
        message: "Maintenance bill not found"
      })
    }

    return res.status(200).json({
      message: "Maintenance bill deleted successfully"
    })
  } catch (error) {
    return handleDatabaseError(res, error, "delete")
  }
}
