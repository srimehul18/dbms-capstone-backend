import { Router } from "express"

import {
  getBills,
  getBill,
  addBill,
  editBill,
  removeBill
} from "../controllers/maintenanceBillController.js"

const router = Router()

router.get("/", getBills)
router.get("/:id", getBill)
router.post("/", addBill)
router.put("/:id", editBill)
router.delete("/:id", removeBill)

export default router
