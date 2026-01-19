import OpenAI from "openai";
import "dotenv/config";

const openai = new OpenAI();

const textToVector = async (text: string): Promise<number[]> => {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  if (response.data.length === 0) {
    throw new Error("No embedding returned from OpenAI");
  }

  const embedding = response.data[0]?.embedding;

  if (!embedding) {
    throw new Error("No embedding data found");
  }

  return embedding;
};

const textsToVectors = async (texts: string[]): Promise<number[][]> => {
  const BATCH_SIZE = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
      encoding_format: "float",
    });
    allEmbeddings.push(...response.data.map((item) => item.embedding));
  }

  return allEmbeddings;
};

export { textToVector, textsToVectors };
