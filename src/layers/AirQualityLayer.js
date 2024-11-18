export const createAirQualityLayer = async (map3DRef, currentLocation) => {
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
