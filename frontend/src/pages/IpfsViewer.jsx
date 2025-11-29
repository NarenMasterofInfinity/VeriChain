import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import DownloadIcon from "@mui/icons-material/Download";

const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export default function IpfsViewer() {
  const [cid, setCid] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileHash, setFileHash] = useState("");

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  const ipfsUrl = useMemo(() => {
    if (!cid.trim()) return "";
    return `${PINATA_GATEWAY}/${cid.trim()}`;
  }, [cid]);

  const loadFile = async () => {
    if (!cid.trim()) {
      setError("Enter a CID to load.");
      return;
    }

    setLoading(true);
    setError("");
    setFileHash("");
    setFileType("");

    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
      setFileUrl("");
    }

    try {
      const response = await axios.get(ipfsUrl, {
        responseType: "blob",
      });
      const blob = response.data;
      const objectUrl = URL.createObjectURL(blob);
      setFileUrl(objectUrl);
      setFileType(blob.type || "application/octet-stream");

      const buffer = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      setFileHash(hashArray.map((b) => b.toString(16).padStart(2, "0")).join(""));
    } catch (err) {
      console.error("Failed to load IPFS file", err);
      setError("Unable to load content from Pinata. Check the CID and try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = () => {
    if (!fileUrl) {
      return (
        <Stack spacing={1} color="text.secondary">
          <Typography variant="body1">
            Provide a Pinata CID to preview the stored file, see its SHA-256 hash,
            and download it locally.
          </Typography>
          <Typography variant="body2">
            We compute the hash client-side to help you match it with the on-chain
            certificate record.
          </Typography>
        </Stack>
      );
    }

    if (fileType.startsWith("image/")) {
      return (
        <Box
          component="img"
          src={fileUrl}
          alt="IPFS preview"
          sx={{
            width: "100%",
            borderRadius: 2,
            border: "1px solid rgba(255,255,255,0.08)",
            objectFit: "contain",
          }}
        />
      );
    }

    if (fileType === "application/pdf") {
      return (
        <iframe
          title="IPFS PDF preview"
          src={fileUrl}
          style={{
            width: "100%",
            minHeight: 400,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "#fff",
          }}
        />
      );
    }

    return (
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Preview not available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            File type <strong>{fileType}</strong> cannot be previewed, but you can still
            download it below.
          </Typography>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 3, md: 4 },
          backgroundColor: "background.paper",
        }}
      >
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h4" fontWeight={600}>
              IPFS Viewer
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Enter a Pinata CID to inspect the stored document, view the computed
              SHA-256 hash, and download a copy.
            </Typography>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "flex-end" }}
          >
            <TextField
              label="Pinata CID"
              placeholder="e.g. Qm..."
              value={cid}
              onChange={(e) => setCid(e.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              size="large"
              startIcon={<TravelExploreIcon />}
              onClick={loadFile}
              disabled={loading}
            >
              {loading ? "Loading…" : "Load"}
            </Button>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          {loading && (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary">
                Fetching file from Pinata gateway…
              </Typography>
            </Stack>
          )}

          {renderPreview()}

          {fileUrl && (
            <>
              <Divider flexItem />
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                  File hash (SHA-256)
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ wordBreak: "break-all", fontWeight: 600 }}
                >
                  {fileHash || "Computing…"}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  component="a"
                  href={fileUrl}
                  download={`ipfs-${cid}`}
                  variant="contained"
                  startIcon={<DownloadIcon />}
                >
                  Download snapshot
                </Button>
                <Button component="a" href={ipfsUrl} target="_blank" rel="noreferrer">
                  Open in gateway
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
