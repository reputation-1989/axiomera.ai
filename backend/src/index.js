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
    const { prompt, selectedModels = [], history = [] } = req.body;

    const models = selectedModels.length > 0
      ? selectedModels
      : ["meta-llama/llama-3.3-70b-instruct:free"];
    
    // Instantiate the engine
    const engine = new DynamicCouncilEngine(
      models,
      process.env.OPENROUTER_API_KEY || ""
    );

    // Run the engine
    const result = await engine.run(prompt);

    res.json(result);
  } catch (err) {
    console.error("Engine Error:", err);
    res.json({
      finalAnswer: `Engine Failure: ${err.message}`,
      transcript: [{ phase: "Error", output: err.message }],
      metadata: { sources: [] }
    });
  }
});

app.listen(3000, "0.0.0.0", () => console.log("🚀 Orchestrator Online"));
