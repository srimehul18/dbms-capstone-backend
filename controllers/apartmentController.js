
import {
  getAllApartments,
  createApartment,
  updateApartment,
  deleteApartment
} from "../models/apartmentModel.js"

const validStatuses = ["Occupied", "Vacant", "Under Maintenance"]

function validateApartment(data) {
  const { apartment, block, floor, type, area, status } = data
  const floorNumber = Number(floor)

  if (
    typeof apartment !== "string" ||
    !apartment.trim() ||
    typeof block !== "string" ||
    !block.trim() ||
    !Number.isInteger(floorNumber) ||
    floorNumber < 0 ||
    typeof type !== "string" ||
    !type.trim() ||
    (area != null && (
      area === "" ||
      !Number.isFinite(Number(area)) ||
      Number(area) <= 0
    )) ||
    !validStatuses.includes(status)
  ) {
    return null
  }

  return {
    apartment,
    block,
    floor: floorNumber,
    type,
    area: area == null || area === "" ? null : Number(area),
    status
  }
}

export async function getApartments(req, res) {
  try {
    const apartments = await getAllApartments()
    res.json(apartments)
  } catch (error) {
    console.error("Failed to fetch apartments:", error.message)
    res.status(500).json({ message: "Failed to fetch apartments" })
  }
}

export async function addApartment(req, res) {
  const data = validateApartment(req.body)

  if (!data) {
    return res.status(400).json({
      message: "Please provide valid apartment details"
    })
  }

  try {
    const apartment = await createApartment(data)
    res.status(201).json(apartment)
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "This apartment number already exists"
      })
    }

    console.error("Failed to create apartment:", error.message)
    res.status(500).json({ message: "Failed to create apartment" })
  }
}

export async function editApartment(req, res) {
  const id = Number(req.params.id)
  const data = validateApartment(req.body)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid apartment ID" })
  }

  if (!data) {
    return res.status(400).json({
      message: "Please provide valid apartment details"
    })
  }

  try {
    const apartment = await updateApartment(id, data)

    if (!apartment) {
      return res.status(404).json({ message: "Apartment not found" })
    }

    res.json(apartment)
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "This apartment number already exists"
      })
    }

    console.error("Failed to update apartment:", error.message)
    res.status(500).json({ message: "Failed to update apartment" })
  }
}

export async function removeApartment(req, res) {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid apartment ID" })
  }

  try {
    const deleted = await deleteApartment(id)

    if (!deleted) {
      return res.status(404).json({ message: "Apartment not found" })
    }

    res.json({ message: "Apartment deleted successfully" })
  } catch (error) {
    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(409).json({
        message: "This apartment has associated records and cannot be deleted"
      })
    }

    console.error("Failed to delete apartment:", error.message)
    res.status(500).json({ message: "Failed to delete apartment" })
  }
}
