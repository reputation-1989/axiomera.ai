import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { DynamicCouncilEngine } from "./engines/DynamicCouncilEngine.js";

dotenv.config();
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

app.post("/api/debate", async (req, res) => {
  try {
    const { prompt, selectedModels = [], history = [], preset = "general" } = req.body;

    // Use the OpenRouter API Key from env
    const apiKey = process.env.OPENROUTER_API_KEY || "";
    const models = selectedModels.length > 0 ? selectedModels : ["meta-llama/llama-3.3-70b-instruct:free"];
    
    const engine = new DynamicCouncilEngine(models, apiKey);
    const result = await engine.run(prompt, history, preset);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, "0.0.0.0", () => console.log("🚀 Orchestrator Online"));
