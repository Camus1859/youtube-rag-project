import { z } from "zod";

const InterestSchema = z.object({
  topic: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  evidence: z.string(),
});

const PersonalityTraitSchema = z.object({
  trait: z.string(),
  description: z.string(),
});

const SpeakingStyleSchema = z.object({
  tone: z.string(),
  vocabulary: z.string(),
  patterns: z.array(z.string()),
});

const TopTopicSchema = z.object({
  name: z.string(),
  frequency: z.string(),
});

const ActionSchema = z.enum(["ask_clarification", "provide_analysis", "need_more_data"]);

const MetricsSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  latencyMs: z.number(),
  schemaValidated: z.boolean(),
});

const UserInsightSchema = z.object({
  message: z.string(),
  action: ActionSchema,
  followUpOptions: z.array(z.string()).optional(),
  interests: z.array(InterestSchema).optional(),
  personalityTraits: z.array(PersonalityTraitSchema).optional(),
  speakingStyle: SpeakingStyleSchema.optional(),
  topTopics: z.array(TopTopicSchema).optional(),
  summary: z.string().optional(),
  metrics: MetricsSchema.optional(),
});

type UserInsight = z.infer<typeof UserInsightSchema>;
type Metrics = z.infer<typeof MetricsSchema>;

export { UserInsightSchema, MetricsSchema };
export type { UserInsight, Metrics };
