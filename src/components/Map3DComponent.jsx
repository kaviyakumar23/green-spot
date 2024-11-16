import { Box } from "@mui/material";
import { useEffect, useRef } from "react";

const Map3DComponent = () => {
  const mapContainerRef = useRef(null);

  useEffect(() => {
    // Load the Maps JavaScript API with required settings
    const loadGoogleMaps = () => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&v=alpha&libraries=maps3d`;
      script.async = true;
      script.defer = true;

      script.onload = async () => {
        const { Map3DElement } = await window.google.maps.importLibrary("maps3d");

        const map3DElement = new Map3DElement({
          center: { lat: 43.6425, lng: -79.3871, altitude: 400 },
          range: 1000,
          tilt: 60,
        });

        // Clear any existing content and append the new map
        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML = "";
          mapContainerRef.current.appendChild(map3DElement);
        }
      };

      document.head.appendChild(script);
    };

    loadGoogleMaps();

    // Cleanup function
    return () => {
      const script = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (script) {
        script.remove();
      }
    };
  }, []);

  return (
    <Box
      ref={mapContainerRef}
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
};

export default Map3DComponent;
