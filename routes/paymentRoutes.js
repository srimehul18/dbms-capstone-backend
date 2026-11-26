
import express from "express";

import {
  getPayments,
  getPayment,
  addPayment,
  editPayment,
  removePayment,
  uploadPaymentProof
} from "../controllers/paymentController.js";

import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/", getPayments);
router.get("/:id", getPayment);

// Upload payment proof
router.post("/:id/proof", upload.single("proof"), uploadPaymentProof);

router.post("/", addPayment);
router.put("/:id", editPayment);
router.delete("/:id", removePayment);

export default router;
