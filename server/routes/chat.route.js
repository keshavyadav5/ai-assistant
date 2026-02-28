import express from "express";

import { chat } from "../controllers/chat.controller.js";
import { upload } from "../utils/multer.js";

const router = express.Router();

router.post("/chat", upload.single("image"), chat);

export default router;