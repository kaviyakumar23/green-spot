import { Box, CircularProgress, Typography, Snackbar, Alert } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import LayerControlPanel, { LAYER_TYPES } from "./LayerControlPanel";
import SearchBar from "./Searchbar";
import AirQualityPanel from "./AirQualityPanel";
import { debounce } from "../utils/utility";
import SolarPanel from "./SolarPanel";
import { createSolarLayer } from "./SolarLayer";

const Map3DComponent = () => {
  const mapContainerRef = useRef(null);
  const map3DRef = useRef(null);
  const layersRef = useRef({});
  const [activeLayers, setActiveLayers] = useState({});
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

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

  const createAirQualityLayer = async () => {
    if (!map3DRef.current || !currentLocation) return;

    try {
      const { Polygon3DElement, AltitudeMode } = await window.google.maps.importLibrary("maps3d");

      // Create a gradient circle around the location
      const layers = [];
      const radii = [2, 1.5, 1, 0.5]; // kilometers
      const response = await fetch(`https://airquality.googleapis.com/v1/currentConditions:lookup?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location: {
            latitude: currentLocation.lat,
            longitude: currentLocation.lng,
          },
        }),
      });

      const data = await response.json();
      const aqi = data.indexes?.[0]?.aqi || 0;
      const alpha = Math.min(aqi / 200, 1); // Normalize AQI for opacity

      for (let i = 0; i < radii.length; i++) {
        const radius = radii[i];
        const points = [];
        const numPoints = 32;

        for (let j = 0; j <= numPoints; j++) {
          const angle = (j / numPoints) * 2 * Math.PI;
          const lat = currentLocation.lat + (radius / 111) * Math.cos(angle);
          const lng = currentLocation.lng + (radius / (111 * Math.cos((currentLocation.lat * Math.PI) / 180))) * Math.sin(angle);
          points.push({ lat, lng, altitude: 200 + i * 50 }); // Stack layers vertically
        }

        const circle = new Polygon3DElement({
          strokeColor: `rgba(255, 0, 0, ${alpha * 0.8})`,
          strokeWidth: 1,
          fillColor: `rgba(255, 0, 0, ${alpha * (0.2 - i * 0.05)})`, // Fade out with distance
          altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
          extruded: true,
        });

        circle.outerCoordinates = points;
        layers.push(circle);
      }

      return layers;
    } catch (error) {
      console.error("Error creating air quality layer:", error);
      return null;
    }
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
    // Clean up existing layers
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
    const initializeGoogleMaps = (g) => {
      var h,
        a,
        k,
        p = "The Google Maps JavaScript API",
        c = "google",
        l = "importLibrary",
        q = "__ib__",
        m = document,
        b = window;
      b = b[c] || (b[c] = {});
      var d = b.maps || (b.maps = {}),
        r = new Set(),
        e = new URLSearchParams(),
        u = () =>
          h ||
          (h = new Promise(async (f, n) => {
            await (a = m.createElement("script"));
            e.set("libraries", [...r] + "");
            for (k in g)
              e.set(
                k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()),
                g[k]
              );
            e.set("callback", c + ".maps." + q);
            a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
            d[q] = f;
            a.onerror = () => (h = n(Error(p + " could not load.")));
            a.nonce = m.querySelector("script[nonce]")?.nonce || "";
            m.head.append(a);
          }));
      d[l] ? console.warn(p + " only loads once. Ignoring:", g) : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)));
    };

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

        // map3DElement.addEventListener(
        //   "gmp-centerchange",
        //   debounce(() => {
        //     if (map3DElement.center) {
        //       handleLocationChange({
        //         lat: map3DElement.center.lat,
        //         lng: map3DElement.center.lng,
        //         altitude: map3DElement.center.altitude || 400,
        //         fromMap: true,
        //       });
        //     }
        //   }, 500)
        // );

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
            if (activeLayers[LAYER_TYPES.SOLAR]) {
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
      <SolarPanel location={currentLocation} visible={activeLayers[LAYER_TYPES.SOLAR]} selectedBuilding={selectedBuilding} />

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
