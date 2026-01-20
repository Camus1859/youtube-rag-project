import type { Handler } from "@netlify/functions";
import { askQuestion } from "../../src/services/queryVector.js";
import type { Message } from "../../src/services/queryVector.js";

const securityHeaders = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
};

function sanitizeInput(input: string): string {
  const patterns = [
    /ignore (all )?(previous|prior|above) (instructions|prompts)/gi,
    /disregard (all )?(previous|prior|above)/gi,
    /forget (everything|all|your instructions)/gi,
    /you are now/gi,
    /new instructions:/gi,
    /system:/gi,
  ];

  let sanitized = input;
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, "[removed]");
  }

  return sanitized.trim();
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: securityHeaders, body: "Method Not Allowed" };
  }

  try {
    const { channelInput, question, history = [] } = JSON.parse(event.body || "{}");

    if (!channelInput || !question) {
      return {
        statusCode: 400,
        headers: securityHeaders,
        body: JSON.stringify({ error: "channelInput and question are required" }),
      };
    }

    if (typeof channelInput !== "string" || typeof question !== "string") {
      return {
        statusCode: 400,
        headers: securityHeaders,
        body: JSON.stringify({ error: "channelInput and question must be strings" }),
      };
    }

    const sanitizedQuestion = sanitizeInput(question);
    const result = await askQuestion(channelInput, sanitizedQuestion, history as Message[]);

    return {
      statusCode: 200,
      headers: securityHeaders,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Ask error:", error);
    return {
      statusCode: 500,
      headers: securityHeaders,
      body: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
    };
  }
};

export { handler };
