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

interface SizeOption {
  key: string;
  label: string;
  rate: number;
}

const DEFAULT_RATE_PER_CARTON = 1.0;

const MAX_DURATION_DAYS = 30;

interface ItemDetails {
  category: string | null;
  subcategory: string | null;
  totalNumber: number | null;
  weight: number | null;
  receiverName: string | null;
  customerRef: string | null;
}

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

export default function StoragePurchaseForm() {
  const { itemRef } = useParams<{ itemRef: string }>();

  const [durationDays, setDurationDays] = useState<number>(1);
  const [durationDaysInput, setDurationDaysInput] = useState<string>("1");
  const [category, setCategory] = useState<string>("");
  const [subcategory, setSubcategory] = useState<string>("");
  const [requiredFrom, setRequiredFrom] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(0);
  const [quantityInput, setQuantityInput] = useState<string>("0");
  const [ratePerCarton, setRatePerCarton] = useState<number>(
    DEFAULT_RATE_PER_CARTON,
  );

  const [sizeOptions, setSizeOptions] = useState<SizeOption[]>([]);
  const [sizeKey, setSizeKey] = useState<string>("");

  const [itemDetails, setItemDetails] = useState<ItemDetails | null>(null);
  const [itemLoading, setItemLoading] = useState<boolean>(true);
  const [itemError, setItemError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const maxQuantity = itemDetails?.totalNumber ?? 0;

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!itemRef) return;

    const fetchItem = async () => {
      setItemLoading(true);
      setItemError(null);
      try {
        const res = await fetch(`${API_URL}/storage/${itemRef}`);
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

        setItemDetails({
          category: data.item.category,
          subcategory: data.item.subcategory,
          totalNumber: data.item.totalNumber,
          weight: data.item.weight,
          receiverName: data.item.receiverName,
          customerRef: data.item.receiverRef,
        });
        const initialQty = data.item.totalNumber ?? 0;
        setQuantity(initialQty);
        setQuantityInput(String(initialQty));
        setCategory(data.item.category ?? "");
        setSubcategory(data.item.subcategory ?? "");
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

  // Fetch dynamic rates: base carton/day rate + all "Storage Size" options
  useEffect(() => {
    let cancelled = false;

    const fetchRates = async () => {
      try {
        const res = await fetch(`${API_URL}/options/system-settings`);
        if (!res.ok) return;
        const data = await res.json();
        const all = data.data || [];

        const storageRate = all.find(
          (s: { key: string }) => s.key === "storage_rate",
        );
        if (!cancelled && storageRate) {
          setRatePerCarton(Number(storageRate.value));
        }

        const sizes: SizeOption[] = all
          .filter((s: { category: string }) => s.category === "Storage Size")
          .map((s: { key: string; label: string; value: string }) => ({
            key: s.key,
            label: s.label,
            rate: Number(s.value),
          }));

        if (!cancelled) {
          setSizeOptions(sizes);
          setSizeKey((prev) => prev || (sizes.length ? sizes[0].key : ""));
        }
      } catch {
        // silently ignore — form still usable with default carton rate, empty size options
      }
    };

    fetchRates();
    return () => {
      cancelled = true;
    };
  }, []);

  const clampQuantity = (value: number): number => {
    if (Number.isNaN(value)) return 0;
    if (value < 0) return 0;
    if (maxQuantity && value > maxQuantity) return maxQuantity;
    return Math.floor(value);
  };

  const commitQuantity = (value: number): void => {
    const clamped = clampQuantity(value);
    setQuantity(clamped);
    setQuantityInput(String(clamped));
  };

  const handleQuantityInputChange = (
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    const raw = event.target.value;
    if (raw === "" || /^\d+$/.test(raw)) {
      const clamped = raw === "" ? 0 : clampQuantity(parseInt(raw, 10));
      setQuantityInput(raw === "" ? "" : String(clamped));
      setQuantity(clamped);
    }
  };

  const handleQuantityInputBlur = (): void => {
    const parsed = parseInt(quantityInput, 10);
    commitQuantity(Number.isNaN(parsed) ? 0 : parsed);
  };

  const clampDurationDays = (value: number): number => {
    if (Number.isNaN(value)) return 0;
    if (value < 0) return 0;
    if (value > MAX_DURATION_DAYS) return MAX_DURATION_DAYS;
    return Math.floor(value);
  };

  const handleDurationDaysInputChange = (
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    const raw = event.target.value;
    if (raw === "" || /^\d+$/.test(raw)) {
      const clamped = raw === "" ? 0 : clampDurationDays(parseInt(raw, 10));
      setDurationDaysInput(raw === "" ? "" : String(clamped));
      setDurationDays(clamped);
    }
  };

  const handleDurationDaysInputBlur = (): void => {
    const parsed = parseInt(durationDaysInput, 10);
    const clamped = clampDurationDays(Number.isNaN(parsed) ? 0 : parsed);
    setDurationDays(clamped);
    setDurationDaysInput(String(clamped));
  };

  const selectedSize = useMemo(
    () => sizeOptions.find((s) => s.key === sizeKey) ?? null,
    [sizeOptions, sizeKey],
  );

  const amount = useMemo<number>(() => {
    const cartonCost = quantity * ratePerCarton * durationDays;
    const sizeCost = (selectedSize?.rate ?? 0) * durationDays;
    return cartonCost + sizeCost;
  }, [quantity, durationDays, ratePerCarton, selectedSize]);

  const isFormValid = useMemo<boolean>(() => {
    return Boolean(
      itemRef &&
      quantity > 0 &&
      (!maxQuantity || quantity <= maxQuantity) &&
      sizeKey &&
      category.trim() &&
      subcategory.trim() &&
      requiredFrom &&
      durationDays > 0,
    );
  }, [
    itemRef,
    quantity,
    maxQuantity,
    sizeKey,
    category,
    subcategory,
    requiredFrom,
    durationDays,
  ]);

  async function submitStoragePurchase() {
    const res = await fetch(`${API_URL}/storage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerRef: itemDetails?.customerRef,
        shipmentRef: itemRef,
        storage: Number(quantity),
        sizeKey,
        sizeLabel: selectedSize?.label ?? null,
        category: category.trim(),
        subcategory: subcategory.trim(),
        requiredFrom,
        durationDays,
        notes: notes.trim() || null,
        amount,
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

    if (!isFormValid) {
      if (maxQuantity && quantity > maxQuantity) {
        toast.error(
          `Quantity to store can't exceed the item total of ${maxQuantity}.`,
        );
      } else {
        toast.error("Please fill in all required fields.");
      }
      return;
    }

    setSubmitting(true);
    try {
      await submitStoragePurchase();
      toast.success("Storage purchase submitted successfully.");
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit storage purchase", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to submit the storage purchase.",
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
                  Purchase Storage
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
                  Extended Storage Request
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
            Please review the item details and select the storage duration and
            quantity before confirming payment.
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
                  title="Storage Duration & Quantity"
                  subtitle="Tell us what you need to store, from when, and for how long"
                />
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, lg: 4 }}>
                    <TextField
                      select
                      fullWidth
                      label="Storage Size"
                      value={sizeKey}
                      onChange={(e) => setSizeKey(e.target.value)}
                      variant="outlined"
                      sx={fieldSx}
                    >
                      {sizeOptions.map((s) => (
                        <MenuItem key={s.key} value={s.key}>
                          {s.label} (AED {s.rate.toFixed(2)})
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, lg: 4 }}>
                    <TextField
                      fullWidth
                      label="Category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      sx={fieldSx}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, lg: 4 }}>
                    <TextField
                      fullWidth
                      label="Subcategory"
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      sx={fieldSx}
                      disabled
                    />
                  </Grid>
                  <Grid size={{ xs: 12, lg: 4 }}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Required From"
                      value={requiredFrom}
                      onChange={(e) => setRequiredFrom(e.target.value)}
                      slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: { min: today },
                      }}
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, lg: 4 }}>
                    <TextField
                      fullWidth
                      label="Expected Duration (Days)"
                      value={durationDaysInput}
                      onChange={handleDurationDaysInputChange}
                      onBlur={handleDurationDaysInputBlur}
                      inputProps={{
                        inputMode: "numeric",
                        pattern: "[0-9]*",
                        style: { fontWeight: 600 },
                      }}
                      sx={fieldSx}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: colors.textMuted,
                        mt: 0.5,
                        display: "block",
                      }}
                    >
                      Max {MAX_DURATION_DAYS} days
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, lg: 4 }}>
                    <TextField
                      fullWidth
                      value={quantityInput}
                      onChange={handleQuantityInputChange}
                      onBlur={handleQuantityInputBlur}
                      label="Quantity to Store"
                      inputProps={{
                        inputMode: "numeric",
                        pattern: "[0-9]*",
                        style: { fontWeight: 600 },
                      }}
                      sx={fieldSx}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: colors.textMuted,
                        mt: 0.5,
                        display: "block",
                      }}
                    >
                      {maxQuantity > 0
                        ? `Max ${maxQuantity} cartons (item total)`
                        : "cartons"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      label="Notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
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
                  title="Cost Summary"
                  subtitle="Review the charges for this storage purchase"
                />
                <Stack
                  spacing={1.5}
                  sx={{
                    px: 2,
                    py: 1.5,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 2,
                    bgcolor: "#fafbfc",
                  }}
                >
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color={colors.textMuted}>
                      Total Quantity of Item
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {quantity}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color={colors.textMuted}>
                      Cost per day
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      AED {ratePerCarton.toFixed(2)} per carton
                    </Typography>
                  </Stack>
                  {selectedSize && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color={colors.textMuted}>
                        Storage Size ({selectedSize.label})
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        AED {selectedSize.rate.toFixed(2)} per day
                      </Typography>
                    </Stack>
                  )}
                </Stack>
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
                    Total Cost (Estimated)
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={800}
                    color={colors.primary}
                  >
                    AED {amount.toFixed(2)}
                  </Typography>
                </Stack>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    mt: 1,
                    color: colors.danger,
                    fontWeight: 500,
                  }}
                >
                  * This is an estimated amount only. The final amount will be
                  confirmed once our team assigns the storage type for your
                  shipment. Each type carries its own rate, which will be added
                  to this total.
                </Typography>
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
                    By submitting, you confirm that the storage details provided
                    are accurate.
                  </Typography>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={!isFormValid || submitting}
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
                    {submitting ? "Processing..." : "Confirm Storage Purchase"}
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
