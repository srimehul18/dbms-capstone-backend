
import express from "express"
import {
  getSecurityLogs,
  getSecurityLog,
  visitorCheckIn,
  visitorCheckOut
} from "../controllers/securityLogController.js"

const router = express.Router()

router.get("/", getSecurityLogs)
router.get("/:id", getSecurityLog)
router.post("/check-in", visitorCheckIn)
router.patch("/:id/check-out", visitorCheckOut)

export default router
