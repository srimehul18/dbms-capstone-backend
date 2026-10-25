
import {
  getAllComplaints,
  createComplaint,
  updateComplaint,
  deleteComplaint
} from "../models/complaintModel.js"

const priorities = ["Low", "Medium", "High"]
const statuses = ["Open", "In Progress", "Resolved", "Closed"]

function validateComplaint(body) {
  const {
    residentId,
    staffId,
    title,
    description,
    category,
    priority = "Medium",
    status = "Open"
  } = body

  const parsedResidentId = Number(residentId)
  const parsedStaffId =
    staffId == null || staffId === "" ? null : Number(staffId)

  if (
    !Number.isInteger(parsedResidentId) ||
    parsedResidentId <= 0 ||
    (parsedStaffId !== null &&
      (!Number.isInteger(parsedStaffId) || parsedStaffId <= 0)) ||
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 150 ||
    (description != null && typeof description !== "string") ||
    typeof category !== "string" ||
    !category.trim() ||
    category.trim().length > 50 ||
    !priorities.includes(priority) ||
    !statuses.includes(status)
  ) {
    return null
  }

  return {
    residentId: parsedResidentId,
    staffId: parsedStaffId,
    title,
    description,
    category,
    priority,
    status
  }
}

function handleComplaintError(error, res, action) {
  if (
    error.code === "ER_NO_REFERENCED_ROW_2" ||
    error.code === "ER_NO_REFERENCED_ROW"
  ) {
    return res.status(400).json({
      message: "The selected resident or staff member does not exist"
    })
  }

  console.error(`Failed to ${action} complaint:`, error.message)

  return res.status(500).json({
    message: `Failed to ${action} complaint`
  })
}

export async function getComplaints(req, res) {
  try {
    const complaints = await getAllComplaints()
    res.json(complaints)
  } catch (error) {
    console.error("Failed to fetch complaints:", error.message)
    res.status(500).json({ message: "Failed to fetch complaints" })
  }
}

export async function addComplaint(req, res) {
  const data = validateComplaint(req.body)

  if (!data) {
    return res.status(400).json({
      message: "Please provide valid complaint details"
    })
  }

  try {
    const complaint = await createComplaint(data)
    res.status(201).json(complaint)
  } catch (error) {
    return handleComplaintError(error, res, "create")
  }
}

export async function editComplaint(req, res) {
  const id = Number(req.params.id)
  const data = validateComplaint(req.body)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid complaint ID" })
  }

  if (!data) {
    return res.status(400).json({
      message: "Please provide valid complaint details"
    })
  }

  try {
    const complaint = await updateComplaint(id, data)

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" })
    }

    res.json(complaint)
  } catch (error) {
    return handleComplaintError(error, res, "update")
  }
}

export async function removeComplaint(req, res) {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid complaint ID" })
  }

  try {
    const deleted = await deleteComplaint(id)

    if (!deleted) {
      return res.status(404).json({ message: "Complaint not found" })
    }

    res.json({ message: "Complaint deleted successfully" })
  } catch (error) {
    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(409).json({
        message: "This complaint is referenced by another record and cannot be deleted"
      })
    }

    console.error("Failed to delete complaint:", error.message)
    res.status(500).json({ message: "Failed to delete complaint" })
  }
}
