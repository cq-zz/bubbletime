import { IMAGE_ALLOWED_MIME_TYPES, IMAGE_MAX_FILE_SIZE_MB } from "./constant";

/**
 * 校验单张图片
 * @param {{ uri?: string, type?: string, fileSize?: number, size?: number }} file
 * @returns {string | null} 校验失败返回 i18n key，通过返回 null
 */
export function validateImage(file) {
  if (!file) return "common.noFileSelected";

  const mimeType = file.type || "";
  if (!IMAGE_ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return "common.unsupportedImageFormat";
  }

  const sizeBytes = file.fileSize ?? file.size ?? 0;
  if (sizeBytes > IMAGE_MAX_FILE_SIZE_MB * 1024 * 1024) {
    return "common.imageTooLarge";
  }

  return null;
}
