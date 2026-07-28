const HOTPEPPER_ENDPOINT = "https://webservice.recruit.co.jp/hotpepper/gourmet/v1/";

// ホットペッパー グルメサーチAPIで店名(+エリア)を検索する。
// 公式ドキュメント: https://webservice.recruit.co.jp/doc/hotpepper/reference.html
async function searchHotpepper({ name, area }) {
  const apiKey = process.env.HOTPEPPER_API_KEY;
  if (!apiKey) {
    return { configured: false, candidates: [] };
  }

  // keywordに店名とエリアを両方詰めるとAND一致になり0件になりやすいため、
  // 店名のみで検索し、エリアは取得結果の住所に対する絞り込みとして後段で使う。
  const params = new URLSearchParams({
    key: apiKey,
    format: "json",
    keyword: name,
    count: "100",
  });

  const res = await fetch(`${HOTPEPPER_ENDPOINT}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`HotPepper API error: ${res.status}`);
  }
  const data = await res.json();
  let shops = data?.results?.shop ?? [];

  if (area) {
    const narrowed = shops.filter((shop) => shop.address?.includes(area));
    // 絞り込んだ結果が0件なら、絞り込み前の一覧を返す(該当なしと誤解させないため)
    if (narrowed.length > 0) shops = narrowed;
  }

  const candidates = shops.slice(0, 10).map((shop) => ({
    source: "hotpepper",
    sourceLabel: "ホットペッパー",
    name: shop.name,
    url: shop.urls?.pc ?? "",
    address: shop.address,
    budget: shop.budget?.name,
    genre: shop.genre?.name,
    photo: shop.photo?.pc?.l || shop.photo?.pc?.m || null,
  }));

  return { configured: true, candidates };
}

module.exports = { searchHotpepper };
