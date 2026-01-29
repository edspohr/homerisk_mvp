import React, { useEffect, useRef, useState } from "react";

interface AddressInputProps {
  onAddressSelect: (address: string, location: { lat: number; lng: number }, neighborhood?: string) => void;
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
    if (!apiKey) return;
    if (window.google?.maps?.places) {
      setScriptLoaded(true);
      return;
    }
    const existingScript = document.getElementById("google-maps-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      document.body.appendChild(script);
    } else {
      setScriptLoaded(true);
    }
  }, []);

  // Use a ref for the callback to prevent effect re-triggering
  const onAddressSelectRef = useRef(onAddressSelect);

  // Update ref when prop changes
  useEffect(() => {
    onAddressSelectRef.current = onAddressSelect;
  }, [onAddressSelect]);

  const autocompleteInstance = useRef<any>(null);

  useEffect(() => {
    if (scriptLoaded && inputRef.current && !autocompleteInstance.current) {
      
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ["geocode"],
        componentRestrictions: { country: "cl" }, 
        fields: ["formatted_address", "geometry", "address_components"],
      });

      autocompleteInstance.current = autocomplete;

      const listener = autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          
          // Extract neighborhood logic
          let neighborhood = "";
          if (place.address_components) {
              const findComponent = (type: string) => place.address_components.find((c: any) => c.types.includes(type));
              const nbComponent = findComponent("neighborhood") || findComponent("sublocality") || findComponent("administrative_area_level_2");
              if (nbComponent) neighborhood = nbComponent.long_name;
          }

          // Call the latest callback
          if (onAddressSelectRef.current) {
               onAddressSelectRef.current(place.formatted_address || "", {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              }, neighborhood);
          }
        }
      });
      
      // Cleanup listener
      return () => {
          if (window.google && window.google.maps && window.google.maps.event) {
              window.google.maps.event.removeListener(listener);
          }
      };
    }
  }, [scriptLoaded]); // Only run once when script loads

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
