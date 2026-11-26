import db from "../config/db.js"
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  savePaymentProof,
  getOutstandingBillAmount,
  createPendingRazorpayPayment,
  getRazorpayPaymentByOrderId,
  markRazorpayPaymentSuccessful
} from "../models/paymentModel.js";
import razorpay from "../config/razorpay.js";
import crypto from "crypto";

import uploadToCloudinary from "../utils/uploadToCloudinary.js";

const getResidentApartmentId = async (residentId) => {
  if (!validId(residentId)) {
    return null
  }

  const [rows] = await db.query(
    `SELECT apartment_id
     FROM resident
     WHERE resident_id = ?`,
    [Number(residentId)]
  )

  return rows.length ? rows[0].apartment_id : null
}

const validId = (value) =>
  Number.isInteger(Number(value)) &&
  Number(value) > 0

const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return false
  }

  const date = new Date(`${value}T00:00:00Z`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

const validStatuses = [
  "Successful",
  "Pending",
  "Failed",
  "Refunded"
]

const validMethods = [
  "UPI",
  "Cash",
  "Bank Transfer",
  "Card",
  "Cheque",
  "Razorpay"
]


const validatePayment = (data) => {
  const {
    billId,
    amount,
    payDate,
    method,
    status
  } = data

  if (!validId(billId)) {
    return "A valid Bill ID is required."
  }

  if (
    amount === "" ||
    amount == null ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0
  ) {
    return "Amount must be greater than zero."
  }

  if (!validDate(payDate)) {
    return "Payment date must be a valid date in YYYY-MM-DD format."
  }

  if (!validMethods.includes(method)) {
    return "Select a valid payment method."
  }

  const effectiveStatus = status || "Pending"

  if (!validStatuses.includes(effectiveStatus)) {
    return "Select a valid payment status."
  }

  return null
}

const handleDatabaseError = (res, error) => {
  console.error("Payment API error:", error)

  if (
    error.code === "ER_NO_REFERENCED_ROW_2" ||
    error.code === "ER_NO_REFERENCED_ROW"
  ) {
    return res.status(400).json({
      message: "The specified Bill ID does not exist."
    })
  }

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: "This payment reference already exists."
    })
  }

  if (
    error.code === "ER_CHECK_CONSTRAINT_VIOLATED" ||
    error.code === "ER_DATA_TOO_LONG" ||
    error.code === "WARN_DATA_TRUNCATED"
  ) {
    return res.status(400).json({
      message: "One or more payment values are invalid."
    })
  }

  const businessRuleErrors = [
    "A future-dated payment cannot be recorded as successful.",
    "This bill has no outstanding balance. The payment would exceed the amount due.",
    "Successful payments cannot be edited. Use a controlled correction or refund process.",
    "Successful payments cannot be deleted. Use a controlled correction or refund process."
  ]

  if (businessRuleErrors.includes(error.message)) {
    return res.status(400).json({
      message: error.message
    })
  }

  if (
    error.message?.startsWith("Payment exceeds the remaining balance of ")
  ) {
    return res.status(400).json({
      message: error.message
    })
  }

  if (
    error.message === "A valid bill ID is required." ||
    error.message === "Payment amount must be greater than zero." ||
    error.message === "A valid payment date is required." ||
    error.message === "Payment method is required." ||
    error.message === "Select a valid payment status."
  ) {
    return res.status(400).json({
      message: error.message
    })
  }

  if (error.message?.startsWith("Maintenance bill ")) {
    return res.status(400).json({
      message: error.message
    })
  }

  return res.status(500).json({
    message: "A database error occurred while processing the payment."
  })
}

export const getPayments = async (req, res) => {
  try {
    const payments = await getAllPayments()
    const { residentId } = req.query

    if (residentId !== undefined) {
      const apartmentId = await getResidentApartmentId(residentId)

      if (apartmentId === null) {
        return res.status(404).json({
          message: "Resident not found."
        })
      }

      const [bills] = await db.query(
        `SELECT bill_id
         FROM maintenancebill
         WHERE apartment_id = ?`,
        [apartmentId]
      )

      const billIds = new Set(
        bills.map((bill) => Number(bill.bill_id))
      )

      return res.json(
        payments.filter((payment) =>
          billIds.has(Number(payment.billId))
        )
      )
    }

    return res.json(payments)
  } catch (error) {
    return handleDatabaseError(res, error)
  }
}

export const getPayment = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid payment ID."
      })
    }

    const payment = await getPaymentById(req.params.id)

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found."
      })
    }

    return res.json(payment)
  } catch (error) {
    return handleDatabaseError(res, error)
  }
}

