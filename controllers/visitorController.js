
import {
  getAllVisitors,
  getVisitorById,
  createVisitor,
  updateVisitor,
  deleteVisitor
} from "../models/visitorModel.js"

const validId = (value) =>
  Number.isInteger(Number(value)) && Number(value) > 0

const validDateTime = (value) => {
  if (!value) return true

  return !Number.isNaN(Date.parse(value))
}

const validateNewVisitor = (data) => {
  const { residentId, name, phone, purpose } = data

  if (!validId(residentId)) {
    return "Enter a valid Resident ID."
  }

  if (typeof name !== "string" || !name.trim()) {
    return "Visitor name is required."
  }

  if (name.trim().length > 100) {
    return "Visitor name cannot exceed 100 characters."
  }

  if (phone != null && typeof phone !== "string") {
    return "Phone number must be text."
  }

  if (purpose != null && typeof purpose !== "string") {
    return "Purpose must be text."
  }

  return null
}

const validateVisitorUpdate = (data) => {
  const {
    residentId,
    name,
    entryTime,
    exitTime,
    status
  } = data

  if (!validId(residentId)) {
    return "Enter a valid Resident ID."
  }

  if (typeof name !== "string" || !name.trim()) {
    return "Visitor name is required."
  }

  if (name.trim().length > 100) {
    return "Visitor name cannot exceed 100 characters."
  }

  if (!validDateTime(entryTime) || !validDateTime(exitTime)) {
    return "Enter valid entry and exit date/time values."
  }

  if (
    entryTime &&
    exitTime &&
    new Date(exitTime) < new Date(entryTime)
  ) {
    return "Exit time cannot be earlier than entry time."
  }

  if (!status || !status.trim()) {
    return "Visitor status is required."
  }

  return null
}

const handleDatabaseError = (res, error) => {
  console.error("Visitor API error:", error)

  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({
      message: "The specified Resident ID does not exist."
    })
  }

  if (
    error.code === "ER_TRUNCATED_WRONG_VALUE" ||
    error.code === "WARN_DATA_TRUNCATED"
  ) {
    return res.status(400).json({
      message: "A supplied value is not accepted by the database."
    })
  }

  if (
    error.code === "ER_ROW_IS_REFERENCED_2" ||
    error.code === "ER_ROW_IS_REFERENCED"
  ) {
    return res.status(409).json({
      message: "This visitor is referenced by a security log and cannot be deleted."
    })
  }

  return res.status(500).json({
    message: "A database error occurred while processing the visitor."
  })
}

export const getVisitors = async (req, res) => {
  try {
    return res.json(await getAllVisitors())
  } catch (error) {
    return handleDatabaseError(res, error)
  }
}

export const getVisitor = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid visitor ID."
      })
    }

    const visitor = await getVisitorById(req.params.id)

    if (!visitor) {
      return res.status(404).json({
        message: "Visitor not found."
      })
    }

    return res.json(visitor)
  } catch (error) {
    return handleDatabaseError(res, error)
  }
}

export const addVisitor = async (req, res) => {
  try {
    const validationError = validateNewVisitor(req.body)

    if (validationError) {
      return res.status(400).json({
        message: validationError
      })
    }

    const visitor = await createVisitor(req.body)

    return res.status(201).json({
      message: "Visitor registered and checked in successfully.",
      visitor
    })
  } catch (error) {
    if (error.message === "A security log already exists for this visitor.") {
      return res.status(409).json({
        message: error.message
      })
    }

    return handleDatabaseError(res, error)
  }
}

export const editVisitor = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid visitor ID."
      })
    }

    const validationError = validateVisitorUpdate(req.body)

    if (validationError) {
      return res.status(400).json({
        message: validationError
      })
    }

    const visitor = await updateVisitor(req.params.id, req.body)

    if (!visitor) {
      return res.status(404).json({
        message: "Visitor not found."
      })
    }

    return res.json(visitor)
  } catch (error) {
    return handleDatabaseError(res, error)
  }
}

export const removeVisitor = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid visitor ID."
      })
    }

    const deleted = await deleteVisitor(req.params.id)

    if (!deleted) {
      return res.status(404).json({
        message: "Visitor not found."
      })
    }

    return res.json({
      message: "Visitor deleted successfully."
    })
  } catch (error) {
    return handleDatabaseError(res, error)
  }
}
