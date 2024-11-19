import { Paper, Typography, Box, CircularProgress, Alert, Grid } from "@mui/material";
import { Park } from "@mui/icons-material";
import { useState, useEffect } from "react";

const GreenSpacesPanel = ({ location, visible, greenSpaces }) => {
  const [sortedSpaces, setSortedSpaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalSpaces: 0,
    totalArea: 0,
    averageDistance: 0,
  });

  useEffect(() => {
    if (!greenSpaces || !location) return;

    try {
      const sorted = [...greenSpaces].sort((a, b) => {
        const distA = getDistance(location, a.geometry.location);
        const distB = getDistance(location, b.geometry.location);
        return distA - distB;
      });

      // Calculate statistics
      const distances = sorted.map((space) => getDistance(location, space.geometry.location));
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      const totalArea = sorted.reduce((total, space) => {
        const bounds = space.geometry.viewport;
        const area = calculateArea(bounds);
        return total + area;
      }, 0);

      setStats({
        totalSpaces: sorted.length,
        totalArea: totalArea,
        averageDistance: avgDistance,
      });

      setSortedSpaces(sorted);
    } catch (err) {
      setError("Failed to process green spaces data");
      console.error("Green Spaces Processing Error:", err);
    }
  }, [greenSpaces, location]);

  if (!visible) return null;

  const formatNumber = (num) => new Intl.NumberFormat().format(Math.round(num));

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
        <Park /> Nearby Green Spaces
      </Typography>

      {loading && (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {sortedSpaces.length > 0 && (
        <Box sx={{ overflow: "auto" }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Paper
                sx={{
                  p: 2,
                  backgroundColor: "rgba(76, 175, 80, 0.1)",
                  border: "1px solid rgba(76, 175, 80, 0.3)",
                }}
              >
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Green Space Summary
                </Typography>
                <Typography variant="h4">{stats.totalSpaces} Areas</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Coverage: {formatNumber(stats.totalArea)} m²
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Average Distance: {stats.averageDistance.toFixed(1)} km
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Nearby Locations
              </Typography>
              {sortedSpaces.map((space, index) => (
                <Box
                  key={space.place_id}
                  sx={{
                    mb: 2,
                    p: 2,
                    backgroundColor: "rgba(0, 0, 0, 0.03)",
                    borderRadius: 1,
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={8}>
                      <Typography variant="body1" fontWeight="medium">
                        {space.name}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary" textAlign="right">
                        {getDistance(location, space.geometry.location).toFixed(1)} km
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Size
                      </Typography>
                      <Typography variant="body1">{formatNumber(calculateArea(space.geometry.viewport))} m²</Typography>
                    </Grid>
                    {space.rating && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Rating
                        </Typography>
                        <Typography variant="body1">{space.rating} ★</Typography>
                      </Grid>
                    )}
                    {space.user_ratings_total && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Reviews
                        </Typography>
                        <Typography variant="body1">{formatNumber(space.user_ratings_total)}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              ))}
            </Grid>
          </Grid>

          <Typography variant="caption" color="text.secondary" display="block" mt={2}>
            Based on Google Places API data
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

const getDistance = (location, placeLocation) => {
  const R = 6371; // Earth's radius in km
  const lat1 = location.lat;
  const lng1 = location.lng;
  const lat2 = typeof placeLocation.lat === "function" ? placeLocation.lat() : placeLocation.lat;
  const lng2 = typeof placeLocation.lng === "function" ? placeLocation.lng() : placeLocation.lng;

  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lng2 - lng1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

const calculateArea = (bounds) => {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  const latDistance = getDistance({ lat: ne.lat(), lng: ne.lng() }, { lat: sw.lat(), lng: ne.lng() });

  const lngDistance = getDistance({ lat: ne.lat(), lng: ne.lng() }, { lat: ne.lat(), lng: sw.lng() });

  return latDistance * lngDistance * 1000000; // Convert to square meters
};

export default GreenSpacesPanel;
