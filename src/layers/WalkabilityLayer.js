export const createWalkabilityLayer = async (map3DRef) => {
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
