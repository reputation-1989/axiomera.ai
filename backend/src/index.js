import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { LiveCouncilEngine } from "./engines/LiveCouncilEngine.js";

dotenv.config();
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Initialize the engine with the API key from environment variables
const engine = new LiveCouncilEngine(process.env.OPENROUTER_API_KEY);

app.post("/api/debate", async (req, res) => {
  try {
    const { prompt, selectedModels = [], history = [], preset = "general" } = req.body;
    
    // Use the engine to process the request
    const result = await engine.run(prompt, selectedModels, history, preset);

    res.json(result);
  } catch (err) {
    console.error("Error in debate endpoint:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, "0.0.0.0", () => console.log("🚀 Orchestrator Online"));
