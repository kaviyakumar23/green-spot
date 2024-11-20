import { Box, CircularProgress, Snackbar, Alert } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import LayerControlPanel, { LAYER_TYPES } from "./LayerControlPanel";
import SearchBar from "./SearchBar";
import AirQualityPanel from "./AirQualityPanel";
import SolarPanel from "./SolarPanel";
import { createSolarLayer } from "../layers/SolarLayer";
import { createWalkabilityLayer } from "../layers/WalkabilityLayer";
import { createAirQualityLayer } from "../layers/AirQualityLayer";
import { initializeGoogleMaps } from "../utils/mapUtils";
import { createGreenSpacesLayer } from "../layers/GreenSpacesLayer";
import GreenSpacesPanel from "./GreenSpacesPanel";
import { createTransitLayer } from "../layers/TransitLayer";
import TransitPanel from "./TransitPanel";
import SustainabilityScorePanel from "./ScorePanel";
import WalkabilityPanel from "./WalkabilityPanel";
import { generateInsights } from "../utils/AIInsights";

const Map3DComponent = () => {
  const mapContainerRef = useRef(null);
  const map3DRef = useRef(null);
  const layersRef = useRef({});
  const [activeLayers, setActiveLayers] = useState({});
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [greenSpaces, setGreenSpaces] = useState(null);
  const [transitData, setTransitData] = useState(null);
  const [solarData, setSolarData] = useState(null);
  const activeLayersRef = useRef({});
  const [sustainabilityScore, setSustainabilityScore] = useState(null);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [walkabilityData, setWalkabilityData] = useState(null);
  const [aqData, setAqData] = useState(null);
  const [visibleMapLayer, setVisibleMapLayer] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);

  const handleToggleLayer = async (layerId) => {
    setActiveLayers((prev) => {
      const newState = {
        ...prev,
        [layerId]: !prev[layerId],
      };

      if (!prev[layerId]) {
        setTimeout(() => {
          updateLayerVisibility(layerId);
        }, 0);
      } else if (visibleMapLayer === layerId) {
        setTimeout(() => {
          updateLayerVisibility(null);
        }, 0);
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

  const handleLayerSelect = (layerId) => {
    if (activeLayers[layerId] && visibleMapLayer !== layerId) {
      updateLayerVisibility(layerId);
    }
  };
  const updateLayerVisibility = async (layerId) => {
    if (layerId === visibleMapLayer) return;

    setIsLoading(true);
    try {
      Object.entries(layersRef.current).forEach(([_, layer]) => {
        if (Array.isArray(layer)) {
          layer.forEach((l) => l.remove());
        } else if (layer) {
          layer.remove();
        }
      });
      layersRef.current = {};

      if (!layerId) {
        setVisibleMapLayer(null);
        return;
      }

      let layers = null;
      switch (layerId) {
        case LAYER_TYPES.SOLAR:
          layers = await createSolarLayer(map3DRef, currentLocation, showNotification, setIsLoading, setSolarData);
          break;

        case LAYER_TYPES.AIR_QUALITY:
          layers = await createAirQualityLayer(map3DRef, currentLocation, showNotification, setIsLoading, setAqData);
          break;

        case LAYER_TYPES.WALKABILITY:
          const walkabilityResult = await createWalkabilityLayer(map3DRef, currentLocation, showNotification, setIsLoading);
          if (walkabilityResult) {
            layers = walkabilityResult.layers;
            setWalkabilityData(walkabilityResult.amenityData);
          }
          break;

        case LAYER_TYPES.GREEN_SPACES:
          layers = await createGreenSpacesLayer(map3DRef, currentLocation, showNotification, setIsLoading, setGreenSpaces);
          break;

        case LAYER_TYPES.TRANSIT:
          layers = await createTransitLayer(map3DRef, currentLocation, showNotification, setIsLoading, setTransitData);
          break;
      }

      if (layers) {
        layersRef.current[layerId] = layers;
        if (Array.isArray(layers)) {
          layers.forEach((layer) => map3DRef.current?.append(layer));
        } else {
          map3DRef.current?.append(layers);
        }
        setVisibleMapLayer(layerId);
      }
    } catch (error) {
      console.error(`Error updating ${layerId} layer:`, error);
      showNotification(`Failed to update ${layerId} layer`, "error");
    } finally {
      setIsLoading(false);
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
              const layers = await createSolarLayer(map3DRef, newLocation, showNotification, setIsLoading, setSolarData);
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
    const requiredLayers = [LAYER_TYPES.AIR_QUALITY, LAYER_TYPES.SOLAR, LAYER_TYPES.WALKABILITY, LAYER_TYPES.GREEN_SPACES, LAYER_TYPES.TRANSIT];

    const allRequiredLayersActive =
      Object.keys(activeLayers).length === requiredLayers.length && requiredLayers.every((layer) => activeLayers[layer] === true);

    if (allRequiredLayersActive) {
      fetchAIInsights();
    }
  }, [activeLayers]);

  const fetchAIInsights = async () => {
    const insights = await generateInsights(solarData, aqData, walkabilityData, greenSpaces, transitData, currentLocation);
    setAiInsights(insights);
  };

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
      <LayerControlPanel
        activeLayers={activeLayers}
        onToggleLayer={handleToggleLayer}
        onSelectPanel={setSelectedPanel}
        selectedPanel={selectedPanel}
        visibleMapLayer={visibleMapLayer}
        onLayerSelect={handleLayerSelect}
      />

      <AirQualityPanel
        location={currentLocation}
        aqData={aqData}
        setAqData={setAqData}
        visible={activeLayers[LAYER_TYPES.AIR_QUALITY] && selectedPanel === LAYER_TYPES.AIR_QUALITY}
      />
      <WalkabilityPanel
        location={currentLocation}
        visible={activeLayers[LAYER_TYPES.WALKABILITY] && selectedPanel === LAYER_TYPES.WALKABILITY}
        walkabilityData={walkabilityData}
      />
      <SolarPanel location={currentLocation} visible={activeLayers[LAYER_TYPES.SOLAR] && selectedPanel === LAYER_TYPES.SOLAR} />
      <GreenSpacesPanel
        location={currentLocation}
        visible={activeLayersRef.current[LAYER_TYPES.GREEN_SPACES] && selectedPanel === LAYER_TYPES.GREEN_SPACES}
        greenSpaces={greenSpaces}
      />
      <TransitPanel
        location={currentLocation}
        visible={activeLayers[LAYER_TYPES.TRANSIT] && selectedPanel === LAYER_TYPES.TRANSIT}
        transitData={transitData}
      />
      <SustainabilityScorePanel
        visible={true}
        sustainabilityScore={sustainabilityScore}
        setSustainabilityScore={setSustainabilityScore}
        activeLayers={activeLayers}
        solarData={solarData}
        greenSpacesData={greenSpaces}
        transitData={transitData}
        walkabilityData={walkabilityData}
        airQualityData={aqData}
        currentLocation={currentLocation}
        aiInsights={aiInsights}
      />

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
