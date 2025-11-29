import { Routes, Route, Link, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Stack,
} from "@mui/material";
import IssueCertificate from "./pages/IssueCertificate";
import VerifyCertificate from "./pages/VerifyCertificate";
import AllCertificates from "./pages/AllCertificates";
import IpfsViewer from "./pages/IpfsViewer";

export default function App() {
  const location = useLocation();

  const navLinks = [
    { label: "Issue", to: "/" },
    { label: "Verify", to: "/verify" },
    { label: "All Certificates", to: "/certificates" },
    { label: "IPFS Viewer", to: "/ipfs" },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, rgba(7,29,57,0.95), rgba(12,40,75,0.98))",
        color: "common.white",
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: "rgba(4, 13, 30, 0.85)",
          backdropFilter: "blur(6px)",
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            ChainCert Manager
          </Typography>

          <Stack direction="row" spacing={1}>
            {navLinks.map((link) => {
              const isActive =
                link.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(link.to);
              return (
                <Button
                  key={link.to}
                  component={Link}
                  to={link.to}
                  variant={isActive ? "contained" : "text"}
                  color={isActive ? "secondary" : "inherit"}
                  sx={{ color: isActive ? "common.white" : "inherit" }}
                >
                  {link.label}
                </Button>
              );
            })}
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Routes>
          <Route path="/" element={<IssueCertificate />} />
          <Route path="/verify" element={<VerifyCertificate />} />
          <Route path="/certificates" element={<AllCertificates />} />
          <Route path="/ipfs" element={<IpfsViewer />} />
        </Routes>
      </Container>
    </Box>
  );
}
