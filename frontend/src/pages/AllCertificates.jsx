import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import LaunchIcon from "@mui/icons-material/Launch";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

const API_BASE = "http://127.0.0.1:5000";

export default function AllCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCertificates = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}/certificates`);
      setCertificates(res.data);
    } catch (err) {
      console.error("Failed to load certificates", err);
      setError(err.response?.data?.message || "Unable to load certificates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  const filteredCertificates = useMemo(() => {
    if (!search.trim()) return certificates;
    const query = search.trim().toLowerCase();
    return certificates.filter((item) => {
      const haystacks = [
        item.hash,
        item.issuedTo,
        item.issuedBy,
        item.cid || "",
        item.filename || "",
      ];
      return haystacks.some((field) =>
        field?.toLowerCase().includes(query)
      );
    });
  }, [certificates, search]);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Issued Certificates
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Browse every certificate committed to the blockchain.
          </Typography>
        </Box>

        <Button
          onClick={loadCertificates}
          variant="contained"
          startIcon={<RefreshIcon />}
          sx={{ alignSelf: { xs: "flex-start", sm: "auto" } }}
        >
          Refresh
        </Button>
      </Stack>

      <TextField
        label="Search by hash or address"
        fullWidth
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3 }}
      />

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={40} />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && filteredCertificates.length === 0 && (
        <Alert severity="info">No certificates found.</Alert>
      )}

      <Grid container spacing={2}>
        {filteredCertificates.map((certificate) => (
          <Grid item xs={12} md={6} key={certificate.hash}>
            <CertificateCard certificate={certificate} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

function CertificateCard({ certificate }) {
  const ipfsUrl = certificate.ipfs_url;

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderRadius: 3,
        borderColor: "divider",
        backgroundColor: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {ipfsUrl ? (
        <PreviewMedia ipfsUrl={ipfsUrl} filename={certificate.filename} />
      ) : (
        <CardMedia
          sx={{
            height: 200,
            background:
              "linear-gradient(135deg, rgba(4,11,23,0.7), rgba(23,33,65,0.9))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <Typography variant="subtitle2">No IPFS snapshot</Typography>
        </CardMedia>
      )}

      <CardContent sx={{ flexGrow: 1 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <Typography variant="h6" fontWeight={600}>
            {certificate.filename || `${certificate.hash.slice(0, 10)}…`}
          </Typography>
          <Chip
            size="small"
            label="On-chain"
            color="success"
            variant="outlined"
          />
        </Stack>

        <HashRow label="Hash" value={certificate.hash} />
        {certificate.cid && <HashRow label="CID" value={certificate.cid} />}

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1}>
          <DetailRow label="Issued to" value={certificate.issuedTo} />
          <DetailRow label="Issued by" value={certificate.issuedBy} />
          <DetailRow
            label="Timestamp"
            value={
              certificate.issuedAt ||
              new Date(certificate.timestamp * 1000).toLocaleString()
            }
          />
        </Stack>
      </CardContent>

      {ipfsUrl && (
        <Stack direction="row" spacing={1} sx={{ p: 2, pt: 0 }}>
          <Button
            component="a"
            href={ipfsUrl}
            target="_blank"
            rel="noreferrer"
            startIcon={<LaunchIcon />}
            fullWidth
          >
            Open
          </Button>
          <Button
            component="a"
            href={ipfsUrl}
            download={certificate.filename || `certificate-${certificate.hash}`}
            startIcon={<FileDownloadIcon />}
            fullWidth
            variant="contained"
          >
            Download
          </Button>
        </Stack>
      )}
    </Card>
  );
}

function PreviewMedia({ ipfsUrl, filename }) {
  const isPdf = filename?.toLowerCase().endswith(".pdf");

  if (isPdf) {
    return (
      <CardMedia
        component="iframe"
        src={`${ipfsUrl}#toolbar=0`}
        sx={{
          height: 220,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          backgroundColor: "#fff",
        }}
        title={filename}
      />
    );
  }

  return (
    <CardMedia
      component="img"
      src={ipfsUrl}
      alt={filename || "certificate preview"}
      sx={{
        height: 220,
        objectFit: "cover",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

function HashRow({ label, value }) {
  const handleCopy = () => {
    navigator.clipboard?.writeText(value).catch(() => {});
  };

  return (
    <Stack spacing={0.5}>
      <Typography
        variant="caption"
        sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography
          variant="body2"
          sx={{ wordBreak: "break-all", fontWeight: 500, flex: 1 }}
        >
          {value}
        </Typography>
        <Tooltip title="Copy">
          <IconButton size="small" onClick={handleCopy}>
            <ContentCopyIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

function DetailRow({ label, value }) {
  return (
    <Stack spacing={0.5}>
      <Typography
        variant="caption"
        sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, wordBreak: "break-all" }}
      >
        {value}
      </Typography>
    </Stack>
  );
}
