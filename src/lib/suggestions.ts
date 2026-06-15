const KEY = "cashflow_suggestions";

interface Suggestions {
  income: { party: string; category: string };
  expense: { party: string; category: string };
}

const EMPTY: Suggestions = {
  income: { party: "", category: "" },
  expense: { party: "", category: "" },
};

export function getSuggestions(): Suggestions {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    return { ...structuredClone(EMPTY), ...JSON.parse(raw) };
  } catch {
    return structuredClone(EMPTY);
  }
}

export function saveSuggestion(
  type: "income" | "expense",
  party: string,
  category?: string
): void {
  try {
    const s = getSuggestions();
    s[type].party = party;
    if (category) s[type].category = category;
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
