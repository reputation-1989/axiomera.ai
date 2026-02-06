import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { LiveCouncilEngine } from "./engines/LiveCouncilEngine.js";

dotenv.config();
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const engine = new LiveCouncilEngine();

app.post("/api/debate", async (req, res) => {
  try {
    const result = await engine.run(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, "0.0.0.0", () => console.log("🚀 Orchestrator Online"));