export const addPayment = async (req, res) => {
  try {
    const validationError = validatePayment(req.body)

    if (validationError) {
      return res.status(400).json({
        message: validationError
      })
    }

    const payment = await createPayment(req.body)

    return res.status(201).json(payment)
  } catch (error) {
    return handleDatabaseError(res, error)
  }
}

export const editPayment = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid payment ID."
      })
    }

    const validationError = validatePayment(req.body)

    if (validationError) {
      return res.status(400).json({
        message: validationError
      })
    }

    const payment = await updatePayment(req.params.id, req.body)

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found."
      })
    }

    return res.json(payment)
  } catch (error) {
    return handleDatabaseError(res, error)
  }
}

export const removePayment = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid payment ID."
      })
    }

    const deleted = await deletePayment(req.params.id)

    if (!deleted) {
      return res.status(404).json({
        message: "Payment not found."
      })
    }

    return res.json({
      message: "Payment deleted successfully."
    })
  } catch (error) {
    return handleDatabaseError(res, error)
  }
}


export const uploadPaymentProof = async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid payment ID."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Please select a payment screenshot."
      });
    }

    // Check payment exists before uploading to Cloudinary
    const existingPayment = await getPaymentById(req.params.id);

    if (!existingPayment) {
      return res.status(404).json({
        message: "Payment not found."
      });
    }

    // Upload image to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer);

    // Save Cloudinary URL in MySQL
    const payment = await savePaymentProof(
      req.params.id,
      result.secure_url
    );

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found."
      });
    }

    return res.status(200).json({
      message: "Payment proof uploaded successfully.",
      payment
    });

  } catch (error) {
    console.error("Payment proof upload error:", error);

    return res.status(500).json({
      message: "Unable to upload payment proof."
    });
  }
};


export const createRazorpayOrder = async (req, res) => {
  try {
    const { billId, residentId } = req.body;

    if (!validId(billId) || !validId(residentId)) {
      return res.status(400).json({
        message: "Valid Bill ID and Resident ID are required."
      });
    }

    // Calculate amount on the backend, never trust the frontend amount.
    const bill = await getOutstandingBillAmount(
      billId,
      residentId
    );

    const amountInPaise = Math.round(
      bill.amountDue * 100
    );

    if (amountInPaise < 100) {
      return res.status(400).json({
        message: "Minimum Razorpay payment amount is ₹1."
      });
    }

    const receipt = `MS${billId}${Date.now()}`;

    // Create order using server-side Razorpay credentials.
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        billId: String(billId),
        residentId: String(residentId),
        project: "MySociety"
      }
    });

    // Store a Pending payment linked to this order.
    await createPendingRazorpayPayment({
      billId,
      residentId,
      orderId: order.id,
      orderAmount: order.amount
    });

    return res.status(201).json({
      message: "Razorpay order created successfully.",
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      billId: bill.billId
    });

  } catch (error) {
    console.error("Razorpay order error:", error);

    return res.status(400).json({
      message: error.message || "Unable to create Razorpay order."
    });
  }
};


export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        message: "Incomplete Razorpay payment details."
      });
    }

    // Confirm that this order belongs to our database.
    const existingPayment = await getRazorpayPaymentByOrderId(
      razorpay_order_id
    );

    if (!existingPayment) {
      return res.status(404).json({
        message: "Payment order not found."
      });
    }

    // Verify the HMAC SHA256 signature.
    const generatedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    const received = Buffer.from(razorpay_signature, "hex");
    const generated = Buffer.from(generatedSignature, "hex");

    if (
      received.length !== generated.length ||
      !crypto.timingSafeEqual(received, generated)
    ) {
      return res.status(400).json({
        message: "Invalid Razorpay payment signature."
      });
    }

    // Fetch payment directly from Razorpay.
    const gatewayPayment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      gatewayPayment.order_id !== razorpay_order_id ||
      Number(gatewayPayment.amount) !==
        Math.round(Number(existingPayment.amount) * 100) ||
      gatewayPayment.currency !== "INR"
    ) {
      return res.status(400).json({
        message: "Razorpay payment details do not match our order."
      });
    }

    // Only captured payments are recorded as Successful.
    if (gatewayPayment.status !== "captured") {
      return res.status(409).json({
        message: `Payment is not captured yet. Current status: ${gatewayPayment.status}`
      });
    }

    const payment = await markRazorpayPaymentSuccessful({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id
    });

    return res.status(200).json({
      message: "Payment verified successfully.",
      payment
    });

  } catch (error) {
    console.error("Razorpay verification error:", error);

    return res.status(500).json({
      message: "Unable to verify Razorpay payment."
    });
  }
};
