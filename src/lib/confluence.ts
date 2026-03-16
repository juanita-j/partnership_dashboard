/**
 * Confluence REST API client: list page attachments and download Excel files.
 * Base URL 예: https://wiki.navercorp.com (또는 context path 포함 시 https://wiki.navercorp.com/wiki)
 */

const EXCEL_EXT = [".xlsx", ".xls"];

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

  const list = await fetchAttachmentList(config);
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
