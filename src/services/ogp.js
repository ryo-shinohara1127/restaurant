const ogs = require("open-graph-scraper");

// 食べログ/Google候補に画像が無い場合、そのURLのOGPメタデータ(og:image等)を取得して補完する。
async function fetchOgp(url) {
  try {
    const { error, result } = await ogs({ url, timeout: 5000 });
    if (error) return null;
    return {
      title: result.ogTitle || null,
      image: result.ogImage?.[0]?.url || null,
      description: result.ogDescription || null,
    };
  } catch {
    return null;
  }
}

module.exports = { fetchOgp };
