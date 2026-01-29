import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

console.log("🚀 Quiz Generator Server");
console.log("🤖 AI Sources:", {
  googleAppsScript: !!APPS_SCRIPT_URL,
  groqApi: !!GROQ_API_KEY ? "✅ FREE & READY" : "❌ NOT SET"
});

if (!GROQ_API_KEY) {
  console.log("\n⚠️  IMPORTANT: Get FREE Groq API Key (2 minutes):");
  console.log("   1. Go to: https://console.groq.com/signup");
  console.log("   2. Sign up (no credit card)");
  console.log("   3. Copy API key from dashboard");
  console.log("   4. Add to .env: GROQ_API_KEY=your_key_here\n");
}

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "running",
    service: "Quiz Generator API",
    aiAvailable: {
      groq: !!GROQ_API_KEY,
      googleAppsScript: !!APPS_SCRIPT_URL,
      mock: true
    },
    note: !GROQ_API_KEY ? "Add GROQ_API_KEY for AI generation" : "Ready to generate quizzes"
  });
});

// Helper: call Groq API for a chunk of content
async function generateQuizFromGroq(contentChunk, qCount, type, difficulty) {
  const prompt =
    type === "Multiple Choice"
      ? `Generate exactly ${qCount} multiple-choice questions (${difficulty} difficulty) from the content below. 
Each question must have 4 options labeled A-D and correctIndex (0-3). Return only a JSON array. 
Do not skip any questions. Output must contain exactly ${qCount} questions.

CONTENT:
${contentChunk}`
      : `Generate exactly ${qCount} open-ended questions (${difficulty} difficulty).

CONTENT:
${contentChunk}


INSTRUCTIONS:
1. Create ${qCount} thought-provoking questions
2. Provide comprehensive sample answers
3. Return ONLY this JSON format, no other text:

[{"id":"1","prompt":"Thoughtful question?","sampleAnswer":"Detailed answer here."}]

CONTENT:
${contentChunk}

INSTRUCTIONS:
1. Create ${qCount} thought-provoking questions
2. Provide comprehensive sample answers
3. Return ONLY this JSON format, no other text:

[{"id":"1","prompt":"Thoughtful question?","sampleAnswer":"Detailed answer here."}]`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", //  model
        messages: [
          { role: "system", content: "You are a quiz generator. Return only JSON array." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
      timeout: 30000
    });


    if (!response.ok) {
      console.log("❌ Groq API error:", response.status);
      return [];
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) return [];

    // Try parsing JSON
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
      if (parsed.data && Array.isArray(parsed.data)) return parsed.data;

      // Fallback: regex extract
      const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) return JSON.parse(match[0]);
      return [];
    } catch (parseError) {
      console.log("❌ JSON parse error:", parseError.message);
      return [];
    }

  } catch (err) {
    console.log("❌ Groq connection failed:", err.message);
    return [];
  }
}

