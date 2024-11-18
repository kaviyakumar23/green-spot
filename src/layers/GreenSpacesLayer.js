export const createGreenSpacesLayer = async (map3DRef, currentLocation, showNotification, setIsLoading, setGreenSpaces) => {
  if (!map3DRef.current) return;

  try {
    setIsLoading(true);
    const { Polygon3DElement, AltitudeMode } = await google.maps.importLibrary("maps3d");
    const placesLibrary = await google.maps.importLibrary("places");

    // Create PlacesService instance
    const service = new placesLibrary.PlacesService(map3DRef.current);

    // Search for parks and green spaces within 2km radius
    const request = {
      location: { lat: currentLocation.lat, lng: currentLocation.lng },
      radius: 2000,
      type: ["park"],
      fields: ["geometry", "name"],
    };

    const places = await new Promise((resolve, reject) => {
      service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          console.log("Green spaces found:", results);
          setGreenSpaces(results);
          resolve(results);
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });

    const layers = [];

    // Create visualization for each green space
    for (const place of places) {
      const bounds = place.geometry.viewport;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      // Create ground-level base polygon
      const basePolygon = new Polygon3DElement({
        strokeColor: "#00FF00",
        strokeWidth: 2,
        fillColor: "rgba(0, 255, 0, 0.3)",
        altitudeMode: AltitudeMode.CLAMP_TO_GROUND,
        drawsOccludedSegments: true,
      });

      // Create elevated canopy effect
      const canopyPolygon = new Polygon3DElement({
        strokeColor: "rgba(0, 200, 0, 0.6)",
        strokeWidth: 1,
        fillColor: "rgba(0, 200, 0, 0.2)",
        altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
        extruded: true,
        drawsOccludedSegments: true,
      });

      const coordinates = [
        { lat: sw.lat(), lng: sw.lng(), altitude: 0 },
        { lat: sw.lat(), lng: ne.lng(), altitude: 0 },
        { lat: ne.lat(), lng: ne.lng(), altitude: 0 },
        { lat: ne.lat(), lng: sw.lng(), altitude: 0 },
        { lat: sw.lat(), lng: sw.lng(), altitude: 0 }, // Close the polygon
      ];

      // Set base at ground level
      basePolygon.outerCoordinates = coordinates;

      // Set canopy with height based on area
      const canopyCoordinates = coordinates.map((coord) => ({
        ...coord,
        altitude: 30, // Standard tree height in meters
      }));
      canopyPolygon.outerCoordinates = canopyCoordinates;

      // Add interaction data
      basePolygon.placeData = place;
      canopyPolygon.placeData = place;

      // Add click event listeners
      basePolygon.addEventListener("click", () => {
        showNotification(`${place.name} - Green Space`, "info");
      });

      canopyPolygon.addEventListener("click", () => {
        showNotification(`${place.name} - Green Space`, "info");
      });

      layers.push(basePolygon, canopyPolygon);
    }

    return layers;
  } catch (error) {
    console.error("Error creating green spaces layer:", error);
    showNotification("Failed to load green spaces data", "error");
    return null;
  } finally {
    setIsLoading(false);
  }
};
