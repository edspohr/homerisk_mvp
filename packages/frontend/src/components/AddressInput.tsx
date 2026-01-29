import React, { useEffect, useRef, useState } from "react";

interface AddressInputProps {
  onAddressSelect: (address: string, location: { lat: number; lng: number }) => void;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const AddressInput: React.FC<AddressInputProps> = ({ onAddressSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("VITE_GOOGLE_MAPS_API_KEY is missing. Autocomplete will not work.");
      return;
    }

    if (window.google?.maps?.places) {
      setScriptLoaded(true);
      return;
    }

    if (!document.querySelector("#google-maps-script")) {
      const script = document.createElement("script");
      script.id = "google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setScriptLoaded(true);
      document.head.appendChild(script);
    } else {
        // If script is already loading but not ready
        const script = document.querySelector("#google-maps-script") as HTMLScriptElement;
        script.addEventListener('load', () => setScriptLoaded(true));
    }
  }, []);

  useEffect(() => {
    if (scriptLoaded && inputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ["geocode"],
        componentRestrictions: { country: "cl" }, // Restrict to Chile for MVP or remove for global
        fields: ["formatted_address", "geometry"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          onAddressSelect(place.formatted_address, {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
      });
    }
  }, [scriptLoaded, onAddressSelect]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">Dirección</label>
      <input
        ref={inputRef}
        type="text"
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
        placeholder="Ingresa tu dirección..."
        required
      />
    </div>
  );
};

export default AddressInput;
