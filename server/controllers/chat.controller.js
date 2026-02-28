import { askAi } from "../services/openRouter.service.js";
import {
  createSession,
  addMessage,
  getMessages,
  sessionExists
} from "../utils/sessionManager.js";
import { getSystemPrompt } from "../scenarios/technicalAssistant.js";

export const chat = async (req, res) => {
  try {
    const { sessionId, scenario, message } = req.body;
    const image = req.file; // multer gives file here
    if (!sessionId || !scenario) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create session if not exists
    if (!sessionExists(sessionId)) {
      const systemPrompt = getSystemPrompt(scenario);
      createSession(sessionId, systemPrompt);
    }

    // 🖼 Handle Image (if exists)
    if (image) {
      const base64Image = image.buffer.toString("base64");

      const imageContent = {
        type: "image_url",
        image_url: {
          url: `data:${image.mimetype};base64,${base64Image}`
        }
      };

      addMessage(sessionId, "user", [
        { type: "text", text: message || "Please analyze this image." },
        imageContent
      ]);

    } else {
      // Normal text message
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      addMessage(sessionId, "user", message);
    }

    // Get full conversation
    const messages = getMessages(sessionId);

    // Call LLM
    const aiReply = await askAi(messages);

    // Store AI reply
    addMessage(sessionId, "assistant", aiReply);

    // Send response
    res.json({ reply: aiReply });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Chat processing failed" });
  }
};