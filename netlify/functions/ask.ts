import type { Handler } from "@netlify/functions";
import { askQuestion } from "../../src/services/queryVector.js";
import type { Message } from "../../src/services/queryVector.js";
import { successResponse } from "../../src/schemas/api.Response.js";
import { errorResponse } from "../../src/schemas/api.Response.js";
import { checkRateLimit } from "../../src/utils/rateLimit.js";
import crypto from "crypto";

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
  const uniqueRequestId = crypto.randomUUID();

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: securityHeaders,
      body: JSON.stringify(
        errorResponse(
          "METHOD_NOT_ALLOWED",
          "Only POST method is allowed",
          uniqueRequestId,
        ),
      ),
    };
  }

  const clientIp = event.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  const rateLimit = await checkRateLimit(clientIp, 20, 60);

  if (!rateLimit.isAllowed) {
    return {
      statusCode: 429,
      headers: {
        ...securityHeaders,
        "X-RateLimit-Limit": "20",
        "X-RateLimit-Remaining": "0",
        "Retry-After": String(rateLimit.resetTime - Math.floor(Date.now() / 1000)),
      },
      body: JSON.stringify(
        errorResponse(
          "RATE_LIMIT_EXCEEDED",
          "Too many requests. Please try again later.",
          uniqueRequestId,
        ),
      ),
    };
  }

  try {
    const {
      channelInput,
      question,
      history = [],
    } = JSON.parse(event.body || "{}");

    if (!channelInput || !question) {
      return {
        statusCode: 400,
        headers: securityHeaders,
        body: JSON.stringify(
          errorResponse(
            "MISSING_PARAMETERS",
            "channelInput and question are required",
            uniqueRequestId,
          ),
        ),
      };
    }

    if (typeof channelInput !== "string" || typeof question !== "string") {
      return {
        statusCode: 400,
        headers: securityHeaders,
        body: JSON.stringify(
          errorResponse(
            "INVALID_PARAMETERS",
            "channelInput and question must be strings",
            uniqueRequestId,
          ),
        ),
      };
    }

    const sanitizedQuestion = sanitizeInput(question);
    const result = await askQuestion(
      channelInput,
      sanitizedQuestion,
      history as Message[],
    );

    return {
      statusCode: 200,
      headers: securityHeaders,
      body: JSON.stringify(successResponse(result, uniqueRequestId)),
    };
  } catch (error) {
    console.error("Ask error:", error);
    return {
      statusCode: 500,
      headers: securityHeaders,
      body: JSON.stringify(
        errorResponse(
          "INTERNAL_SERVER_ERROR",
          "An unexpected error occurred",
          uniqueRequestId,
        ),
      ),
    };
  }
};

export { handler };
