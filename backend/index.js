import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";
import { SimpleCouncilEngine } from "./engines/SimpleCouncilEngine.js";
import { AdvancedDebateEngine } from "./engines/AdvancedDebateEngine.js";

dotenv.config();
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// --- Rate Limiting / Queue Logic (In-Memory) ---
const MAX_CONCURRENT_DEBATES = 5;
let activeDebates = 0;

const PRESETS = {
  general: {
    architect: "You are a Lead Architect. You are logical, helpful, and constructive.",
    auditor: "You are a Critical Auditor. You fact-check everything and look for logical fallacies.",
    synthesizer: "You are a Synthesizer. You balance different viewpoints into a coherent answer."
  },
  coding: {
    architect: "You are a Senior Developer. Write clean, efficient, and documented code.",
    auditor: "You are a Security Specialist. Look for edge cases, vulnerabilities, and inefficiencies.",
    synthesizer: "You are a Tech Lead. Optimize the solution and ensure best practices."
  },
  academic: {
    architect: "You are a Scholar. Focus on theoretical depth and citation of first principles.",
    auditor: "You are a Peer Reviewer. Challenge assumptions and demand rigorous proof.",
    synthesizer: "You are a Professor. Explain the consensus with clarity and nuance."
  },
  research: {
    architect: "You are a Data Analyst. Look for patterns and underlying trends.",
    auditor: "You are Counter-Intelligence. Verify sources and check for bias.",
    synthesizer: "You are a Director. Summarize the findings into actionable intelligence."
  }
};

async function performWebSearch(query) {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey || !tavilyKey.startsWith("tvly")) return null;
  try {
    const res = await axios.post('https://api.tavily.com/search', {
      api_key: tavilyKey, query, search_depth: "smart", max_results: 5
    });
    return res.data.results.map(r => ({ title: r.title, url: r.url }));
  } catch (error) { return null; }
}

app.post("/api/debate", async (req, res) => {
  if (activeDebates >= MAX_CONCURRENT_DEBATES) {
    return res.status(503).json({ error: "The Council is currently at maximum capacity. Please try again in a moment." });
  }

  activeDebates++;
  try {
    const { prompt, selectedModels = [], history = [], preset = "general" } = req.body;

    // Basic validation
    if (!prompt || typeof prompt !== 'string') {
        throw new Error("Invalid prompt provided.");
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    // Default model if none selected
    const models = selectedModels.length > 0 ? selectedModels : ["meta-llama/llama-3.3-70b-instruct:free"];

    // 1. Web Search / Grounding
    const searchData = await performWebSearch(prompt);
    const transcript = [];
    let augmentedPrompt = prompt;

    if (searchData) {
      transcript.push({ phase: "Grounding", output: `Retrieved ${searchData.length} live research points.` });
      augmentedPrompt += `\n\n[LIVE_DATA]:\n${JSON.stringify(searchData)}`;
    }

    // 2. Select Engine
    let result;
    const roles = PRESETS[preset] || PRESETS.general;

    if (models.length >= 2) {
      // Use Advanced Debate with first two models
      console.log(`Using AdvancedDebateEngine with ${models[0]} and ${models[1]}`);
      const engine = new AdvancedDebateEngine(models[0], models[1], apiKey);
      result = await engine.run(augmentedPrompt, {
        enableCodeExecution: preset === 'coding',
        roles
      });
    } else {
      // Use Simple Council with single model
      console.log(`Using SimpleCouncilEngine with ${models[0]}`);
      const engine = new SimpleCouncilEngine({
        solverModel: models[0],
        verifierModel: models[0],
        apiKey
      });
      result = await engine.run(augmentedPrompt, { enableCodeExecution: preset === 'coding' });
    }

    // 3. Merge Transcripts
    const finalTranscript = [...transcript, ...result.transcript];

    res.json({
      finalAnswer: result.finalAnswer,
      transcript: finalTranscript,
      metadata: { sources: searchData || [], duration: result.metadata?.duration }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    activeDebates--;
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Orchestrator Online on port ${PORT}`));
