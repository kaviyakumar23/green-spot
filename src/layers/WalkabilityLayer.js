import { getPlacesService } from "../utils/mapUtils";
import { getDistance } from "../utils/scoreUtils";

const calculateCirclePoints = (center, radiusKm, numPoints = 64) => {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle);
    const dy = radiusKm * Math.sin(angle);

    const lat = center.lat + (dy / 6371) * (180 / Math.PI);
    const lng = center.lng + ((dx / 6371) * (180 / Math.PI)) / Math.cos((center.lat * Math.PI) / 180);
    points.push({ lat, lng });
  }
  points.push(points[0]);
  return points;
};

const WALKABLE_PLACE_TYPES = [
  "restaurant",
  "cafe",
  "grocery_or_supermarket",
  "park",
  "pharmacy",
  "school",
  "shopping_mall",
  "convenience_store",
  "bus_station",
  "subway_station",
  "train_station",
];

export const createWalkabilityLayer = async (mapRef, location, showNotification, setIsLoading) => {
  try {
    setIsLoading?.(true);
    const layers = [];
    const walkingRadiusKm = 1.2; // Approximately 15 minutes walking distance

    const { Polygon3DElement, Marker3DElement, AltitudeMode } = await google.maps.importLibrary("maps3d");

    const circlePoints = calculateCirclePoints(location, walkingRadiusKm);

    const walkRadiusPolygon = new Polygon3DElement({
      outerCoordinates: circlePoints.map((point) => ({
        ...point,
        altitude: 50,
      })),
      altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
      fillColor: "rgba(76, 175, 80, 0.08)",
      strokeColor: "rgba(76, 175, 80, 0.9)",
      strokeWidth: 5,
      drawsOccludedSegments: true,
      extruded: true,
    });
    layers.push(walkRadiusPolygon);

    const topCircle = new Polygon3DElement({
      outerCoordinates: circlePoints.map((point) => ({
        ...point,
        altitude: 50,
      })),
      altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
      fillColor: "rgba(76, 175, 80, 0.1)",
      strokeColor: "rgba(76, 175, 80, 0.4)",
      strokeWidth: 1,
      drawsOccludedSegments: true,
    });
    layers.push(topCircle);

    const placesService = await getPlacesService(mapRef.current);

    // Collecting all amenities within walking radius
    const amenities = {};
    const amenityData = {};
    const searchPromises = WALKABLE_PLACE_TYPES.map(
      (type) =>
        new Promise((resolve) => {
          const request = {
            location: { lat: location.lat, lng: location.lng },
            radius: walkingRadiusKm * 1000, // Convert to meters
            type: type,
          };

          placesService.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              amenities[type] = results.filter((place) => {
                const distance = getDistance(location, place.geometry.location.toJSON());
                return distance <= walkingRadiusKm;
              });
            }
            resolve();
          });
        })
    );

    await Promise.all(searchPromises);

    const typeColors = {
      restaurant: "#FF5252",
      cafe: "#FF9800",
      grocery_or_supermarket: "#4CAF50",
      park: "#66BB6A",
      pharmacy: "#E91E63",
      school: "#2196F3",
      shopping_mall: "#9C27B0",
      convenience_store: "#00BCD4",
      bus_station: "#FFC107",
      subway_station: "#3F51B5",
      train_station: "#673AB7",
    };

    // Create markers for amenities - place them above the radius visualization
    Object.entries(amenities).forEach(([type, places]) => {
      places.forEach((place) => {
        const marker = new Marker3DElement({
          position: place.geometry.location.toJSON(),
          altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
          collisionBehavior: "OPTIONAL_AND_HIDES_LOWER_PRIORITY",
        });

        // Create custom marker template with enhanced visibility
        const template = document.createElement("template");
        template.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24">
            <defs>
              <filter id="shadow-${type}" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.3"/>
              </filter>
              <radialGradient id="grad-${type}" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" style="stop-color:${typeColors[type]};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${typeColors[type]};stop-opacity:0.8" />
              </radialGradient>
            </defs>
            <circle 
              cx="12" 
              cy="12" 
              r="8" 
              fill="url(#grad-${type})" 
              filter="url(#shadow-${type})"
              stroke="white"
              stroke-width="1"
            />
            <circle 
              cx="12" 
              cy="12" 
              r="6" 
              fill="white" 
              fill-opacity="0.3"
            />
          </svg>
        `;
        marker.append(template);

        // Add click listener with distance information
        marker.addEventListener("click", () => {
          const distance = calculateDistance(location, place.geometry.location.toJSON()).toFixed(2);
          const walkingTime = Math.round((distance / walkingRadiusKm) * 15); // Approximate walking time in minutes
          showNotification?.(`${place.name} - ${type.replace(/_/g, " ")} (${distance}km, ~${walkingTime} min walk)`, "info");
        });

        layers.push(marker);
      });
      amenityData[type] = places.map((place) => ({
        name: place.name,
        type: type,
        distance: getDistance(location, place.geometry.location.toJSON()),
        location: place.geometry.location.toJSON(),
      }));
    });

    // Calculate walkability score
    const totalAmenities = Object.values(amenities).reduce((sum, places) => sum + places.length, 0);
    const walkabilityScore = Math.min(Math.round((totalAmenities / 20) * 100), 100);

    showNotification?.(`Walkability Score: ${walkabilityScore}/100 (${totalAmenities} amenities within 15-min walk)`, "success");

    return { layers, amenityData };
  } catch (error) {
    console.error("Error creating walkability layer:", error);
    showNotification?.("Failed to create walkability visualization", "error");
    return null;
  } finally {
    setIsLoading?.(false);
  }
};
