import * as googleTTS from "google-tts-api";
import fs from "fs";
import path from "path";

/**
 * Splits long text into smaller segments under 200 characters to respect Google Translate API limits.
 */
function splitTextIntoChunks(text, maxLength = 180) {
  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = "";

  for (const word of words) {
    if ((currentChunk + " " + word).trim().length <= maxLength) {
      currentChunk = (currentChunk + " " + word).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = word;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

/**
 * Generates a free MP3 audio voiceover for the given script.
 * Filters out brackets and cues (like [Visuals] or [Audio]) to synthesize only spoken words.
 */
export async function generateFreeSpeech(text, id) {
  try {
    // 1. Clean visual/audio cues from Llama 3 script
    const cleanedText = text
      .replace(/\[Visuals?.*?\]/gi, "")
      .replace(/\[Audio?.*?\]/gi, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanedText) {
      throw new Error(
        "No pronounceable text remaining in script after filtering cues.",
      );
    }

    // 2. Split text into chunks under Google's 200 char limit
    const chunks = splitTextIntoChunks(cleanedText, 180);
    const buffers = [];

    // 3. Request audio chunk buffers from Google
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const base64Audio = await googleTTS.getAudioBase64(chunk, {
        lang: "en",
        slow: false,
        host: "https://translate.google.com",
        timeout: 10000,
      });
      buffers.push(Buffer.from(base64Audio, "base64"));
    }

    // 4. Concatenate chunks into a single MP3 buffer
    const finalBuffer = Buffer.concat(buffers);

    // 5. Ensure output directory exists in system temp directory
    const tempDir = require("os").tmpdir();
    const filename = `${id}.mp3`;
    const filePath = path.join(tempDir, filename);

    // 6. Write MP3 file to disk
    fs.writeFileSync(filePath, finalBuffer);
    console.log(
      `[TTS API] Voiceover generated successfully: ${filePath}`,
    );

    return filePath;
  } catch (error) {
    console.error("Free TTS Generation Error: ", error);
    throw new Error(`Google TTS failed: ${error.message}`);
  }
}
