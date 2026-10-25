
import { Router } from "express"

import {
  getApartments,
  addApartment,
  editApartment,
  removeApartment
} from "../controllers/apartmentController.js"

const router = Router()

router.get("/", getApartments)
router.post("/", addApartment)
router.put("/:id", editApartment)
router.delete("/:id", removeApartment)

export default router
