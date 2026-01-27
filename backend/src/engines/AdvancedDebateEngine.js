import OpenAI from "openai";
import { executeAllCodeBlocks } from "../codeExecutor.js";

export class AdvancedDebateEngine {
  constructor(modelA, modelB, apiKey) {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey
    });
    this.modelA = modelA;
    this.modelB = modelB;
  }

  async call(model, prompt, maxTokens = 900) {
    const res = await this.client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens
    });
    return res.choices[0]?.message?.content || "";
  }

  async run(prompt, classification) {
    const transcript = [];
    const start = Date.now();

    const basePrompt = `Solve carefully:\n${prompt}`;

    const [a, b] = await Promise.all([
      this.call(this.modelA, basePrompt),
      this.call(this.modelB, basePrompt)
    ]);

    transcript.push({ phase: "solutions", modelA: a, modelB: b });

    if (classification.enableCodeExecution) {
      transcript.push({
        phase: "execution",
        modelA: await executeAllCodeBlocks(a),
        modelB: await executeAllCodeBlocks(b)
      });
    }

    const critiqueA = await this.call(this.modelA, `Critique:\n${b}`);
    const critiqueB = await this.call(this.modelB, `Critique:\n${a}`);

    transcript.push({ phase: "critique", critiqueA, critiqueB });

    const finalAnswer = await this.call(
      this.modelA,
      `Synthesize the best solution:\n${a}\n${b}\nCritiques:\n${critiqueA}\n${critiqueB}`,
      700
    );

    return {
      success: true,
      finalAnswer,
      transcript,
      metadata: {
        mode: "advanced-debate",
        duration: ((Date.now() - start) / 1000).toFixed(2)
      }
    };
  }
}
