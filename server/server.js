import express from "express";
import dotenv from "dotenv";
import chatRoute from "./routes/chat.route.js";
import cors from 'cors'

dotenv.config();

const app = express();

app.use(cors({
  origin: "https://ai-assistant-1-wn6p.onrender.com",
  credentials: true
}))

app.use(express.json());
app.use("/api", chatRoute);

const PORT =process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