// Main endpoint
app.post("/generate-quiz", async (req, res) => {
  console.log("📩 Quiz request received");
  const startTime = Date.now();

  try {
    const { documentContent, quantity = 5, quizType = "mcq", difficulty = "medium" } = req.body;

    if (!documentContent || documentContent.trim().length < 50) {
      return res.status(400).json({
        success: false,
        error: "Content too short",
        message: "Please provide at least 50 characters"
      });
    }

    const qCount = Math.min(quantity, 10);
    const type = quizType === "mcq" ? "Multiple Choice" : "Open Ended";

    console.log(`⚙️  Config: ${qCount} ${type} questions (${difficulty})`);

    let questions = [];
    let source = "mock";
    let aiUsed = false;

    // If Groq API key exists, try generating AI questions in chunks
    if (GROQ_API_KEY) {
      const paragraphs = documentContent.split(/\n\n/); // split by double newline
      for (let para of paragraphs) {
        if (questions.length >= qCount) break;
        if (GROQ_API_KEY) {
          const chunk = documentContent.substring(0, 5000); // 5000 chars 
          console.log("🔹 Groq prompt preview:", chunk.substring(0, 100));
          const chunkQuestions = await generateQuizFromGroq(chunk, qCount, type, difficulty);
          questions.push(...chunkQuestions);
        }

      }
      if (questions.length > 0) {
        aiUsed = true;
        source = "groq";
        console.log(`🎯 Groq generated ${questions.length} questions`);
      }
    }

    // Fallback to mock data if Groq fails or returns nothing
    if (!aiUsed || questions.length === 0) {
      console.log("🔄 Using intelligent mock data...");
      questions = generateSmartMockQuestions(qCount, type, documentContent);
      source = "mock";
    }

    // Format questions
    questions = questions.slice(0, qCount).map((q, i) => ({
      id: String(q.id || i + 1),
      prompt: q.prompt || q.question || `Question ${i + 1} about the content`,
      options: q.options || ["Option A", "Option B", "Option C", "Option D"],
      correctIndex: q.correctIndex !== undefined ? q.correctIndex : i % 4,
      sampleAnswer: q.sampleAnswer || q.answer || `Sample answer for question ${i + 1}`,
      explanation: q.explanation || ""
    }));

    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      questions,
      count: questions.length,
      quizType: type,
      difficulty,
      source,
      responseTime: `${responseTime}ms`,
      generatedAt: new Date().toISOString(),
      note:
        source === "groq"
          ? "Generated via Groq API (Llama 3 70B) - 100% Free"
          : source === "google-apps-script"
            ? "Generated via Google Apps Script"
            : "Using smart mock data. Add Groq API key for AI generation."
    });
  } catch (error) {
    console.error("🔥 Server error:", error);

    const questions = generateSmartMockQuestions(5, "mcq", "");

    res.json({
      success: true,
      questions,
      source: "error-fallback",
      error: error.message,
      generatedAt: new Date().toISOString()
    });
  }
});

// Smart mock generator
function generateSmartMockQuestions(count, type, content) {
  const qCount = Math.min(count, 10);
  const words = content.toLowerCase().match(/\b(\w+)\b/g) || [];
  const keywords = [...new Set(words)].slice(0, 5).join(', ');

  if (type === "Multiple Choice") {
    return Array.from({ length: qCount }, (_, i) => {
      const questionTypes = [
        `What is the main idea about "${keywords}"?`,
        `Which statement accurately describes "${keywords}"?`,
        `Based on the content, what can be inferred about "${keywords}"?`,
        `What is a key concept related to "${keywords}"?`
      ];

      return {
        id: String(i + 1),
        prompt: questionTypes[i % questionTypes.length],
        options: [
          "It is a fundamental concept discussed in the content",
          "It involves multiple interconnected processes",
          "It requires further analysis and understanding",
          "All of the above are relevant aspects"
        ],
        correctIndex: 3,
        explanation: "This question tests comprehension of the content's main themes."
      };
    });
  } else {
    return Array.from({ length: qCount }, (_, i) => ({
      id: String(i + 1),
      prompt: `Explain the significance of "${keywords}" based on the content. (Question ${i + 1})`,
      sampleAnswer: `The content discusses important concepts related to ${keywords}. A thorough answer would analyze the key points, provide examples from the text, and demonstrate understanding of how these concepts interconnect and apply to the broader subject matter.`
    }));
  }
}
app.post("/generate-timetable", async (req, res) => {
  try {
    const {
      courses,
      availableHours,
      startTime,
      endTime,
      selectedDays
    } = req.body;

    if (!courses || courses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No courses provided"
      });
    }

    const timetable = [];
    const startHour = Number(startTime.split(":")[0]);
    const endHour = Number(endTime.split(":")[0]);
    const totalHours = Math.min(availableHours, endHour - startHour);

    selectedDays.forEach(day => {
      courses.forEach((course, index) => {
        const hour = startHour + (index % totalHours);
        timetable.push({
          day,
          course: course.name,
          time: `${hour}:00 - ${hour + 1}:00`
        });
      });
    });

    res.json({
      success: true,
      timetable,
      source: "backend-logic",
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Timetable error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate timetable"
    });
  }
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`
🎉 QUIZ GENERATOR SERVER
===============================
Port: ${PORT}

${GROQ_API_KEY ? '✅ Groq API: READY (100% FREE)' : '❌ Groq API: NOT SET'}
${APPS_SCRIPT_URL ? '✅ Google Apps Script: CONNECTED' : '❌ Apps Script: NOT SET'}
✅ Smart Mock Data: ALWAYS AVAILABLE

📡 Endpoints:
- Health: http://localhost:${PORT}
- Generate Quiz: POST http://localhost:${PORT}/generate-quiz

🚀 Ready to generate quizzes!
`);
});
