import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { TrackingPoint } from '../types/tracking';

interface TrackMapViewProps {
  points: TrackingPoint[];
  trackerName: string;
}

export const TrackMapView: React.FC<TrackMapViewProps> = ({ points, trackerName }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (points.length === 0) return;

    // Clean up previous map if exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const latLngs: L.LatLngExpression[] = points.map((p) => [p.lat, p.lon]);

    // Initialize Leaflet map
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    });
    mapInstanceRef.current = map;

    // Add standard OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Draw the GPX track polyline
    const trackPolyline = L.polyline(latLngs, {
      color: '#4f46e5',
      weight: 4,
      opacity: 0.9,
      lineJoin: 'round',
    }).addTo(map);

    // Fit map bounds to show entire track
    if (latLngs.length > 1) {
      map.fitBounds(trackPolyline.getBounds(), { padding: [40, 40] });
    } else {
      map.setView(latLngs[0], 15);
    }

    // Start point marker (Green)
    const startPt = points[0];
    const startIcon = L.divIcon({
      className: 'start-marker-icon',
      html: `
        <div style="background-color: #10b981; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
          S
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    L.marker([startPt.lat, startPt.lon], { icon: startIcon })
      .bindPopup(
        `<strong>Start Point</strong><br/>${startPt.time || 'Start'}<br/><code>${startPt.lat.toFixed(6)}, ${startPt.lon.toFixed(6)}</code>`
      )
      .addTo(map);

    // End point / Current marker (Red)
    if (points.length > 1) {
      const endPt = points[points.length - 1];
      const endIcon = L.divIcon({
        className: 'end-marker-icon',
        html: `
          <div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; animation: pulse 2s infinite;">
            ●
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker([endPt.lat, endPt.lon], { icon: endIcon })
        .bindPopup(
          `<strong>Latest Position (${trackerName})</strong><br/>${endPt.time || 'Latest'}<br/><code>${endPt.lat.toFixed(6)}, ${endPt.lon.toFixed(6)}</code>`
        )
        .addTo(map);
    }

    // Force map size refresh after modal finishes rendering
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [points, trackerName]);

  return (
    <div className="w-full h-72 sm:h-80 rounded-xl overflow-hidden border border-slate-200 relative z-0 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
