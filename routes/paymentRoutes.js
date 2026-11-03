
import express from "express"
import {
  getPayments,
  getPayment,
  addPayment,
  editPayment,
  removePayment
} from "../controllers/paymentController.js"

const router = express.Router()

router.get("/", getPayments)
router.get("/:id", getPayment)
router.post("/", addPayment)
router.put("/:id", editPayment)
router.delete("/:id", removePayment)

export default router
