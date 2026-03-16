/**
 * Confluence REST API client: list page attachments and download Excel files.
 * Base URL 예: https://wiki.navercorp.com (또는 context path 포함 시 https://wiki.navercorp.com/wiki)
 * CONFLUENCE_PAGE_ID: 숫자 페이지 ID(예: 123456789) 또는 short link 키(예: WSw9JwE). short link면 리다이렉트로 페이지 ID를 조회합니다.
 */

const EXCEL_EXT = [".xlsx", ".xls"];

/** /pages/123456789/ 제목 형태에서 페이지 ID 추출 */
const PAGE_ID_IN_URL = /\/pages\/(\d+)(?:\/|$)/i;

export interface ConfluenceConfig {
  baseUrl: string;
  pageId: string;
  email: string;
  apiToken: string;
}

function getConfig(): ConfluenceConfig | null {
  const baseUrl = process.env.CONFLUENCE_BASE_URL?.trim();
  const pageId = process.env.CONFLUENCE_PAGE_ID?.trim();
  const email = process.env.CONFLUENCE_EMAIL?.trim();
  const apiToken = process.env.CONFLUENCE_API_TOKEN?.trim();
  if (!baseUrl || !pageId || !email || !apiToken) return null;
  return { baseUrl, pageId, email, apiToken };
}

/** 숫자만 있으면 true (페이지 ID), 아니면 short key(예: WSw9JwE) */
function isNumericPageId(value: string): boolean {
  return /^\d+$/.test(value);
}

/** short link 키로 페이지 URL 요청 후 리다이렉트 Location에서 페이지 ID 추출. 실패 시 null */
const resolvedPageIdCache = new Map<string, string>();

async function resolveShortLinkToPageId(config: ConfluenceConfig): Promise<string> {
  const cacheKey = `${config.baseUrl}:${config.pageId}`;
  const cached = resolvedPageIdCache.get(cacheKey);
  if (cached) return cached;

  const base = config.baseUrl.replace(/\/$/, "");
  const shortUrl = `${base}/x/${config.pageId}`;
  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");

  let currentUrl: string = shortUrl;
  const maxRedirects = 5;
  for (let i = 0; i < maxRedirects; i++) {
    const res = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "text/html, application/json",
      },
    });

    if (res.status === 200) {
      const finalUrl = res.url || currentUrl;
      const match = finalUrl.match(PAGE_ID_IN_URL);
      if (match) {
        const pageId = match[1];
        resolvedPageIdCache.set(cacheKey, pageId);
        return pageId;
      }
      break;
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      currentUrl = location.startsWith("http") ? location : new URL(location, base).href;
      const match = currentUrl.match(PAGE_ID_IN_URL);
      if (match) {
        const pageId = match[1];
        resolvedPageIdCache.set(cacheKey, pageId);
        return pageId;
      }
      continue;
    }
    break;
  }

  throw new Error(
    `Confluence short link를 페이지 ID로 변환할 수 없습니다. URL: ${shortUrl} (CONFLUENCE_PAGE_ID를 숫자 페이지 ID로 직접 설정해 보세요.)`
  );
}

/** 설정된 pageId가 short key면 숫자 페이지 ID로 변환한 config 반환 */
async function resolveConfigPageId(config: ConfluenceConfig): Promise<ConfluenceConfig> {
  if (isNumericPageId(config.pageId)) return config;
  const resolvedId = await resolveShortLinkToPageId(config);
  return { ...config, pageId: resolvedId };
}

function isExcelFileName(title: string): boolean {
  const lower = title.toLowerCase();
  return EXCEL_EXT.some((ext) => lower.endsWith(ext));
}

/** Confluence REST API (Server/Data Center): GET /rest/api/content/{pageId}/child/attachment */
async function fetchAttachmentList(config: ConfluenceConfig): Promise<{ title: string; downloadPath: string }[]> {
  const base = config.baseUrl.replace(/\/$/, "");
  const apiPath = `${base}/rest/api/content/${config.pageId}/child/attachment`;
  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");

  const res = await fetch(apiPath, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Confluence attachments list failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as {
    results?: Array<{
      title?: string;
      _links?: { download?: string };
    }>;
  };

  const results = json.results ?? [];
  const out: { title: string; downloadPath: string }[] = [];
  for (const r of results) {
    const title = (r.title ?? "").trim();
    const download = (r._links?.download ?? "").trim();
    if (!title || !download) continue;
    if (!isExcelFileName(title)) continue;
    out.push({ title, downloadPath: download.startsWith("http") ? download : `${base}${download.startsWith("/") ? "" : "/"}${download}` });
  }
  return out;
}

/** Download attachment binary. downloadPath may be full URL or path. */
async function downloadAttachment(config: ConfluenceConfig, downloadPath: string): Promise<ArrayBuffer> {
  const base = config.baseUrl.replace(/\/$/, "");
  const url = downloadPath.startsWith("http") ? downloadPath : `${base}${downloadPath.startsWith("/") ? "" : "/"}${downloadPath}`;
  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/octet-stream",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Confluence attachment download failed: ${res.status} ${text}`);
  }

  return res.arrayBuffer();
}

/**
 * Fetch all Excel attachments from the configured Confluence page and return their buffers.
 * Order: by attachment title (deterministic).
 */
export async function fetchExcelBuffersFromConfluence(): Promise<{ fileName: string; buffer: ArrayBuffer }[]> {
  const config = getConfig();
  if (!config) {
    throw new Error(
      "Confluence not configured. Set CONFLUENCE_BASE_URL, CONFLUENCE_PAGE_ID, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN."
    );
  }

  const resolvedConfig = await resolveConfigPageId(config);
  const list = await fetchAttachmentList(resolvedConfig);
  if (list.length === 0) {
    return [];
  }

  const sorted = [...list].sort((a, b) => a.title.localeCompare(b.title));
  const out: { fileName: string; buffer: ArrayBuffer }[] = [];
  for (const item of sorted) {
    const buffer = await downloadAttachment(config, item.downloadPath);
    out.push({ fileName: item.title, buffer });
  }
  return out;
}

export function isConfluenceConfigured(): boolean {
  return getConfig() !== null;
}
