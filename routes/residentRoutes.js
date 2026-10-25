
import { Router } from "express"

import {
  getResidents,
  addResident,
  editResident,
  removeResident
} from "../controllers/residentController.js"

const router = Router()

router.get("/", getResidents)
router.post("/", addResident)
router.put("/:id", editResident)
router.delete("/:id", removeResident)

export default router
