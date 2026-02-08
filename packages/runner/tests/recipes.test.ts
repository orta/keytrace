import { describe, it, expect } from "vitest";
import { githubGistRecipe } from "../src/recipes/github-gist.js";
import { dnsTxtRecipe } from "../src/recipes/dns-txt.js";

describe("built-in recipes", () => {
  describe("githubGistRecipe", () => {
    it("should have correct metadata", () => {
      expect(githubGistRecipe.type).toBe("github-gist");
      expect(githubGistRecipe.version).toBe(1);
      expect(githubGistRecipe.displayName).toContain("GitHub");
      expect(githubGistRecipe.$type).toBe("dev.keytrace.recipe");
    });

    it("should have gistUrl param", () => {
      expect(githubGistRecipe.params).toHaveLength(1);
      expect(githubGistRecipe.params![0].key).toBe("gistUrl");
      expect(githubGistRecipe.params![0].type).toBe("url");
      expect(githubGistRecipe.params![0].extractFrom).toBeDefined();
    });

    it("should have instruction steps", () => {
      expect(githubGistRecipe.instructions.steps.length).toBeGreaterThan(0);
      expect(githubGistRecipe.instructions.proofTemplate).toContain("{claimId}");
      expect(githubGistRecipe.instructions.proofTemplate).toContain("{did}");
    });

    it("should have 3 verification steps", () => {
      const steps = githubGistRecipe.verification.steps;
      expect(steps).toHaveLength(3);
      expect(steps[0].action).toBe("http-get");
      expect(steps[1].action).toBe("json-path");
      expect(steps[2].action).toBe("json-path");
    });

    it("should verify keytrace and did fields", () => {
      const steps = githubGistRecipe.verification.steps;
      expect(steps[1].selector).toBe("$.keytrace");
      expect(steps[1].expect).toBe("equals:{claimId}");
      expect(steps[2].selector).toBe("$.did");
      expect(steps[2].expect).toBe("equals:{did}");
    });
  });

  describe("dnsTxtRecipe", () => {
    it("should have correct metadata", () => {
      expect(dnsTxtRecipe.type).toBe("dns");
      expect(dnsTxtRecipe.version).toBe(1);
      expect(dnsTxtRecipe.displayName).toContain("DNS");
      expect(dnsTxtRecipe.$type).toBe("dev.keytrace.recipe");
    });

    it("should have domain param", () => {
      expect(dnsTxtRecipe.params).toHaveLength(1);
      expect(dnsTxtRecipe.params![0].key).toBe("domain");
      expect(dnsTxtRecipe.params![0].type).toBe("domain");
    });

    it("should have instruction steps", () => {
      expect(dnsTxtRecipe.instructions.steps.length).toBeGreaterThan(0);
      expect(dnsTxtRecipe.instructions.proofTemplate).toContain("{did}");
    });

    it("should have 2 verification steps", () => {
      const steps = dnsTxtRecipe.verification.steps;
      expect(steps).toHaveLength(2);
      expect(steps[0].action).toBe("dns-txt");
      expect(steps[1].action).toBe("regex-match");
    });
  });
});
