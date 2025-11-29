import { useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Link,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LaunchIcon from "@mui/icons-material/Launch";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useDropzone } from "react-dropzone";
import { QRCodeCanvas } from "qrcode.react";

const API_BASE = "http://127.0.0.1:5000";

export default function IssueCertificate() {
  const [file, setFile] = useState(null);
  const [hash, setHash] = useState("");
  const [cid, setCid] = useState("");
  const [ipfsUrl, setIpfsUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onDrop = (acceptedFiles) => {
    setFile(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    setError("");
    setHash("");
    setCid("");
    setIpfsUrl("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${API_BASE}/issue`, formData);
      setHash(res.data.hash);
      setCid(res.data.cid || "");
      setIpfsUrl(res.data.ipfs_url || "");
    } catch (err) {
      console.error("Failed to issue certificate", err);

      const revertReason =
        err.response?.data?.details?.reason ||
        err.response?.data?.reason ||
        err.response?.data?.message;

      if (revertReason?.toLowerCase().includes("certificate already exists")) {
        setError("Certificate already exists on the blockchain.");
      } else {
        setError(revertReason || "Failed to issue certificate. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Grid container spacing={4} alignItems="stretch">
        <Grid item xs={12} md={7}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 3, md: 4 },
              backgroundColor: "background.paper",
              minHeight: 420,
            }}
          >
            <Stack spacing={2} sx={{ mb: 2 }}>
              <Typography variant="h4" fontWeight={600}>
                Issue a new certificate
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Upload the signed document to generate a tamper-proof hash and
                anchor it on-chain. Supported formats: PDF, PNG, JPG.
              </Typography>
            </Stack>

            <Paper
              {...getRootProps()}
              variant="outlined"
              sx={{
                p: 4,
                textAlign: "center",
                borderStyle: "dashed",
                borderColor: isDragActive ? "primary.main" : "divider",
                backgroundColor: isDragActive
                  ? "rgba(31,142,241,0.08)"
                  : "transparent",
                cursor: "pointer",
                transition: "all .3s ease",
              }}
            >
              <input {...getInputProps()} />
              <CloudUploadIcon
                color="primary"
                sx={{ fontSize: 46, mb: 1 }}
              />
              {!file ? (
                <>
                  <Typography variant="h6">
                    Drag & drop certificate
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    or click to browse files
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {file.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(file.size / 1024).toFixed(1)} KB
                  </Typography>
                </>
              )}
            </Paper>

            <Button
              onClick={handleSubmit}
              variant="contained"
              size="large"
              fullWidth
              disabled={!file || loading}
              sx={{ mt: 3 }}
            >
              {loading ? "Issuing…" : "Issue Certificate"}
            </Button>

            {loading && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Broadcasting transaction to the blockchain…
                </Typography>
              </Stack>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 3 }}>
                {error}
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 3, md: 4 },
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              backgroundColor: "rgba(255,255,255,0.04)",
            }}
          >
            <Typography variant="h5" fontWeight={600}>
              Status
            </Typography>

            {hash ? (
              <Stack spacing={2} alignItems="center" textAlign="center">
                <CheckCircleIcon color="success" sx={{ fontSize: 54 }} />
                <Typography variant="h6">Certificate recorded</Typography>
                <HashBlock label="Document hash" value={hash} />
                {cid && <HashBlock label="Pinata CID" value={cid} />}
                <Divider flexItem />
                <QRCodeCanvas value={hash} size={180} />
                {ipfsUrl && (
                  <Stack direction="row" spacing={1}>
                    <Button
                      component={Link}
                      href={ipfsUrl}
                      target="_blank"
                      rel="noreferrer"
                      startIcon={<LaunchIcon />}
                    >
                      View on Pinata
                    </Button>
                    <Button
                      component="a"
                      href={ipfsUrl}
                      download={file?.name || `certificate-${cid}`}
                      startIcon={<FileDownloadIcon />}
                    >
                      Download
                    </Button>
                  </Stack>
                )}
              </Stack>
            ) : (
              <Stack spacing={2} color="text.secondary">
                <Typography>
                  Submit a document to see the generated hash and QR code here.
                </Typography>
                <Divider flexItem />
                <Typography variant="body2">
                  Every certificate is hashed with SHA-256 and permanently stored
                  on the blockchain, ensuring authenticity and integrity.
                </Typography>
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function HashBlock({ label, value }) {
  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard?.writeText(value).catch(() => {});
  };

  return (
    <Stack spacing={1} alignItems="center">
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography
          variant="body2"
          sx={{ wordBreak: "break-all", fontWeight: 600, maxWidth: 260 }}
        >
          {value}
        </Typography>
        <Tooltip title="Copy to clipboard">
          <IconButton size="small" onClick={handleCopy} color="primary">
            <ContentCopyIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
