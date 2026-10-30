import { Box, Paper, Stack, Typography, Link } from "@mui/material";
import { GppBad as ShieldOffIcon } from "@mui/icons-material";
import PortalLayout, { colors } from "../components/PortalLayout";

const steps = [
  "Open the original link from your email or message.",
  "Make sure the full link was copied, with nothing cut off.",
  "Contact the company that sent you the link if the problem continues.",
];

export default function Unauthorized() {
  return (
    <PortalLayout title="Access Denied" subtitle="Authorization required">
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 560,
          p: { xs: 3, md: 5 },
          borderRadius: 3,
          border: `1px solid ${colors.border}`,
          borderTop: `4px solid ${colors.danger}`,
          bgcolor: colors.cardBg,
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            mx: "auto",
            mb: 2.5,
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "#fef2f2",
            color: colors.danger,
          }}
        >
          <ShieldOffIcon sx={{ fontSize: 40 }} />
        </Box>

        <Typography
          variant="overline"
          sx={{ color: colors.danger, fontWeight: 700, letterSpacing: "0.1em" }}
        >
          Error 403
        </Typography>
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{ color: colors.textMain, letterSpacing: "-0.02em", mb: 1.5 }}
        >
          You can't access this page
        </Typography>
        <Typography variant="body1" sx={{ color: colors.textMuted, mb: 3 }}>
          This link is not valid for the page you are trying to open. Each KYC
          link is issued for a specific company and can't be used for another.
        </Typography>

        <Box
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 2,
            bgcolor: "#fafbfc",
            border: `1px solid ${colors.border}`,
            textAlign: "left",
          }}
        >
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{ color: colors.textMain, mb: 1.5 }}
          >
            What you can do
          </Typography>
          <Stack spacing={1.25}>
            {steps.map((text, i) => (
              <Stack
                key={i}
                direction="row"
                spacing={1.5}
                alignItems="flex-start"
              >
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    flexShrink: 0,
                    borderRadius: "50%",
                    bgcolor: colors.primary,
                    color: "white",
                    fontSize: 12,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {i + 1}
                </Box>
                <Typography variant="body2" sx={{ color: colors.textMuted }}>
                  {text}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Typography variant="body2" sx={{ color: colors.textMuted }}>
          Still stuck? Email{" "}
          <Link
            href="mailto:support@royalgulfshipping.com"
            sx={{ color: colors.primary, fontWeight: 600 }}
          >
            support@royalgulfshipping.com
          </Link>
        </Typography>
      </Paper>
    </PortalLayout>
  );
}
