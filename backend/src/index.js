import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { SimpleCouncilEngine } from "./engines/SimpleCouncilEngine.js";
import { AdvancedDebateEngine } from "./engines/AdvancedDebateEngine.js";
import { classifyQuery } from "./queryClassifier.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.post("/api/debate", async (req, res) => {
  try {
    const { prompt, selectedModels = [], history = [], preset = "general" } = req.body;

    // Default models if none selected
    const models = selectedModels.length > 0 ? selectedModels : ["meta-llama/llama-3.3-70b-instruct:free"];

    // Classify Query
    const classification = classifyQuery(prompt);

    let result;

    if (models.length > 1) {
      // Advanced Debate Engine (Multiple models)
      // We use the first two models for the debate as AdvancedDebateEngine takes 2
      const engine = new AdvancedDebateEngine(models[0], models[1], OPENROUTER_API_KEY);
      result = await engine.run(prompt, classification);
    } else {
      // Simple Council Engine (Single model)
      const engine = new SimpleCouncilEngine({
        solverModel: models[0],
        verifierModel: models[0], // Use same model for verification in simple mode
        apiKey: OPENROUTER_API_KEY
      });
      result = await engine.run(prompt, classification);
    }

    res.json(result);

  } catch (err) {
    console.error("Error in /api/debate:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, "0.0.0.0", () => console.log("🚀 Orchestrator Online"));
