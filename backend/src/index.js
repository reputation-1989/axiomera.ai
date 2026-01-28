import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";
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
    const { prompt, selectedModels = [], preset = "general" } = req.body;
    
    const defaultModel = "meta-llama/llama-3.3-70b-instruct:free";
    const modelA = selectedModels[0] || defaultModel;
    const modelB = selectedModels[1] || modelA; // Use same model for critique if only one selected

    const searchData = await performWebSearch(prompt);
    const context = searchData ? `\n\n[LIVE_DATA from Web Search]:\n${JSON.stringify(searchData)}` : "";
    const fullPrompt = prompt + context;

    const isCoding = preset === 'coding' || prompt.toLowerCase().includes('code') || prompt.toLowerCase().includes('function');

    const engine = new AdvancedDebateEngine(modelA, modelB, process.env.OPENROUTER_API_KEY);
    const result = await engine.run(fullPrompt, { enableCodeExecution: isCoding });

    const finalTranscript = [
      ...(searchData ? [{ phase: "Grounding", output: `Retrieved ${searchData.length} live research points.` }] : []),
      ...result.transcript
    ];

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

app.listen(3000, "0.0.0.0", () => console.log("🚀 Orchestrator Online"));
