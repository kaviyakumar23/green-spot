import { useState } from "react";
import { Paper, Typography, Box, Grid, LinearProgress, Accordion, AccordionSummary, AccordionDetails, Chip, Skeleton, Alert } from "@mui/material";
import { GaugeCircle, ChevronDown, Sun as WbSunny, TreePine as Park, Train } from "lucide-react";
import { LAYER_TYPES } from "./LayerControlPanel";

const SustainabilityScorePanel = ({ visible, activeLayers, solarData, greenSpacesData, transitData, currentLocation }) => {
  const [expandedPanel, setExpandedPanel] = useState(false);

  if (!visible) return null;

  // Helper functions
  const formatNumber = (num) => {
    if (typeof num !== "number") return "N/A";
    return Math.round(num).toLocaleString();
  };

  const formatDistance = (distance) => {
    if (typeof distance !== "number") return "N/A";
    return `${distance.toFixed(1)} km`;
  };

  const getScoreColor = (score, max) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return "success";
    if (percentage >= 60) return "warning";
    return "error";
  };

  const getGradeColor = (grade) => {
    switch (grade?.[0]) {
      case "A":
        return "#4CAF50";
      case "B":
        return "#8BC34A";
      case "C":
        return "#FFC107";
      case "D":
        return "#FF9800";
      default:
        return "#F44336";
    }
  };

  const getMetricValue = (path, defaultValue = "N/A") => {
    try {
      const value = path();
      return value !== undefined && value !== null ? value : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // Calculate scores for each layer
  const calculateSolarScore = (data) => {
    if (!data?.solarPotential) return { score: 0, metrics: {} };

    const maxPotential = data.solarPotential.maxSunshineHoursPerYear;
    const roofSegments = data.solarPotential.roofSegmentStats;
    const totalArea = roofSegments.reduce((sum, segment) => sum + segment.stats.areaMeters2, 0);
    const avgSunshine =
      roofSegments.reduce((sum, segment) => {
        const segmentAvg = segment.stats.sunshineQuantiles.reduce((a, b) => a + b, 0) / segment.stats.sunshineQuantiles.length;
        return sum + segmentAvg * segment.stats.areaMeters2;
      }, 0) / totalArea;

    return {
      score: Math.min(avgSunshine / 50, 40), // Normalize to 40 points max
      metrics: {
        avgSunshine,
        totalArea,
        possibleConfigurations: data.solarPotential.solarPanelConfigs.length,
      },
    };
  };

  const calculateGreenSpaceScore = (data) => {
    if (!data?.length) return { score: 0, metrics: {} };

    // Helper to calculate area from viewport
    const calculateAreaFromViewport = (geometry) => {
      if (!geometry?.viewport) return 0;
      const bounds = geometry.viewport;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      // Calculate approximate area in square meters
      const latDistance = getDistance({ lat: ne.lat(), lng: ne.lng() }, { lat: sw.lat(), lng: ne.lng() });

      const lngDistance = getDistance({ lat: ne.lat(), lng: ne.lng() }, { lat: ne.lat(), lng: sw.lng() });

      return latDistance * lngDistance * 1000000; // Convert to square meters
    };

    // Calculate distances for each park
    const parksWithDistances = data.map((park) => ({
      ...park,
      area: calculateAreaFromViewport(park.geometry),
      distance: getDistance(
        {
          lat: park.geometry.location.lat(),
          lng: park.geometry.location.lng(),
        },
        currentLocation // You'll need to pass this as a parameter
      ),
    }));

    const metrics = {
      numberOfSpaces: data.length,
      totalArea: parksWithDistances.reduce((sum, space) => sum + space.area, 0),
      averageDistance: parksWithDistances.reduce((sum, space) => sum + space.distance, 0) / data.length,
      hasLargeParks: parksWithDistances.some((space) => space.area > 10000), // Adjusted threshold
      parkTypes: data.reduce((acc, park) => {
        park.types.forEach((type) => {
          if (type !== "point_of_interest" && type !== "establishment") {
            acc[type] = (acc[type] || 0) + 1;
          }
        });
        return acc;
      }, {}),
      averageRating: data.reduce((sum, park) => sum + (park.rating || 0), 0) / data.length,
      totalReviews: data.reduce((sum, park) => sum + (park.user_ratings_total || 0), 0),
    };

    // Score calculation (30 points max)
    const quantityScore = Math.min(data.length * 3, 10); // Up to 10 points for quantity

    const proximityScore = Math.min(
      Math.max(10 - metrics.averageDistance * 2, 0), // More points for closer parks
      10 // Max 10 points for proximity
    );

    const qualityScore = Math.min(
      ((metrics.averageRating || 0) / 5) * 5 + // Up to 5 points for ratings
        (metrics.hasLargeParks ? 3 : 0) + // 3 points for having large parks
        Object.keys(metrics.parkTypes).length * 0.5, // 0.5 points per unique park type
      10 // Max 10 points for quality
    );

    const totalScore = Math.min(
      quantityScore + proximityScore + qualityScore,
      30 // Ensure we don't exceed max score
    );

    return {
      score: totalScore,
      metrics: {
        ...metrics,
        scores: {
          quantity: quantityScore,
          proximity: proximityScore,
          quality: qualityScore,
        },
      },
    };
  };

  // Helper function to calculate distance between two points
  const getDistance = (point1, point2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = deg2rad(point2.lat - point1.lat);
    const dLon = deg2rad(point2.lng - point1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(point1.lat)) * Math.cos(deg2rad(point2.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  const calculateTransitScore = (data) => {
    if (!data?.length) return { score: 0, metrics: {} };

    const metrics = {
      numberOfStations: data.length,
      stationTypes: data.reduce((acc, station) => {
        acc[station.type] = (acc[station.type] || 0) + 1;
        return acc;
      }, {}),
      averageDistance: data.reduce((sum, station) => sum + station.distance, 0) / data.length,
    };

    const score = Math.min(
      metrics.numberOfStations * 3 + // 3 points per station
        Object.keys(metrics.stationTypes).length * 5 + // 5 points per type
        Math.max(10 - metrics.averageDistance * 2, 0), // Distance points
      30 // Max score
    );

    return { score, metrics };
  };

  // Check layer states and calculate scores
  const layerStates = {
    solar: {
      isActive: activeLayers[LAYER_TYPES.SOLAR] || false,
      hasData: Boolean(solarData),
      score: calculateSolarScore(solarData),
    },
    greenSpace: {
      isActive: activeLayers[LAYER_TYPES.GREEN_SPACES] || false,
      hasData: Boolean(greenSpacesData),
      score: calculateGreenSpaceScore(greenSpacesData),
    },
    transit: {
      isActive: activeLayers[LAYER_TYPES.TRANSIT] || false,
      hasData: Boolean(transitData),
      score: calculateTransitScore(transitData),
    },
  };

  // Calculate total score
  const calculateTotalScore = () => {
    let totalScore = 0;
    let maxPossibleScore = 0;

    if (layerStates.solar.isActive) {
      maxPossibleScore += 40;
      if (layerStates.solar.hasData) totalScore += layerStates.solar.score.score;
    }
    if (layerStates.greenSpace.isActive) {
      maxPossibleScore += 30;
      if (layerStates.greenSpace.hasData) totalScore += layerStates.greenSpace.score.score;
    }
    if (layerStates.transit.isActive) {
      maxPossibleScore += 30;
      if (layerStates.transit.hasData) totalScore += layerStates.transit.score.score;
    }

    return maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  };

  const getGrade = (score) => {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B+";
    if (score >= 60) return "B";
    if (score >= 50) return "C+";
    if (score >= 40) return "C";
    if (score >= 30) return "D";
    return "F";
  };

  const totalScore = calculateTotalScore();
  const grade = getGrade(totalScore);

  const renderMetricsSection = (layerState, renderContent) => {
    if (!layerState.isActive) {
      return (
        <Alert severity="info" sx={{ mt: 1 }}>
          Enable this layer to see metrics
        </Alert>
      );
    }

    if (!layerState.hasData) {
      return (
        <Box sx={{ mt: 1 }}>
          <Skeleton variant="text" height={24} />
          <Skeleton variant="text" height={24} />
          <Skeleton variant="text" height={24} />
        </Box>
      );
    }

    return renderContent();
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: "absolute",
        top: 80,
        left: 20,
        width: 380,
        maxWidth: "90vw",
        maxHeight: "80vh",
        zIndex: 1000,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(4px)",
        p: 2,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
        <GaugeCircle /> Sustainability Score
      </Typography>

      {!Object.values(activeLayers).some(Boolean) ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Enable layers to see sustainability metrics
        </Alert>
      ) : (
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={4}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: `${getGradeColor(grade)}22`,
                  border: `1px solid ${getGradeColor(grade)}`,
                }}
              >
                <Typography variant="h3" fontWeight="bold" color={getGradeColor(grade)}>
                  {grade}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Grade
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={8}>
              <Typography variant="h4" gutterBottom>
                {Math.round(totalScore)}/100
              </Typography>
              <LinearProgress
                variant="determinate"
                value={totalScore}
                sx={{
                  height: 8,
                  borderRadius: 1,
                  backgroundColor: "rgba(0,0,0,0.1)",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: getGradeColor(grade),
                  },
                }}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      <Box sx={{ overflow: "auto" }}>
        {/* Solar Score Section */}
        <Accordion expanded={expandedPanel === "solar"} onChange={() => setExpandedPanel(expandedPanel === "solar" ? false : "solar")}>
          <AccordionSummary expandIcon={<ChevronDown />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
              <WbSunny color={getScoreColor(layerStates.solar.score.score, 40)} />
              <Typography>Solar Potential</Typography>
              <Typography sx={{ ml: "auto" }}>
                {layerStates.solar.isActive
                  ? layerStates.solar.hasData
                    ? `${Math.round(layerStates.solar.score.score)}/40`
                    : "Loading..."
                  : "Disabled"}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {renderMetricsSection(layerStates.solar, () => (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Metrics
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Average Sunshine: {formatNumber(layerStates.solar.score.metrics.averageSunshine)} kWh/m²/year
                    </Typography>
                    <Typography variant="body2">Total Roof Area: {formatNumber(layerStates.solar.score.metrics.totalArea)} m²</Typography>
                    <Typography variant="body2">
                      Possible Configurations: {formatNumber(layerStates.solar.score.metrics.possibleConfigurations)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            ))}
          </AccordionDetails>
        </Accordion>

        {/* Green Spaces Section */}
        <Accordion expanded={expandedPanel === "green"} onChange={() => setExpandedPanel(expandedPanel === "green" ? false : "green")}>
          <AccordionSummary expandIcon={<ChevronDown />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
              <Park color={getScoreColor(layerStates.greenSpace.score.score, 30)} />
              <Typography>Green Spaces</Typography>
              <Typography sx={{ ml: "auto" }}>
                {layerStates.greenSpace.isActive
                  ? layerStates.greenSpace.hasData
                    ? `${Math.round(layerStates.greenSpace.score.score)}/30`
                    : "Loading..."
                  : "Disabled"}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {renderMetricsSection(layerStates.greenSpace, () => (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Metrics
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Number of Spaces: {formatNumber(layerStates.greenSpace.score.metrics.numberOfSpaces)}</Typography>
                    <Typography variant="body2">Average Distance: {formatDistance(layerStates.greenSpace.score.metrics.averageDistance)}</Typography>
                    <Typography variant="body2">Average Rating: {(layerStates.greenSpace.score.metrics.averageRating || 0).toFixed(1)} ★</Typography>
                    <Typography variant="body2">Total Reviews: {formatNumber(layerStates.greenSpace.score.metrics.totalReviews)}</Typography>
                    <Typography variant="body2">Large Parks: {layerStates.greenSpace.score.metrics.hasLargeParks ? "Yes" : "No"}</Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Score Breakdown
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Quantity: {layerStates.greenSpace.score.metrics.scores.quantity}/10</Typography>
                    <Typography variant="body2">Proximity: {layerStates.greenSpace.score.metrics.scores.proximity}/10</Typography>
                    <Typography variant="body2">Quality: {layerStates.greenSpace.score.metrics.scores.quality}/10</Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Park Types
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {Object.entries(layerStates.greenSpace.score.metrics.parkTypes || {}).map(([type, count]) => (
                      <Chip
                        key={type}
                        label={`${type.replace("_", " ")}: ${count}`}
                        size="small"
                        sx={{
                          mr: 0.5,
                          mb: 0.5,
                          textTransform: "capitalize",
                        }}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            ))}
          </AccordionDetails>
        </Accordion>

        {/* Transit Section */}
        <Accordion expanded={expandedPanel === "transit"} onChange={() => setExpandedPanel(expandedPanel === "transit" ? false : "transit")}>
          <AccordionSummary expandIcon={<ChevronDown />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
              <Train color={getScoreColor(layerStates.transit.score.score, 30)} />
              <Typography>Transit Access</Typography>
              <Typography sx={{ ml: "auto" }}>
                {layerStates.transit.isActive
                  ? layerStates.transit.hasData
                    ? `${Math.round(layerStates.transit.score.score)}/30`
                    : "Loading..."
                  : "Disabled"}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {renderMetricsSection(layerStates.transit, () => (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Metrics
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Number of Stations: {formatNumber(layerStates.transit.score.metrics.numberOfStations)}</Typography>
                    <Typography variant="body2">Average Distance: {formatDistance(layerStates.transit.score.metrics.averageDistance)}</Typography>
                    <Typography variant="body2">
                      Transit Types: {formatNumber(Object.keys(layerStates.transit.score.metrics.stationTypes || {}).length)}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      {Object.entries(layerStates.transit.score.metrics.stationTypes || {}).map(([type, count]) => (
                        <Chip
                          key={type}
                          label={`${type.replace("_", " ")}: ${count}`}
                          size="small"
                          sx={{
                            mr: 0.5,
                            mb: 0.5,
                            textTransform: "capitalize",
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            ))}
          </AccordionDetails>
        </Accordion>
      </Box>

      <Typography variant="caption" color="text.secondary" display="block" mt={2}>
        {Object.values(activeLayers).some(Boolean)
          ? `Based on analysis of ${Object.entries(layerStates)
              .filter(([_, state]) => state.isActive)
              .map(([key]) => key.replace(/([A-Z])/g, " $1").toLowerCase())
              .join(", ")}`
          : "Enable layers to begin analysis"}
      </Typography>
    </Paper>
  );
};

export default SustainabilityScorePanel;
