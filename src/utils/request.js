import { Platform } from "react-native";
import { globalAlert } from "../hooks/useAlert";

/**
 * 默认请求头 —— 所有请求默认携带 JSON 格式标记
 */
const DEFAULT_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

/**
 * 业务层认为成功的 code 列表（HTTP 状态码之外的业务码）
 */
const DEFAULT_SUCCESS_CODES = [0, 200];

/**
 * HTTP 状态码 → 中文提示映射
 */
const HTTP_STATUS_MESSAGES = {
  400: "请求参数错误",
  401: "登录状态已过期，请重新登录",
  403: "没有权限访问该资源",
  404: "请求的资源不存在",
  405: "请求方法不被允许",
  408: "请求超时，请稍后重试",
  409: "请求冲突，请稍后重试",
  422: "请求数据校验失败",
  429: "请求过于频繁，请稍后重试",
  500: "服务器异常，请稍后重试",
  502: "网关异常，请稍后重试",
  503: "服务暂不可用，请稍后重试",
  504: "网关超时，请稍后重试",
};

/**
 * 被判定为文件下载响应的 Content-Type 关键字列表
 */
const FILE_CONTENT_TYPES = [
  "application/octet-stream",
  "application/pdf",
  "application/zip",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument",
  "image/",
  "audio/",
  "video/",
];

/** 存储当前正在进行的请求，用于取消同接口重复请求 */
const pendingRequests = new Map();

// ──────────────────────────────────────────────
// 自定义错误类
// ──────────────────────────────────────────────

/**
 * 请求层统一抛出的错误类型。
 * 除原生 message 外，额外携带 HTTP 状态码、业务错误码、接口返回数据和原始响应对象，
 * 方便业务层按需处理不同错误场景。
 */
export class RequestError extends Error {
  /**
   * @param {string} message - 错误提示文案
   * @param {object} options - 附加错误上下文
   * @param {number} [options.status] - HTTP 状态码
   * @param {number|string} [options.code] - 接口业务错误码
   * @param {*} [options.data] - 接口返回的错误详情数据
   * @param {Response} [options.response] - fetch 原始响应对象
   */
  constructor(message, options = {}) {
    super(message);
    this.name = "RequestError";
    this.status = options.status;
    this.code = options.code;
    this.data = options.data;
    this.response = options.response;
  }
}

// ──────────────────────────────────────────────
// 工具函数 —— 类型判断
// ──────────────────────────────────────────────

/**
 * 获取接口基础地址。
 * 优先读取 EXPO_PUBLIC_API_BASE_URL 环境变量，未配置时返回空字符串（允许传入完整 URL）。
 * @returns {string}
 */
function getBaseUrl() {
  return process.env.EXPO_PUBLIC_API_BASE_URL || "";
}

/**
 * 判断一个值是否为普通对象（`{ ... }` 字面量）。
 * 用于区分标准 API 响应和字符串、数组等其他类型。
 * @param {*} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

/**
 * 判断请求体是否为 FormData。
 * FormData 的 Content-Type 应由运行时自动生成，不能手动设置。
 * @param {*} value
 * @returns {boolean}
 */
