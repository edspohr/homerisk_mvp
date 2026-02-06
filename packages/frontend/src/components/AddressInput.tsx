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

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    // Check if script is already present or loaded
    if (window.google?.maps?.places) {
      console.log("Google Maps JS API already loaded.");
      setScriptLoaded(true);
      return;
    }
    
    const existingScript = document.getElementById("google-maps-script");
    if (!existingScript) {
      console.log("Injecting Google Maps Script...");
      const script = document.createElement("script");
      script.id = "google-maps-script";
      // Legacy loading without 'loading=async' to ensure libraries are loaded with the main script if possible,
      // or at least available via global namespace checks.
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
         console.log("Google Maps Script loaded successfully.");
         setScriptLoaded(true);
      };
      script.onerror = (e) => console.error("Google Maps script failed to load:", e);
      document.head.appendChild(script);
    } else {
      console.log("Google Maps Script already exists in DOM.");
      if (window.google?.maps?.places) {
          setScriptLoaded(true);
      } else {
          // Poll for it
          const checkGoogle = setInterval(() => {
              if (window.google?.maps?.places) {
                  console.log("Google Maps object detected via polling.");
                  setScriptLoaded(true);
                  clearInterval(checkGoogle);
              }
          }, 100);
      }
    }
  }, [apiKey]);

  const onAddressSelectRef = useRef(onAddressSelect);
  useEffect(() => {
    onAddressSelectRef.current = onAddressSelect;
  }, [onAddressSelect]);

  const autocompleteInstance = useRef<any>(null);

  useEffect(() => {
    if (!scriptLoaded || !inputRef.current || autocompleteInstance.current) return;

    const initialize = () => {
        if (!window.google?.maps?.places) {
            console.log("Waiting for window.google.maps.places...");
            return;
        }

        try {
            console.log("Initializing Autocomplete (Legacy Mode) on:", inputRef.current);
            const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
                types: ["geocode"],
                componentRestrictions: { country: "cl" },
                fields: ["formatted_address", "geometry", "address_components"],
            });

            autocompleteInstance.current = autocomplete;
            console.log("Autocomplete instance created:", autocomplete);


            autocomplete.addListener("place_changed", () => {

                const place = autocomplete.getPlace();
                console.log("Place selected:", place);

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
            
            // Note: Cleaner cleanup would happen here but since we use a ref for instance,
            // we rely on garbage collection or manual cleanup on unmount if strictly needed.
            // But the listener is attached to the instance.
        } catch (error) {
            console.error("Error initializing Autocomplete:", error);
        }
    };

    // Retry loop just in case scriptLoaded is true but places isn't quite there (race condition)
    if (window.google?.maps?.places) {
        initialize();
    } else {
        const interval = setInterval(() => {
            if (window.google?.maps?.places) {
                clearInterval(interval);
                initialize();
            }
        }, 100);
        return () => clearInterval(interval);
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

