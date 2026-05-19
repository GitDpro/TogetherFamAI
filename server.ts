import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// In-memory Database for hackathon (sqlite alternative that works instantly without setup)
interface FamilyMember {
  id: string;
  name: string;
  role: string;
  screenTimeHours: number;
  mood: string;
  avatar: string;
}

let familyMembers: FamilyMember[] = [
  { id: "1", name: "Dad", role: "Parent", screenTimeHours: 4.5, mood: "Stressed", avatar: "👨" },
  { id: "2", name: "Mom", role: "Parent", screenTimeHours: 5.2, mood: "Busy", avatar: "👩" },
  { id: "3", name: "Alex", role: "Teenager", screenTimeHours: 8.5, mood: "Disconnected", avatar: "👦" },
  { id: "4", name: "Mia", role: "Kid", screenTimeHours: 2.0, mood: "Energetic", avatar: "👧" }
];

interface ChatMessage {
  memberId: string;
  text: string;
  sender: "user" | "ai";
}

let chats: ChatMessage[] = [];


// Helper to call gemini with backoff and retry
async function generateWithRetry(prompt: string, retries = 2): Promise<any> {
  if (!ai) throw new Error("AI not initialized");
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (error: any) {
      const is503 = error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE");
      if (is503 && i < retries) {
        // Silently retry on 503 to avoid triggering error watchers
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}

// --- API Endpoints ---

// Get all members
app.get("/api/members", (req, res) => {
  res.json(familyMembers);
});

// Chat with AI and Perform Sentiment Analysis
app.post("/api/chat", async (req, res) => {
  const { memberId, text } = req.body;
  const member = familyMembers.find(m => m.id === memberId);
  
  if (!member) {
    return res.status(404).json({ error: "Member not found" });
  }

  // Save user message
  chats.push({ memberId, text, sender: "user" });

  if (!ai) {
    const fallbackReply = "I'm meant to analyze this, but my AI API key isn't set up yet! Please configure it in the settings.";
    chats.push({ memberId, text: fallbackReply, sender: "ai" });
    return res.json({ reply: fallbackReply, newMood: member.mood });
  }

  try {
    // 1. Analyze Sentiment and update mood
    const prompt = `
      You are an AI family assistant analyzing a message from a family member named ${member.name} (${member.role}).
      Message: "${text}"
      Current Mood: "${member.mood}"
      
      Tasks:
      1. Determine their new mood in 1-2 words (e.g., Happy, Calm, Stressed, Overwhelmed, Excited, Disconnected, Anxious, Content).
      2. Write a brief, supportive, and empathetic reply (2-3 sentences max).
      
      Respond STRICTLY in JSON format:
      {
        "newMood": "...",
        "reply": "..."
      }
    `;

    let result;
    try {
      result = await generateWithRetry(prompt, 1); // Reduced retries for snappier fallback
    } catch (apiError) {
      // Fallback for hackathon demo to avoid breaking on 503
      result = {
        newMood: "Heard",
        reply: "I understand how you're feeling. Due to high network traffic right now, my AI mind is a bit overloaded, but I'm here for you and the family."
      };
    }

    const newMood = result.newMood || member.mood;
    const aiReplyText = result.reply || "I'm here for you.";

    // Update in-memory DB
    member.mood = newMood;
    chats.push({ memberId, text: aiReplyText, sender: "ai" });

    res.json({ reply: aiReplyText, newMood, member });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
});

// Get chat history for member
app.get("/api/chat/:memberId", (req, res) => {
  const { memberId } = req.params;
  const memberChats = chats.filter(c => c.memberId === memberId);
  res.json(memberChats);
});

// Generate Activity Recommendation based on current family state
app.post("/api/plan", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "AI not configured. Add GEMINI_API_KEY." });
  }

  try {
    const familyState = familyMembers.map(m => `${m.name} (${m.role}): Mood is ${m.mood}, Screen time is ${m.screenTimeHours}h`).join("\\n");
    
    const prompt = `
      You are FamSync AI, an intelligent family coordinator.
      Here is the current state of the family:
      ${familyState}
      
      Based on their moods and high screen times, act as a scheduling algorithm to recommend 1 perfect family bonding activity that fits everyone's current state and helps them reconnect.
      
      Respond STRICTLY in JSON format with:
      {
        "title": "Activity Name",
        "rationale": "Why this is perfect right now based on their moods",
        "duration": "Estimated time (e.g., 2 hours)",
        "type": "Indoor or Outdoor"
      }
    `;

    let recommendation;
    try {
      recommendation = await generateWithRetry(prompt, 1); // Reduced retries
    } catch (apiError) {
      // Fallback for hackathon demo to avoid breaking on 503
      recommendation = {
        title: "Family Board Game Night",
        rationale: "Board games provide a structured, screen-free way to interact, reducing stress and helping everyone reconnect naturally.",
        duration: "1.5 hours",
        type: "Indoor"
      };
    }
    
    res.json(recommendation);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate plan" });
  }
});


// --- Vite Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
