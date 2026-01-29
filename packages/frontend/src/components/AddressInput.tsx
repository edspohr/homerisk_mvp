import React, { useEffect, useRef, useState } from "react";

interface AddressInputProps {
  onAddressSelect: (address: string, location: { lat: number; lng: number }, neighborhood?: string) => void;
  onInputChange?: (value: string) => void;
  onManualSubmit?: (value: string) => void;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const AddressInput: React.FC<AddressInputProps & { className?: string; inputClassName?: string }> = ({ 
  onAddressSelect, 
  onInputChange,
  onManualSubmit,
  className, 
  inputClassName 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [hasSelectedPlace, setHasSelectedPlace] = useState(false);

  const apiKey = "AIzaSyBaCXbou3KwRUEJbPYxu8vhRH-SxwtPAGQ";

  useEffect(() => {
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
      script.onerror = () => console.warn("Google Maps script failed to load");
      document.body.appendChild(script);
    } else {
      setScriptLoaded(true);
    }
  }, [apiKey]);

  const onAddressSelectRef = useRef(onAddressSelect);
  useEffect(() => {
    onAddressSelectRef.current = onAddressSelect;
  }, [onAddressSelect]);

  const autocompleteInstance = useRef<any>(null);

  useEffect(() => {
    if (scriptLoaded && inputRef.current && !autocompleteInstance.current && window.google?.maps?.places) {
      try {
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ["geocode"],
          componentRestrictions: { country: "cl" }, 
          fields: ["formatted_address", "geometry", "address_components"],
        });

        autocompleteInstance.current = autocomplete;

        const listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place.geometry && place.geometry.location) {
            let neighborhood = "";
            if (place.address_components) {
              const findComponent = (type: string) => place.address_components.find((c: any) => c.types.includes(type));
              const nbComponent = findComponent("neighborhood") || findComponent("sublocality") || findComponent("administrative_area_level_2");
              if (nbComponent) neighborhood = nbComponent.long_name;
            }
            setHasSelectedPlace(true);
            if (onAddressSelectRef.current) {
              onAddressSelectRef.current(place.formatted_address || "", {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              }, neighborhood);
            }
          }
        });
        
        return () => {
          if (window.google?.maps?.event) {
            window.google.maps.event.removeListener(listener);
          }
        };
      } catch (e) {
        console.warn("Google Maps Autocomplete initialization failed:", e);
      }
    }
  }, [scriptLoaded]); 

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setHasSelectedPlace(false);
    onInputChange?.(value);
  };

  // Handle Enter key for manual submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.length > 3 && !hasSelectedPlace) {
      e.preventDefault();
      onManualSubmit?.(inputValue);
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="text"
        className={inputClassName || "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"}
        placeholder="Ingresa dirección (ej: Av. Providencia 1234)..."
        required
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

export default AddressInput;

