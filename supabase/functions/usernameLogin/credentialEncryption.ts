interface Credentials {
  mode: "signIn" | "signUp";
  identifier: string;
  password: string;
  issuedAt: number;
  nonce: string;
}

let privateKey: Promise<CryptoKey> | undefined;

function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function getPrivateKey(): Promise<CryptoKey> {
  if (!privateKey) {
    const encoded = Deno.env.get("AUTH_PRIVATE_KEY");

    if (!encoded) {
      throw new Error("AUTH_ENCRYPTION_UNAVAILABLE");
    }

    privateKey = crypto.subtle
      .importKey(
        "pkcs8",
        decode(encoded),
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        false,
        ["decrypt"],
      )
      .catch((error: unknown) => {
        privateKey = undefined;
        throw error;
      });
  }

  return privateKey;
}

export async function decryptCredentials(body: unknown): Promise<Credentials> {
  if (
    typeof body !== "object" ||
    body === null ||
    !("version" in body) ||
    body.version !== 1 ||
    !("encryptedKey" in body) ||
    typeof body.encryptedKey !== "string" ||
    body.encryptedKey.length > 1024 ||
    !("iv" in body) ||
    typeof body.iv !== "string" ||
    body.iv.length !== 16 ||
    !("ciphertext" in body) ||
    typeof body.ciphertext !== "string" ||
    body.ciphertext.length > 12_000
  ) {
    throw new Error("INVALID_REQUEST");
  }

  const iv = decode(body.iv);

  if (iv.length !== 12) {
    throw new Error("INVALID_REQUEST");
  }

  const rawKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    await getPrivateKey(),
    decode(body.encryptedKey),
  );

  let plaintext: ArrayBuffer | undefined;

  try {
    if (rawKey.byteLength !== 32) {
      throw new Error("INVALID_REQUEST");
    }

    const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, [
      "decrypt",
    ]);

    plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: new TextEncoder().encode("groovy-auth:v1"),
        tagLength: 128,
      },
      key,
      decode(body.ciphertext),
    );

    const payload: unknown = JSON.parse(new TextDecoder().decode(plaintext));

    if (
      typeof payload !== "object" ||
      payload === null ||
      !("mode" in payload) ||
      (payload.mode !== "signIn" && payload.mode !== "signUp") ||
      !("identifier" in payload) ||
      typeof payload.identifier !== "string" ||
      !payload.identifier.trim() ||
      payload.identifier.length > 254 ||
      !("password" in payload) ||
      typeof payload.password !== "string" ||
      !payload.password ||
      payload.password.length > 1024 ||
      !("issuedAt" in payload) ||
      typeof payload.issuedAt !== "number" ||
      !Number.isSafeInteger(payload.issuedAt) ||
      !("nonce" in payload) ||
      typeof payload.nonce !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        payload.nonce,
      )
    ) {
      throw new Error("INVALID_REQUEST");
    }

    const age = Date.now() - payload.issuedAt;

    if (age > 120_000 || age < -30_000) {
      throw new Error("EXPIRED_REQUEST");
    }

    return {
      mode: payload.mode,
      identifier: payload.identifier.trim(),
      password: payload.password,
      issuedAt: payload.issuedAt,
      nonce: payload.nonce,
    };
  } finally {
    new Uint8Array(rawKey).fill(0);

    if (plaintext) {
      new Uint8Array(plaintext).fill(0);
    }
  }
}
