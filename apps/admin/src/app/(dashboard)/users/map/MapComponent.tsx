"use client";

import { useEffect, useRef } from "react";
import type { LiveLocation } from "@/lib/api";
import L from "leaflet";

const createGoldenIcon = (initials: string, isActive: boolean) =>
  L.divIcon({
    className: "golden-marker",
    html: `
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        background: linear-gradient(135deg, #C9A227, #E6C55C);
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <div style="
          transform: rotate(45deg);
          color: #0C0A06;
          font-weight: bold;
          font-size: 13px;
          font-family: system-ui;
        ">${initials}</div>
        ${isActive ? `<div style="
          position: absolute;
          top: -3px;
          right: -3px;
          width: 12px;
          height: 12px;
          background: #10B981;
          border: 2px solid white;
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>` : ""}
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
      </style>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });

interface Props {
  locations: LiveLocation[];
  onSelect: (loc: LiveLocation) => void;
  activeMinutes: number;
}

export default function LeafletMap({ locations, onSelect, activeMinutes }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([26.8206, 30.8025], 6);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    const now = Date.now();

    const currentIds = new Set(locations.map((l) => l.userId));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    locations.forEach((loc) => {
      const minsSinceUpdate = (now - new Date(loc.updatedAt).getTime()) / 60_000;
      const isActive = minsSinceUpdate < 5;
      const name = loc.displayName;
      const initials = name !== "Unknown"
        ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
        : (loc.user.email?.[0]?.toUpperCase() ?? "?");

      const existing = markersRef.current.get(loc.userId);
      const icon = createGoldenIcon(initials, isActive);

      if (existing) {
        existing.setLatLng([loc.latitude, loc.longitude]);
        existing.setIcon(icon);
      } else {
        const marker = L.marker([loc.latitude, loc.longitude], { icon }).addTo(map);
        markersRef.current.set(loc.userId, marker);
        marker.on("click", () => onSelect(loc));
      }

      const marker = markersRef.current.get(loc.userId)!;
      const popupHtml = `
        <div style="min-width: 220px; font-family: system-ui;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="
              width: 38px; height: 38px; border-radius: 50%;
              background: linear-gradient(135deg, #C9A227, #E6C55C);
              color: #0C0A06; font-weight: bold; font-size: 14px;
              display: flex; align-items: center; justify-content: center;
              flex-shrink: 0;
            ">${initials}</div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 600; color: #0C0A06; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${name}
              </div>
              <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
                ${loc.user.email ?? loc.user.phone ?? ""}
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
            <span style="
              display: inline-flex; align-items: center; gap: 3px;
              padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600;
              background: ${isActive ? "#dcfce7" : "#fef3c7"};
              color: ${isActive ? "#166534" : "#92400e"};
            ">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: ${isActive ? "#10B981" : "#F59E0B"};"></span>
              ${isActive ? "Active now" : Math.round(minsSinceUpdate) + "m ago"}
            </span>
            ${loc.battery != null ? `
              <span style="
                padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600;
                background: ${loc.battery > 50 ? "#dcfce7" : loc.battery > 20 ? "#fef3c7" : "#fee2e2"};
                color: ${loc.battery > 50 ? "#166534" : loc.battery > 20 ? "#92400e" : "#991b1b"};
              ">🔋 ${loc.battery}%</span>
            ` : ""}
          </div>
          <div style="font-size: 11px; color: #6b7280; line-height: 1.5;">
            📍 ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}
            ${loc.accuracy ? "<br/>🎯 ±" + Math.round(loc.accuracy) + "m accuracy" : ""}
            ${loc.source ? "<br/>📡 " + loc.source : ""}
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
    });
  }, [locations, activeMinutes, onSelect]);

  return <div ref={mapRef} className="kemraa-map" style={{ width: "100%", height: "100%" }} />;
}