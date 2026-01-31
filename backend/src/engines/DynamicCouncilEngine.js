import OpenAI from "openai";
import { performWebSearch } from "../search.js";

const PRESETS = {
  general: { architect: "Lead Architect: Logical & Helpful.", auditor: "Critical Auditor: Fact-checker.", synthesizer: "Synthesizer: Balanced." },
  coding: { architect: "Senior Developer: Clean Code.", auditor: "Security Specialist: Edge Cases.", synthesizer: "Tech Lead: Optimized." },
  academic: { architect: "Scholar: Theoretical Depth.", auditor: "Peer Reviewer: Logical Rigor.", synthesizer: "Professor: Clarity." },
  research: { architect: "Analyst: Pattern Discovery.", auditor: "Counter-Intelligence: Verification.", synthesizer: "Director: Summary." }
};

export class DynamicCouncilEngine {
  constructor(models, apiKey) {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey
    });
    this.models = models && models.length > 0 ? models : ["meta-llama/llama-3.3-70b-instruct:free"];
  }

  async chat(model, messages, systemPrompt) {
    try {
      const msgs = [{ role: "system", content: systemPrompt }, ...messages];
      const res = await this.client.chat.completions.create({
        model: model,
        messages: msgs,
        temperature: 0.3,
      });
      return res.choices[0]?.message?.content || "";
    } catch (e) {
      return `Error with ${model}: ${e.message}`;
    }
  }

  async run(prompt, history = [], preset = "general") {
    const transcript = [];
    const roles = PRESETS[preset] || PRESETS.general;
    
    // 1. Web Search
    const searchData = await performWebSearch(prompt);
    let context = searchData ? `\n\n[LIVE_DATA]:\n${JSON.stringify(searchData)}` : "";
    
    if (searchData) {
      transcript.push({ 
        phase: "Grounding",
        output: `Retrieved ${searchData.length} live research points.`
      });
    }

    // 2. Architect
    // Uses the last 6 messages from history for context, plus the current prompt with research context
    const currentMessages = [...history.slice(-6), { role: "user", content: prompt + context }];
    let draft = await this.chat(
      this.models[0], 
      currentMessages,
      roles.architect
    );
    transcript.push({ phase: "Architect", output: draft });

    // 3. Auditor & Synthesizer (if multiple models are available)
    if (this.models.length > 1) {
      let audit = await this.chat(
        this.models[1],
        [{ role: "user", content: `Audit this: ${draft}` }],
        roles.auditor
      );
      transcript.push({ phase: "Auditor", output: audit });

      draft = await this.chat(
        this.models[0],
        [{ role: "user", content: `Prompt: ${prompt}\nDraft: ${draft}\nAudit: ${audit}` }],
        roles.synthesizer
      );
    }

    return {
      finalAnswer: draft,
      transcript,
      metadata: { sources: searchData || [] }
    };
  }
}
