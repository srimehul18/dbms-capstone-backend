import {
  getAllResidents,
  createResident,
  updateResident,
  deleteResident
} from "../models/residentModel.js" 

export async function getResidents(req, res) {
  try {
    const residents = await getAllResidents() 
    res.json(residents) 
  } catch (error) {
    console.error("Failed to fetch residents:", error.message) 

    res.status(500).json({
      message: "Failed to fetch residents",
    }) 
  }
}

export async function addResident(req, res) {
  const { name, apartment, phone, email, role, status } = req.body 

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof apartment !== "string" ||
    !apartment.trim() ||
    typeof phone !== "string" ||
    !phone.trim() ||
    (email != null && typeof email !== "string") ||
    !["Owner", "Tenant"].includes(role) ||
    !["Active", "Inactive"].includes(status)
  ) {
    return res.status(400).json({
      message: "Please provide valid resident details.",
    }) 
  }

  try {
    const resident = await createResident({
      name,
      apartment,
      phone,
      email,
      role,
      status,
    }) 

    res.status(201).json(resident) 
  } catch (error) {
    if (error.code === "APARTMENT_NOT_FOUND") {
      return res.status(400).json({
        message: error.message,
      }) 
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "That email address is already registered.",
      }) 
    }

    console.error("Failed to create resident:", error.message) 

    res.status(500).json({
      message: "Failed to create resident.",
    }) 
  }
}


export async function editResident(req, res) {
  const id = Number(req.params.id)
  const { name, apartment, phone, email, role, status } = req.body

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    typeof name !== "string" ||
    !name.trim() ||
    typeof apartment !== "string" ||
    !apartment.trim() ||
    typeof phone !== "string" ||
    !phone.trim() ||
    (email != null && typeof email !== "string") ||
    !["Owner", "Tenant"].includes(role) ||
    !["Active", "Inactive"].includes(status)
  ) {
    return res.status(400).json({
      message: "Please provide valid resident details"
    })
  }

  try {
    const resident = await updateResident(id, {
      name,
      apartment,
      phone,
      email,
      role,
      status
    })

    if (!resident) {
      return res.status(404).json({
        message: "Resident not found"
      })
    }

    res.json(resident)
  } catch (error) {
    if (error.code === "APARTMENT_NOT_FOUND") {
      return res.status(400).json({
        message: error.message
      })
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "That email address is already registered"
      })
    }

    console.error("Failed to update resident:", error.message)

    res.status(error.code === "ER_NO_REFERENCED_ROW_2" ? 400 : 500).json({
      message: "Failed to update resident"
    })
  }
}

export async function removeResident(req, res) {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "Invalid resident ID"
    })
  }

  try {
    const deleted = await deleteResident(id)

    if (!deleted) {
      return res.status(404).json({
        message: "Resident not found"
      })
    }

    res.json({
      message: "Resident deleted successfully"
    })
  } catch (error) {
    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(409).json({
        message: "This resident has related records and cannot be deleted"
      })
    }

    console.error("Failed to delete resident:", error.message)

    res.status(500).json({
      message: "Failed to delete resident"
    })
  }
}
