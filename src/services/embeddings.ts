import OpenAI from "openai";
import "dotenv/config";

const openai = new OpenAI();

const getEmbeddingOfUserInput = async (text: string): Promise<number[]> => {
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

const getEmbeddings = async (texts: string[]): Promise<number[][]> => {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
    encoding_format: "float",
  });

  return response.data.map((item) => item.embedding);
};

export { getEmbeddingOfUserInput, getEmbeddings };
