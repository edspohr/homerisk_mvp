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

const AddressInput: React.FC<AddressInputProps & { className?: string; inputClassName?: string }> = ({ onAddressSelect, className, inputClassName }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const isMockMode = !apiKey || apiKey.includes("YOUR_KEY") || apiKey === "placeholder";

  useEffect(() => {
    if (isMockMode) return;

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
  }, [apiKey, isMockMode]);

  // Use a ref for the callback to prevent effect re-triggering
  const onAddressSelectRef = useRef(onAddressSelect);

  // Update ref when prop changes
  useEffect(() => {
    onAddressSelectRef.current = onAddressSelect;
  }, [onAddressSelect]);

  const autocompleteInstance = useRef<any>(null);

  useEffect(() => {
    if (isMockMode) return;

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
  }, [scriptLoaded, isMockMode]); 

  // Handle Mock Mode Input
  const handleMockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      // Simulate selection immediately for smooth UX, or wait for blur
      // Let's do it immediately so "Analizar" button enables
      if (onAddressSelectRef.current && e.target.value.length > 3) {
           onAddressSelectRef.current(e.target.value, {
               lat: -33.4488897, // Santiago Center Mock
               lng: -70.6692655
           }, "Barrio Demo");
      }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="text"
        className={inputClassName || "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"}
        placeholder={isMockMode ? "Ingresa dirección (Modo Demo)..." : "Ingresa dirección (ej: Av. Providencia 1234)..."}
        required
        value={isMockMode ? inputValue : undefined} // Controlled in mock mode, uncontrolled (ref) in Maps mode
        onChange={isMockMode ? handleMockChange : undefined}
      />
      {isMockMode && <p className="text-xs text-indigo-200 mt-1 ml-1">* Modo Demo (Sin Google Maps API)</p>}
    </div>
  );
};

export default AddressInput;
