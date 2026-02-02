import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { DynamicCouncilEngine } from "./engines/DynamicCouncilEngine.js";

dotenv.config();
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const engine = new DynamicCouncilEngine();

app.post("/api/debate", async (req, res) => {
  try {
    const { prompt, selectedModels = [], history = [], preset = "general" } = req.body;
    
    const result = await engine.run(prompt, history, preset, selectedModels);

    res.json(result);
  } catch (err) {
    console.error("Error in /api/debate:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, "0.0.0.0", () => console.log("🚀 Orchestrator Online"));
