import {
  getAllAmenities,
  createAmenity,
  updateAmenity,
  deleteAmenity
} from "../models/amenityModel.js"

const validStatuses = [
  "Available",
  "Unavailable",
  "Under Maintenance"
]

const validateAmenity = (data) => {
  const errors = []

  const name = typeof data.name === "string" ? data.name.trim() : ""
  const capacity = Number(data.capacity)
  const fee = data.fee === "" || data.fee == null
    ? 0
    : Number(data.fee)

  if (!name) {
    errors.push("Amenity name is required")
  } else if (name.length > 100) {
    errors.push("Amenity name cannot exceed 100 characters")
  }

  if (
    data.location != null &&
    typeof data.location !== "string"
  ) {
    errors.push("Location must be text")
  } else if ((data.location || "").length > 100) {
    errors.push("Location cannot exceed 100 characters")
  }

  if (
    data.description != null &&
    typeof data.description !== "string"
  ) {
    errors.push("Description must be text")
  }

  if (!Number.isInteger(capacity) || capacity <= 0) {
    errors.push("Capacity must be a positive whole number")
  }

  if (!Number.isFinite(fee) || fee < 0) {
    errors.push("Booking fee must be a non-negative number")
  }

  if (fee > 99999999.99) {
    errors.push("Booking fee exceeds the allowed amount")
  }

  if (!validStatuses.includes(data.status || "Available")) {
    errors.push("Invalid amenity status")
  }

  return {
    errors,
    values: {
      name,
      description: data.description?.trim() || null,
      location: data.location?.trim() || null,
      capacity,
      fee,
      status: data.status || "Available"
    }
  }
}

const handleDatabaseError = (res, error, action) => {
  console.error(`Amenity ${action} error:`, error)

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: "An amenity with this name already exists"
    })
  }

  if (error.code === "ER_ROW_IS_REFERENCED_2") {
    return res.status(409).json({
      message: "This amenity is linked to existing bookings and cannot be deleted"
    })
  }

  return res.status(500).json({
    message: `Failed to ${action} amenity`
  })
}

export const getAmenities = async (req, res) => {
  try {
    const amenities = await getAllAmenities()
    res.status(200).json(amenities)
  } catch (error) {
    handleDatabaseError(res, error, "fetch")
  }
}

export const addAmenity = async (req, res) => {
  const { errors, values } = validateAmenity(req.body)

  if (errors.length) {
    return res.status(400).json({
      message: errors.join(", ")
    })
  }

  try {
    const amenity = await createAmenity(values)

    return res.status(201).json({
      message: "Amenity created successfully",
      amenity
    })
  } catch (error) {
    return handleDatabaseError(res, error, "create")
  }
}

export const editAmenity = async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "Invalid amenity ID"
    })
  }

  const { errors, values } = validateAmenity(req.body)

  if (errors.length) {
    return res.status(400).json({
      message: errors.join(", ")
    })
  }

  try {
    const amenity = await updateAmenity(id, values)

    if (!amenity) {
      return res.status(404).json({
        message: "Amenity not found"
      })
    }

    return res.status(200).json({
      message: "Amenity updated successfully",
      amenity
    })
  } catch (error) {
    return handleDatabaseError(res, error, "update")
  }
}

export const removeAmenity = async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "Invalid amenity ID"
    })
  }

  try {
    const deleted = await deleteAmenity(id)

    if (!deleted) {
      return res.status(404).json({
        message: "Amenity not found"
      })
    }

    return res.status(200).json({
      message: "Amenity deleted successfully"
    })
  } catch (error) {
    return handleDatabaseError(res, error, "delete")
  }
}
