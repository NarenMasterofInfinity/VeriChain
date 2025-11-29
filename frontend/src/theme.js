import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#1f8ef1",
    },
    secondary: {
      main: "#17c964",
    },
    background: {
      default: "#030712",
      paper: "rgba(255,255,255,0.04)",
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily:
      '"Inter", "IBM Plex Sans", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
  },
});

export default theme;
