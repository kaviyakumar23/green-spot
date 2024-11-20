import { useState } from "react";
import { Paper, InputBase, IconButton, Box, List, ListItem, ListItemText, Collapse } from "@mui/material";
import { Search, MyLocation } from "@mui/icons-material";

const SearchBar = ({ onLocationSelect, onUseCurrentLocation }) => {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);

  // Handle Places Autocomplete
  const handleSearchInput = async (value) => {
    setQuery(value);
    if (!value.trim()) {
      setPredictions([]);
      return;
    }

    try {
      const { PlacesService } = await google.maps.importLibrary("places");
      const autocompleteService = new google.maps.places.AutocompleteService();
      const results = await autocompleteService.getPlacePredictions({
        input: value,
      });
      setPredictions(results?.predictions || []);
      setShowPredictions(true);
    } catch (error) {
      console.error("Places API Error:", error);
      setPredictions([]);
    }
  };

  // Handle prediction selection
  const handlePredictionSelect = async (prediction) => {
    setQuery(prediction.description);
    setShowPredictions(false);

    try {
      const { PlacesService } = await google.maps.importLibrary("places");
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ placeId: prediction.place_id });

      if (result.results[0]?.geometry?.location) {
        const location = result.results[0].geometry.location;
        onLocationSelect({
          lat: location.lat(),
          lng: location.lng(),
          altitude: 400, // Default altitude
        });
      }
    } catch (error) {
      console.error("Geocoding Error:", error);
    }
  };

  // Handle current location
  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onLocationSelect({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            altitude: 400,
          });
        },
        (error) => {
          console.error("Geolocation Error:", error);
        }
      );
    }
  };

  return (
    <Box
      sx={{
        position: "absolute",
        top: 20,
        left: 20,
        zIndex: 1002,
        width: 400,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: "2px 4px",
          display: "flex",
          alignItems: "center",
          width: "100%",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(4px)",
        }}
      >
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          placeholder="Search locations..."
          value={query}
          onChange={(e) => handleSearchInput(e.target.value)}
          onFocus={() => setShowPredictions(true)}
        />
        <IconButton sx={{ p: "10px" }} onClick={() => handleSearchInput(query)}>
          <Search />
        </IconButton>
        <IconButton sx={{ p: "10px" }} onClick={handleCurrentLocation}>
          <MyLocation />
        </IconButton>
      </Paper>

      <Collapse in={showPredictions && predictions.length > 0}>
        <Paper
          elevation={3}
          sx={{
            mt: 1,
            maxHeight: 300,
            overflow: "auto",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(4px)",
          }}
        >
          <List>
            {predictions.map((prediction) => (
              <ListItem key={prediction.place_id} button onClick={() => handlePredictionSelect(prediction)}>
                <ListItemText primary={prediction.description} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default SearchBar;
