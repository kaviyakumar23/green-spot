export const createTransitLayer = async (map3DRef, currentLocation, showNotification, setIsLoading, setTransitData) => {
  if (!map3DRef.current) return;

  try {
    setIsLoading(true);
    const { Polygon3DElement, Polyline3DElement, AltitudeMode } = await google.maps.importLibrary("maps3d");
    const placesLibrary = await google.maps.importLibrary("places");

    // Create PlacesService instance
    const service = new placesLibrary.PlacesService(map3DRef.current);

    // Search for transit stations within 1.5km radius
    const request = {
      location: { lat: currentLocation.lat, lng: currentLocation.lng },
      radius: 1500,
      type: ["transit_station", "subway_station", "train_station", "bus_station"],
      fields: ["geometry", "name", "types", "place_id"],
    };

    const stations = await new Promise((resolve, reject) => {
      service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          resolve(results);
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });

    const layers = [];
    const transitInfo = [];

    // Create visualization for transit stations and routes
    for (const station of stations) {
      // Create station marker visualization
      const stationBase = new Polygon3DElement({
        strokeColor: "#2196F3",
        strokeWidth: 2,
        fillColor: "rgba(33, 150, 243, 0.3)",
        altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
        extruded: true,
        drawsOccludedSegments: true,
      });

      // Create a circular base for the station
      const centerLat = station.geometry.location.lat();
      const centerLng = station.geometry.location.lng();
      const radius = 20; // meters
      const points = [];
      const segments = 32;

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        const lat = centerLat + (radius / 111111) * Math.cos(angle);
        const lng = centerLng + (radius / (111111 * Math.cos(centerLat * (Math.PI / 180)))) * Math.sin(angle);
        points.push({ lat, lng, altitude: 30 }); // 30m height for visibility
      }

      stationBase.outerCoordinates = points;

      // Create connection line to current location
      const connectionLine = new Polyline3DElement({
        strokeColor: "rgba(33, 150, 243, 0.5)",
        strokeWidth: 3,
        altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
        drawsOccludedSegments: true,
        geodesic: true,
      });

      connectionLine.coordinates = [
        { lat: currentLocation.lat, lng: currentLocation.lng, altitude: 20 },
        { lat: centerLat, lng: centerLng, altitude: 20 },
      ];

      // Store station data for panel display
      const distance = getDistance({ lat: centerLat, lng: centerLng }, { lat: currentLocation.lat, lng: currentLocation.lng });

      transitInfo.push({
        ...station,
        distance,
        type: station.types.find((type) => ["subway_station", "train_station", "bus_station", "transit_station"].includes(type)),
      });

      // Add click event listener
      stationBase.addEventListener("click", () => {
        showNotification(`${station.name} - ${distance.toFixed(2)}km away`, "info");
      });

      layers.push(stationBase, connectionLine);
    }

    // Store transit data for the panel
    setTransitData(transitInfo);

    return layers;
  } catch (error) {
    console.error("Error creating transit layer:", error);
    showNotification("Failed to load transit data", "error");
    return null;
  } finally {
    setIsLoading(false);
  }
};

// Helper function to calculate distance between two points
const getDistance = (point1, point2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = deg2rad(point2.lat - point1.lat);
  const dLon = deg2rad(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(point1.lat)) * Math.cos(deg2rad(point2.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};
