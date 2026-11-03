import {
  getAllSecurityLogs,
  getSecurityLogById,
  checkInVisitor,
  checkOutVisitor
} from "../models/securityLogModel.js"

const validId = (value) =>
  Number.isInteger(Number(value)) && Number(value) > 0

const handleError = (res, error) => {
  console.error("SecurityLog API error:", error)

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      message: error.message
    })
  }

  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({
      message: "The specified visitor or staff member does not exist."
    })
  }

  return res.status(500).json({
    message: "A database error occurred while processing the security log."
  })
}

export const getSecurityLogs = async (req, res) => {
  try {
    const logs = await getAllSecurityLogs()
    return res.json(logs)
  } catch (error) {
    return handleError(res, error)
  }
}

export const getSecurityLog = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid security log ID."
      })
    }

    const log = await getSecurityLogById(req.params.id)

    if (!log) {
      return res.status(404).json({
        message: "Security log not found."
      })
    }

    return res.json(log)
  } catch (error) {
    return handleError(res, error)
  }
}

export const visitorCheckIn = async (req, res) => {
  try {
    const { visitorId, staffId, remarks } = req.body

    if (!validId(visitorId)) {
      return res.status(400).json({
        message: "A valid Visitor ID is required."
      })
    }

    if (
      staffId !== undefined &&
      staffId !== null &&
      staffId !== "" &&
      !validId(staffId)
    ) {
      return res.status(400).json({
        message: "Staff ID must be a valid positive integer."
      })
    }

    if (
      remarks !== undefined &&
      remarks !== null &&
      typeof remarks !== "string"
    ) {
      return res.status(400).json({
        message: "Remarks must be text."
      })
    }

    const log = await checkInVisitor({
      visitorId: Number(visitorId),
      staffId:
        staffId === undefined || staffId === null || staffId === ""
          ? null
          : Number(staffId),
      remarks: remarks?.trim() || null
    })

    return res.status(201).json({
      message: "Visitor checked in successfully.",
      data: log
    })
  } catch (error) {
    return handleError(res, error)
  }
}

export const visitorCheckOut = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid security log ID."
      })
    }

    const log = await checkOutVisitor(Number(req.params.id))

    return res.json({
      message: "Visitor checked out successfully.",
      data: log
    })
  } catch (error) {
    return handleError(res, error)
  }
}
