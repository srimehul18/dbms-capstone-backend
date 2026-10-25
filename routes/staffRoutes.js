
import { Router } from "express"

import {
  getStaff,
  addStaff,
  editStaff,
  removeStaff
} from "../controllers/staffController.js"

const router = Router()

router.get("/", getStaff)
router.post("/", addStaff)
router.put("/:id", editStaff)
router.delete("/:id", removeStaff)

export default router
