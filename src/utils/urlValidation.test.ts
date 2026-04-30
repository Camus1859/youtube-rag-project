import { describe, it, expect } from "vitest";
import { isValidYouTubeUrl, cleanYouTubeUrl } from "./urlValidation.js";

describe("isValidYouTubeUrl", () => {
  it("accepts valid youtube channel URL", () => {
    expect(isValidYouTubeUrl("https://www.youtube.com/@Fireship")).toBe(true);
  });

  it("accepts URL without www", () => {
    expect(isValidYouTubeUrl("https://youtube.com/@Fireship")).toBe(true);
  });

  it("accepts URL without https", () => {
    expect(isValidYouTubeUrl("http://www.youtube.com/@Fireship")).toBe(true);
  });

  it("rejects video URL", () => {
    expect(isValidYouTubeUrl("https://www.youtube.com/watch?v=abc123")).toBe(false);
  });

  it("rejects random URL", () => {
    expect(isValidYouTubeUrl("https://google.com")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidYouTubeUrl("")).toBe(false);
  });
});

describe("cleanYouTubeUrl", () => {
  it("strips trailing path from channel URL", () => {
    expect(cleanYouTubeUrl("https://www.youtube.com/@Fireship/featured")).toBe("https://www.youtube.com/@Fireship");
  });

  it("returns clean URL unchanged", () => {
    expect(cleanYouTubeUrl("https://www.youtube.com/@Fireship")).toBe("https://www.youtube.com/@Fireship");
  });

  it("returns input unchanged if no match", () => {
    expect(cleanYouTubeUrl("not a url")).toBe("not a url");
  });
});
