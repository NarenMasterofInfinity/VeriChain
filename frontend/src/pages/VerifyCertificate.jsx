import { useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";
import DangerousIcon from "@mui/icons-material/Dangerous";

const API_BASE = "http://127.0.0.1:5000";

export default function VerifyCertificate() {
  const [hash, setHash] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!hash.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await axios.get(`${API_BASE}/verify/${hash.trim()}`);
      setResult(res.data);
    } catch (err) {
      console.error("Failed to verify certificate", err);
      setError("Unable to verify certificate. Please double-check the hash.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 3, md: 4 },
          maxWidth: 720,
          margin: "0 auto",
          backgroundColor: "background.paper",
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h4" fontWeight={600}>
            Verify authenticity
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Paste a certificate hash to confirm whether it exists on the
            blockchain registry.
          </Typography>

          <TextField
            label="Certificate hash"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            fullWidth
            placeholder="e.g. 600c9257a62b..."
          />

          <Button
            variant="contained"
            size="large"
            onClick={handleVerify}
            disabled={!hash.trim() || loading}
          >
            {loading ? "Verifying…" : "Verify certificate"}
          </Button>

          {error && <Alert severity="error">{error}</Alert>}

          {result && (
            <VerificationResult
              valid={result.valid}
              details={result.details}
            />
          )}
        </Stack>
      </Paper>
    </Box>
  );
}

function VerificationResult({ valid, details }) {
  const timestamp = details?.timestamp
    ? new Date(details.timestamp * 1000).toLocaleString()
    : "N/A";

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        mt: 3,
        borderColor: valid ? "success.main" : "error.main",
        backgroundColor: valid
          ? "rgba(23, 201, 100, 0.08)"
          : "rgba(244, 67, 54, 0.08)",
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          {valid ? (
            <VerifiedIcon color="success" fontSize="large" />
          ) : (
            <DangerousIcon color="error" fontSize="large" />
          )}
          <Typography variant="h6">
            {valid ? "Certificate is valid" : "Certificate not found"}
          </Typography>
        </Stack>

        {valid && (
          <>
            <Detail label="Issued to" value={details.issuedTo} />
            <Detail label="Issued by" value={details.issuedBy} />
            <Detail label="Timestamp" value={timestamp} />
          </>
        )}
      </Stack>
    </Paper>
  );
}

function Detail({ label, value }) {
  return (
    <Stack spacing={0.5}>
      <Typography
        variant="caption"
        sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
        {value}
      </Typography>
    </Stack>
  );
}
