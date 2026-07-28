const CSE_ENDPOINT = "https://www.googleapis.com/customsearch/v1";

// Google Custom Search JSON APIの共通呼び出し。siteRestrict を渡すと "site:xxx.com" を検索語に付与する。
async function runGoogleSearch({ query, siteRestrict }) {
  const apiKey = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !cx) {
    return { configured: false, items: [] };
  }

  const q = siteRestrict ? `site:${siteRestrict} ${query}` : query;
  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q,
    num: "10",
  });

  const res = await fetch(`${CSE_ENDPOINT}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Google Custom Search API error: ${res.status}`);
  }
  const data = await res.json();
  return { configured: true, items: data.items ?? [] };
}

module.exports = { runGoogleSearch };
