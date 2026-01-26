import OpenAI from "openai";
import { executeAllCodeBlocks } from "../codeExecutor.js";

// Simple retry wrapper
async function withRetry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

export class AdvancedDebateEngine {
  constructor(modelA, modelB, apiKey) {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey
    });
    this.modelA = modelA;
    this.modelB = modelB;
  }

  async call(model, messages, maxTokens = 900) {
    if (process.env.RUN_MODE === "MOCK") {
      const lastMsg = messages[messages.length - 1].content;
      return `[MOCK] Response from ${model} for: ${lastMsg.slice(0, 30)}...`;
    }

    return withRetry(async () => {
      const res = await this.client.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens
      });
      return res.choices[0]?.message?.content || "";
    });
  }

  async run(prompt, options = {}) {
    try {
      const { enableCodeExecution, roles } = options;
      const transcript = [];
      const start = Date.now();

      // Use provided roles or defaults
      const roleA = roles?.architect || "You are a helpful assistant.";
      const roleB = roles?.auditor || "You are a critical reviewer.";
      const roleSynth = roles?.synthesizer || "You are a balanced synthesizer.";

      const basePrompt = `Solve this problem:\n${prompt}`;

      // Round 1: Initial Proposals
      const [a, b] = await Promise.all([
        this.call(this.modelA, [{ role: "system", content: roleA }, { role: "user", content: basePrompt }]),
        this.call(this.modelB, [{ role: "system", content: roleB }, { role: "user", content: basePrompt }])
      ]);

      transcript.push({ phase: "solutions", modelA: { role: roleA, content: a }, modelB: { role: roleB, content: b } });

      // Optional: Code Execution
      if (enableCodeExecution) {
        transcript.push({
          phase: "execution",
          modelA: await executeAllCodeBlocks(a),
          modelB: await executeAllCodeBlocks(b)
        });
      }

      // Round 2: Critique
      const critiqueA = await this.call(this.modelA, [
          { role: "system", content: roleA },
          { role: "user", content: `Here is a solution from another agent:\n${b}\n\nPlease critique it based on your expertise.` }
      ]);
      const critiqueB = await this.call(this.modelB, [
          { role: "system", content: roleB },
          { role: "user", content: `Here is a solution from another agent:\n${a}\n\nPlease critique it based on your expertise.` }
      ]);

      transcript.push({ phase: "critique", critiqueA, critiqueB });

      // Round 3: Synthesis (by Model A usually, acting as Lead)
      const finalAnswer = await this.call(
        this.modelA,
        [
            { role: "system", content: roleSynth },
            { role: "user", content: `Original Problem: ${prompt}\n\nSolution A:\n${a}\n\nSolution B:\n${b}\n\nCritique A:\n${critiqueA}\n\nCritique B:\n${critiqueB}\n\nSynthesize the absolute best final answer.` }
        ],
        1000
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
    } catch (error) {
      console.error("Debate Engine Failed:", error);
      return {
        success: false,
        finalAnswer: "The Council could not reach a consensus due to a connection error. Please try again.",
        transcript: [],
        metadata: { error: error.message }
      };
    }
  }
}
