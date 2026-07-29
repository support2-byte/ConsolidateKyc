import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type PointerEvent,
  type DragEvent,
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
  IconButton,
  Chip,
} from "@mui/material";
import {
  Send as SendIcon,
  Clear as ClearIcon,
  CloudUpload as UploadIcon,
  Draw as DrawIcon,
  CheckCircle as CheckIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL;

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

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
  customerName: string;
  phoneNumber: string;
  emailAddress: string;
  address: string;
  emiratesId: string;
  passportNumber: string;
  tradeLicenseNumber: string;
}

interface UploadedDoc {
  name: string;
  sizeLabel: string;
  kind: "pdf" | "image";
  file: File;
}

const initialForm: FormState = {
  customerName: "",
  phoneNumber: "",
  emailAddress: "",
  address: "",
  emiratesId: "",
  passportNumber: "",
  tradeLicenseNumber: "",
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function KycSubmissionPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { zohoId, seed } = useParams<{ zohoId: string; seed: string }>();

  const [customerLoading, setCustomerLoading] = useState<boolean>(true);
  const [customerError, setCustomerError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(initialForm);
  const [passportDoc, setPassportDoc] = useState<UploadedDoc | null>(null);
  const [emiratesDoc, setEmiratesDoc] = useState<UploadedDoc | null>(null);
  const [dragTarget, setDragTarget] = useState<"passport" | "emirates" | null>(
    null,
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);

  const resetCanvas = (): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 620;
    const height = rect.height || 200;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const context = canvas.getContext("2d");
    if (!context) return;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = colors.primary;
    context.fillStyle = colors.cardBg;
    context.fillRect(0, 0, width, height);

    setHasSignature(false);
  };

  useEffect(() => {
    resetCanvas();
    window.addEventListener("resize", resetCanvas);
    return () => window.removeEventListener("resize", resetCanvas);
  }, []);

  useEffect(() => {
    if (!zohoId) return;

    const fetchCustomer = async () => {
      setCustomerLoading(true);
      setCustomerError(null);
      try {
        const res = await fetch(`${API_URL}/internal/customer/${zohoId}`);
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "Customer not found."
              : "Failed to load customer details.",
          );
        }
        const data = await res.json();
        const customer = data.customer;

        setForm((prev) => ({
          ...prev,
          customerName: customer.contactName || "",
          emailAddress: customer.email || "",
          phoneNumber: customer.phoneNumber || "",
          address: customer.address || "",
        }));
      } catch (err) {
        setCustomerError(
          err instanceof Error
            ? err.message
            : "Failed to load customer details.",
        );
      } finally {
        setCustomerLoading(false);
      }
    };

    fetchCustomer();
  }, [zohoId]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Only PDF, JPG, or PNG files are accepted.";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return "File exceeds the 5MB size limit.";
    }
    return null;
  };

  const applyFile = (file: File, type: "passport" | "emirates"): void => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    const doc: UploadedDoc = {
      name: file.name,
      sizeLabel: formatFileSize(file.size),
      kind: file.type === "application/pdf" ? "pdf" : "image",
      file,
    };
    if (type === "passport") setPassportDoc(doc);
    else setEmiratesDoc(doc);
  };

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
    type: "passport" | "emirates",
  ): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    applyFile(file, type);
    event.target.value = "";
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
    type: "passport" | "emirates",
  ): void => {
    event.preventDefault();
    setDragTarget(null);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    applyFile(file, type);
  };

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>,
    type: "passport" | "emirates",
  ): void => {
    event.preventDefault();
    setDragTarget(type);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragTarget(null);
  };

  const removeFile = (type: "passport" | "emirates") => {
    if (type === "passport") setPassportDoc(null);
    else setEmiratesDoc(null);
  };

  const getCanvasPosition = (
    event: PointerEvent<HTMLCanvasElement>,
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>): void => {
    const point = getCanvasPosition(event);
    if (!point) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (!isDrawing) return;
    const point = getCanvasPosition(event);
    if (!point) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stopDrawing = (): void => setIsDrawing(false);

  const clearSignature = (): void => resetCanvas();

  const applyTypedSignature = async (): Promise<void> => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context || !canvas) return;

    const value = form.customerName.trim();
    if (!value) {
      toast.warning("Please enter your name in the Customer Name field first.");
      return;
    }

    await document.fonts.load("64px 'Dancing Script'");
    await document.fonts.ready;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 620;
    const height = rect.height || 200;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(
      window.devicePixelRatio || 1,
      0,
      0,
      window.devicePixelRatio || 1,
      0,
      0,
    );
    context.fillStyle = colors.cardBg;
    context.fillRect(0, 0, width, height);

    context.fillStyle = colors.primary;
    context.textAlign = "center";
    context.textBaseline = "middle";

    let fontSize = 72;
    while (fontSize > 24) {
      context.font = `700 ${fontSize}px 'Dancing Script', cursive`;
      if (context.measureText(value).width <= width * 0.8) break;
      fontSize -= 2;
    }

    context.fillText(value, width / 2, height / 2);

    setHasSignature(true);
    toast.success("Signature applied successfully.");
  };

  async function submitKycForm(
    form: FormState,
    passportDoc: UploadedDoc | null,
    emiratesDoc: UploadedDoc | null,
    signatureFile: File,
    zohoId: string,
    seed: string,
  ) {
    const body = new FormData();
    body.append("customerRef", zohoId);
    body.append("seed", seed);
    body.append("name", form.customerName);
    body.append("email", form.emailAddress);
    body.append("phone", form.phoneNumber);
    body.append("address", form.address);
    body.append("emiratesId", form.emiratesId);
    body.append("passportNumber", form.passportNumber);
    body.append("tradeLicense", form.tradeLicenseNumber);
    body.append("signature", signatureFile, "signature.png");
    if (passportDoc)
      body.append("passport", passportDoc.file, passportDoc.name);
    if (emiratesDoc)
      body.append("emiratesId", emiratesDoc.file, emiratesDoc.name);

    const res = await fetch(`${API_URL}/internal/submit-kyc`, {
      method: "POST",
      body,
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

    if (!form.emiratesId || !form.passportNumber) {
      toast.error("Please fill in all the required fields.");
      return;
    }
    if (!hasSignature) {
      toast.error("Please provide your signature before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const signatureBlob: Blob | null = await new Promise((resolve) =>
        canvasRef.current?.toBlob((blob) => resolve(blob), "image/png"),
      );
      if (!signatureBlob) {
        toast.error("Unable to capture signature. Please redraw it.");
        setSubmitting(false);
        return;
      }
      const signatureFile = new File([signatureBlob], "signature.png", {
        type: "image/png",
      });

      await submitKycForm(
        form,
        passportDoc,
        emiratesDoc,
        signatureFile,
        zohoId!,
        seed!,
      );
      toast.success("KYC submitted successfully.");
      setForm(initialForm);
      setPassportDoc(null);
      setEmiratesDoc(null);
      resetCanvas();
    } catch (error) {
      console.error("Failed to submit KYC form", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to submit the KYC form.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = useMemo<boolean>(() => {
    return Boolean(form.emiratesId && form.passportNumber && hasSignature);
  }, [form.emiratesId, form.passportNumber, hasSignature]);

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

  const UploadZone = ({
    type,
    label,
    doc,
  }: {
    type: "passport" | "emirates";
    label: string;
    doc: UploadedDoc | null;
  }) => {
    const isDragActive = dragTarget === type;
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // CHANGE: added
    const handleZoneClick = (): void => {
      fileInputRef.current?.click();
    };

    if (doc) {
      const FileTypeIcon = doc.kind === "pdf" ? PdfIcon : ImageIcon;
      return (
        <Box
          sx={{
            height: 180,
            border: `1px solid ${colors.success}`,
            borderRadius: 2,
            bgcolor: "#f0fdf4",
            p: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          <IconButton
            size="small"
            onClick={() => removeFile(type)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: colors.textMuted,
              "&:hover": { color: colors.danger, bgcolor: "#fee2e2" },
            }}
          >
            <ClearIcon fontSize="small" />
          </IconButton>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: "50%",
              bgcolor: "#dcfce7",
              mb: 1,
            }}
          >
            <FileTypeIcon sx={{ fontSize: 22, color: colors.success }} />
          </Box>
          <Typography
            variant="body2"
            fontWeight={600}
            color="#166534"
            sx={{
              textAlign: "center",
              px: 2,
              wordBreak: "break-all",
              lineHeight: 1.3,
            }}
          >
            {doc.name}
          </Typography>
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{ mt: 0.5 }}
          >
            <CheckIcon sx={{ fontSize: 14, color: colors.success }} />
            <Typography variant="caption" color={colors.textMuted}>
              {doc.sizeLabel} · Uploaded
            </Typography>
          </Stack>
        </Box>
      );
    }

    return (
      <Box
        onClick={handleZoneClick}
        onDrop={(e: DragEvent<HTMLDivElement>) => handleDrop(e, type)}
        onDragOver={(e: DragEvent<HTMLDivElement>) => handleDragOver(e, type)}
        onDragLeave={handleDragLeave}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 180,
          border: `2px dashed ${isDragActive ? colors.accent : colors.border}`,
          borderRadius: 2,
          bgcolor: isDragActive ? "#eff6ff" : "#f8fafc",
          cursor: "pointer",
          transition: "all 0.15s ease",
          transform: isDragActive ? "scale(1.01)" : "scale(1)",
          "&:hover": {
            borderColor: colors.accent,
            bgcolor: "#eff6ff",
          },
        }}
      >
        <UploadIcon
          sx={{
            fontSize: 36,
            color: isDragActive ? colors.accent : colors.textMuted,
            mb: 1,
          }}
        />
        <Typography variant="body2" fontWeight={600} color={colors.textMain}>
          {isDragActive ? "Drop to upload" : `Upload ${label}`}
        </Typography>
        <Typography
          variant="caption"
          color={colors.textMuted}
          sx={{ mt: 0.25 }}
        >
          Drag & drop or click to browse
        </Typography>
        <Typography variant="caption" color={colors.textMuted}>
          Max 5MB (PDF, JPG, PNG)
        </Typography>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/*,.pdf"
          onChange={(e) => handleFileChange(e, type)}
        />
      </Box>
    );
  };

  if (!zohoId || !seed) {
    return (
      <Alert severity="error" sx={{ m: 4 }}>
        Invalid or incomplete link. Please use the link sent to your email.
      </Alert>
    );
  }

  if (customerLoading) {
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

  if (customerError) {
    return (
      <Alert severity="error" sx={{ m: 4 }}>
        {customerError}
      </Alert>
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
              {/* Logo */}
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
                  Customer Onboarding
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
                  Know Your Customer (KYC) Verification
                </Typography>
              </Box>
            </Stack>
            <Chip
              label="Secure Form"
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
            Please ensure all information matches the official documents
            exactly. Fields marked with * are mandatory.
          </Alert>

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
                  title="Personal & Contact Details"
                  subtitle="Individual information of the authorized representative"
                />
                <Grid container spacing={2.5}>
                  {[
                    { name: "customerName", label: "Full Legal Name", md: 6 },
                    { name: "phoneNumber", label: "Phone Number", md: 6 },
                    {
                      name: "emailAddress",
                      label: "Email Address",
                      md: 6,
                      type: "email",
                    },
                    { name: "address", label: "Address", md: 6 },
                  ].map((field) => (
                    <Grid key={field.name} size={{ xs: 12, md: field.md }}>
                      <TextField
                        fullWidth
                        required
                        label={field.label}
                        name={field.name}
                        value={form[field.name as keyof FormState]}
                        onChange={handleChange}
                        type={field.type || "text"}
                        variant="outlined"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor: "#fafbfc",
                            "&:hover": { bgcolor: "#fff" },
                            "&.Mui-focused": { bgcolor: "#fff" },
                          },
                          "& .MuiInputLabel-root.Mui-focused": {
                            color: colors.accent,
                          },
                        }}
                      />
                    </Grid>
                  ))}
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
                  title="Identification & Registration"
                  subtitle="Government and trade ID details"
                />
                <Grid container spacing={2.5}>
                  {[
                    {
                      name: "emiratesId",
                      label: "Emirates ID Number",
                      md: 4,
                    },
                    {
                      name: "passportNumber",
                      label: "Passport Number",
                      md: 4,
                    },
                    {
                      name: "tradeLicenseNumber",
                      label: "Trade License Number",
                      md: 4,
                    },
                  ].map((field) => (
                    <Grid key={field.name} size={{ xs: 12, md: field.md }}>
                      <TextField
                        fullWidth
                        required
                        label={field.label}
                        name={field.name}
                        value={form[field.name as keyof FormState]}
                        onChange={handleChange}
                        variant="outlined"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            bgcolor: "#fafbfc",
                            "&:hover": { bgcolor: "#fff" },
                            "&.Mui-focused": { bgcolor: "#fff" },
                          },
                          "& .MuiInputLabel-root.Mui-focused": {
                            color: colors.accent,
                          },
                        }}
                      />
                    </Grid>
                  ))}
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
                  title="Document Uploads"
                  subtitle="Clear, colored scans or photos (PDF, JPG, PNG) — drag & drop supported"
                />
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <UploadZone
                      type="passport"
                      label="Passport Copy"
                      doc={passportDoc}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <UploadZone
                      type="emirates"
                      label="Emirates ID Copy"
                      doc={emiratesDoc}
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
                  title="Digital Signature"
                  subtitle="Draw or generate your official signature"
                />

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    gap: 3,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Paper
                      elevation={0}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        overflow: "hidden",
                        position: "relative",
                        borderColor: hasSignature
                          ? colors.success
                          : colors.border,
                      }}
                    >
                      {!hasSignature && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            pointerEvents: "none",
                            opacity: 0.4,
                            zIndex: 1,
                          }}
                        >
                          <DrawIcon sx={{ fontSize: 36, mb: 0.5 }} />
                          <Typography variant="body2">
                            Draw your signature here
                          </Typography>
                        </Box>
                      )}
                      <canvas
                        ref={canvasRef}
                        width={620}
                        height={200}
                        style={{
                          width: "100%",
                          display: "block",
                          touchAction: "none",
                          cursor: "crosshair",
                        }}
                        onPointerDown={startDrawing}
                        onPointerMove={draw}
                        onPointerUp={stopDrawing}
                        onPointerLeave={stopDrawing}
                      />
                    </Paper>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      sx={{ mt: 1 }}
                    >
                      <Typography variant="caption" color={colors.textMuted}>
                        *Signature is mandatory
                      </Typography>
                      <Button
                        size="small"
                        color="inherit"
                        onClick={clearSignature}
                        startIcon={<ClearIcon />}
                        sx={{ textTransform: "none", color: colors.textMuted }}
                      >
                        Clear Pad
                      </Button>
                    </Stack>
                  </Box>

                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{ display: { xs: "none", md: "block" } }}
                  />

                  <Box
                    sx={{
                      flex: { xs: 1, md: 0.4 },
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      gutterBottom
                    >
                      Auto-Generate Signature
                    </Typography>
                    <Typography
                      variant="body2"
                      color={colors.textMuted}
                      sx={{ mb: 2, fontSize: "0.875rem" }}
                    >
                      Click below to use the <strong>Full Legal Name</strong>{" "}
                      provided above as a stylized signature.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={applyTypedSignature}
                      disabled={!form.customerName.trim()}
                      startIcon={<DrawIcon />}
                      sx={{
                        borderRadius: 2,
                        textTransform: "none",
                        fontWeight: 600,
                        bgcolor: colors.primary,
                        "&:hover": { bgcolor: "#145f55" },
                        "&.Mui-disabled": {
                          bgcolor: colors.border,
                          color: colors.textMuted,
                        },
                      }}
                    >
                      Apply Typed Signature
                    </Button>
                  </Box>
                </Box>
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
                    By submitting, you confirm that the information provided is
                    accurate.
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
                    {submitting ? "Processing..." : "Submit KYC Form"}
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </form>
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
