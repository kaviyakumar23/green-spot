import { Paper, Typography, Box, CircularProgress, Alert } from "@mui/material";
import { Air } from "@mui/icons-material";
import React, { useState, useEffect } from "react";
import { rgbToHex } from "../utils/utility";

const AirQualityPanel = ({ location, aqData, setAqData, visible }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAirQuality = async () => {
      if (!visible || !location) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              location: {
                latitude: location.lat,
                longitude: location.lng,
              },
              extraComputations: [
                "HEALTH_RECOMMENDATIONS",
                "DOMINANT_POLLUTANT_CONCENTRATION",
                "POLLUTANT_CONCENTRATION",
                "LOCAL_AQI",
                "POLLUTANT_ADDITIONAL_INFO",
              ],
            }),
          }
        );

        const data = await response.json();
        console.log(data);
        setAqData(data);
      } catch (err) {
        setError("Failed to fetch air quality data");
        console.error("Air Quality API Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAirQuality();
  }, [location, visible]);

  if (!visible) return null;

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
        <Air /> Air Quality Index
      </Typography>

      {loading && (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {aqData && aqData.indexes && aqData.indexes[0] && (
        <Box sx={{ overflow: "auto" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: rgbToHex(aqData.indexes[0].color.red, aqData.indexes[0].color.green, aqData.indexes[0].color.blue),
                color: "white",
                boxShadow: 2,
              }}
            >
              <Typography variant="h4">{aqData.indexes[0].aqiDisplay}</Typography>
            </Box>
            <Box flex={1} ml={2}>
              <Typography variant="h6">{aqData.indexes[0].displayName}</Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {aqData.indexes[0].category}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Health Recommendations
            </Typography>

            {aqData.healthRecommendations &&
              Object.entries(aqData.healthRecommendations).map(([group, recommendation]) => {
                // Convert camelCase to Title Case
                const groupTitle = group
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())
                  .replace("Population", "");

                return (
                  <Box key={group} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="primary">
                      {groupTitle}:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {recommendation}
                    </Typography>
                  </Box>
                );
              })}
          </Box>

          <Typography variant="caption" color="text.secondary" display="block" mt={2}>
            Last updated: {new Date(aqData.dateTime).toLocaleString()}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default AirQualityPanel;
