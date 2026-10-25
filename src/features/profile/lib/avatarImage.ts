const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const maxSourceBytes = 5 * 1024 * 1024;
const maxOutputBytes = 128 * 1024;
const minDimension = 256;
const maxDimension = 4096;
const outputDimension = 256;

function encodeWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== "image/webp") {
          reject(new Error("AVATAR_ENCODING_FAILED"));
          return;
        }

        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

export async function prepareAvatar(file: File): Promise<Blob> {
  if (!allowedTypes.has(file.type)) {
    throw new Error("AVATAR_INVALID_TYPE");
  }

  if (file.size === 0 || file.size > maxSourceBytes) {
    throw new Error("AVATAR_SOURCE_TOO_LARGE");
  }

  let image: ImageBitmap;

  try {
    image = await createImageBitmap(file);
  } catch {
    throw new Error("AVATAR_INVALID_IMAGE");
  }

  try {
    if (
      image.width < minDimension ||
      image.height < minDimension ||
      image.width > maxDimension ||
      image.height > maxDimension
    ) {
      throw new Error("AVATAR_INVALID_RESOLUTION");
    }

    const canvas = document.createElement("canvas");
    canvas.width = outputDimension;
    canvas.height = outputDimension;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("AVATAR_ENCODING_FAILED");
    }

    const side = Math.min(image.width, image.height);
    const sourceX = (image.width - side) / 2;
    const sourceY = (image.height - side) / 2;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    context.drawImage(
      image,
      sourceX,
      sourceY,
      side,
      side,
      0,
      0,
      outputDimension,
      outputDimension,
    );

    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await encodeWebp(canvas, quality);

      if (blob.size > 0 && blob.size <= maxOutputBytes) {
        return blob;
      }
    }

    throw new Error("AVATAR_OUTPUT_TOO_LARGE");
  } finally {
    image.close();
  }
}
