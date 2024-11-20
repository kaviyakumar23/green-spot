import { Paper, Typography, Box, Grid, Chip } from "@mui/material";
import { Footprints } from "lucide-react";
import { useState, useEffect } from "react";

const WalkabilityPanel = ({ location, visible, walkabilityData }) => {
  const [stats, setStats] = useState({
    totalAmenities: 0,
    walkabilityScore: 0,
    amenityTypes: {},
    nearestAmenities: [],
    averageDistance: 0,
  });

  useEffect(() => {
    if (!walkabilityData || !location) return;

    try {
      const amenityTypes = {};
      let totalDistance = 0;
      let totalAmenities = 0;

      Object.entries(walkabilityData).forEach(([type, places]) => {
        if (places.length > 0) {
          amenityTypes[type] = places.length;
          totalAmenities += places.length;
          totalDistance += places.reduce((sum, place) => sum + place.distance, 0);
        }
      });

      // Find nearest amenities of each type
      const nearestAmenities = Object.entries(walkabilityData)
        .map(([type, places]) => {
          if (places.length === 0) return null;
          const nearest = places.reduce((min, place) => (!min || place.distance < min.distance ? place : min));
          return { ...nearest, type };
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance);

      setStats({
        totalAmenities,
        walkabilityScore: Math.min(Math.round((totalAmenities / 20) * 100), 100),
        amenityTypes,
        nearestAmenities,
        averageDistance: totalAmenities > 0 ? totalDistance / totalAmenities : 0,
      });
    } catch (err) {
      console.error("Error processing walkability data:", err);
    }
  }, [walkabilityData, location]);

  if (!visible) return null;

  const formatDistance = (distance) => `${distance.toFixed(1)} km`;
  const formatType = (type) => type.replace(/_/g, " ");

  const getScoreColor = (score) => {
    if (score >= 80) return "#4CAF50";
    if (score >= 60) return "#FFC107";
    if (score >= 40) return "#FF9800";
    return "#F44336";
  };

  const getTypeColor = (type) => {
    const colors = {
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
    return colors[type] || "#9E9E9E";
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: "absolute",
        bottom: 20,
        left: 20,
        width: 350,
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
        <Footprints /> Walkability Analysis
      </Typography>

      <Box sx={{ overflow: "auto" }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Paper
              sx={{
                p: 2,
                backgroundColor: `${getScoreColor(stats.walkabilityScore)}22`,
                border: `1px solid ${getScoreColor(stats.walkabilityScore)}`,
              }}
            >
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Walkability Score
              </Typography>
              <Typography variant="h3" sx={{ color: getScoreColor(stats.walkabilityScore) }}>
                {stats.walkabilityScore}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Based on {stats.totalAmenities} nearby amenities
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average distance: {formatDistance(stats.averageDistance)}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Amenity Types
            </Typography>
            <Box sx={{ mb: 2, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              {Object.entries(stats.amenityTypes).map(([type, count]) => (
                <Chip
                  key={type}
                  label={`${formatType(type)}: ${count}`}
                  size="small"
                  sx={{
                    backgroundColor: `${getTypeColor(type)}22`,
                    borderColor: getTypeColor(type),
                    border: "1px solid",
                    mb: 0.5,
                  }}
                />
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Nearest Amenities
            </Typography>
            {stats.nearestAmenities.slice(0, 5).map((amenity, index) => (
              <Box
                key={`${amenity.type}-${index}`}
                sx={{
                  mb: 1,
                  p: 1,
                  backgroundColor: "rgba(0, 0, 0, 0.03)",
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" fontWeight="medium">
                  {amenity.name}
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Chip
                    label={formatType(amenity.type)}
                    size="small"
                    sx={{
                      backgroundColor: `${getTypeColor(amenity.type)}22`,
                      borderColor: getTypeColor(amenity.type),
                      border: "1px solid",
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {formatDistance(amenity.distance)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Grid>
        </Grid>

        <Typography variant="caption" color="text.secondary" display="block" mt={2}>
          Based on 15-minute walking radius analysis
        </Typography>
      </Box>
    </Paper>
  );
};

export default WalkabilityPanel;
