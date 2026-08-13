"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Package, MapPin, X } from "lucide-react";
import { searchApi, type SearchResponse } from "@/lib/api";

export default function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const container = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchApi.query(q.trim());
        setResults(res);
        setOpen(true);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [q]);

  // Click outside to close
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (container.current && !container.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const totalHits = results?.results.reduce((sum, r) => sum + r.found, 0) ?? 0;

  const goTo = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  return (
    <div ref={container} className="relative w-96">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { if (results) setOpen(true); }}
          placeholder="Search services, trips..."
          className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {loading && <Loader2 className="absolute right-9 top-2.5 text-blue-500 animate-spin" size={18} />}
        {q && (
          <button
            onClick={() => { setQ(""); setResults(null); }}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {open && results && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[500px] overflow-y-auto">
          {totalHits === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No results for "{q}"
            </div>
          ) : (
            <>
              <div className="px-4 py-2 border-b bg-gray-50 text-xs text-gray-600 flex justify-between">
                <span>{totalHits} results</span>
                <button
                  onClick={() => goTo("/search?q=" + encodeURIComponent(q))}
                  className="text-blue-600 hover:underline"
                >
                  View all →
                </button>
              </div>
              {results.results.map((r, idx) => (
                <div key={idx} className="border-b last:border-b-0">
                  <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase flex items-center gap-2">
                    {r.collection === "services" ? <Package size={12} /> : <MapPin size={12} />}
                    {r.collection} ({r.found})
                  </div>
                  {r.hits.slice(0, 4).map((hit, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(r.collection === "services" ? `/services?id=${hit.document.id}` : `/trips?id=${hit.document.id}`)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition"
                    >
                      <div className="font-medium text-gray-900 text-sm">
                        {hit.document.name || hit.document.title || hit.document.id.slice(0, 8)}
                      </div>
                      {hit.document.type && (
                        <div className="text-xs text-gray-500 mt-0.5">Type: {hit.document.type}</div>
                      )}
                      {hit.document.destinationCountry && (
                        <div className="text-xs text-gray-500 mt-0.5">→ {hit.document.destinationCountry}</div>
                      )}
                    </button>
                  ))}
                  {r.found > 4 && (
                    <div className="px-4 py-2 text-xs text-gray-500 text-center bg-gray-50">
                      + {r.found - 4} more
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}