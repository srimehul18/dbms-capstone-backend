
import express from "express"
import {
  getVisitors,
  getVisitor,
  addVisitor,
  editVisitor,
  removeVisitor
} from "../controllers/visitorController.js"

const router = express.Router()

router.get("/", getVisitors)
router.get("/:id", getVisitor)
router.post("/", addVisitor)
router.put("/:id", editVisitor)
router.delete("/:id", removeVisitor)

export default router
