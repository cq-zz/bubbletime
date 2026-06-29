import { IMAGE_ALLOWED_MIME_TYPES } from "./constant";

export function validateImage(file) {
  if (!file) return "common.noFileSelected";

  const mimeType = file.type || "";
  if (!IMAGE_ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return "common.unsupportedImageFormat";
  }

  return null;
}
