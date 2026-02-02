import OpenAI from "openai";
import { performWebSearch } from "../search.js";

const PRESETS = {
  general: { architect: "Lead Architect: Logical & Helpful.", auditor: "Critical Auditor: Fact-checker.", synthesizer: "Synthesizer: Balanced." },
  coding: { architect: "Senior Developer: Clean Code.", auditor: "Security Specialist: Edge Cases.", synthesizer: "Tech Lead: Optimized." },
  academic: { architect: "Scholar: Theoretical Depth.", auditor: "Peer Reviewer: Logical Rigor.", synthesizer: "Professor: Clarity." },
  research: { architect: "Analyst: Pattern Discovery.", auditor: "Counter-Intelligence: Verification.", synthesizer: "Director: Summary." }
};

export class DynamicCouncilEngine {
  constructor() {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY || ""
    });
  }

  async call(model, messages, systemPrompt) {
    const msgs = [{ role: "system", content: systemPrompt }, ...messages];
    try {
      const res = await this.client.chat.completions.create({
        model: model || "meta-llama/llama-3.3-70b-instruct:free",
        messages: msgs,
        temperature: 0.3
      });
      return res.choices[0]?.message?.content || "";
    } catch (e) {
      return `Error with ${model}: ${e.message}`;
    }
  }

  async run(prompt, history = [], preset = "general", selectedModels = []) {
    const transcript = [];
    const roles = PRESETS[preset] || PRESETS.general;
    const models = selectedModels.length > 0 ? selectedModels : ["meta-llama/llama-3.3-70b-instruct:free"];

    // 1. Web Search / Grounding
    const searchData = await performWebSearch(prompt);
    let context = searchData ? `\n\n[LIVE_DATA]:\n${JSON.stringify(searchData)}` : "";
    
    if (searchData) {
      transcript.push({ 
        phase: "Grounding",
        output: `Retrieved ${searchData.length} live research points.`
      });
    }

    // 2. Architect Phase
    // Limit history to last 6 messages to avoid token limits
    const historyContext = history.slice(-6);
    let draft = await this.call(
      models[0],
      [...historyContext, { role: "user", content: prompt + context }],
      roles.architect
    );
    transcript.push({ phase: "Architect", output: draft });

    // 3. Auditor & Synthesizer Phases (if multiple models)
    if (models.length > 1) {
      let audit = await this.call(
        models[1],
        [{ role: "user", content: `Audit this: ${draft}` }],
        roles.auditor
      );
      transcript.push({ phase: "Auditor", output: audit });

      draft = await this.call(
        models[0],
        [{ role: "user", content: `Prompt: ${prompt}\nDraft: ${draft}\nAudit: ${audit}` }],
        roles.synthesizer
      );
      // Note: The original inline logic didn't push Synthesizer output to transcript explicitly as "Synthesizer",
      // but it updated 'draft' which is returned as finalAnswer.
      // However, usually we want to see the final synthesis in the transcript too?
      // The original code was:
      // transcript.push({ phase: "Auditor", output: audit });
      // draft = await askAI(...)
      // res.json({ finalAnswer: draft ... })
      // So the final answer IS the synthesis.
      // But let's add it to transcript for completeness if the frontend expects it or if it's just helpful.
      // The frontend shows `step.output`. If we don't push it, the user only sees Architect and Auditor in the trace,
      // and the main chat bubble has the final answer.
      // The previous `DynamicCouncilEngine` pushed "Final Synthesis".
      // I'll stick to the original logic from index.js for now to minimize behavior change:
      // The main chat bubble displays `draft` (finalAnswer). The transcript is side content.
      // Actually, looking at `index.js`, it did NOT push the final synthesis to the transcript array.
      // It just returned it as `finalAnswer`.
      // But the previous `DynamicCouncilEngine` DID.
      // I will ADD it to the transcript because it's good "Forensics".
      transcript.push({ phase: "Synthesizer", output: draft });
    }

    return {
      finalAnswer: draft,
      transcript,
      metadata: { sources: searchData || [] }
    };
  }
}
