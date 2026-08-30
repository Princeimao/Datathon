import { CrimeExtractionResult } from "../types.js";
import { processAgent } from "./agent.service.js";

export const processService = async (
  data: string,
): Promise<CrimeExtractionResult | null> => {
  try {
    const result = await processAgent.invoke({
      messages: [
        {
          role: "user",
          content: typeof data === "string" ? data : JSON.stringify(data),
        },
      ],
    });
    const content = result.messages[1].content;
    if (typeof content === "string") {
      try {
        return extractJSON(content);
      } catch (error) {
        console.error("Error parsing JSON:", error);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.log("Error processing data:", error);
    return null;
  }
};

function extractJSON(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found");
  return JSON.parse(match[0]);
}
