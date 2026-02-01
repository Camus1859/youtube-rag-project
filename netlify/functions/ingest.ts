import type { Handler } from "@netlify/functions";
import { upsertChunks } from "../../src/services/upsertVectors.js";
import { getNamespaceFromInput } from "../../src/utils/urlParser.js";
import { pcIndex } from "../../src/services/pinecone.js";
import { successResponse } from "../../src/schemas/api.Response.js";
import {errorResponse} from "../../src/schemas/api.Response.js";
import { checkRateLimit } from "../../src/utils/rateLimit.js";
import { checkIdempotencyKey, setProcessing } from "../../src/utils/idempotency.js";
import crypto from "crypto";

const securityHeaders = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
};

function isValidYouTubeInput(input: string): boolean {
  const urlPattern = /^(https?:\/\/)?(www\.)?youtube\.com\/@[\w-]+/i;
  return urlPattern.test(input);
}

function cleanYouTubeUrl(input: string): string {
  const match = input.match(/^(https?:\/\/)?(www\.)?youtube\.com\/@[\w-]+/i);
  return match ? match[0] : input;
}

const handler: Handler = async (event) => {
  const uniqueRequestId =  crypto.randomUUID();

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
  const rateLimit = await checkRateLimit(clientIp, 10, 60);

  if (!rateLimit.isAllowed) {
    return {
      statusCode: 429,
      headers: {
        ...securityHeaders,
        "X-RateLimit-Limit": "10",
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

  const idempotencyKey = event.headers["idempotency-key"];
  if (idempotencyKey) {
    const existing = await checkIdempotencyKey(idempotencyKey);
    if (existing === "PROCESSING") {
      return {
        statusCode: 409,
        headers: securityHeaders,
        body: JSON.stringify(
          errorResponse(
            "REQUEST_IN_PROGRESS",
            "Request already being processed",
            uniqueRequestId,
          ),
        ),
      };
    }
    await setProcessing(idempotencyKey);
  }

  try {
    const { channelInput } = JSON.parse(event.body || "{}");

    if (!channelInput) {
      return {
        statusCode: 400,
        headers: securityHeaders,
        body: JSON.stringify(
          errorResponse(
            "MISSING_PARAMETERS",
            "channelInput is required",
            uniqueRequestId,
          ),
        ),
      };
    }

    if (!isValidYouTubeInput(channelInput)) {
      return {
        statusCode: 400,
        headers: securityHeaders,
        body: JSON.stringify(
          errorResponse(
            "INVALID_INPUT",
            "channelInput must be a valid YouTube channel URL",
            uniqueRequestId,
          ),
        ),
      };
    }

    const cleanedUrl = cleanYouTubeUrl(channelInput);

    const data = await pcIndex.listNamespaces();

    const youtubersName = getNamespaceFromInput(cleanedUrl);
    const nameSpaceExist = data.namespaces?.some(
      (namespace) => namespace.name === youtubersName,
    );

    if (nameSpaceExist) {
      return {
        statusCode: 200,
        headers: securityHeaders,
        body: JSON.stringify(
          successResponse(
            { nameSpaceExist: true },
            uniqueRequestId,
          )
        )
      };
    } else {
      await upsertChunks(cleanedUrl);

      return {
        statusCode: 200,
        headers: securityHeaders,
        body: JSON.stringify(
          successResponse(
            { nameSpaceExist: false },
            uniqueRequestId,
          )
        ),
      };
    }
  } catch (error) {
    console.error("Ingest error:", error);
    return {
      statusCode: 500,
      headers: securityHeaders,
      body: JSON.stringify(
        errorResponse(
          "INTERNAL_SERVER_ERROR",
          "An unexpected error occurred",
          uniqueRequestId,
        )
      ),
    };
  }
};

export { handler };