function isFormData(value) {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

/**
 * 判断请求体是否为浏览器/RN 原生支持的二进制类型。
 * 这类数据不应被 JSON.stringify，否则会破坏内容。
 * @param {*} value
 * @returns {boolean}
 */
function isBinaryBody(value) {
  return (
    isFormData(value) ||
    (typeof Blob !== "undefined" && value instanceof Blob) ||
    (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) ||
    (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams)
  );
}

// ──────────────────────────────────────────────
// 工具函数 —— URL 处理
// ──────────────────────────────────────────────

/**
 * 将对象参数拼接到 URL 查询字符串中。
 * - 跳过 null 和 undefined
 * - 数组会展开为多个同名参数（如 `?id=1&id=2`）
 * @param {string} url - 原始 URL
 * @param {object} params - 查询参数对象
 * @returns {string} 拼接后的 URL
 */
function appendQuery(url, params) {
  if (!params || Object.keys(params).length === 0) return url;

  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, String(item)));
      return;
    }
    query.append(key, String(value));
  });

  const queryString = query.toString();
  if (!queryString) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${queryString}`;
}

/**
 * 构造最终请求地址。
 * - 绝对地址（http/https）原样使用
 * - 相对地址自动拼接 baseUrl
 * - 统一附加查询参数
 * @param {string} url - 请求地址
 * @param {object} params - 查询参数
 * @param {string} baseUrl - 接口基础地址
 * @returns {string}
 */
function buildUrl(url, params, baseUrl) {
  const normalizedUrl = /^https?:\/\//i.test(url) ? url : `${baseUrl}${url}`;
  return appendQuery(normalizedUrl, params);
}

// ──────────────────────────────────────────────
// 工具函数 —— 请求头处理
// ──────────────────────────────────────────────

/**
 * 合并默认请求头和自定义请求头，并处理 FormData 的 Content-Type 移除。
 * @param {object} headers - 调用方传入的自定义请求头
 * @param {*} body - 规范化后的请求体
 * @returns {object} 最终请求头
 */
function normalizeHeaders(headers, body) {
  const result = {
    ...DEFAULT_HEADERS,
    ...headers,
  };

  if (isFormData(body)) {
    delete result["Content-Type"];
    delete result["content-type"];
  }

  return result;
}

// ──────────────────────────────────────────────
// 工具函数 —— 请求体处理
// ──────────────────────────────────────────────

/**
 * 规范化请求体。
 * - 普通对象 → JSON 字符串
 * - 原生二进制/字符串 → 直接透传
 * - null/undefined → undefined（fetch 会自动忽略 body）
 * @param {*} body
 * @returns {*}
 */
function normalizeBody(body) {
  if (body === undefined || body === null) return undefined;
  if (isBinaryBody(body) || typeof body === "string") return body;
  return JSON.stringify(body);
}

// ──────────────────────────────────────────────
// 工具函数 —— 响应处理
// ──────────────────────────────────────────────

/**
 * 从 Content-Disposition 中解析下载文件名。
 * 优先 `filename*=UTF-8''xxx` 格式，其次 `filename=xxx` 格式。
 * @param {Response} response
 * @returns {string}
 */
function getResponseFilename(response) {
  const disposition = response.headers.get("content-disposition") || "";
  const utf8Filename = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const normalFilename = disposition.match(/filename="?([^"]+)"?/i);
  const rawFilename = utf8Filename?.[1] || normalFilename?.[1];
  if (!rawFilename) return `download-${Date.now()}`;
  try {
    return decodeURIComponent(rawFilename);
  } catch {
    return rawFilename;
  }
}

/**
 * 判断响应是否为文件流（根据 Content-Type 和 Content-Disposition）。
 * @param {Response} response
 * @returns {boolean}
 */
function isFileResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const disposition = response.headers.get("content-disposition") || "";
  if (/attachment|filename=/i.test(disposition)) return true;
  return FILE_CONTENT_TYPES.some((type) => contentType.includes(type));
}

/**
 * 在 Web 环境中触发浏览器下载（创建临时 a 标签模拟点击）。
 * RN 原生无 DOM 能力，直接返回 false。
 * @param {Blob} blob - 文件内容
 * @param {string} filename - 下载文件名
 * @returns {boolean} 是否成功触发自动下载
 */
function downloadBlob(blob, filename) {
  if (Platform.OS !== "web" || typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(objectUrl);
  return true;
}

/**
 * 解析 fetch 原始响应。
 * - 文件响应 → 解析为 Blob 并尝试触发浏览器下载
 * - JSON 响应 → 解析为对象
 * - 其他响应 → 优先尝试 JSON，失败则返回纯文本
 * @param {Response} response
 * @returns {Promise<{ isFile: boolean, value: * }>}
 */
async function parseResponse(response) {
  if (isFileResponse(response) && response.ok) {
    const blob = await response.blob();
    const filename = getResponseFilename(response);
    return { isFile: true, value: { blob, filename, downloaded: downloadBlob(blob, filename) } };
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return { isFile: false, value: await response.json() };
  }

  const text = await response.text();
  try {
    return { isFile: false, value: text ? JSON.parse(text) : null };
  } catch {
    return { isFile: false, value: text };
  }
}

/**
 * 从接口返回值中提取错误提示文案。
 * 优先级：标准结构的 message > 纯字符串响应 > 兜底文案。
 * @param {*} payload - 接口响应数据
 * @param {string} fallback - 兜底错误文案
 * @returns {string}
 */
function getMessage(payload, fallback) {
  if (isPlainObject(payload) && payload.message) return payload.message;
  if (typeof payload === "string" && payload) return payload;
  return fallback;
}

/**
 * 统一触发错误提示。
 * - 有自定义回调时交给回调处理
 * - Web 端默认 console.warn
 * - 原生端默认全局弹窗
 * @param {string} message
 * @param {Function} [onError]
 */
function stripHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/<[^>]*>/g, "").replace(/&[a-zA-Z0-9#]+;/g, "").trim() || str;
}

function notifyError(message, onError) {
  if (typeof onError === "function") {
    onError(message);
    return;
  }
  if (Platform.OS === "web") {
    console.warn(message);
    return;
  }
  globalAlert("提示", stripHtml(message));
}

// ──────────────────────────────────────────────
// 同接口请求取消机制
// ──────────────────────────────────────────────

/**
 * 生成同接口请求的标识 key。
 * 默认格式 "METHOD:/path"，不包含 query / body，
 * 使同一接口即使携带不同参数也会被互相取消。
 * @param {{ method: string, url: string, cancelKey?: string|Function }} options
 * @returns {string}
 */
function buildRequestCancelKey({ method, url, cancelKey }) {
  if (typeof cancelKey === "function") return cancelKey({ method, url });
  if (cancelKey) return String(cancelKey);
  return `${method}:${url.split("?")[0]}`;
}

/**
 * 创建请求被取消时抛出的统一错误。
 * 业务层可通过 `error.isCanceled` 判断并忽略这类错误。
 * @returns {RequestError}
 */
function createCanceledRequestError() {
  const error = new RequestError("请求已被新的同接口请求取消", { code: "REQUEST_CANCELED" });
  error.isCanceled = true;
  return error;
}

/**
 * 为当前请求创建 AbortController，并取消上一个同接口的未完成请求。
 * 如果调用方传入了外部 signal，会同步到内部 controller。
 * @param {{ cancelRepeated: boolean, cancelKey: string, externalSignal?: AbortSignal }} options
 * @returns {{ signal: AbortSignal|undefined, cleanup: Function }}
 */
function createRequestAbortControl({ cancelRepeated, cancelKey, externalSignal }) {
  if (!cancelRepeated) {
    return { signal: externalSignal, cleanup: () => {} };
  }

  const previousRequest = pendingRequests.get(cancelKey);
  if (previousRequest) {
    previousRequest.controller.abort();
    previousRequest.cleanup();
  }

  const controller = new AbortController();
  const abortCurrentRequest = () => controller.abort();
  const cleanup = () => {
    const currentRequest = pendingRequests.get(cancelKey);
    if (currentRequest?.controller === controller) {
      pendingRequests.delete(cancelKey);
    }
    externalSignal?.removeEventListener?.("abort", abortCurrentRequest);
  };

  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener?.("abort", abortCurrentRequest, { once: true });
  }

  pendingRequests.set(cancelKey, { controller, cleanup });

  return { signal: controller.signal, cleanup };
}

// ──────────────────────────────────────────────
// 核心请求方法
// ──────────────────────────────────────────────

/**
 * 通用请求方法。
 *
 * 负责：
 * - URL 拼接与查询参数附加
 * - 自动注入 Authorization 请求头（从 AsyncStorage 读取）
 * - 请求体序列化
 * - 响应解析（JSON / 文件流）
 * - HTTP 状态码拦截（非 2xx 抛出 RequestError）
 * - 业务 code 拦截（不在 successCodes 中时抛出 RequestError）
 * - 同接口请求取消（防止重复提交）
 *
 * @param {string} url - 请求地址（绝对或相对路径）
 * @param {object} [options] - 请求配置
 * @param {string} [options.method="GET"] - 请求方法
 * @param {object} [options.params] - URL 查询参数
 * @param {*} [options.data] - 请求体（GET/DELETE 时作为查询参数）
 * @param {object} [options.headers] - 自定义请求头（会合并到默认头之上）
 * @param {boolean} [options.cancelRepeated=true] - 是否取消上一个同接口请求
 * @param {string|Function} [options.cancelKey] - 自定义取消标识
 * @param {AbortSignal} [options.signal] - 外部取消信号
 * @param {number[]|string[]} [options.successCodes=[0,200]] - 业务成功 code
 * @param {boolean} [options.showError=true] - 失败时是否自动弹出提示
 * @param {Function} [options.onError] - 自定义错误回调（覆盖默认提示）
 * @param {string} [options.baseUrl] - 单次请求覆盖基础地址
 * @returns {Promise<*>} 标准响应返回 data 字段；文件响应返回 `{ blob, filename, downloaded }`
 * @throws {RequestError}
 */
export async function request(url, options = {}) {
  const {
    method = "GET",
    params,
    data,
    headers,
    cancelRepeated = true,
    cancelKey,
    signal,
    successCodes = DEFAULT_SUCCESS_CODES,
    showError = true,
    onError,
    baseUrl = getBaseUrl(),
    ...fetchOptions
  } = options;

  const upperMethod = method.toUpperCase();
  const hasQueryPayload = upperMethod === "GET" || upperMethod === "DELETE";
  const requestUrl = buildUrl(url, hasQueryPayload ? params || data : params, baseUrl);
  const body = hasQueryPayload ? undefined : normalizeBody(data);

  const requestHeaders = normalizeHeaders(headers, body);

  const requestCancelKey = buildRequestCancelKey({ method: upperMethod, url: requestUrl, cancelKey });
  const abortControl = createRequestAbortControl({ cancelRepeated, cancelKey: requestCancelKey, externalSignal: signal });

  try {
    const response = await fetch(requestUrl, {
      method: upperMethod,
      headers: requestHeaders,
      body,
      signal: abortControl.signal,
      ...fetchOptions,
    });

    const parsed = await parseResponse(response);

    // ── HTTP 状态码异常 ──
    if (!response.ok) {
      const message = getMessage(parsed.value, HTTP_STATUS_MESSAGES[response.status] || `请求失败（${response.status}）`);
      const error = new RequestError(message, { status: response.status, data: parsed.value, response });
      if (showError) notifyError(message, onError);
      throw error;
    }

    // ── 文件流响应 ──
    if (parsed.isFile) {
      if (!parsed.value.downloaded && showError) {
        notifyError("当前环境不支持自动下载，请使用返回的文件数据自行处理", onError);
      }
      return parsed.value;
    }

    const payload = parsed.value;

    // ── 标准 JSON 响应，校验业务 code ──
    if (isPlainObject(payload) && Object.prototype.hasOwnProperty.call(payload, "code")) {
      if (!successCodes.includes(payload.code)) {
        const message = getMessage(payload, "请求失败，请稍后重试");
        const error = new RequestError(message, { status: response.status, code: payload.code, data: payload.data, response });
        if (showError) notifyError(message, onError);
        throw error;
      }
      return payload.data;
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createCanceledRequestError();
    }
    throw error;
  } finally {
    abortControl.cleanup();
  }
}

/**
 * 发起 GET 请求。
 * @param {string} url - 请求地址
 * @param {object} [options] - 请求配置
 * @returns {Promise<*>}
 */
request.get = (url, options) => request(url, { ...options, method: "GET" });

/**
 * 发起 POST 请求。
 * @param {string} url - 请求地址
 * @param {*} data - 请求体数据
 * @param {object} [options] - 请求配置
 * @returns {Promise<*>}
 */
request.post = (url, data, options) => request(url, { ...options, method: "POST", data });

/**
 * 发起 PUT 请求。
 * @param {string} url - 请求地址
 * @param {*} data - 请求体数据
 * @param {object} [options] - 请求配置
 * @returns {Promise<*>}
 */
request.put = (url, data, options) => request(url, { ...options, method: "PUT", data });

/**
 * 发起 DELETE 请求。
 * @param {string} url - 请求地址
 * @param {object} [options] - 请求配置，data 会作为查询参数发送
 * @returns {Promise<*>}
 */
request.delete = (url, options) => request(url, { ...options, method: "DELETE" });

export default request;
