
import { Router } from "express"

import {
  getAmenities,
  addAmenity,
  editAmenity,
  removeAmenity
} from "../controllers/amenityController.js"

const router = Router()

router.get("/", getAmenities)
router.post("/", addAmenity)
router.put("/:id", editAmenity)
router.delete("/:id", removeAmenity)

export default router
