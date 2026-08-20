"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { FileText, Upload, Loader2 } from "lucide-react";
import Cookies from "js-cookie";

export default function DocumentsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.get("/partner-portal/documents").then((r) => r.data),
  });
  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-kemraa-gold tracking-wider">Documents</h1>
          <p className="text-sm text-kemraa-text/60 mt-1">KYB and legal documents (§11)</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-kemraa-goldDark to-kemraa-gold text-kemraa-dark rounded-lg font-semibold hover:brightness-110 transition">
          <Upload size={18} /> Upload Document
        </button>
      </div>

      {isLoading ? (
        <div className="text-kemraa-text/60 py-12 text-center">Loading documents...</div>
      ) : items.length === 0 ? (
        <div className="bg-kemraa-darkAlt border border-kemraa-goldDark/20 rounded-xl py-16 text-center text-kemraa-text/60">No documents uploaded yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((d: any) => (
            <div key={d.id} className="bg-gradient-to-br from-kemraa-darkAlt to-kemraa-dark border border-kemraa-goldDark/20 rounded-xl p-5 hover:border-kemraa-goldDark/40 transition">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-kemraa-goldDark to-kemraa-gold flex items-center justify-center"><FileText size={20} className="text-kemraa-dark" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-kemraa-text font-semibold truncate">{d.fileName}</div>
                  <div className="text-xs text-kemraa-text/50">{d.docType}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-kemraa-text/60">
                <span>{(d.fileSize / 1024).toFixed(1)} KB</span>
                <span className={`px-2 py-0.5 rounded ${d.status === "APPROVED" ? "bg-green-500/10 text-green-400" : d.status === "REJECTED" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>{d.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}