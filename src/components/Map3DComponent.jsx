import { Box, CircularProgress, Typography, Snackbar, Alert } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import LayerControlPanel, { LAYER_TYPES } from "./LayerControlPanel";
import SearchBar from "./Searchbar";
import AirQualityPanel from "./AirQualityPanel";
import SolarPanel from "./SolarPanel";
import { createSolarLayer } from "../layers/SolarLayer";
import { createWalkabilityLayer } from "../layers/WalkabilityLayer";
import { createAirQualityLayer } from "../layers/AirQualityLayer";
import { initializeGoogleMaps } from "../utils/mapUtils";

const Map3DComponent = () => {
  const mapContainerRef = useRef(null);
  const map3DRef = useRef(null);
  const layersRef = useRef({});
  const [activeLayers, setActiveLayers] = useState({});
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const activeLayersRef = useRef({});

  const handleToggleLayer = async (layerId) => {
    setActiveLayers((prev) => {
      const newState = { ...prev, [layerId]: !prev[layerId] };
      console.log("newState", newState);
      if (map3DRef.current) {
        updateLayerVisibility(layerId, newState[layerId]);
      }

      return newState;
    });
  };

  const handleLocationChange = (newLocation) => {
    setCurrentLocation(newLocation);
    if (map3DRef.current) {
      // Only update map center if change came from search, not from map movement
      if (newLocation.fromSearch) {
        map3DRef.current.center = newLocation;
      }

      // Update layers
      Object.entries(activeLayers).forEach(([layerId, isActive]) => {
        if (isActive) {
          if (layersRef.current[layerId]) {
            if (Array.isArray(layersRef.current[layerId])) {
              layersRef.current[layerId].forEach((layer) => layer.remove());
            } else {
              layersRef.current[layerId].remove();
            }
            layersRef.current[layerId] = null;
          }
          updateLayerVisibility(layerId, true);
        }
      });
    }
  };

  const updateLayerVisibility = async (layerId, isVisible) => {
    if (layersRef.current[layerId]) {
      if (Array.isArray(layersRef.current[layerId])) {
        layersRef.current[layerId].forEach((layer) => layer.remove());
      } else {
        layersRef.current[layerId].remove();
      }
      layersRef.current[layerId] = null;
    }

    if (!isVisible) return;

    try {
      let layers = null;

      switch (layerId) {
        case LAYER_TYPES.SOLAR:
          layers = await createSolarLayer(map3DRef, currentLocation, showNotification, setIsLoading);
          break;

        case LAYER_TYPES.AIR_QUALITY:
          layers = await createAirQualityLayer(map3DRef, currentLocation);
          break;

        case LAYER_TYPES.WALKABILITY:
          layers = await createWalkabilityLayer(map3DRef, currentLocation);
          break;
      }

      if (layers) {
        layersRef.current[layerId] = layers;
        if (Array.isArray(layers)) {
          layers.forEach((layer) => {
            map3DRef.current.append(layer);

            // Add click listener for solar segments
            if (layerId === LAYER_TYPES.SOLAR) {
              layer.addEventListener("click", () => {
                if (layer.segment) {
                  showNotification(`Roof segment solar potential: ${Math.round(layer.segment.stats.sunshineQuantiles[5])} kWh/year`, "info");
                }
              });
            }
          });
        } else {
          map3DRef.current.append(layers);
        }
      }
    } catch (error) {
      console.error(`Error updating ${layerId} layer:`, error);
      showNotification(`Failed to update ${layerId} layer`, "error");
    }
  };

  useEffect(() => {
    activeLayersRef.current = activeLayers;
  }, [activeLayers]);

  useEffect(() => {
    initializeGoogleMaps({
      key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      v: "alpha",
    });

    const init = async () => {
      const { Map3DElement } = await google.maps.importLibrary("maps3d");
      const map3DElement = new Map3DElement({
        center: { lat: 43.4330471, lng: -80.4475974, altitude: 200 },
        range: 800,
        tilt: 60,
        roll: 0,
      });

      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = "";
        mapContainerRef.current.appendChild(map3DElement);
        map3DRef.current = map3DElement;

        setCurrentLocation({ lat: 43.4330471, lng: -80.4475974, altitude: 400 });

        map3DElement.addEventListener("gmp-click", async (e) => {
          console.log("clicked", e.placeId);
          if (e.position && e.placeId) {
            // Update current location with the clicked position
            const newLocation = {
              lat: e.position.lat,
              lng: e.position.lng,
              fromMap: true,
            };

            setCurrentLocation(newLocation);

            // If solar layer is active, update it
            if (activeLayersRef.current[LAYER_TYPES.SOLAR]) {
              // Remove existing solar layers
              if (layersRef.current[LAYER_TYPES.SOLAR]) {
                layersRef.current[LAYER_TYPES.SOLAR].forEach((layer) => layer.remove());
              }
              // Create new solar layer for selected position
              const layers = await createSolarLayer(map3DRef, newLocation, showNotification, setIsLoading);
              if (layers) {
                layersRef.current[LAYER_TYPES.SOLAR] = layers;
                layers.forEach((layer) => map3DRef.current.append(layer));
              }
            }
          }
        });
      }
    };

    init();

    return () => {
      const script = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (script) {
        script.remove();
      }
      Object.keys(layersRef.current).forEach((layerId) => {
        if (layersRef.current[layerId]) {
          if (Array.isArray(layersRef.current[layerId])) {
            layersRef.current[layerId].forEach((layer) => layer.remove());
          } else {
            layersRef.current[layerId].remove();
          }
        }
      });
    };
  }, []);

  useEffect(() => {
    console.log("Active layers updated:", activeLayers);
  }, [activeLayers]);

  const handleSearchLocation = (location) => {
    handleLocationChange({
      ...location,
      fromSearch: true,
    });
  };

  const showNotification = (message, severity = "info") => {
    setNotification({ message, severity });
  };

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
      <SearchBar onLocationSelect={handleSearchLocation} />
      <LayerControlPanel activeLayers={activeLayers} onToggleLayer={handleToggleLayer} />
      <AirQualityPanel location={currentLocation} visible={activeLayers[LAYER_TYPES.AIR_QUALITY]} />
      <SolarPanel location={currentLocation} visible={activeLayers[LAYER_TYPES.SOLAR]} />

      {isLoading && (
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1500,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            padding: 3,
            borderRadius: 2,
          }}
        >
          <CircularProgress />
          <Typography>Loading solar data...</Typography>
        </Box>
      )}

      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setNotification(null)} severity={notification?.severity || "info"} sx={{ width: "100%" }}>
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Map3DComponent;
