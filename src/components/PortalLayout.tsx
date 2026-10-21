import type { ReactNode } from "react";
import { Box, Container, Divider, Stack, Typography } from "@mui/material";

export const colors = {
  primary: "#1a7a6e",
  cta: "#e07b2a",
  bg: "#f1f5f9",
  cardBg: "#ffffff",
  textMain: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0",
  danger: "#dc2626",
};

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function PortalLayout({ title, subtitle, children }: Props) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: colors.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          bgcolor: colors.cardBg,
          borderBottom: `1px solid ${colors.border}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction="row"
            alignItems="center"
            spacing={2.5}
            sx={{ py: 2 }}
          >
            <Box
              component="img"
              src="/logo.png"
              alt="Royal Gulf Shipping & Logistics"
              sx={{ height: 48, objectFit: "contain" }}
            />
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{ color: colors.primary, letterSpacing: "-0.02em" }}
              >
                {title}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: colors.textMuted,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {subtitle}
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container
        maxWidth="md"
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: { xs: 4, md: 8 },
        }}
      >
        {children}
      </Container>

      <Box sx={{ bgcolor: colors.primary, color: "white", py: 3 }}>
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              © {new Date().getFullYear()} Royal Gulf Shipping & Logistics LLC.
              All rights reserved.
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              This portal is strictly for authorized use. Data is processed
              securely.
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
