// TinyURLの無料URL短縮API(APIキー不要)を使う。失敗した場合は呼び出し元で元のURLにフォールバックする想定。
async function shortenUrl(longUrl) {
  const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
  const text = (await res.text()).trim();
  if (!res.ok || !text.startsWith("http")) {
    throw new Error(text || `TinyURL error: ${res.status}`);
  }
  return text;
}

module.exports = { shortenUrl };
