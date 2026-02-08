import OpenAI from "openai";
import { performWebSearch } from "../search.js";

const PRESETS = {
  general: { architect: "Lead Architect: Logical & Helpful.", auditor: "Critical Auditor: Fact-checker.", synthesizer: "Synthesizer: Balanced." },
  coding: { architect: "Senior Developer: Clean Code.", auditor: "Security Specialist: Edge Cases.", synthesizer: "Tech Lead: Optimized." },
  academic: { architect: "Scholar: Theoretical Depth.", auditor: "Peer Reviewer: Logical Rigor.", synthesizer: "Professor: Clarity." },
  research: { architect: "Analyst: Pattern Discovery.", auditor: "Counter-Intelligence: Verification.", synthesizer: "Director: Summary." }
};

export class LiveCouncilEngine {
  constructor(apiKey) {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey || process.env.OPENROUTER_API_KEY
    });
  }

  async askAI(model, history, systemPrompt) {
    const messages = [{ role: "system", content: systemPrompt }, ...history];
    try {
      const res = await this.client.chat.completions.create({
        model: model || "meta-llama/llama-3.3-70b-instruct:free",
        messages, temperature: 0.3
      });
      return res.choices[0]?.message?.content || "";
    } catch (e) { return `Error with ${model}: ${e.message}`; }
  }

  async run(prompt, selectedModels = [], history = [], preset = "general") {
    const transcript = [];
    const roles = PRESETS[preset] || PRESETS.general;
    const models = selectedModels.length > 0 ? selectedModels : ["meta-llama/llama-3.3-70b-instruct:free"];

    const searchData = await performWebSearch(prompt);
    let context = searchData ? `\n\n[LIVE_DATA]:\n${JSON.stringify(searchData)}` : "";
    if (searchData) transcript.push({ phase: "Grounding", output: `Retrieved ${searchData.length} live research points.` });

    let draft = await this.askAI(models[0], [...history.slice(-6), { role: "user", content: prompt + context }], roles.architect);
    transcript.push({ phase: "Architect", output: draft });

    if (models.length > 1) {
      let audit = await this.askAI(models[1], [{ role: "user", content: `Audit this: ${draft}` }], roles.auditor);
      transcript.push({ phase: "Auditor", output: audit });
      draft = await this.askAI(models[0], [{ role: "user", content: `Prompt: ${prompt}\nDraft: ${draft}\nAudit: ${audit}` }], roles.synthesizer);
    }

    return { finalAnswer: draft, transcript, metadata: { sources: searchData || [] } };
  }
}
