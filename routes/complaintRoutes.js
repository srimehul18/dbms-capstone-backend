
import { Router } from "express"

import {
  getComplaints,
  addComplaint,
  editComplaint,
  removeComplaint
} from "../controllers/complaintController.js"

const router = Router()

router.get("/", getComplaints)
router.post("/", addComplaint)
router.put("/:id", editComplaint)
router.delete("/:id", removeComplaint)

export default router
