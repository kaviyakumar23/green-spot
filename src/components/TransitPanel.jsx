import { Paper, Typography, Box, CircularProgress, Alert, Grid, Chip } from "@mui/material";
import { Train } from "lucide-react";
import { useState, useEffect } from "react";

const getStationType = (type) => {
  switch (type) {
    case "subway_station":
      return "Subway";
    case "train_station":
      return "Train";
    case "bus_station":
      return "Bus";
    default:
      return "Transit";
  }
};

const TransitPanel = ({ location, visible, transitData }) => {
  const [stats, setStats] = useState({
    totalStations: 0,
    averageDistance: 0,
    stationTypes: {},
    closestStation: null,
  });

  useEffect(() => {
    if (!transitData || !location) return;

    try {
      // Calculate statistics
      const stationTypes = transitData.reduce((acc, station) => {
        const type = getStationType(station.type);
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      const avgDistance = transitData.reduce((sum, station) => sum + station.distance, 0) / transitData.length;
      const closestStation = transitData.reduce((closest, current) => (!closest || current.distance < closest.distance ? current : closest), null);

      setStats({
        totalStations: transitData.length,
        averageDistance: avgDistance,
        stationTypes,
        closestStation,
      });
    } catch (err) {
      console.error("Transit data processing error:", err);
    }
  }, [transitData, location]);

  if (!visible) return null;

  const formatNumber = (num) => new Intl.NumberFormat().format(Math.round(num));

  const getTypeColor = (type) => {
    switch (type) {
      case "subway_station":
        return "#E91E63";
      case "train_station":
        return "#2196F3";
      case "bus_station":
        return "#4CAF50";
      default:
        return "#9E9E9E";
    }
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
        <Train /> Transit Access
      </Typography>

      {!transitData && (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress />
        </Box>
      )}

      {transitData?.length === 0 && <Alert severity="info">No transit stations found nearby</Alert>}

      {transitData?.length > 0 && (
        <Box sx={{ overflow: "auto" }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Paper
                sx={{
                  p: 2,
                  backgroundColor: "rgba(33, 150, 243, 0.1)",
                  border: "1px solid rgba(33, 150, 243, 0.3)",
                }}
              >
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Transit Summary
                </Typography>
                <Typography variant="h4">{stats.totalStations} Stations</Typography>
                <Typography variant="body2" color="text.secondary">
                  Average Distance: {stats.averageDistance.toFixed(1)} km
                </Typography>
                <Box sx={{ mt: 1, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  {Object.entries(stats.stationTypes).map(([type, count]) => (
                    <Chip
                      key={type}
                      label={`${type}: ${count}`}
                      size="small"
                      sx={{
                        backgroundColor: `${getTypeColor(type)}22`,
                        borderColor: getTypeColor(type),
                        border: "1px solid",
                      }}
                    />
                  ))}
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Nearby Stations
              </Typography>
              {transitData.map((station) => (
                <Box
                  key={station.place_id}
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
                        {station.name}
                      </Typography>
                      <Chip
                        label={getStationType(station.type)}
                        size="small"
                        sx={{
                          mt: 0.5,
                          backgroundColor: `${getTypeColor(station.type)}22`,
                          borderColor: getTypeColor(station.type),
                          border: "1px solid",
                        }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary" textAlign="right">
                        {station.distance.toFixed(1)} km
                      </Typography>
                    </Grid>
                    {station.rating && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Rating
                        </Typography>
                        <Typography variant="body1">{station.rating} ★</Typography>
                      </Grid>
                    )}
                    {station.user_ratings_total && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Reviews
                        </Typography>
                        <Typography variant="body1">{formatNumber(station.user_ratings_total)}</Typography>
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

export default TransitPanel;
