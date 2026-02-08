import * as cheerio from "cheerio";

/**
 * Parse HTML and extract text content using a CSS selector.
 * Uses cheerio for server-side HTML parsing.
 */
export function cssSelect(html: string, selector: string): string {
  const $ = cheerio.load(html);
  const elements = $(selector);
  if (elements.length === 0) {
    throw new Error(`No elements matched selector: "${selector}"`);
  }
  return elements.first().text().trim();
}
