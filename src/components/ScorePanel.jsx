import { useState } from "react";
import { Paper, Typography, Box, Grid, LinearProgress, Accordion, AccordionSummary, AccordionDetails, Chip, Skeleton, Alert } from "@mui/material";
import { GaugeCircle, ChevronDown, Sun as WbSunny, TreePine as Park, Train, Wind, Footprints, Brain } from "lucide-react";
import { LAYER_TYPES } from "./LayerControlPanel";
import { formatNumber, formatDistance, getScoreColor, getGradeColor, getGrade, getDistance } from "../utils/scoreUtils";
import ReactMarkdown from "react-markdown";

const SustainabilityScorePanel = ({
  visible,
  activeLayers,
  solarData,
  greenSpacesData,
  transitData,
  currentLocation,
  walkabilityData,
  airQualityData,
  aiInsights,
}) => {
  const [expandedPanel, setExpandedPanel] = useState(false);

  if (!visible) return null;

  const calculateWalkabilityScore = (data) => {
    if (!data) return { score: 0, metrics: {} };

    const metrics = {
      totalAmenities: Object.values(data).reduce((sum, places) => sum + places.length, 0),
      amenityTypes: Object.entries(data).reduce((acc, [type, places]) => {
        if (places.length > 0) acc[type] = places.length;
        return acc;
      }, {}),
      averageDistance:
        Object.values(data).reduce((sum, places) => sum + places.reduce((total, place) => total + place.distance, 0), 0) /
        Object.values(data).reduce((sum, places) => sum + places.length, 0),
    };

    // Score calculation (30 points max)
    const amenityScore = Math.min(metrics.totalAmenities * 2, 15); // Up to 15 points for number of amenities
    const diversityScore = Math.min(Object.keys(metrics.amenityTypes).length * 2, 10); // Up to 10 points for diversity
    const proximityScore = Math.min(Math.max(10 - metrics.averageDistance * 2, 0), 5); // Up to 5 points for proximity

    const totalScore = Math.min(amenityScore + diversityScore + proximityScore, 30);

    return {
      score: totalScore,
      metrics: {
        ...metrics,
        scores: {
          amenities: amenityScore,
          diversity: diversityScore,
          proximity: proximityScore,
        },
      },
    };
  };

  const calculateAirQualityScore = (data) => {
    if (!data?.indexes?.[0]) return { score: 0, metrics: {} };

    const primaryIndex = data.indexes[0];
    const aqi = primaryIndex.aqi || primaryIndex.aqiDisplay;
    let baseScore;
    if (aqi >= 80) {
      baseScore = 16 + ((aqi - 80) / 20) * 4;
    } else if (aqi >= 60) {
      baseScore = 12 + ((aqi - 60) / 19) * 3.8;
    } else if (aqi >= 40) {
      baseScore = 8 + ((aqi - 40) / 19) * 3.8;
    } else if (aqi >= 20) {
      baseScore = 4 + ((aqi - 20) / 19) * 3.8;
    } else if (aqi >= 1) {
      baseScore = 0.2 + ((aqi - 1) / 18) * 3.6;
    } else {
      baseScore = 0;
    }

    const metrics = {
      aqi,
      category: primaryIndex.category,
      dominantPollutant: data.dominantPollutant,
      healthRecommendations: data.healthRecommendations,
      updatedAt: data.dateTime,
    };

    return {
      score: baseScore,
      metrics,
    };
  };

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
        currentLocation
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

    const totalScore = Math.min(quantityScore + proximityScore + qualityScore, 30);

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
    walkability: {
      isActive: activeLayers[LAYER_TYPES.WALKABILITY] || false,
      hasData: Boolean(walkabilityData),
      score: calculateWalkabilityScore(walkabilityData),
    },
    airQuality: {
      isActive: activeLayers[LAYER_TYPES.AIR_QUALITY] || false,
      hasData: Boolean(airQualityData),
      score: calculateAirQualityScore(airQualityData),
    },
    transit: {
      isActive: activeLayers[LAYER_TYPES.TRANSIT] || false,
      hasData: Boolean(transitData),
      score: calculateTransitScore(transitData),
    },
  };

  const scoreWeights = {
    solar: 40,
    walkability: 30,
    airQuality: 20,
    greenSpace: 30,
    transit: 30,
  };

  const calculateTotalScore = () => {
    let totalScore = 0;
    let maxPossibleScore = 0;

    Object.entries(layerStates).forEach(([key, state]) => {
      if (state.isActive) {
        maxPossibleScore += scoreWeights[key];
        if (state.hasData) {
          totalScore += state.score.score || 0;
        }
      }
    });

    return maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
  };

  const getScoreContribution = (score, maxScore) => {
    if (!score || !maxScore) return 0;
    return Math.round((score / maxScore) * 100);
  };

  const renderLayerScore = (layerState, maxScore) => {
    if (!layerState.isActive) return "Disabled";
    if (!layerState.hasData) return "Loading...";

    const score = Math.round(layerState.score.score);
    const contribution = getScoreContribution(score, maxScore);
    return `${score}/${maxScore} (${contribution}%)`;
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
        top: 20,
        right: 20,
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
      <Box sx={{ overflow: "auto" }}>
        <Accordion
          expanded={expandedPanel === "insights"}
          onChange={() => setExpandedPanel(expandedPanel === "insights" ? false : "insights")}
          sx={{ mb: 1 }}
        >
          <AccordionSummary expandIcon={<ChevronDown />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
              <Brain />
              <Typography>AI Insights</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {!aiInsights ? (
              <Box sx={{ mt: 1 }}>
                <Alert severity="info">Enable all layers to get AI insights</Alert>
              </Box>
            ) : (
              <Typography variant="body2" component="div">
                <ReactMarkdown
                  components={{
                    p: (props) => <Typography variant="body2" gutterBottom {...props} />,
                    h1: (props) => <Typography variant="h5" gutterBottom {...props} />,
                    h2: (props) => <Typography variant="h6" gutterBottom {...props} />,
                    h3: (props) => <Typography variant="subtitle1" gutterBottom {...props} />,
                    ul: (props) => <Box component="ul" sx={{ pl: 2 }} {...props} />,
                    li: (props) => <Typography variant="body2" component="li" {...props} />,
                  }}
                >
                  {aiInsights}
                </ReactMarkdown>
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
        <Accordion
          expanded={expandedPanel === "overall"}
          onChange={() => setExpandedPanel(expandedPanel === "overall" ? false : "overall")}
          defaultExpanded
        >
          <AccordionSummary expandIcon={<ChevronDown />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
              <GaugeCircle />
              <Typography>Sustainability Score</Typography>
              <Typography sx={{ ml: "auto" }}>{Object.values(activeLayers).some(Boolean) ? `${Math.round(totalScore)}/100` : "Disabled"}</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {/* Overall Score Section */}
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

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Score Breakdown
              </Typography>
              <Box sx={{ mb: 2 }}>
                {Object.entries(layerStates).map(([key, state]) => {
                  if (!state.isActive) return null;
                  const maxScore = scoreWeights[key];
                  const score = state.hasData ? state.score.score : 0;
                  const contribution = getScoreContribution(score, maxScore);

                  return (
                    <Box key={key} sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="body2">{key.charAt(0).toUpperCase() + key.slice(1)}:</Typography>
                      <Typography variant="body2">{state.hasData ? `${Math.round(score)}/${maxScore} (${contribution}%)` : "N/A"}</Typography>
                    </Box>
                  );
                })}
                <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid rgba(0,0,0,0.1)" }}>
                  <Typography variant="body2" fontWeight="bold" sx={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Total Score:</span>
                    <span>{Math.round(totalScore)}/100</span>
                  </Typography>
                </Box>
              </Box>
            </Box>
            {/* Walkability Section */}
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", mb: 1 }}>
                <Footprints color={getScoreColor(layerStates.walkability.score.score, 30)} />
                <Typography>Walkability</Typography>
                <Typography sx={{ ml: "auto" }}>
                  {layerStates.walkability.isActive
                    ? layerStates.walkability.hasData
                      ? renderLayerScore(layerStates.walkability, 30)
                      : "Loading..."
                    : "Disabled"}
                </Typography>
              </Box>
              {renderMetricsSection(layerStates.walkability, () => (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Metrics
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">Total Amenities: {formatNumber(layerStates.walkability.score.metrics.totalAmenities)}</Typography>
                      <Typography variant="body2">
                        Average Distance: {formatDistance(layerStates.walkability.score.metrics.averageDistance)}
                      </Typography>
                      <Typography variant="body2">Amenity Types: {Object.keys(layerStates.walkability.score.metrics.amenityTypes).length}</Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Score Breakdown
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">Amenities: {layerStates.walkability.score.metrics.scores.amenities}/15</Typography>
                      <Typography variant="body2">Diversity: {layerStates.walkability.score.metrics.scores.diversity}/10</Typography>
                      <Typography variant="body2">Proximity: {layerStates.walkability.score.metrics.scores.proximity}/5</Typography>
                    </Box>
                  </Grid>
                </Grid>
              ))}
            </Box>
            {/* Air Quality Section */}
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", mb: 1 }}>
                <Wind color={getScoreColor(layerStates.airQuality.score.score, 20)} />
                <Typography>Air Quality</Typography>
                <Typography sx={{ ml: "auto" }}>
                  {layerStates.airQuality.isActive
                    ? layerStates.airQuality.hasData
                      ? renderLayerScore(layerStates.airQuality, 20)
                      : "Loading..."
                    : "Disabled"}
                </Typography>
              </Box>
              {renderMetricsSection(layerStates.airQuality, () => (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Metrics
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">AQI: {layerStates.airQuality.score.metrics.aqi}</Typography>
                      <Typography variant="body2">Category: {layerStates.airQuality.score.metrics.category}</Typography>
                      <Typography variant="body2">Dominant Pollutant: {layerStates.airQuality.score.metrics.dominantPollutant}</Typography>
                    </Box>
                  </Grid>
                </Grid>
              ))}
            </Box>
            {/* Solar Score Section */}
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", mb: 1 }}>
                <WbSunny color={getScoreColor(layerStates.solar.score.score, 40)} />
                <Typography>Solar Potential</Typography>
                <Typography sx={{ ml: "auto" }}>
                  {layerStates.solar.isActive ? (layerStates.solar.hasData ? renderLayerScore(layerStates.solar, 40) : "Loading...") : "Disabled"}
                </Typography>
              </Box>
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
            </Box>
            {/* Green Spaces Section */}
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", mb: 1 }}>
                <Park color={getScoreColor(layerStates.greenSpace.score.score, 30)} />
                <Typography>Green Spaces</Typography>
                <Typography sx={{ ml: "auto" }}>
                  {layerStates.greenSpace.isActive
                    ? layerStates.greenSpace.hasData
                      ? renderLayerScore(layerStates.greenSpace, 30)
                      : "Loading..."
                    : "Disabled"}
                </Typography>
              </Box>
              {renderMetricsSection(layerStates.greenSpace, () => (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Metrics
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">Number of Spaces: {formatNumber(layerStates.greenSpace.score.metrics.numberOfSpaces)}</Typography>
                      <Typography variant="body2">
                        Average Distance: {formatDistance(layerStates.greenSpace.score.metrics.averageDistance)}
                      </Typography>
                      <Typography variant="body2">
                        Average Rating: {(layerStates.greenSpace.score.metrics.averageRating || 0).toFixed(1)} ★
                      </Typography>
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
            </Box>
            {/* Transit Section */}
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", mb: 1 }}>
                <Train color={getScoreColor(layerStates.transit.score.score, 30)} />
                <Typography>Transit Access</Typography>
                <Typography sx={{ ml: "auto" }}>
                  {layerStates.transit.isActive
                    ? layerStates.transit.hasData
                      ? renderLayerScore(layerStates.transit, 30)
                      : "Loading..."
                    : "Disabled"}
                </Typography>
              </Box>
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
            </Box>

            <Typography variant="caption" color="text.secondary" display="block" mt={2}>
              {Object.values(activeLayers).some(Boolean)
                ? `Based on analysis of ${Object.entries(layerStates)
                    .filter(([_, state]) => state.isActive)
                    .map(([key]) => key.replace(/([A-Z])/g, " $1").toLowerCase())
                    .join(", ")}`
                : "Enable layers to begin analysis"}
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Paper>
  );
};

export default SustainabilityScorePanel;
