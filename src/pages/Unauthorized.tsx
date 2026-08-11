import { Box, Typography } from "@mui/material";
import { GppBad as ShieldOffIcon } from "@mui/icons-material";

export default function Unauthorized() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f8fafc",
        px: 3,
        textAlign: "center",
      }}
    >
      <ShieldOffIcon
        sx={{ fontSize: 72, color: "#dc2626", mb: 2, opacity: 0.85 }}
      />

      <Typography variant="h3" fontWeight={800} color="#1e293b">
        403
      </Typography>
      <Typography variant="h5" fontWeight={800} color="#dc2626" gutterBottom>
        Access Denied
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ maxWidth: 420, mb: 1 }}
      >
        This link is not valid for the page you are trying to access.
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 420, mb: 4 }}
      >
        Each KYC link is issued for a specific company. Please use the original
        link sent to your email, or contact support if you believe this is an
        error.
      </Typography>

      <Typography variant="caption" color="text.disabled">
        If you require assistance, please reach out to the company that sent you
        this link.
      </Typography>
    </Box>
  );
}
