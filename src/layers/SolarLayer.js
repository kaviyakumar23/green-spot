import { SOLAR_COLORS, SOLAR_THRESHOLDS } from "../utils/constants";

export const createSolarLayer = async (map3DRef, currentLocation, showNotification, setIsLoading, setSolarData) => {
  if (!map3DRef.current) return;

  try {
    setIsLoading(true);
    const { Polygon3DElement, AltitudeMode } = await google.maps.importLibrary("maps3d");

    const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${currentLocation.lat}&location.longitude=${
      currentLocation.lng
    }&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch solar data");
    const data = await response.json();
    console.log("Solar API Response:", data);

    setSolarData(data);

    const layers = [];
    if (data.solarPotential?.roofSegmentStats) {
      // Find the largest roof segment which will be our main building footprint
      const mainSegment = data.solarPotential.roofSegmentStats.reduce((prev, curr) =>
        prev.stats.areaMeters2 > curr.stats.areaMeters2 ? prev : curr
      );

      // Create building outline
      const buildingOutline = new Polygon3DElement({
        strokeColor: "#FFFFFF",
        strokeWidth: 2,
        fillColor: "rgba(100, 100, 100, 0.5)",
        altitudeMode: AltitudeMode.ABSOLUTE,
        extruded: true,
        drawsOccludedSegments: true,
      });

      // Get the height from the API
      const buildingHeight = mainSegment.planeHeightAtCenterMeters + 1;

      // Use the boundingBox from the main building data since it's more accurate
      const coordinates = [
        { lat: data.boundingBox.sw.latitude, lng: data.boundingBox.sw.longitude, altitude: buildingHeight },
        { lat: data.boundingBox.sw.latitude, lng: data.boundingBox.ne.longitude, altitude: buildingHeight },
        { lat: data.boundingBox.ne.latitude, lng: data.boundingBox.ne.longitude, altitude: buildingHeight },
        { lat: data.boundingBox.ne.latitude, lng: data.boundingBox.sw.longitude, altitude: buildingHeight },
        { lat: data.boundingBox.sw.latitude, lng: data.boundingBox.sw.longitude, altitude: buildingHeight }, // Close the polygon
      ];

      buildingOutline.outerCoordinates = coordinates;
      layers.push(buildingOutline);

      // Add roof segments visualization
      data.solarPotential.roofSegmentStats.forEach((segment, index) => {
        console.log(`Processing roof segment ${index + 1}:`, {
          pitch: segment.pitchDegrees,
          azimuth: segment.azimuthDegrees,
          area: segment.stats.areaMeters2,
          height: segment.planeHeightAtCenterMeters,
          boundingBox: segment.boundingBox,
        });

        const roofSegment = new Polygon3DElement({
          strokeColor: "#FFFFFF",
          strokeWidth: 2,
          fillColor: getSolarEfficiencyColor(segment.stats.sunshineQuantiles),
          altitudeMode: AltitudeMode.ABSOLUTE,
          drawsOccludedSegments: true,
        });

        const segmentPoints = createRoofSegmentPoints(segment);
        roofSegment.outerCoordinates = segmentPoints;
        layers.push(roofSegment);
      });

      console.log("Building height:", buildingHeight);
      console.log("Building azimuth:", mainSegment.azimuthDegrees);
      console.log("Coordinates:", coordinates);
    }

    return layers;
  } catch (error) {
    console.error("Error creating solar layer:", error);
    showNotification("Failed to load solar potential data", "error");
    return null;
  } finally {
    setIsLoading(false);
  }
};

const createRoofSegmentPoints = (segment) => {
  const { boundingBox, center, pitchDegrees, azimuthDegrees, planeHeightAtCenterMeters, stats } = segment;

  // Add detailed logging
  console.log("Detailed segment analysis:", {
    originalPitch: pitchDegrees,
    originalAzimuth: azimuthDegrees,
    center: center,
    boundingBox: boundingBox,
    height: planeHeightAtCenterMeters,
    area: stats.areaMeters2,
  });

  // Convert angles to radians, handle very small angles
  const pitch = Math.max(pitchDegrees || 0, 0.24361458) * (Math.PI / 180); // Minimum pitch angle
  // Adjust azimuth to match building orientation (rotate 180 degrees)
  const azimuth = (((azimuthDegrees || 0) + 180) % 360) * (Math.PI / 180);

  // Calculate the actual dimensions based on the bounding box
  const latDiff = boundingBox.ne.latitude - boundingBox.sw.latitude;
  const lngDiff = boundingBox.ne.longitude - boundingBox.sw.longitude;

  // Calculate meters using the actual differences
  const metersPerDegreeLat = 111111;
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos(center.latitude * (Math.PI / 180));

  const widthMeters = Math.abs(lngDiff * metersPerDegreeLng);
  const lengthMeters = Math.abs(latDiff * metersPerDegreeLat);

  // Scale factor to ensure the segment fits within the building outline
  const scaleFactor = 0.8; // Reduced scale factor to keep segments within building

  // Define corners based on actual dimensions
  const corners = [
    { dx: (-widthMeters * scaleFactor) / 2, dy: (-lengthMeters * scaleFactor) / 2 },
    { dx: (widthMeters * scaleFactor) / 2, dy: (-lengthMeters * scaleFactor) / 2 },
    { dx: (widthMeters * scaleFactor) / 2, dy: (lengthMeters * scaleFactor) / 2 },
    { dx: (-widthMeters * scaleFactor) / 2, dy: (lengthMeters * scaleFactor) / 2 },
  ];

  const points = [];
  corners.forEach(({ dx, dy }) => {
    // Apply rotation based on azimuth
    const rotatedX = dx * Math.cos(azimuth) - dy * Math.sin(azimuth);
    const rotatedY = dx * Math.sin(azimuth) + dy * Math.cos(azimuth);

    // Calculate height adjustment based on pitch and position
    const heightOffset = Math.sin(pitch) * dy;

    const lat = center.latitude + rotatedY / metersPerDegreeLat;
    const lng = center.longitude + rotatedX / metersPerDegreeLng;

    points.push({
      lat,
      lng,
      altitude: planeHeightAtCenterMeters + heightOffset,
    });
  });

  // Log the generated points for debugging
  console.log("Generated points:", points);

  // Close the polygon
  points.push(points[0]);
  return points;
};

const getSolarEfficiencyColor = (sunshineQuantiles) => {
  if (!sunshineQuantiles || sunshineQuantiles.length === 0) {
    return SOLAR_COLORS.UNKNOWN;
  }

  // Calculate average sunshine from quantiles
  const averageSunshine = sunshineQuantiles.reduce((a, b) => a + b, 0) / sunshineQuantiles.length;

  // Color based on annual kWh/kW values
  if (averageSunshine >= SOLAR_THRESHOLDS.EXCELLENT) return SOLAR_COLORS.EXCELLENT;
  if (averageSunshine >= SOLAR_THRESHOLDS.GOOD) return SOLAR_COLORS.GOOD;
  if (averageSunshine >= SOLAR_THRESHOLDS.FAIR) return SOLAR_COLORS.FAIR;
  if (averageSunshine > 0) return SOLAR_COLORS.POOR;
  return SOLAR_COLORS.UNKNOWN;
};
