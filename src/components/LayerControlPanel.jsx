import { Paper, Typography, List, ListItem, ListItemIcon, ListItemText, Switch, Box } from "@mui/material";
import { Air, WbSunny, DirectionsWalk, Park, DirectionsTransit } from "@mui/icons-material";

// Define layer types as constants
export const LAYER_TYPES = {
  AIR_QUALITY: "airQuality",
  SOLAR: "solar",
  WALKABILITY: "walkability",
  GREEN_SPACES: "greenSpaces",
  TRANSIT: "transit",
};

const LayerControlPanel = ({ activeLayers, onToggleLayer }) => {
  const layers = [
    {
      id: LAYER_TYPES.AIR_QUALITY,
      icon: <Air />,
      name: "Air Quality",
      description: "Real-time AQI data",
    },
    {
      id: LAYER_TYPES.SOLAR,
      icon: <WbSunny />,
      name: "Solar Potential",
      description: "Rooftop solar analysis",
    },
    {
      id: LAYER_TYPES.WALKABILITY,
      icon: <DirectionsWalk />,
      name: "Walkability",
      description: "15-minute walk radius",
    },
    {
      id: LAYER_TYPES.GREEN_SPACES,
      icon: <Park />,
      name: "Green Spaces",
      description: "Parks and natural areas",
    },
    {
      id: LAYER_TYPES.TRANSIT,
      icon: <DirectionsTransit />,
      name: "Transit Access",
      description: "Public transportation",
    },
  ];

  return (
    <Paper
      elevation={3}
      sx={{
        position: "absolute",
        top: 20,
        right: 20,
        width: 300,
        zIndex: 1000,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(4px)",
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Sustainability Layers
        </Typography>
        <List>
          {layers.map((layer) => (
            <ListItem key={layer.id}>
              <ListItemIcon>{layer.icon}</ListItemIcon>
              <ListItemText primary={layer.name} secondary={layer.description} />
              <Switch edge="end" checked={activeLayers[layer.id] || false} onChange={() => onToggleLayer(layer.id)} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Paper>
  );
};

export default LayerControlPanel;
