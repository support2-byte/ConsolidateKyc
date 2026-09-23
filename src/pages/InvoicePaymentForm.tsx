import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  CreditCard as CreditCardIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import {
  useInvoicePayment,
  type InvoiceRecord,
  type OrderRecord,
  type ReceiverRecord,
} from "../hooks/useInvoicePayment";

const API_URL = import.meta.env.VITE_API_URL;

const TEAL = "#1a7a6e";
const ORANGE = "#e07b2a";

const colors = {
  primary: TEAL,
  accent: TEAL,
  cta: ORANGE,
  bg: "#f1f5f9",
  cardBg: "#ffffff",
  textMain: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#d97706",
};

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
  }).format(amount);
};

const formatStorageType = (value: string | null | undefined): string => {
  if (!value) return "—";
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusChipColor = (
  status: string | undefined,
): "success" | "warning" | "error" | "default" => {
  const value = (status || "").toLowerCase();
  if (value === "paid") return "success";
  if (value === "pending") return "warning";
  if (value === "overdue" || value === "failed") return "error";
  return "default";
};

const INVOICE_META: Record<
  InvoiceRecord["invoiceType"],
  { heading: [string, string]; description: string; note: string }
> = {
  overstayed: {
    heading: ["OVERSTAY", "INVOICE"],
    description: "Cargo Overstay Charges",
    note: "Charges apply after the 3 free-day period following shipment delivery.",
  },
  storage: {
    heading: ["STORAGE", "INVOICE"],
    description: "Storage Charges",
    note: "Charges reflect storage usage for the period specified in your request.",
  },
  delivery: {
    heading: ["DELIVERY", "INVOICE"],
    description: "Delivery Charges",
    note: "Charges reflect delivery service requested for this shipment.",
  },
  dropoff: {
    heading: ["DROP-OFF", "INVOICE"],
    description: "Drop-off Pickup Charges",
    note: "Charges reflect pickup service requested for this shipment.",
  },
};

const SectionHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <Box sx={{ display: "flex", alignItems: "center", mb: 3, mt: 1 }}>
    <Box
      sx={{
        width: 4,
        height: 28,
        bgcolor: colors.accent,
        borderRadius: 1,
        mr: 2,
      }}
    />
    <Box>
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ color: colors.textMain, lineHeight: 1.2 }}
      >
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: colors.textMuted }}>
        {subtitle}
      </Typography>
    </Box>
  </Box>
);

const InfoField = ({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) => (
  <Grid size={{ xs: 12, md: 6 }}>
    <Typography variant="caption" color={colors.textMuted}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600}>
      {value === null || value === undefined || value === "" ? "—" : value}
    </Typography>
  </Grid>
);

