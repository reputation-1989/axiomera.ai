import OpenAI from "openai";
import { executeAllCodeBlocks } from "../codeExecutor.js";
import { getCachedResponse, setCachedResponse } from "../cache.js";

export class SimpleCouncilEngine {
  constructor({ solverModel, verifierModel, apiKey }) {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey
    });
    this.solverModel = solverModel;
    this.verifierModel = verifierModel;
  }

  getRunMode() {
    return process.env.RUN_MODE || "LIVE";
  }

  mockResponse(role) {
    if (role === "solver") {
      return "Binary search works by halving a sorted search space at each step.";
    }
    if (role === "verifier") {
      return "Correct. Mention the loop invariant explicitly.";
    }
    return "Binary search is correct because it maintains a valid invariant and reduces the search space logarithmically.";
  }

  async call(model, prompt, role) {
    const RUN_MODE = this.getRunMode();

    if (RUN_MODE === "MOCK") {
      return this.mockResponse(role);
    }

    if (RUN_MODE !== "LIVE") {
      return `[${RUN_MODE}] skipped`;
    }

    const res = await this.client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 800
    });

    return res.choices[0]?.message?.content || "";
  }

  async run(prompt, classification) {
    const RUN_MODE = this.getRunMode();

    // 🔥 CACHE CHECK (LIVE only)
    if (RUN_MODE === "LIVE") {
      const cached = getCachedResponse(prompt);
      if (cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cache: "HIT"
          }
        };
      }
    }

    const transcript = [];
    const start = Date.now();

    const solution = await this.call(this.solverModel, prompt, "solver");
    transcript.push({ phase: "solver", output: solution });

    let executionResults = null;
    if (classification.enableCodeExecution && RUN_MODE === "LIVE") {
      executionResults = await executeAllCodeBlocks(solution);
      transcript.push({ phase: "execution", results: executionResults });
    }

    const verification = await this.call(this.verifierModel, solution, "verifier");
    transcript.push({ phase: "verifier", output: verification });

    const finalAnswer =
      RUN_MODE === "LIVE"
        ? await this.call(this.solverModel, solution + verification, "final")
        : this.mockResponse("final");

    transcript.push({ phase: "final", output: finalAnswer });

    const response = {
      success: true,
      finalAnswer,
      transcript,
      metadata: {
        mode: RUN_MODE,
        duration: ((Date.now() - start) / 1000).toFixed(2),
        cache: "MISS"
      }
    };

    if (RUN_MODE === "LIVE") {
      setCachedResponse(prompt, response);
    }

    return response;
  }
}
