import type { SpotifyApiCode } from "./models/spotify.ts";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: SpotifyApiCode,
    readonly retryAfter = 0,
  ) {
    super(code);
  }
}

export async function readBody(request: Request): Promise<unknown> {
  if (!request.body) {
    throw new ApiError(400, "INVALID_REQUEST");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  while (true) {
    const part = await reader.read();
    if (part.done) break;

    length += part.value.byteLength;

    if (length > 2048) {
      await reader.cancel();
      throw new ApiError(413, "INVALID_REQUEST");
    }

    chunks.push(part.value);
  }

  const bytes = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(400, "INVALID_REQUEST");
  }
}
