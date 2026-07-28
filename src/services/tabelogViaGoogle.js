const { runGoogleSearch } = require("./googleCustomSearch");

// 食べログには公式APIが無いため、Google Custom Search APIで
// site:tabelog.com に絞った検索を行い、間接的に食べログの店舗URLを取得する。
async function searchTabelogViaGoogle({ name, area }) {
  const query = area ? `${name} ${area}` : name;
  const { configured, items } = await runGoogleSearch({
    query,
    siteRestrict: "tabelog.com",
  });
  if (!configured) {
    return { configured: false, candidates: [] };
  }

  const candidates = items.map((item) => ({
    source: "tabelog",
    sourceLabel: "② 食べログ",
    name: item.title,
    url: item.link,
    snippet: item.snippet,
    photo: item.pagemap?.cse_image?.[0]?.src || null,
  }));

  return { configured: true, candidates };
}

module.exports = { searchTabelogViaGoogle };
