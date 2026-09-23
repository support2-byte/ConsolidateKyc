import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  MenuItem,
} from "@mui/material";
import {
  Send as SendIcon,
  CheckCircle as CheckIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import AddressPicker from "../components/AddressPicker";

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
};

interface FormState {
  customerRef: string;
  customerName: string;
  contactNumber: string;
  pickupAddress: string;
  shipmentRef: string;
  zone: string;
  pickupDate: string;
}

interface ItemDetails {
  category: string | null;
  subcategory: string | null;
  totalNumber: number | null;
  weight: number | null;
  senderName: string | null;
}

const initialForm: FormState = {
  customerRef: "",
  customerName: "",
  contactNumber: "",
  pickupAddress: "",
  shipmentRef: "",
  zone: "",
  pickupDate: "",
};

interface PickupZone {
  key: string;
  label: string;
  amount: number;
}

const todayISO = (): string => new Date().toISOString().split("T")[0];

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

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    bgcolor: "#fafbfc",
    "&:hover": { bgcolor: "#fff" },
    "&.Mui-focused": { bgcolor: "#fff" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: colors.accent },
};

export default function DropOffRequestForm() {
  const { itemRef } = useParams<{ itemRef: string }>();

  const [form, setForm] = useState<FormState>(initialForm);
  const [itemDetails, setItemDetails] = useState<ItemDetails | null>(null);

  const [itemLoading, setItemLoading] = useState<boolean>(true);
  const [itemError, setItemError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [pickupZones, setPickupZones] = useState<PickupZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!itemRef) return;

    const fetchItem = async () => {
      setItemLoading(true);
      setItemError(null);
      try {
        const res = await fetch(`${API_URL}/drop-off/${itemRef}`);
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "Item not found."
              : "Failed to load item details.",
          );
        }
        const data = await res.json();

        if (data.alreadySubmitted) {
          setSubmitted(true);
          return;
        }

        setItemDetails(data.item);
        setForm((prev) => ({
          ...prev,
          customerRef: data.item.senderRef || "",
          contactNumber: data.item.senderContact || "",
          customerName: data.item.senderName || "",
          pickupAddress: data.item.senderAddress || "",
          shipmentRef: itemRef,
        }));
      } catch (err) {
        setItemError(
          err instanceof Error ? err.message : "Failed to load item details.",
        );
      } finally {
        setItemLoading(false);
      }
    };

    fetchItem();
  }, [itemRef]);

  useEffect(() => {
    let cancelled = false;

    const fetchZones = async () => {
      setZonesLoading(true);
      try {
        const res = await fetch(`${API_URL}/options/system-settings`);
        if (!res.ok) return;
        const data = await res.json();
        const zones = (data.data || [])
          .filter((s: { category: string }) => s.category === "pickup_zone")
          .sort(
            (a: { sort_order: number }, b: { sort_order: number }) =>
              (a.sort_order ?? 0) - (b.sort_order ?? 0),
          )
          .map(
            (s: { key: string; label: string; value: string }): PickupZone => ({
              key: s.key,
              label: s.label,
              amount: Number(s.value),
            }),
          );
        if (!cancelled) setPickupZones(zones);
      } catch {
      } finally {
        if (!cancelled) setZonesLoading(false);
      }
    };

    fetchZones();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const selectedZone = useMemo(
    () => pickupZones.find((zone) => zone.key === form.zone) || null,
    [form.zone, pickupZones],
  );

  const pickupAmount = selectedZone?.amount ?? 0;

  const isFormValid = useMemo<boolean>(() => {
    return Boolean(
      form.customerRef.trim() &&
      form.customerName.trim() &&
      form.contactNumber.trim() &&
      form.pickupAddress.trim() &&
      form.shipmentRef.trim() &&
      form.pickupDate.trim() &&
      pickupAmount > 0,
    );
  }, [form, pickupAmount]);

  async function submitDropOffRequest(form: FormState, amount: number) {
    const res = await fetch(`${API_URL}/drop-off`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerRef: form.customerRef,
        customerName: form.customerName,
        shipmentRef: form.shipmentRef,
        pickupAddress: form.pickupAddress,
        contactNumber: form.contactNumber,
        pickupAmount: amount,
        pickupDate: form.pickupDate,
        zone: form.zone,
      }),
    });

    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: "Submission failed." }));
      throw new Error(err.message || "Submission failed.");
    }

    return res.json();
  }

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    console.log(form);

    if (!isFormValid) {
      toast.error(
        "Please fill in all the required fields and select a pickup zone.",
      );
      return;
    }

    setSubmitting(true);
    try {
      await submitDropOffRequest(form, pickupAmount);
      toast.success("Drop-off request submitted successfully.");
      setSubmitted(true);
      setForm((prev) => ({ ...initialForm, shipmentRef: prev.shipmentRef }));
    } catch (error) {
      console.error("Failed to submit drop-off request", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to submit the drop-off request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!itemRef) {
    return (
      <Alert severity="error" sx={{ m: 4 }}>
        Invalid or incomplete link. Please use the link sent for this item.
      </Alert>
    );
  }

  if (itemLoading) {
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

  if (itemError) {
    return (
      <Alert severity="error" sx={{ m: 4 }}>
        {itemError}
      </Alert>
    );
  }

  if (submitted) {
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
            Storage Request Received
          </Typography>
          <Typography variant="body2" color={colors.textMuted}>
            Thank you. Your storage request for item {itemRef} has been
            submitted.
          </Typography>
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
                  Drop-off Request
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
                  Sender Pickup Scheduling
                </Typography>
              </Box>
            </Stack>
            <Chip
              label="Internal Form"
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
            Please verify the pickup address and contact details before
            submitting. Fields marked with * are mandatory.
          </Alert>

          {itemDetails && (
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                mb: 4,
                borderRadius: 3,
                border: `1px solid ${colors.border}`,
                bgcolor: "#fafbfc",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: colors.textMuted,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Item Reference: {itemRef}
              </Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color={colors.textMuted}>
                    Category
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {itemDetails.category || "—"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color={colors.textMuted}>
                    Subcategory
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {itemDetails.subcategory || "—"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color={colors.textMuted}>
                    Total Number
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {itemDetails.totalNumber ?? "—"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color={colors.textMuted}>
                    Weight
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {itemDetails.weight ?? "—"} KG
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
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
                  title="Sender Details"
                  subtitle="Who the pickup driver should contact"
                />
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      required
                      label="Customer Name"
                      name="customerName"
                      value={form.customerName}
                      onChange={handleChange}
                      variant="outlined"
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      required
                      label="Contact Number"
                      name="contactNumber"
                      value={form.contactNumber}
                      onChange={handleChange}
                      variant="outlined"
                      sx={fieldSx}
                    />
                  </Grid>
                </Grid>
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
                  title="Pickup Address"
                  subtitle="Full address where the shipment will be collected"
                />
                <AddressPicker
                  label="Pickup Address"
                  value={form.pickupAddress}
                  onChange={(address) =>
                    setForm((prev) => ({ ...prev, pickupAddress: address }))
                  }
                  sx={fieldSx}
                />
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
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <SectionHeader
                      title="Pickup Schedule"
                      subtitle="Preferred date for the pickup"
                    />
                    <TextField
                      fullWidth
                      required
                      label="Pickup Date"
                      name="pickupDate"
                      value={form.pickupDate}
                      onChange={handleChange}
                      type="date"
                      variant="outlined"
                      slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: { min: todayISO() },
                      }}
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <SectionHeader
                      title="Pickup Zone"
                      subtitle="Determines the pickup charge"
                    />
                    <TextField
                      fullWidth
                      required
                      select
                      label="Pickup Zone"
                      name="zone"
                      value={form.zone}
                      onChange={handleChange}
                      variant="outlined"
                      sx={fieldSx}
                    >
                      {zonesLoading ? (
                        <MenuItem value="" disabled>
                          Loading zones...
                        </MenuItem>
                      ) : pickupZones.length === 0 ? (
                        <MenuItem value="" disabled>
                          No zones available
                        </MenuItem>
                      ) : (
                        pickupZones.map((zone) => (
                          <MenuItem key={zone.key} value={zone.key}>
                            {zone.label} — AED {zone.amount.toFixed(2)}
                          </MenuItem>
                        ))
                      )}
                    </TextField>
                    <Divider sx={{ my: 2 }} />
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        color={colors.textMain}
                      >
                        Pickup Amount
                      </Typography>
                      <Typography
                        variant="subtitle1"
                        fontWeight={800}
                        color={colors.primary}
                      >
                        AED {pickupAmount.toFixed(2)}
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>

              <Box sx={{ pt: 2, pb: 4 }}>
                <Divider sx={{ mb: 4 }} />
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={2}
                >
                  <Typography
                    variant="caption"
                    color={colors.textMuted}
                    sx={{ order: { xs: 2, sm: 1 } }}
                  >
                    By submitting, you confirm that the pickup details provided
                    are accurate.
                  </Typography>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={submitting}
                    startIcon={
                      submitting ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <SendIcon />
                      )
                    }
                    sx={{
                      order: { xs: 1, sm: 2 },
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
                    {submitting ? "Processing..." : "Submit Drop-off Request"}
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </form>
        </Box>
      </Container>

      <Box sx={{ bgcolor: colors.primary, color: "white", py: 3, mt: "auto" }}>
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
