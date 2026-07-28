const PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

// Places API (New) の searchText を呼び出す。テキストクエリ(キーワード+エリア)に加えて、
// 現在地(lat/lng)があれば locationBias で近くの結果を優先させる。
// 公式ドキュメント: https://developers.google.com/maps/documentation/places/web-service/text-search
async function searchPlaces({ query, lat, lng, radius = 3000 }) {
  const apiKey = process.env.GOOGLE_PLACES_KEY;
  if (!apiKey) {
    return { configured: false, places: [] };
  }

  const body = {
    textQuery: query,
    maxResultCount: 12,
    languageCode: "ja",
  };
  if (lat != null && lng != null) {
    body.locationBias = {
      circle: { center: { latitude: lat, longitude: lng }, radius },
    };
  }

  const res = await fetch(PLACES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.googleMapsUri,places.location",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Places API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const places = (data.places || []).map((p) => ({
    placeId: p.id,
    name: p.displayName?.text || "",
    address: p.formattedAddress || "",
    rating: p.rating ?? null,
    mapUrl: p.googleMapsUri || "",
    lat: p.location?.latitude,
    lng: p.location?.longitude,
  }));

  return { configured: true, places };
}

module.exports = { searchPlaces };
