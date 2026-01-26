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
  try {
    const { prompt, selectedModels = [], history = [], preset = "general" } = req.body;
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
    if (models.length >= 2) {
      // Use Advanced Debate with first two models
      console.log(`Using AdvancedDebateEngine with ${models[0]} and ${models[1]}`);
      const engine = new AdvancedDebateEngine(models[0], models[1], apiKey);
      result = await engine.run(augmentedPrompt, { enableCodeExecution: preset === 'coding' });
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
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Orchestrator Online on port ${PORT}`));
