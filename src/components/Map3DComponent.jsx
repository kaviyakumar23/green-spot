import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import LayerControlPanel, { LAYER_TYPES } from "./LayerControlPanel";
import SearchBar from "./Searchbar";

const Map3DComponent = () => {
  const mapContainerRef = useRef(null);
  const map3DRef = useRef(null);
  const layersRef = useRef({});
  const [activeLayers, setActiveLayers] = useState({});

  const handleToggleLayer = async (layerId) => {
    setActiveLayers((prev) => {
      const newState = { ...prev, [layerId]: !prev[layerId] };

      if (map3DRef.current) {
        updateLayerVisibility(layerId, newState[layerId]);
      }

      return newState;
    });
  };

  const createWalkabilityLayer = async () => {
    if (!map3DRef.current) return;

    const { Polygon3DElement, AltitudeMode } = await window.google.maps.importLibrary("maps3d");

    const center = map3DRef.current.center;
    const radius = 1.25; // Approximately 15-minute walk in km
    const numPoints = 32;
    const points = [];

    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const lat = center.lat + (radius / 111) * Math.cos(angle);
      const lng = center.lng + (radius / (111 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(angle);
      points.push({ lat, lng, altitude: 100 }); // Set altitude for visual effect
    }

    const walkabilityCircle = new Polygon3DElement({
      strokeColor: "rgba(0, 255, 0, 0.8)",
      strokeWidth: 2,
      fillColor: "rgba(0, 255, 0, 0.2)",
      altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
      extruded: true,
    });

    walkabilityCircle.outerCoordinates = points;
    return walkabilityCircle;
  };

  const handleLocationChange = (newLocation) => {
    if (map3DRef.current) {
      map3DRef.current.center = newLocation;

      // Update any active layers for the new location
      Object.entries(activeLayers).forEach(([layerId, isActive]) => {
        if (isActive) {
          // Remove old layer
          if (layersRef.current[layerId]) {
            layersRef.current[layerId].remove();
            layersRef.current[layerId] = null;
          }
          // Create new layer at new location
          updateLayerVisibility(layerId, true);
        }
      });
    }
  };

  const updateLayerVisibility = async (layerId, isVisible) => {
    if (layerId === LAYER_TYPES.WALKABILITY) {
      if (isVisible) {
        if (!layersRef.current[layerId]) {
          layersRef.current[layerId] = await createWalkabilityLayer();
        }
        map3DRef.current.append(layersRef.current[layerId]);
      } else if (layersRef.current[layerId]) {
        layersRef.current[layerId].remove();
      }
    }
  };

  useEffect(() => {
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

        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML = "";
          mapContainerRef.current.appendChild(map3DElement);
          map3DRef.current = map3DElement;

          Object.entries(activeLayers).forEach(([layerId, isActive]) => {
            if (isActive) {
              updateLayerVisibility(layerId, true);
            }
          });
        }
      };

      document.head.appendChild(script);
    };

    loadGoogleMaps();

    return () => {
      const script = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (script) {
        script.remove();
      }
    };
  }, []);

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
      }}
    >
      <Box
        ref={mapContainerRef}
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <SearchBar onLocationSelect={handleLocationChange} />
      <LayerControlPanel activeLayers={activeLayers} onToggleLayer={handleToggleLayer} />
    </Box>
  );
};

export default Map3DComponent;
