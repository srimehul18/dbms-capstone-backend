
import {
  getAllStaff,
  createStaff,
  updateStaff,
  deleteStaff
} from "../models/staffModel.js"

const validStatuses = ["Active", "Inactive"]

function validateStaff(body) {
  const {
    name,
    role,
    department,
    phone,
    email,
    status = "Active"
  } = body

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 100 ||
    typeof role !== "string" ||
    !role.trim() ||
    role.trim().length > 50 ||
    (department != null &&
      (typeof department !== "string" ||
        department.trim().length > 50)) ||
    typeof phone !== "string" ||
    !phone.trim() ||
    phone.trim().length > 15 ||
    (email != null &&
      (typeof email !== "string" || email.trim().length > 100)) ||
    !validStatuses.includes(status)
  ) {
    return null
  }

  return { name, role, department, phone, email, status }
}

export async function getStaff(req, res) {
  try {
    const staff = await getAllStaff()
    res.json(staff)
  } catch (error) {
    console.error("Failed to fetch staff:", error.message)
    res.status(500).json({ message: "Failed to fetch staff" })
  }
}

export async function addStaff(req, res) {
  const data = validateStaff(req.body)

  if (!data) {
    return res.status(400).json({
      message: "Please provide valid staff details"
    })
  }

  try {
    const staff = await createStaff(data)
    res.status(201).json(staff)
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "That email address or another unique staff value is already registered"
      })
    }

    console.error("Failed to create staff:", error.message)
    res.status(500).json({ message: "Failed to create staff" })
  }
}

export async function editStaff(req, res) {
  const id = Number(req.params.id)
  const data = validateStaff(req.body)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid staff ID" })
  }

  if (!data) {
    return res.status(400).json({
      message: "Please provide valid staff details"
    })
  }

  try {
    const staff = await updateStaff(id, data)

    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" })
    }

    res.json(staff)
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "That email address or another unique staff value is already registered"
      })
    }

    console.error("Failed to update staff:", error.message)
    res.status(500).json({ message: "Failed to update staff" })
  }
}

export async function removeStaff(req, res) {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid staff ID" })
  }

  try {
    const deleted = await deleteStaff(id)

    if (!deleted) {
      return res.status(404).json({ message: "Staff member not found" })
    }

    res.json({ message: "Staff member deleted successfully" })
  } catch (error) {
    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(409).json({
        message: "This staff member is assigned to existing records and cannot be deleted"
      })
    }

    console.error("Failed to delete staff:", error.message)
    res.status(500).json({ message: "Failed to delete staff" })
  }
}
