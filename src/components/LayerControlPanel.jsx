import { Paper, Typography, List, ListItem, ListItemIcon, ListItemText, Switch, Box } from "@mui/material";
import { Air, WbSunny, DirectionsWalk, Park, DirectionsTransit } from "@mui/icons-material";

export const LAYER_TYPES = {
  AIR_QUALITY: "airQuality",
  SOLAR: "solar",
  WALKABILITY: "walkability",
  GREEN_SPACES: "greenSpaces",
  TRANSIT: "transit",
};

const LayerControlPanel = ({ activeLayers, onToggleLayer, onSelectPanel, selectedPanel }) => {
  const layers = [
    {
      id: LAYER_TYPES.AIR_QUALITY,
      icon: <Air size={20} />,
      name: "Air Quality",
      description: "Real-time AQI data",
    },
    {
      id: LAYER_TYPES.SOLAR,
      icon: <WbSunny size={20} />,
      name: "Solar Potential",
      description: "Rooftop solar analysis",
    },
    {
      id: LAYER_TYPES.WALKABILITY,
      icon: <DirectionsWalk size={20} />,
      name: "Walkability",
      description: "Walkability score",
    },
    {
      id: LAYER_TYPES.GREEN_SPACES,
      icon: <Park size={20} />,
      name: "Green Spaces",
      description: "Parks and natural areas",
    },
    {
      id: LAYER_TYPES.TRANSIT,
      icon: <DirectionsTransit size={20} />,
      name: "Transit Access",
      description: "Public transportation",
    },
  ];

  const handleToggleLayer = (layerId) => {
    onToggleLayer(layerId);
    if (!activeLayers[layerId]) {
      onSelectPanel(layerId);
    }
  };

  const handleLayerClick = (layerId) => {
    if (activeLayers[layerId]) {
      onSelectPanel(layerId);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: "absolute",
        bottom: 20,
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
            <ListItem
              key={layer.id}
              sx={{
                pr: 1,
                cursor: activeLayers[layer.id] ? "pointer" : "default",
                bgcolor: selectedPanel === layer.id ? "rgba(0, 0, 0, 0.04)" : "transparent",
                "&:hover": activeLayers[layer.id]
                  ? {
                      bgcolor: "rgba(0, 0, 0, 0.08)",
                    }
                  : {},
              }}
              onClick={(e) => {
                if (!e.target.closest(".MuiSwitch-root")) {
                  handleLayerClick(layer.id);
                }
              }}
            >
              <ListItemIcon>{layer.icon}</ListItemIcon>
              <ListItemText primary={layer.name} secondary={layer.description} />
              <Switch className="layer-switch" edge="end" checked={activeLayers[layer.id] || false} onChange={() => handleToggleLayer(layer.id)} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Paper>
  );
};

export default LayerControlPanel;
