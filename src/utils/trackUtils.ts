import { TrackingPoint } from '../types/tracking';

/**
 * Calculates distance in kilometers between two GPS coordinates using the Haversine formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes total track length across all chronological points
 */
export function calculateTotalTrackDistance(points: TrackingPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (prev && curr && typeof prev.lat === 'number' && typeof curr.lat === 'number') {
      total += calculateDistanceKm(prev.lat, prev.lon, curr.lat, curr.lon);
    }
  }
  return total;
}

/**
 * Orders and deduplicates tracking points chronologically
 */
export function getSortedValidTrackPoints(
  historyPoints: TrackingPoint[],
  currentPoint?: TrackingPoint
): TrackingPoint[] {
  const all: TrackingPoint[] = [];

  for (const pt of historyPoints) {
    if (pt && typeof pt.lat === 'number' && typeof pt.lon === 'number') {
      all.push(pt);
    }
  }

  if (currentPoint && typeof currentPoint.lat === 'number' && typeof currentPoint.lon === 'number') {
    // If current point is not already the last item, append it
    const last = all[all.length - 1];
    if (
      !last ||
      last.lat !== currentPoint.lat ||
      last.lon !== currentPoint.lon ||
      last.time !== currentPoint.time
    ) {
      all.push(currentPoint);
    }
  }

  // Sort by time if time exists
  all.sort((a, b) => {
    if (!a.time || !b.time) return 0;
    return a.time.localeCompare(b.time);
  });

  return all;
}

/**
 * Generates a standard XML GPX track string for download or GIS tools
 */
export function generateGpxString(
  points: TrackingPoint[],
  trackerName: string,
  dateStr: string
): string {
  const trkpts = points
    .map((pt) => {
      const timeTag = pt.time ? `\n        <time>${pt.time.replace(' ', 'T')}Z</time>` : '';
      return `      <trkpt lat="${pt.lat}" lon="${pt.lon}">${timeTag}\n      </trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Live_track Database Manager" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Live_track ${trackerName} - ${dateStr}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${trackerName} (${dateStr})</name>
    <desc>Live_track GPS recording</desc>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

/**
 * Generates a GeoJSON feature collection for the track
 */
export function generateGeoJson(
  points: TrackingPoint[],
  trackerName: string,
  dateStr: string
) {
  const coordinates = points.map((p) => [p.lon, p.lat]);

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          tracker: trackerName,
          date: dateStr,
          pointsCount: points.length,
          stroke: '#4f46e5',
          'stroke-width': 4,
          'stroke-opacity': 0.9,
        },
        geometry: {
          type: 'LineString',
          coordinates,
        },
      },
      ...points.map((p, idx) => ({
        type: 'Feature',
        properties: {
          index: idx + 1,
          time: p.time,
          FC: p.FC,
          'marker-size': idx === 0 || idx === points.length - 1 ? 'large' : 'small',
          'marker-color': idx === 0 ? '#10b981' : idx === points.length - 1 ? '#ef4444' : '#6366f1',
          'marker-symbol': idx === 0 ? 'star' : idx === points.length - 1 ? 'circle' : 'dot',
        },
        geometry: {
          type: 'Point',
          coordinates: [p.lon, p.lat],
        },
      })),
    ],
  };
}

/**
 * Builds Google Maps URL displaying the track route between points
 * Google Maps Directions API allows origin, destination, and up to 9 intermediate waypoints
 */
export function buildGoogleMapsTrackUrl(points: TrackingPoint[]): string {
  if (!points.length) return 'https://www.google.com/maps';
  if (points.length === 1) {
    return `https://www.google.com/maps?q=${points[0].lat},${points[0].lon}`;
  }

  const origin = `${points[0].lat},${points[0].lon}`;
  const destination = `${points[points.length - 1].lat},${points[points.length - 1].lon}`;

  // Sample intermediate waypoints evenly (up to 9 to stay within Google Maps URL limits)
  const intermediate: string[] = [];
  if (points.length > 2) {
    const step = (points.length - 2) / Math.min(8, points.length - 2);
    for (let i = 1; i < points.length - 1; i += Math.max(1, Math.floor(step))) {
      intermediate.push(`${points[i].lat},${points[i].lon}`);
      if (intermediate.length >= 8) break;
    }
  }

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (intermediate.length > 0) {
    url += `&waypoints=${encodeURIComponent(intermediate.join('|'))}`;
  }
  return url;
}

/**
 * Builds an OpenStreetMap / GeoJSON.io URL showing the full track polyline
 */
export function buildOsmTrackUrl(points: TrackingPoint[], trackerName: string, dateStr: string): string {
  if (!points.length) return 'https://www.openstreetmap.org';

  // GeoJSON.io directly loads and renders the full polyline track over OpenStreetMap / Mapbox tiles
  const geojson = generateGeoJson(points, trackerName, dateStr);
  const geojsonString = JSON.stringify(geojson);
  
  // If payload is reasonably sized, geojson.io opens the interactive track directly on OSM tiles
  if (geojsonString.length < 8000) {
    return `https://geojson.io/#data=data:application/json,${encodeURIComponent(geojsonString)}`;
  }

  // Fallback to OpenStreetMap bbox centered on track
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLon = points[0].lon;
  let maxLon = points[0].lon;

  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }

  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;
  return `https://www.openstreetmap.org/?mlat=${centerLat}&mlon=${centerLon}#map=15/${centerLat.toFixed(5)}/${centerLon.toFixed(5)}&box=${minLon},${minLat},${maxLon},${maxLat}`;
}
