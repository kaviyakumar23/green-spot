import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import Map3DComponent from "./components/Map3DComponent";

const theme = createTheme({
  palette: {
    mode: "light",
  },
});

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Map3DComponent />
    </ThemeProvider>
  );
};

export default App;
