import { describe, it, expect } from "vitest";
import { extractHandleFromUrl, extractChannelIdFromUrl, getNamespaceFromInput } from "./urlParser.js";

describe("extractHandleFromUrl", () => {
  it("extracts handle from youtube URL", () => {
    expect(extractHandleFromUrl("https://www.youtube.com/@Fireship")).toBe("Fireship");
  });

  it("extracts handle with trailing path", () => {
    expect(extractHandleFromUrl("https://www.youtube.com/@Fireship/videos")).toBe("Fireship");
  });

  it("returns null when no handle present", () => {
    expect(extractHandleFromUrl("https://www.youtube.com/watch?v=abc123")).toBeNull();
  });
});

describe("extractChannelIdFromUrl", () => {
  it("extracts channel ID from URL", () => {
    expect(extractChannelIdFromUrl("https://www.youtube.com/channel/UCsBjURrPoezykLs9EqgamOA")).toBe("UCsBjURrPoezykLs9EqgamOA");
  });

  it("returns null when no channel ID present", () => {
    expect(extractChannelIdFromUrl("https://www.youtube.com/@Fireship")).toBeNull();
  });
});

describe("getNamespaceFromInput", () => {
  it("returns handle from youtube URL", () => {
    expect(getNamespaceFromInput("https://www.youtube.com/@Fireship")).toBe("Fireship");
  });

  it("returns channel ID from channel URL", () => {
    expect(getNamespaceFromInput("https://www.youtube.com/channel/UCsBjURrPoezykLs9EqgamOA")).toBe("UCsBjURrPoezykLs9EqgamOA");
  });

  it("strips @ from raw handle input", () => {
    expect(getNamespaceFromInput("@Fireship")).toBe("Fireship");
  });

  it("returns raw string if no pattern matches", () => {
    expect(getNamespaceFromInput("Fireship")).toBe("Fireship");
  });
});
