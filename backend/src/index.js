import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";
import axios from "axios";

dotenv.config();
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const openRouterClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || ""
});

const PRESETS = {
  general: { architect: "Lead Architect: Logical & Helpful.", auditor: "Critical Auditor: Fact-checker.", synthesizer: "Synthesizer: Balanced." },
  coding: { architect: "Senior Developer: Clean Code.", auditor: "Security Specialist: Edge Cases.", synthesizer: "Tech Lead: Optimized." },
  academic: { architect: "Scholar: Theoretical Depth.", auditor: "Peer Reviewer: Logical Rigor.", synthesizer: "Professor: Clarity." },
  research: { architect: "Analyst: Pattern Discovery.", auditor: "Counter-Intelligence: Verification.", synthesizer: "Director: Summary." }
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

async function askAI(model, history, systemPrompt) {
  const messages = [{ role: "system", content: systemPrompt }, ...history];
  try {
    const res = await openRouterClient.chat.completions.create({ 
      model: model || "meta-llama/llama-3.3-70b-instruct:free", 
      messages, temperature: 0.3 
    });
    return res.choices[0]?.message?.content || "";
  } catch (e) { return `Error with ${model}: ${e.message}`; }
}

app.post("/api/debate", async (req, res) => {
  try {
    const { prompt, selectedModels = [], history = [], preset = "general" } = req.body;
    const transcript = [];
    const roles = PRESETS[preset] || PRESETS.general;
    const models = selectedModels.length > 0 ? selectedModels : ["meta-llama/llama-3.3-70b-instruct:free"];
    
    const searchData = await performWebSearch(prompt);
    let context = searchData ? `\n\n[LIVE_DATA]:\n${JSON.stringify(searchData)}` : "";
    if (searchData) transcript.push({ phase: "Grounding", output: `Retrieved ${searchData.length} live research points.` });

    let draft = await askAI(models[0], [...history.slice(-6), { role: "user", content: prompt + context }], roles.architect);
    transcript.push({ phase: "Architect", output: draft });

    if (models.length > 1) {
      let audit = await askAI(models[1], [{ role: "user", content: `Audit this: ${draft}` }], roles.auditor);
      transcript.push({ phase: "Auditor", output: audit });
      draft = await askAI(models[0], [{ role: "user", content: `Prompt: ${prompt}\nDraft: ${draft}\nAudit: ${audit}` }], roles.synthesizer);
    }
    res.json({ finalAnswer: draft, transcript, metadata: { sources: searchData || [] } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(3000, "0.0.0.0", () => console.log("🚀 Orchestrator Online"));