import type {
  Recipe,
  ClaimContext,
  RunnerConfig,
  VerificationResult,
  StepResult,
  VerificationStep,
  FetchFn,
} from "./types.js";
import { interpolate } from "./interpolate.js";
import { checkExpect } from "./expect.js";
import { httpGet } from "./actions/http-get.js";
import { jsonPath } from "./actions/json-path.js";
import { cssSelect } from "./actions/css-select.js";
import { regexMatch } from "./actions/regex-match.js";
import { dnsTxt } from "./actions/dns-txt.js";

const DEFAULT_TIMEOUT = 10_000;

/**
 * Execute a recipe's verification steps against a claim context.
 * Returns a full result with per-step details. Stops on first failure.
 */
export async function runRecipe(
  recipe: Recipe,
  context: ClaimContext,
  config?: RunnerConfig,
): Promise<VerificationResult> {
  const fetchFn: FetchFn = config?.fetch ?? globalThis.fetch;
  const timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  const steps: StepResult[] = [];

  // Extract subject from params if a param defines extractFrom
  let subject: string | undefined;
  if (recipe.params) {
    for (const param of recipe.params) {
      if (param.extractFrom && context.params[param.key]) {
        const regex = new RegExp(param.extractFrom);
        const match = context.params[param.key].match(regex);
        if (match?.[1]) {
          subject = `${recipe.type.split("-")[0]}:${match[1]}`;
        }
      }
    }
  }

  // Tracks the last "fetch" output (http-get, dns-txt) for extraction steps to use.
  // Extraction steps (json-path, css-select, regex-match) always operate on the
  // last fetch output, not on each other's output.
  let lastFetchOutput: unknown = undefined;

  for (const step of recipe.verification.steps) {
    const isFetchAction = step.action === "http-get" || step.action === "dns-txt";
    const result = await executeStep(step, context, lastFetchOutput, fetchFn, timeout);
    steps.push(result);

    if (!result.success) {
      return { success: false, steps, subject, error: result.error };
    }

    if (isFetchAction) {
      lastFetchOutput = result.data;
    }
  }

  return { success: true, steps, subject };
}

async function executeStep(
  step: VerificationStep,
  context: ClaimContext,
  previousOutput: unknown,
  fetchFn: FetchFn,
  timeout: number,
): Promise<StepResult> {
  try {
    let data: unknown;

    switch (step.action) {
      case "http-get": {
        const url = interpolate(step.url!, context);
        data = await httpGet(url, fetchFn, timeout);
        break;
      }

      case "json-path": {
        const selector = interpolate(step.selector!, context);
        const input = previousOutput ?? "";
        data = jsonPath(input as string | object, selector);
        break;
      }

      case "css-select": {
        const selector = interpolate(step.selector!, context);
        const input = previousOutput as string;
        if (typeof input !== "string") {
          throw new Error("css-select requires string input from a previous step");
        }
        data = cssSelect(input, selector);
        break;
      }

      case "regex-match": {
        const pattern = interpolate(step.pattern!, context);
        const input = typeof previousOutput === "string" ? previousOutput : String(previousOutput ?? "");
        data = regexMatch(input, pattern);
        break;
      }

      case "dns-txt": {
        const domain = step.url ? interpolate(step.url, context) : interpolate(step.pattern!, context);
        data = await dnsTxt(domain);
        break;
      }

      default:
        throw new Error(`Unknown action: "${step.action}"`);
    }

    // Check expect if defined
    if (step.expect) {
      const expectStr = interpolate(step.expect, context);
      const result = checkExpect(expectStr, data);
      if (!result.pass) {
        return { action: step.action, success: false, data, error: result.message };
      }
    }

    return { action: step.action, success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { action: step.action, success: false, error: message };
  }
}
