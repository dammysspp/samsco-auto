import Groq from "groq-sdk";

export interface GeneratedContent {
  shortsScript: string;
  communityCaption: string;
}

/**
 * Generates engaging YouTube Shorts scripts and Community posts using Groq Llama-3-70b.
 */
export async function generateAIFootballContent(
  title: string,
  description: string,
  customApiKey?: string
): Promise<GeneratedContent> {
  const apiKey = customApiKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Groq API Key. Configure it in settings or environment.");
  }

  const groq = new Groq({ apiKey });

  const systemPrompt = `You are a Senior Football Content Producer and YouTube growth expert specializing in the ongoing 2026 FIFA World Cup. 
Your goal is to produce highly viral content for YouTube Shorts and YouTube Community posts. 
You will be given a news article title and description. You must generate:
1. A 60-second YouTube Shorts script. It must have a strong hook in the first 3 seconds, high energy, specific 2026 World Cup match/player/event details from the article, and a call to subscribe. Format it clearly with [Visuals] and [Audio] guides.
2. An engaging, interactive YouTube Community Tab Post. This should be poll-style or discussion-based to maximize viewer comments. Use relevant emojis and hashtags (e.g. #FIFAWorldCup, #WorldCup2026, #Football).

You must return your output strictly in JSON format with the keys: "shortsScript" and "communityCaption". Do not write any markdown or text outside the JSON object.`;

  const userPrompt = `News Article Title: ${title}
News Description: ${description}`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const contentJsonString = response.choices[0]?.message?.content || "{}";
    const data = JSON.parse(contentJsonString);

    return {
      shortsScript: data.shortsScript || "Failed to generate Shorts script.",
      communityCaption: data.communityCaption || "Failed to generate Community caption.",
    };
  } catch (error: any) {
    console.error("Groq Generation Error: ", error);
    throw new Error(`Groq AI generation failed: ${error.message}`);
  }
}
