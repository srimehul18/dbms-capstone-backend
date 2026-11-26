
import express from "express";

import {
  getPayments,
  getPayment,
  addPayment,
  editPayment,
  removePayment,
  uploadPaymentProof,
  createRazorpayOrder,
  verifyRazorpayPayment
} from "../controllers/paymentController.js";

import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/", getPayments);
router.get("/:id", getPayment);

// Cloudinary payment proof
router.post(
  "/:id/proof",
  upload.single("proof"),
  uploadPaymentProof
);

// Razorpay
router.post("/razorpay/order", createRazorpayOrder);
router.post("/razorpay/verify", verifyRazorpayPayment);

// Existing CRUD
router.post("/", addPayment);
router.put("/:id", editPayment);
router.delete("/:id", removePayment);

export default router;