const InvoiceTemplateCard = ({
  invoice,
  order,
  receiver,
}: {
  invoice: InvoiceRecord;
  order: OrderRecord | null;
  receiver: ReceiverRecord | null;
}) => {
  const isOverstay = invoice.invoiceType === "overstayed";
  const meta = INVOICE_META[invoice.invoiceType] ?? INVOICE_META.overstayed;
  const subtotal = invoice.subtotal ?? invoice.amount;
  const taxAmount = invoice.amount - subtotal;
  const total = invoice.amount;
  const commodityLabel =
    [invoice.category, invoice.subcategory].filter(Boolean).join(" - ") || "—";

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{ borderRadius: 2, borderColor: colors.border, overflow: "hidden" }}
    >
      <Box
        sx={{
          bgcolor: colors.primary,
          color: "#fff",
          py: 1.5,
          textAlign: "center",
        }}
      >
        <Typography variant="subtitle2" fontWeight={700} letterSpacing={1}>
          STORAGE & DISTRIBUTION
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              component="img"
              src="https://royalgulfshipping.com/wp-content/uploads/2023/08/RGSL-LOGO.png"
              alt="RGSL Logo"
              sx={{
                height: 40,
                objectFit: "contain",
              }}
            />
            <Box>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{ color: colors.primary }}
              >
                Royal Gulf Shipping & Logistics
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: colors.textMuted, mb: 0 }}
              >
                21 6a st - Ras Al Khor Industrial Area 2 - Dubai - UAE
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ textAlign: "right" }}>
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{ color: colors.cta, lineHeight: 1.1 }}
            >
              {meta.heading[0]}
            </Typography>
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{ color: colors.cta, lineHeight: 1.1 }}
            >
              {meta.heading[1]}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <InfoField label="Invoice #" value={invoice.invoiceId} />
          <InfoField
            label="Invoice Date"
            value={formatDate(invoice.createdAt)}
          />
          <InfoField label="Terms" value="Due on Receipt" />
          <InfoField label="Order Ref" value={order?.formNumber} />
          <InfoField label="Commodity" value={commodityLabel} />
          {isOverstay && (
            <InfoField
              label="Overstayed"
              value={`${invoice.overstayDays ?? 0} day(s)`}
            />
          )}
        </Grid>

        <Box
          sx={{ bgcolor: "#f2f4f5", borderRadius: 1, px: 1.5, py: 1, mb: 2 }}
        >
          <Typography
            variant="caption"
            fontWeight={700}
            color={colors.textMain}
          >
            Bill To
          </Typography>
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{ color: "#c0392b" }}
          >
            {receiver?.receiverName || "N/A"}
          </Typography>
          {receiver?.receiverContact && (
            <Typography variant="caption" color={colors.textMuted}>
              {receiver.receiverContact}
            </Typography>
          )}
        </Box>

        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 32 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">
                Amount
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell sx={{ verticalAlign: "top", color: "#c0392b" }}>
                1
              </TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  color={colors.primary}
                >
                  {meta.description}
                </Typography>
                <Typography
                  variant="caption"
                  display="block"
                  color={colors.textMuted}
                >
                  {commodityLabel}
                </Typography>
                {isOverstay ? (
                  <Typography
                    variant="caption"
                    display="block"
                    color={colors.textMuted}
                  >
                    {invoice.overstayDays ?? 0} day(s) x{" "}
                    {formatCurrency(invoice.baseRate)}
                  </Typography>
                ) : invoice.invoiceType === "storage" && invoice.details ? (
                  <Typography
                    variant="caption"
                    display="block"
                    color={colors.textMuted}
                  >
                    {[
                      formatStorageType(invoice.details.storageType),
                      invoice.details.size,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell align="right" sx={{ verticalAlign: "top" }}>
                <Typography variant="body2" fontWeight={700} color="#c0392b">
                  {(isOverstay ? subtotal : invoice.amount).toFixed(2)} AED
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {isOverstay && (
          <>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color={colors.textMuted}>
                Subtotal
              </Typography>
              <Typography variant="body2">{subtotal.toFixed(2)} AED</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color={colors.textMuted}>
                Tax ({invoice.taxPercent ?? 0}%)
              </Typography>
              <Typography variant="body2">
                {taxAmount.toFixed(2)} AED
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color={colors.textMuted}>
                Discount (AED)
              </Typography>
              <Typography variant="body2">
                {invoice.discount ?? 0} AED
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" mt={1}>
              <Typography variant="body1" fontWeight={600}>
                Total
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {total ?? 0} AED
              </Typography>
            </Stack>
          </>
        )}

        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 3,
            color: colors.textMuted,
            fontStyle: "italic",
          }}
        >
          Charges apply after the 3 free-day period following shipment delivery.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1.5, color: colors.textMain }}>
          Thanks for your business.
        </Typography>
      </Box>

      <Box
        sx={{
          bgcolor: colors.primary,
          color: "#fff",
          py: 1.25,
          px: 3,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          mt: 10,
        }}
      >
        <Typography variant="caption">Tel: +971 50 972 4214</Typography>
        <Typography variant="caption">
          Email: info@royalgulfshipping.com
        </Typography>
      </Box>
    </Paper>
  );
};

const RequestDetails = ({ invoice }: { invoice: InvoiceRecord }) => {
  const d = invoice.details;
  if (!d) return null;

  const rows: [string, string | number | null | undefined][] =
    invoice.invoiceType === "storage"
      ? [
          ["Storage Type", formatStorageType(d.storageType)],
          ["Size", d.size],
          ["Quantity", d.quantity],
          ["Required From", formatDate(d.requiredFrom)],
          ["Duration", d.durationDays ? `${d.durationDays} days` : null],
          ["Notes", d.notes],
        ]
      : invoice.invoiceType === "delivery"
        ? [
            ["Delivery Contact", d.deliveryContact],
            ["Delivery Address", d.deliveryAddress],
            ["Delivery Options", d.deliveryOptions?.join(", ")],
          ]
        : invoice.invoiceType === "dropoff"
          ? [
              ["Contact Number", d.contactNumber],
              ["Pickup Address", d.pickupAddress],
              ["Pickup Date", formatDate(d.pickupDate)],
              ["Pickup Zone", d.zone],
            ]
          : [];

  if (rows.length === 0) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: 3,
        border: `1px solid ${colors.border}`,
        bgcolor: colors.cardBg,
      }}
    >
      <SectionHeader
        title="Request Details"
        subtitle="What was requested for this invoice"
      />
      <Grid container spacing={2}>
        {rows.map(([label, value]) => (
          <InfoField key={label} label={label} value={value} />
        ))}
      </Grid>
    </Paper>
  );
};

