import { describe, it, expect } from "vitest";
import { cssSelect } from "../../src/actions/css-select.js";

describe("cssSelect", () => {
  const html = `
    <html>
      <head><title>Test Page</title></head>
      <body>
        <h1 class="title">Hello World</h1>
        <div id="content">
          <p class="message">Verification: did:plc:abc123</p>
          <span data-key="keytrace">kt-a1b2c3d4</span>
        </div>
      </body>
    </html>
  `;

  it("should select by tag name", () => {
    expect(cssSelect(html, "h1")).toBe("Hello World");
  });

  it("should select by class", () => {
    expect(cssSelect(html, ".message")).toBe("Verification: did:plc:abc123");
  });

  it("should select by id", () => {
    expect(cssSelect(html, "#content")).toContain("Verification: did:plc:abc123");
  });

  it("should select by attribute", () => {
    expect(cssSelect(html, "[data-key=keytrace]")).toBe("kt-a1b2c3d4");
  });

  it("should select by title", () => {
    expect(cssSelect(html, "title")).toBe("Test Page");
  });

  it("should throw on no match", () => {
    expect(() => cssSelect(html, ".nonexistent")).toThrow("No elements matched");
  });
});
