"use client";

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para iconos de Leaflet en Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon style for dark mode (optional, using default for now but styled by CSS)
const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface LocationPickerProps {
  marker: { lat: number; lng: number };
  setMarker: (marker: { lat: number; lng: number }) => void;
  flyTo?: { lat: number; lng: number } | null;
}

function MapEvents({ setMarker, flyTo }: { setMarker: any, flyTo: any }) {
  const map = useMap();
  
  useEffect(() => {
    if (flyTo) {
      map.flyTo([flyTo.lat, flyTo.lng], 15, { animate: true, duration: 1.5 });
    }
  }, [flyTo, map]);

  useMapEvents({
    dragend: () => {
      const center = map.getCenter();
      setMarker({ lat: center.lat, lng: center.lng });
    },
    zoomend: () => {
      const center = map.getCenter();
      setMarker({ lat: center.lat, lng: center.lng });
    }
  });

  return null;
}

export default function LocationPicker({ marker, setMarker, flyTo }: LocationPickerProps) {
  return (
    <MapContainer 
      center={[marker.lat, marker.lng]} 
      zoom={13} 
      style={{ width: '100%', height: '100%', background: '#0f172a' }}
      className="z-0"
    >
      {/* Dark theme tile layer - CartoDB Dark Matter */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapEvents setMarker={setMarker} flyTo={flyTo} />
      
      {/* We keep the marker fixed at the center of the map while user drags */}
      <Marker position={[marker.lat, marker.lng]} icon={customIcon} />
    </MapContainer>
  );
}