export default function InvoicePaymentForm() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [searchParams] = useSearchParams();

  const { loading, error, alreadyPaid, invoice, order, receiver, company } =
    useInvoicePayment(invoiceId);

  const [payProcessing, setPayProcessing] = useState<boolean>(false);
  const [verifyingReturn, setVerifyingReturn] = useState<boolean>(false);
  const [paymentResult, setPaymentResult] = useState<
    "success" | "failed" | null
  >(null);
  const [otp, setOtp] = useState<string>("");
  const [otpVerified, setOtpVerified] = useState<boolean>(false);
  const [otpVerifying, setOtpVerifying] = useState<boolean>(false);

  useEffect(() => {
    const isReturningFromPayment = searchParams.get("paid") === "1";
    if (!isReturningFromPayment || !invoiceId) return;

    let cancelled = false;

    async function confirmPayment(): Promise<void> {
      setVerifyingReturn(true);
      try {
        const res = await fetch(`${API_URL}/invoices/${invoiceId}/confirm`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Payment verification failed.");
        }
        if (!cancelled) {
          const state = data.data?.state;
          setPaymentResult(
            state === "CAPTURED" || state === "PURCHASED"
              ? "success"
              : "failed",
          );
        }
      } catch (err) {
        if (!cancelled) {
          setPaymentResult("failed");
          toast.error(
            err instanceof Error ? err.message : "Payment verification failed.",
          );
        }
      } finally {
        if (!cancelled) setVerifyingReturn(false);
      }
    }

    confirmPayment();
    return () => {
      cancelled = true;
    };
  }, [searchParams, invoiceId]);

  const handleVerifyOtp = async (): Promise<void> => {
    if (!invoiceId) return;
    setOtpVerifying(true);
    try {
      const res = await fetch(`${API_URL}/invoices/${invoiceId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid OTP.");
      }
      setOtpVerified(true);
      toast.success("OTP verified.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid OTP.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const handlePay = async (): Promise<void> => {
    if (!invoiceId || !otpVerified) return;
    setPayProcessing(true);
    try {
      const res = await fetch(`${API_URL}/invoices/${invoiceId}/ngenius`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.data?.paymentUrl) {
        throw new Error(data.message || "Unable to start payment.");
      }
      window.location.href = data.data.paymentUrl;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to start payment.",
      );
      setPayProcessing(false);
    }
  };

  if (!invoiceId) {
    return (
      <Alert severity="error" sx={{ m: 4 }}>
        Invalid or incomplete link. Please use the link sent to your email.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 4 }}>
        {error}
      </Alert>
    );
  }

  if (verifyingReturn) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color={colors.textMuted}>
          Verifying your payment...
        </Typography>
      </Box>
    );
  }

  if (paymentResult === "success" || alreadyPaid) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 480,
            p: 4,
            borderRadius: 3,
            border: `1px solid ${colors.border}`,
            bgcolor: colors.cardBg,
            textAlign: "center",
          }}
        >
          <CheckIcon sx={{ fontSize: 48, color: colors.success, mb: 2 }} />
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ color: colors.textMain, mb: 1 }}
          >
            Payment Received
          </Typography>
          <Typography variant="body2" color={colors.textMuted}>
            Thank you. Your invoice {invoice?.invoiceId} has been marked as
            paid.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (paymentResult === "failed") {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 480,
            p: 4,
            borderRadius: 3,
            border: `1px solid ${colors.border}`,
            bgcolor: colors.cardBg,
            textAlign: "center",
          }}
        >
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ color: colors.danger, mb: 1 }}
          >
            Payment Not Completed
          </Typography>
          <Typography variant="body2" color={colors.textMuted} sx={{ mb: 3 }}>
            We couldn't confirm your payment. You can try again below.
          </Typography>
          <Button
            variant="contained"
            onClick={() => setPaymentResult(null)}
            sx={{
              bgcolor: colors.cta,
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { bgcolor: "#c4671f" },
            }}
          >
            Try Again
          </Button>
        </Paper>
      </Box>
    );
  }

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
            justifyContent="space-between"
            sx={{ py: 2 }}
          >
            <Stack direction="row" alignItems="center" spacing={2.5}>
              <Box
                component="img"
                src={company?.logoUrl || "/logo.png"}
                alt={company?.company || "Company"}
                sx={{ height: 48, objectFit: "contain" }}
              />
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography
                  variant="h6"
                  fontWeight={800}
                  sx={{ color: colors.primary, letterSpacing: "-0.02em" }}
                >
                  Invoice Payment
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
                  Review & Pay
                </Typography>
              </Box>
            </Stack>
            <Chip
              label="Secure Payment"
              color="success"
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, display: { xs: "none", md: "flex" } }}
            />
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
        <Box sx={{ maxWidth: 900, mx: "auto" }}>
          <Alert
            severity="info"
            sx={{
              mb: 4,
              borderRadius: 2,
              bgcolor: "#eaf5f3",
              color: "#0f4f47",
              border: "1px solid #b9dcd7",
              "& .MuiAlert-icon": { color: colors.primary },
            }}
          >
            Please review the invoice below before proceeding to payment.
          </Alert>

          <Stack spacing={4}>
            {invoice && <RequestDetails invoice={invoice} />}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 3,
                border: `1px solid ${colors.border}`,
                bgcolor: colors.cardBg,
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <SectionHeader
                  title="Your Invoice"
                  subtitle={`Invoice ${invoice?.invoiceId || "—"}`}
                />
                <Chip
                  label={(invoice?.status || "pending").toUpperCase()}
                  color={statusChipColor(invoice?.status)}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
              {invoice && (
                <InvoiceTemplateCard
                  invoice={invoice}
                  order={order}
                  receiver={receiver}
                />
              )}
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 3,
                border: `1px solid ${colors.border}`,
                bgcolor: colors.cardBg,
              }}
            >
              <SectionHeader
                title="Payment"
                subtitle="Secure checkout powered by N-Genius"
              />
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", sm: "flex-start" }}
                sx={{ mb: 3 }}
              >
                <TextField
                  label="Enter OTP"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  disabled={otpVerified}
                  helperText={
                    otpVerified
                      ? "OTP verified"
                      : "Enter the 6-digit code from your invoice email"
                  }
                  slotProps={{
                    htmlInput: {
                      inputMode: "numeric",
                      maxLength: 6,
                      style: { letterSpacing: 6, fontWeight: 600 },
                    },
                  }}
                  sx={{ maxWidth: 280 }}
                />
                <Button
                  variant="outlined"
                  onClick={handleVerifyOtp}
                  disabled={otpVerified || otpVerifying || otp.length !== 6}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    height: 56,
                    borderColor: colors.primary,
                    color: colors.primary,
                  }}
                >
                  {otpVerifying
                    ? "Verifying..."
                    : otpVerified
                      ? "Verified"
                      : "Verify OTP"}
                </Button>
              </Stack>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
                spacing={2}
              >
                <Box>
                  <Typography variant="caption" color={colors.textMuted}>
                    Amount Due
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{ color: colors.textMain }}
                  >
                    {formatCurrency(invoice?.amount)}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handlePay}
                  disabled={payProcessing}
                  startIcon={
                    payProcessing ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <CreditCardIcon />
                    )
                  }
                  sx={{
                    px: 6,
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: "none",
                    fontSize: "1rem",
                    bgcolor: colors.cta,
                    boxShadow: "0 4px 14px rgba(224, 123, 42, 0.35)",
                    "&:hover": {
                      bgcolor: "#c4671f",
                      boxShadow: "0 6px 20px rgba(224, 123, 42, 0.45)",
                    },
                    "&.Mui-disabled": {
                      bgcolor: colors.border,
                      color: colors.textMuted,
                      boxShadow: "none",
                    },
                  }}
                >
                  {payProcessing ? "Redirecting..." : "Pay with N-Genius"}
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Box>
      </Container>

      <Box
        sx={{
          bgcolor: colors.primary,
          color: "white",
          py: 3,
          mt: "auto",
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              © {new Date().getFullYear()} {company?.company || "Consolidate"}.
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
