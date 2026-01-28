import OpenAI from "openai";
import { performWebSearch } from "../search.js";

export class DynamicCouncilEngine {
  constructor(models, apiKey) {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey
    });
    this.models = models;
  }

  async call(model, prompt, system = "") {
    const res = await this.client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
    });
    return res.choices[0]?.message?.content || "";
  }

  async run(prompt) {
    const transcript = [];
    let researchData = null;

    // 1. RESEARCH PHASE
    const searchQuery = await this.call(
      this.models[0], 
      `Based on this user prompt, write a single search query to get the most up-to-date information: "${prompt}"`,
      "You are a search query optimizer."
    );
    
    researchData = await performWebSearch(searchQuery);
    
    if (researchData) {
      transcript.push({ 
        phase: "Web Research", 
        output: researchData.map(d => `Source: ${d.title} (${d.url})`).join('\n') 
      });
    }

    const context = researchData 
      ? `REAL-TIME RESEARCH DATA:\n${JSON.stringify(researchData)}\n\nUSER PROMPT: ${prompt}`
      : prompt;

    // 2. INITIAL SOLUTION
    let currentSolution = await this.call(
      this.models[0], 
      `Using the research provided (if any), solve this carefully: ${context}`
    );
    transcript.push({ phase: `Initial Solution (${this.models[0].split('/').pop()})`, output: currentSolution });

    // 3. ADVERSARIAL DEBATE
    for (let i = 1; i < this.models.length; i++) {
      const model = this.models[i];
      const critique = await this.call(
        model, 
        `Critique this solution. Check for facts against the research. Provide a better version: ${currentSolution}`,
        "You are a rigorous logic verifier."
      );
      currentSolution = critique;
      transcript.push({ phase: `Refinement (${model.split('/').pop()})`, output: currentSolution });
    }

    // 4. FINAL SYNTHESIS
    const finalAnswer = await this.call(
      this.models[0], 
      `Look at the research and the debate. Provide the definitive final answer: ${currentSolution}`
    );
    transcript.push({ phase: "Final Synthesis", output: finalAnswer });

    return {
      success: true,
      finalAnswer,
      transcript,
      metadata: { mode: "COUNCIL", grounded: !!researchData }
    };
  }
}
