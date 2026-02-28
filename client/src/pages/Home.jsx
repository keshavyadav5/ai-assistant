import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Mic, MicOff, Plus, Send } from "lucide-react";

const Home = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);
  const isListeningRef = useRef(false); // new ref to track actual listening state

  const [sessionId] = useState(() => crypto.randomUUID());

  /* ---------------- LOAD VOICES ---------------- */
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setSelectedVoice(voices[0]);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  /* ---------------- SPEAK FUNCTION ---------------- */
  const speakText = (text) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      if (selectedVoice) utterance.voice = selectedVoice;

      utterance.rate = 0.95;

      utterance.onstart = () => {
        setIsAIPlaying(true);
        stopMic(); // stop mic while AI speaks
      };

      utterance.onend = () => {
        setIsAIPlaying(false);
        // Restart mic if it was on before AI started speaking
        if (isMicOn) startMic();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  useEffect(() => {
    if (!selectedScenario) return;
    if (isAIPlaying) return;
    // Auto-start mic when scenario selected and AI not speaking
    // (commented out as in original, but can be enabled)
  }, [selectedScenario, isAIPlaying]);

  /* ---------------- INITIAL GREETING ---------------- */
  useEffect(() => {
    const greeting = "Hello dear. How can I help you today?";
    setMessages([{ role: "assistant", content: greeting }]);
    speakText(greeting);
  }, []);

  /* ---------------- AUTO SCROLL ---------------- */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------------- SPEECH RECOGNITION SETUP ---------------- */
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsMicOn(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      sendMessage(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);
      isListeningRef.current = false;
      setIsMicOn(false);
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setIsMicOn(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const startMic = () => {
    if (!recognitionRef.current) return;
    if (isAIPlaying) return;
    if (!selectedScenario) return;
    if (isListeningRef.current) return; // already listening

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error("Failed to start mic:", err);
      setIsMicOn(false);
    }
  };

  const stopMic = () => {
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop();
      // isListeningRef will be set false in onend/onerror
    }
  };

  const toggleMic = () => {
    if (isMicOn) {
      stopMic();
      // isMicOn will be updated by onend/onerror
    } else {
      startMic();
    }
  };

  /* ---------------- SCENARIO SELECT ---------------- */
  const handleScenarioSelect = async (scenario) => {
    setSelectedScenario(scenario);

    const text = `Great! You selected ${scenario}. Please tell me your issue.`;

    setMessages((prev) => [...prev, { role: "assistant", content: text }]);
    await speakText(text);
  };

  /* ---------------- SEND MESSAGE ---------------- */
  const sendMessage = async (overrideText) => {
    if (!selectedScenario) return;
    const userText = overrideText || input;
    if (!userText.trim() && !imageFile) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userText || "Image uploaded" }
    ]);

    setInput("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("scenario", selectedScenario);
      formData.append("message", userText);

      if (imageFile) {
        formData.append("image", imageFile);
      }
      // REMOVED THE ROGUE toggleMic() CALL

      const response = await axios.post(
        "http://localhost:5000/api/chat",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const aiText = response.data.reply;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiText }
      ]);

      await speakText(aiText);

    } catch (error) {
      console.error(error);
    }

    setImageFile(null);
    setLoading(false);
  };

  const handlePlusClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
    }
  };
  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  return (
    <div className="h-[80%] bg-gray-100 flex w-lg flex-col max-w-2xl mx-auto shadow-lg">

      <div className="bg-blue-600 text-white p-4 text-center text-xl font-semibold">
        AI Voice Assistant
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 hide">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`max-w-lg px-4 py-2 rounded-lg ${msg.role === "user"
              ? "bg-blue-500 text-white ml-auto w-[80%]"
              : "bg-white text-gray-800 w-[70%]"
              }`}
          >
            {msg.content}
          </div>
        ))}

        {!selectedScenario && (
          <div className="space-y-2">
            <button
              onClick={() => handleScenarioSelect("technicalAssistant")}
              className="block w-full bg-white border p-3 rounded-lg"
            >
              🔧 Technical Assistant
            </button>
            <button
              onClick={() => handleScenarioSelect("callingAgent")}
              className="block w-full bg-white border p-3 rounded-lg"
            >
              📅 Calling Agent
            </button>
            <button
              onClick={() => handleScenarioSelect("customerSupport")}
              className="block w-full bg-white border p-3 rounded-lg"
            >
              🎧 Customer Support
            </button>
          </div>
        )}

        {loading && (
          <div className="bg-white px-4 py-2 rounded-lg w-fit">
            Thinking...
          </div>
        )}

        <div ref={bottomRef} />
      </div>


      {selectedScenario && (
        <div className="p-4 bg-white flex gap-2 items-center w-full flex-col">
          {
            previewUrl && (
              <div className="relative w-20 h-20">
                <img
                  src={previewUrl}
                  alt="preview"
                  className="w-full h-full object-contain rounded-md"
                />
                <button
                  onClick={() => setImageFile(null)}
                  className="absolute top-0 right-0 bg-black text-white text-xs px-1 rounded"
                >
                  ✕
                </button>
              </div>
            )
          }

          {/* Mic Button */}
          <div className="flex-1 flex items-center w-full px-4">
            <button onClick={toggleMic}>
              {isMicOn ? (
                <Mic className="text-green-600 cursor-pointer" />
              ) : (
                <MicOff className="cursor-pointer" />
              )}
            </button>

            <div className="flex-1 flex items-center gap-2 border rounded-lg ml-3">


              {/* Hidden File Input */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
              />

              {/* Plus Icon  */}
              <button className="px-2" onClick={handlePlusClick}>
                <Plus className="cursor-pointer" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                className="flex-1 pr-4 py-2 outline-none border-0"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />

              <button className="px-2" >
                <Send className="cursor-pointer" onClick={() => sendMessage()} />
              </button>
            </div>


          </div>
        </div>
      )}
    </div>
  );
};

export default Home;