import express from "express" 
import cors from "cors" 
import residentRoutes from "./routes/residentRoutes.js" 
import apartmentRoutes from "./routes/apartmentRoutes.js"
import complaintRoutes from "./routes/complaintRoutes.js"
import staffRoutes from "./routes/staffRoutes.js"
import amenityRoutes from "./routes/amenityRoutes.js"
import maintenanceBillRoutes from "./routes/maintenanceBillRoutes.js"
import paymentRoutes from "./routes/paymentRoutes.js"
import amenityBookingRoutes from "./routes/amenityBookingRoutes.js"
import visitorRoutes from "./routes/visitorRoutes.js"
import securityLogRoutes from "./routes/securityLogRoutes.js"

const app = express() 

const allowedOrigins = [
  "http://localhost:5173",
  "https://societymanagmentsystem-six.vercel.app"
]

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))
app.use(express.json()) 

app.get("/", (req, res) => {
  res.json({ message: "MySociety API is running" }) 
}) 

app.use("/api/residents", residentRoutes) 
app.use("/api/apartments", apartmentRoutes)
app.use("/api/complaints", complaintRoutes)
app.use("/api/staff", staffRoutes)
app.use("/api/amenities", amenityRoutes)
app.use("/api/maintenance", maintenanceBillRoutes)
app.use("/api/payments", paymentRoutes)
app.use("/api/amenity-bookings", amenityBookingRoutes)
app.use("/api/visitors", visitorRoutes)
app.use("/api/security-logs", securityLogRoutes)

export default app 
