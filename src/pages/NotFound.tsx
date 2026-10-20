import { useLocation } from "react-router-dom";
import { Box, Grid, Paper, Typography, Link } from "@mui/material";
import {
  AssignmentTurnedIn as KycIcon,
  ReceiptLong as InvoiceIcon,
  LocalShipping as DeliveryIcon,
  LinkOff as LinkOffIcon,
  VerifiedUser as PortalIcon,
} from "@mui/icons-material";
import PortalLayout, { colors } from "../components/PortalLayout";

const services = [
  {
    icon: <KycIcon />,
    title: "KYC & Bookings",
    text: "Complete customer verification and booking confirmation forms.",
  },
  {
    icon: <InvoiceIcon />,
    title: "Invoice Payments",
    text: "View and pay your invoices securely online.",
  },
  {
    icon: <DeliveryIcon />,
    title: "Shipment Requests",
    text: "Request delivery, purchase storage, or schedule a drop-off pickup.",
  },
];

export default function NotFound() {
  const { pathname } = useLocation();
  const isRoot = pathname === "/" || pathname === "";

  return (
    <PortalLayout
      title="Form Portal"
      subtitle="Royal Gulf Shipping & Logistics"
    >
      <Box sx={{ width: "100%", maxWidth: 820 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 3,
            border: `1px solid ${colors.border}`,
            bgcolor: colors.cardBg,
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              mx: "auto",
              mb: 3,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: isRoot ? "#eaf5f3" : "#fdf1e7",
              color: isRoot ? colors.primary : colors.cta,
            }}
          >
            {isRoot ? (
              <PortalIcon sx={{ fontSize: 38 }} />
            ) : (
              <LinkOffIcon sx={{ fontSize: 38 }} />
            )}
          </Box>

          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ color: colors.textMain, letterSpacing: "-0.02em", mb: 1.5 }}
          >
            {isRoot ? "Welcome to our Form portal" : "Page not found"}
          </Typography>

          <Typography
            variant="body1"
            sx={{ color: colors.textMuted, maxWidth: 560, mx: "auto" }}
          >
            {isRoot
              ? "To get started, please open the personalized link we sent you by email or message. Each link takes you directly to your form, invoice, or request."
              : "The link you followed doesn't exist or may be incomplete. Please check the original link you received and try again."}
          </Typography>
        </Paper>

        {isRoot && (
          <Grid container spacing={2.5} sx={{ mt: 1 }}>
            {services.map((s) => (
              <Grid
                key={s.title}
                size={{ xs: 12, md: 4 }}
                sx={{ display: "flex" }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    flex: 1,
                    borderRadius: 3,
                    border: `1px solid ${colors.border}`,
                    bgcolor: colors.cardBg,
                  }}
                >
                  <Box sx={{ color: colors.primary, mb: 1.5 }}>{s.icon}</Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    sx={{ color: colors.textMain }}
                  >
                    {s.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.textMuted }}>
                    {s.text}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        <Typography
          variant="body2"
          sx={{ mt: 4, textAlign: "center", color: colors.textMuted }}
        >
          Need help? Contact{" "}
          <Link
            href="mailto:support@yourcompany.com"
            sx={{ color: colors.primary, fontWeight: 600 }}
          >
            support@yourcompany.com
          </Link>
        </Typography>
      </Box>
    </PortalLayout>
  );
}
