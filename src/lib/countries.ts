export const countryToFlag: Record<string, string> = {
  "congo": "🇨🇩",
  "france": "🇫🇷",
  "germany": "🇩🇪",
  "italy": "🇮🇹",
  "netherlands": "🇳🇱",
  "sweden": "🇸🇪",
  "switzerland": "🇨🇭",
  "canada": "🇨🇦",
  "usa": "🇺🇸",
  "united states": "🇺🇸",
  "brazil": "🇧🇷",
  "argentina": "🇦🇷",
  "japan": "🇯🇵",
  "singapore": "🇸🇬",
  "uk": "🇬🇧",
  "united kingdom": "🇬🇧",
  "spain": "🇪🇸",
  "portugal": "🇵🇹",
  "romania": "🇷🇴",
  "poland": "🇵🇱",
  "india": "🇮🇳",
  "australia": "🇦🇺",
  "mexico": "🇲🇽",
  "chile": "🇨🇱",
  "colombia": "🇨🇴",
  "peru": "🇵🇪",
  "nigeria": "🇳🇬",
  "south africa": "🇿🇦",
  "morocco": "🇲🇦",
  "egypt": "🇪🇬",
  "turkey": "🇹🇷",
  "russia": "🇷🇺",
  "china": "🇨🇳",
  "indonesia": "🇮🇩",
  "philippines": "🇵🇭",
  "vietnam": "🇻🇳",
  "thailand": "🇹🇭",
  "malaysia": "🇲🇾",
  "south korea": "🇰🇷",
  "kenya": "🇰🇪",
  "ghana": "🇬🇭",
  "cameroon": "🇨🇲",
  "ivory coast": "🇨🇮",
  "senegal": "🇸🇳",
  "uganda": "🇺🇬",
  "tanzania": "🇹🇿"
};

export function getFlag(country?: string): string | null {
  if (!country) return null;
  const cleaned = country.trim().toLowerCase();
  if (countryToFlag[cleaned]) return countryToFlag[cleaned];
  
  for (const [key, flag] of Object.entries(countryToFlag)) {
    if (cleaned.includes(key) || key.includes(cleaned)) return flag;
  }
  return null;
}
