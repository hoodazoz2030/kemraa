"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { searchApi, type SearchResponse } from "@/lib/api";
import { Search, Package, MapPin, Loader2, ArrowLeft } from "lucide-react";

export default function SearchPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialQ = sp.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = async (term: string) => {
    if (term.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchApi.query(term.trim());
      setResults(res);
      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set("q", term.trim());
      window.history.replaceState({}, "", url.toString());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQ) doSearch(initialQ);
  }, [initialQ]);

  const totalHits = results?.results.reduce((s, r) => s + r.found, 0) ?? 0;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="text-sm text-gray-600 mt-1">
          Instant full-text search across services and trips
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); doSearch(q); }}
        className="bg-white rounded-lg border p-4 flex gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-gray-500" size={20} />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type to search..."
            className="w-full pl-11 pr-4 py-2.5 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={loading || q.trim().length < 2}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
          Search
        </button>
      </form>

      {searched && !loading && results && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          Found <strong>{totalHits}</strong> results for "<em>{q}</em>"
        </div>
      )}

      {results && results.results.map((r, idx) => (
        <div key={idx} className="bg-white rounded-lg border overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b flex items-center gap-2">
            {r.collection === "services" ? <Package size={16} className="text-gray-600" /> : <MapPin size={16} className="text-gray-600" />}
            <h2 className="font-semibold text-gray-900 capitalize">{r.collection}</h2>
            <span className="ml-auto text-sm text-gray-600">{r.found} hits</span>
          </div>
          <div className="divide-y">
            {r.hits.length === 0 ? (
              <div className="p-8 text-center text-gray-600 text-sm">No results</div>
            ) : (
              r.hits.map((hit, i) => (
                <div key={i} className="p-4 hover:bg-gray-50 transition">
                  <div className="font-semibold text-gray-900">
                    {hit.document.name || hit.document.title || "Untitled"}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    {hit.document.type && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {hit.document.type}
                      </span>
                    )}
                    {hit.document.status && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                        {hit.document.status}
                      </span>
                    )}
                    {hit.document.destinationCountry && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        {hit.document.destinationCountry}
                      </span>
                    )}
                    <span className="text-gray-500 font-mono">
                      {hit.document.id.slice(0, 8)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}

      {!searched && (
        <div className="bg-gray-50 border-2 border-dashed rounded-lg p-12 text-center text-gray-500">
          <Search size={48} className="mx-auto mb-3 opacity-40" />
          <p>Type above to search</p>
        </div>
      )}
    </div>
  );
}