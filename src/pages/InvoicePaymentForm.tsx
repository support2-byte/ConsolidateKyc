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
import { COMPANY, DEFAULT_TERMS } from "../constants/invoiceContent";

const API_URL = import.meta.env.VITE_API_URL;

const TEAL = "#0d6c6a";
const ORANGE = "#f58220";

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
  gold: "#ddbe3c",
  dark: "#3a3a3a",
  light: "#f5f5f5",
  borderGrey: "#d2d2d2",
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
  const title = meta.heading
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
  const total = Number(invoice.amount) || 0;
  const subtotal = Number(invoice.subtotal ?? invoice.amount) || 0;
  const taxPercent = Number(invoice.taxPercent) || 0;
  const taxAmount = isOverstay ? subtotal * (taxPercent / 100) : 0;
  const discount = Number(invoice.discount) || 0;
  const hasTax = taxPercent > 0 && isOverstay;
  const itemAmount = isOverstay ? subtotal : total;
  const qty = isOverstay ? Number(invoice.overstayDays) || 0 : 1;
  const rate = isOverstay ? Number(invoice.baseRate) || 0 : total;
  const commodityLabel =
    [invoice.category, invoice.subcategory].filter(Boolean).join(" - ") || "—";
  const storageDetail =
    invoice.invoiceType === "storage" && invoice.details
      ? [formatStorageType(invoice.details.storageType), invoice.details.size]
          .filter(Boolean)
          .join(" • ")
      : "";
  const subLine = [commodityLabel, storageDetail].filter(Boolean).join("  ");
  const num = (n: number, d = 3) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  const date = formatDate(invoice.createdAt);
  const address =
    invoice.invoiceType === "dropoff"
      ? invoice.details?.pickupAddress
      : invoice.details?.deliveryAddress;

  const metaRows: [string, string | number | null | undefined][] = [
    ["Invoice Date", date],
    ["Terms", "Due on Receipt"],
    ["Due Date", date],
    ["Order Number", order?.formNumber],
    ["Commodity", commodityLabel],
    ...(address
      ? ([
          [
            invoice.invoiceType === "dropoff" ? "Pickup Address" : "Address",
            address,
          ],
        ] as [string, string][])
      : []),
    ...(isOverstay
      ? ([["Overstayed", `${invoice.overstayDays ?? 0} day(s)`]] as [
          string,
          string,
        ][])
      : []),
  ];

  const headCell = {
    color: "#fff",
    bgcolor: colors.dark,
    fontWeight: 600,
    fontSize: 12,
    py: 1.25,
    borderBottom: "none",
  };
  const bodyCell = {
    fontSize: 13,
    color: colors.textMain,
    borderColor: "#aaa",
    verticalAlign: "top",
  };

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
        <Typography variant="h6" fontWeight={700} letterSpacing={1}>
          STORAGE & DISTRIBUTION
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 2.5, md: 4 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Box
              component="img"
              src="https://royalgulfshipping.com/wp-content/uploads/2023/08/RGSL-LOGO.png"
              alt="RGSL Logo"
              sx={{ height: 48, objectFit: "contain", mb: 1 }}
            />
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{ color: "#1e1e1e" }}
            >
              {COMPANY.name}
            </Typography>
            {COMPANY.addressLines.map((line) => (
              <Typography
                key={line}
                variant="caption"
                display="block"
                sx={{ color: "#3c3c3c", lineHeight: 1.4 }}
              >
                {line}
              </Typography>
            ))}
          </Box>
          <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
            <Typography
              sx={{ color: colors.gold, fontSize: 30, lineHeight: 1.2 }}
            >
              {title}
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              Invoice# {invoice.invoiceId}
            </Typography>
            <Typography
              variant="caption"
              fontWeight={700}
              display="block"
              sx={{ mt: 2 }}
            >
              Balance Due
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              AED {num(total)}
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          spacing={3}
          sx={{ mb: 3 }}
        >
          <Box sx={{ pt: { sm: 6 } }}>
            <Typography variant="body2" sx={{ color: "#3c3c3c" }}>
              Bill To
            </Typography>
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{ textTransform: "uppercase" }}
            >
              {receiver?.receiverName || "N/A"}
            </Typography>
            {receiver?.receiverContact && (
              <Typography variant="body2" sx={{ color: "#3c3c3c" }}>
                {receiver.receiverContact}
              </Typography>
            )}
          </Box>
          <Box sx={{ minWidth: { sm: 320 } }}>
            {metaRows.map(([label, value]) => (
              <Stack
                key={label}
                direction="row"
                justifyContent="space-between"
                spacing={2}
                sx={{ py: 0.75 }}
              >
                <Typography variant="body2" sx={{ color: "#3c3c3c" }}>
                  {label} :
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "#3c3c3c", textAlign: "right", maxWidth: 200 }}
                >
                  {value === null || value === undefined || value === ""
                    ? "N/A"
                    : value}
                </Typography>
              </Stack>
            ))}
          </Box>
        </Stack>

        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 520 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...headCell, width: 32 }} align="center">
                  #
                </TableCell>
                <TableCell sx={headCell}>Item & Description</TableCell>
                <TableCell sx={headCell} align="right">
                  Qty
                </TableCell>
                <TableCell sx={headCell} align="right">
                  Rate
                </TableCell>
                <TableCell sx={headCell} align="right">
                  Tax
                </TableCell>
                <TableCell sx={headCell} align="right">
                  Amount
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={bodyCell} align="center">
                  1
                </TableCell>
                <TableCell sx={bodyCell}>
                  {meta.description}
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{ color: "#5a5a5a" }}
                  >
                    {subLine}
                  </Typography>
                </TableCell>
                <TableCell sx={bodyCell} align="right">
                  {num(qty, 2)}
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{ color: "#5a5a5a" }}
                  >
                    {isOverstay ? "DAY" : "NO"}
                  </Typography>
                </TableCell>
                <TableCell sx={bodyCell} align="right">
                  {num(rate)}
                </TableCell>
                <TableCell sx={bodyCell} align="right">
                  {hasTax ? num(taxAmount) : "-"}
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{ color: "#5a5a5a" }}
                  >
                    {hasTax ? `${num(taxPercent, 2)}%` : "-"}
                  </Typography>
                </TableCell>
                <TableCell sx={bodyCell} align="right">
                  {num(itemAmount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>

        <Box sx={{ ml: "auto", mt: 1, maxWidth: 360 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{ py: 1, borderBottom: "1px solid #aaa" }}
          >
            <Typography variant="body2" fontWeight={700}>
              Sub Total
            </Typography>
            <Typography variant="body2">{num(itemAmount)}</Typography>
          </Stack>
          {discount > 0 && (
            <Stack
              direction="row"
              justifyContent="space-between"
              sx={{ py: 1 }}
            >
              <Typography variant="body2" fontWeight={700}>
                Discount
              </Typography>
              <Typography variant="body2">- AED {num(discount)}</Typography>
            </Stack>
          )}
          <Stack direction="row" justifyContent="space-between" sx={{ py: 1 }}>
            <Typography variant="body2" fontWeight={700}>
              Total
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              AED {num(total)}
            </Typography>
          </Stack>
          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{ py: 1.25, px: 1.5, bgcolor: colors.light }}
          >
            <Typography variant="body2" fontWeight={700}>
              Balance Due
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              AED {num(total)}
            </Typography>
          </Stack>
        </Box>

        <Typography sx={{ mt: 4, mb: 1, color: "#3c3c3c" }}>
          Tax Summary
        </Typography>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 420 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={headCell}>Tax Details</TableCell>
                <TableCell sx={headCell} align="right">
                  Taxable Amount (AED)
                </TableCell>
                <TableCell sx={headCell} align="right">
                  Tax Amount (AED)
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                [
                  `Standard Rate (${num(taxPercent || 5, 0)}%)`,
                  hasTax ? subtotal : 0,
                  hasTax ? taxAmount : 0,
                  false,
                ],
                ["Exempt", hasTax ? 0 : itemAmount, 0, false],
                ["Total", itemAmount, taxAmount, true],
              ].map(([label, taxable, tax, bold]) => (
                <TableRow key={label as string}>
                  <TableCell sx={{ ...bodyCell, fontWeight: bold ? 700 : 400 }}>
                    {label as string}
                  </TableCell>
                  <TableCell
                    sx={{ ...bodyCell, fontWeight: bold ? 700 : 400 }}
                    align="right"
                  >
                    {num(taxable as number)}
                  </TableCell>
                  <TableCell
                    sx={{ ...bodyCell, fontWeight: bold ? 700 : 400 }}
                    align="right"
                  >
                    {num(tax as number)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        <Typography sx={{ mt: 4, mb: 1, color: "#3c3c3c" }}>Notes</Typography>
        <Typography variant="caption" display="block">
          {meta.note}
        </Typography>
        <Typography variant="caption" display="block" sx={{ mb: 1.5 }}>
          Thanks for your business.
        </Typography>
        {COMPANY.bank.map((line, i) => (
          <Typography
            key={i}
            variant="caption"
            display="block"
            sx={{ minHeight: 14 }}
          >
            {line}
          </Typography>
        ))}

        <Typography sx={{ mt: 4, mb: 1, color: "#3c3c3c" }}>
          Terms & Conditions
        </Typography>
        <Typography variant="caption" display="block">
          Warehousing & Storage Contract.
        </Typography>
        <Typography variant="caption" display="block" sx={{ mb: 1.5 }}>
          Warehouse & Storage Terms & Conditions:
        </Typography>
        <Stack spacing={0.5}>
          {DEFAULT_TERMS.map((term, i) => (
            <Stack key={i} direction="row" spacing={1}>
              <Typography sx={{ fontSize: 11, minWidth: 20 }}>
                {i + 1}.
              </Typography>
              <Typography sx={{ fontSize: 11 }}>{term}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Box
        sx={{
          bgcolor: colors.primary,
          color: "#fff",
          py: 1.5,
          px: 3,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography variant="caption" fontWeight={700}>
          Tel: {COMPANY.phone} | Mob: {COMPANY.mobile}
        </Typography>
        <Typography variant="caption" fontWeight={700}>
          Email: {COMPANY.email}
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

  const handlePay = async (): Promise<void> => {
    if (!invoiceId) return;
    setPayProcessing(true);
    try {
      const res = await fetch(`${API_URL}/invoices/${invoiceId}/ngenius`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
