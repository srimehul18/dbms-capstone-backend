import express from "express" 
import cors from "cors" 
import residentRoutes from "./routes/residentRoutes.js" 
import apartmentRoutes from "./routes/apartmentRoutes.js"
import complaintRoutes from "./routes/complaintRoutes.js"
import staffRoutes from "./routes/staffRoutes.js"
import amenityRoutes from "./routes/amenityRoutes.js"

const app = express() 

app.use(cors({ origin: "http://localhost:5173" })) 
app.use(express.json()) 

app.get("/", (req, res) => {
  res.json({ message: "MySociety API is running" }) 
}) 

app.use("/api/residents", residentRoutes) 
app.use("/api/apartments", apartmentRoutes)
app.use("/api/complaints", complaintRoutes)
app.use("/api/staff", staffRoutes)
app.use("/api/amenities", amenityRoutes)


export default app 
