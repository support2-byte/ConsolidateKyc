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
  ArrowBack as ArrowBackIcon,
  Visibility as PreviewIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { useBookingOrder } from "../hooks/useBookingOrder";
import { generateBookingConfirmationHtml } from "../documents/bookingConfirmationGenerator";

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
  passportNumber: string;
  emiratesId: string;
  tradeLicenseNumber: string;
  expectedDate: string;
}

interface UploadedDoc {
  name: string;
  sizeLabel: string;
  kind: "pdf" | "image";
  file: File;
}

const initialForm: FormState = {
  passportNumber: "",
  emiratesId: "",
  tradeLicenseNumber: "",
  expectedDate: "",
};

type UploadKind = "passport" | "emirates" | "tradeLicense";

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const cropCanvasToContent = (source: HTMLCanvasElement): HTMLCanvasElement => {
  const ctx = source.getContext("2d");
  if (!ctx) return source;

  const { width, height } = source;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      // ignore transparent AND near-white pixels (canvas bg fill)
      if (alpha > 10) {
        const r = data[(y * width + x) * 4];
        const g = data[(y * width + x) * 4 + 1];
        const b = data[(y * width + x) * 4 + 2];
        const isNearWhite = r > 240 && g > 240 && b > 240;
        if (!isNearWhite) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }

  if (!found) return source;

  const padding = 10;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width, maxX + padding);
  maxY = Math.min(height, maxY + padding);

  const cropped = document.createElement("canvas");
  cropped.width = maxX - minX;
  cropped.height = maxY - minY;
  const croppedCtx = cropped.getContext("2d");
  if (!croppedCtx) return source;

  croppedCtx.drawImage(
    source,
    minX,
    minY,
    maxX - minX,
    maxY - minY,
    0,
    0,
    maxX - minX,
    maxY - minY,
  );

  return cropped;
};

type Step = "form" | "preview";

export default function BookingConfirmationForm() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { formId, type } = useParams<{
    formId: string;
    type: string;
  }>();

  const {
    loading: orderLoading,
    error: orderError,
    alreadySubmitted,
    participantRole,
    participantName,
    company,
    order,
  } = useBookingOrder(formId, type);

  const [step, setStep] = useState<Step>("form");

  const [form, setForm] = useState<FormState>(initialForm);
  const [passportDoc, setPassportDoc] = useState<UploadedDoc | null>(null);
  const [emiratesDoc, setEmiratesDoc] = useState<UploadedDoc | null>(null);
  const [tradeLicenseDoc, setTradeLicenseDoc] = useState<UploadedDoc | null>(
    null,
  );
  const [dragTarget, setDragTarget] = useState<UploadKind | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string | null>(
    null,
  );
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const [otp, setOtp] = useState<string>("");
  const [otpVerified, setOtpVerified] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string | null>(null);

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
    context.strokeStyle = "#000000";
    context.fillStyle = colors.cardBg;
    context.fillRect(0, 0, width, height);

    setHasSignature(false);
  };

  useEffect(() => {
    if (step !== "form") return;
    resetCanvas();
    window.addEventListener("resize", resetCanvas);
    return () => window.removeEventListener("resize", resetCanvas);
  }, [step]);

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

  const applyFile = (file: File, type: UploadKind): void => {
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
    else if (type === "emirates") setEmiratesDoc(doc);
    else setTradeLicenseDoc(doc);
  };

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
    type: UploadKind,
  ): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    applyFile(file, type);
    event.target.value = "";
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
    type: UploadKind,
  ): void => {
    event.preventDefault();
    setDragTarget(null);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    applyFile(file, type);
  };

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>,
    type: UploadKind,
  ): void => {
    event.preventDefault();
    setDragTarget(type);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragTarget(null);
  };

  const removeFile = (type: UploadKind) => {
    if (type === "passport") setPassportDoc(null);
    else if (type === "emirates") setEmiratesDoc(null);
    else setTradeLicenseDoc(null);
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

    const value = (participantName || "").trim();
    if (!value) {
      toast.warning("Your name is unavailable to generate a signature.");
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

    context.fillStyle = "#000000";
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

  const isFormValid = useMemo<boolean>(() => {
    return Boolean(form.passportNumber && form.expectedDate && hasSignature);
  }, [form.passportNumber, form.expectedDate, hasSignature]);

  const goToPreview = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (!form.passportNumber || !form.expectedDate) {
      toast.error("Please fill in all the required fields.");
      return;
    }
    if (!hasSignature) {
      toast.error("Please provide your signature before continuing.");
      return;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const cropped = cropCanvasToContent(canvas);
      setSignaturePreviewUrl(cropped.toDataURL("image/png"));
      cropped.toBlob((blob) => {
        if (blob) {
          setSignatureFile(
            new File([blob], "signature.png", { type: "image/png" }),
          );
        }
      }, "image/png");
    }
    setStep("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backToForm = (): void => {
    setStep("form");
    setOtp("");
    setOtpVerified(false);
    setOtpError(null);
    setSignatureFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const verifyOtp = async (): Promise<boolean> => {
    if (!otp.trim()) {
      setOtpError("Please enter the OTP sent to your email.");
      return false;
    }
    setOtpError(null);
    try {
      const res = await fetch(`${API_URL}/booking/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId, type, otp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.verified) {
        throw new Error(data.message || "Invalid or expired OTP.");
      }
      setOtpVerified(true);
      return true;
    } catch (error) {
      setOtpError(
        error instanceof Error ? error.message : "Invalid or expired OTP.",
      );
      return false;
    }
  };

  async function submitBookingConfirmation(): Promise<void> {
    if (!signatureFile) {
      throw new Error(
        "Unable to capture signature. Please go back and redraw it.",
      );
    }

    const body = new FormData();
    body.append("formId", formId!);
    body.append("type", type!);
    body.append("passportNumber", form.passportNumber);
    body.append("emiratesId", form.emiratesId);
    body.append("tradeLicenseNumber", form.tradeLicenseNumber);
    body.append("expectedDate", form.expectedDate);
    body.append("otp", otp);
    body.append("signature", signatureFile, "signature.png");
    if (passportDoc)
      body.append("passportDocument", passportDoc.file, passportDoc.name);
    if (emiratesDoc)
      body.append("emiratesDocument", emiratesDoc.file, emiratesDoc.name);
    if (tradeLicenseDoc)
      body.append(
        "tradeLicenseDocument",
        tradeLicenseDoc.file,
        tradeLicenseDoc.name,
      );

    const res = await fetch(`${API_URL}/booking`, {
      method: "POST",
      body,
    });

    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: "Submission failed." }));
      throw new Error(err.message || "Submission failed.");
    }
  }

  const handleVerifyAndSubmit = async (): Promise<void> => {
    if (!otp.trim()) {
      setOtpError("Please enter the OTP sent to your email.");
      return;
    }
    setSubmitting(true);
    try {
      const isVerified = otpVerified || (await verifyOtp());
      if (!isVerified) {
        return;
      }
      await submitBookingConfirmation();
      toast.success("Booking confirmation submitted successfully.");
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit booking confirmation", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to submit the booking confirmation.",
      );
    } finally {
      setSubmitting(false);
    }
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

  const UploadZone = ({
    type,
    label,
    doc,
  }: {
    type: UploadKind;
    label: string;
    doc: UploadedDoc | null;
  }) => {
    const isDragActive = dragTarget === type;
    const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  if (!formId || !type) {
    return (
      <Alert severity="error" sx={{ m: 4 }}>
        Invalid or incomplete link. Please use the link sent to your email.
      </Alert>
    );
  }

  if (orderLoading) {
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

  if (orderError) {
    return (
      <Alert severity="error" sx={{ m: 4 }}>
        {orderError}
      </Alert>
    );
  }

  if (alreadySubmitted || submitted) {
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
            {submitted ? "Booking Confirmation Submitted" : "Already Submitted"}
          </Typography>
          <Typography variant="body2" color={colors.textMuted}>
            {submitted
              ? "Thank you. Your booking confirmation has been received and is now on record."
              : "This booking confirmation has already been submitted and is under review. If you believe this is an error, please contact the company that sent you this link."}
          </Typography>
        </Paper>
      </Box>
    );
  }

  const previewHtml = generateBookingConfirmationHtml(order, company, {
    passportNumber: form.passportNumber,
    emiratesId: form.emiratesId,
    tradeLicenseNumber: form.tradeLicenseNumber,
    expectedDate: form.expectedDate,
    signatureDataUrl: signaturePreviewUrl,
    participantRole,
  });

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
                  Booking Confirmation & Acceptance
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
                  {step === "form"
                    ? "Complete Your Details"
                    : "Review & Submit"}
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
          {step === "form" ? (
            <>
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
                Please ensure all information matches your official documents
                exactly. Fields marked with * are mandatory.
              </Alert>

              <form onSubmit={goToPreview}>
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
                      title="Booking Summary"
                      subtitle="Details of the shipment as recorded"
                    />
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="caption" color={colors.textMuted}>
                          Sender
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {order?.senderName || "—"}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="caption" color={colors.textMuted}>
                          Receiver
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {order?.receiverName || "—"}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="caption" color={colors.textMuted}>
                          Mode
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {order?.mode || "—"}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="caption" color={colors.textMuted}>
                          Items
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {order?.items?.length || 0} item(s)
                        </Typography>
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
                      title="Identification"
                      subtitle={`Your government ID details, ${
                        participantName ||
                        "as the " +
                          (participantRole === "sender" ? "sender" : "receiver")
                      }`}
                    />
                    <Grid container spacing={2.5}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          required
                          label="Passport Number"
                          name="passportNumber"
                          value={form.passportNumber}
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
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Emirates ID Number (Optional)"
                          name="emiratesId"
                          value={form.emiratesId}
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
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Trade License Number (Optional)"
                          name="tradeLicenseNumber"
                          value={form.tradeLicenseNumber}
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
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          required
                          type="date"
                          label="Expected Ship Date"
                          name="expectedDate"
                          value={form.expectedDate}
                          onChange={handleChange}
                          variant="outlined"
                          InputLabelProps={{ shrink: true }}
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
                      <Grid size={{ xs: 12, md: 4 }}>
                        <UploadZone
                          type="passport"
                          label="Passport Copy"
                          doc={passportDoc}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <UploadZone
                          type="emirates"
                          label="Emirates ID Copy (Optional)"
                          doc={emiratesDoc}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <UploadZone
                          type="tradeLicense"
                          label="Trade License Copy (Optional)"
                          doc={tradeLicenseDoc}
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
                          <Typography
                            variant="caption"
                            color={colors.textMuted}
                          >
                            *Signature is mandatory
                          </Typography>
                          <Button
                            size="small"
                            color="inherit"
                            onClick={clearSignature}
                            startIcon={<ClearIcon />}
                            sx={{
                              textTransform: "none",
                              color: colors.textMuted,
                            }}
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
                          Click below to use your registered name (
                          <strong>{participantName || "—"}</strong>) as a
                          stylized signature.
                        </Typography>
                        <Button
                          variant="contained"
                          onClick={applyTypedSignature}
                          disabled={!participantName}
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
                        You'll be able to review the final document before it's
                        submitted.
                      </Typography>
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={!isFormValid}
                        startIcon={<PreviewIcon />}
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
                        Review Document
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </form>
            </>
          ) : (
            <>
              <Alert
                severity="warning"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                }}
              >
                Please review the document below carefully before submitting.
                This action cannot be undone.
              </Alert>

              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 4 },
                  borderRadius: 3,
                  border: `1px solid ${otpVerified ? colors.success : colors.border}`,
                  bgcolor: otpVerified ? "#f0fdf4" : colors.cardBg,
                  mb: 4,
                }}
              >
                <SectionHeader
                  title="Verify Your Identity"
                  subtitle="Enter the OTP that was emailed to you along with this link"
                />

                {otpVerified ? (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <CheckIcon sx={{ color: colors.success }} />
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="#166534"
                    >
                      OTP verified. You're ready to submit.
                    </Typography>
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <Typography variant="body2" color={colors.textMuted}>
                      Enter the OTP sent to{" "}
                      <strong>
                        {(participantRole === "sender"
                          ? order?.senderEmail
                          : order?.receiverEmail) || "your email"}
                      </strong>
                      .
                    </Typography>
                    <TextField
                      size="small"
                      label="OTP"
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value);
                        setOtpError(null);
                      }}
                      error={Boolean(otpError)}
                      helperText={otpError || " "}
                      sx={{ maxWidth: { sm: 220 } }}
                    />
                  </Stack>
                )}
              </Paper>

              <Paper
                elevation={3}
                sx={{
                  width: "100%",
                  overflow: "auto",
                  bgcolor: "#fff",
                  mb: 4,
                  "& .container": {
                    boxShadow: "none !important",
                    border: "none !important",
                    margin: "0 !important",
                  },
                }}
              >
                <Box dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </Paper>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems="center"
                spacing={2}
                sx={{ pb: 4 }}
              >
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={backToForm}
                  disabled={submitting}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderColor: colors.border,
                    color: colors.textMain,
                  }}
                >
                  Back & Edit
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleVerifyAndSubmit}
                  disabled={submitting || !otp.trim()}
                  startIcon={
                    submitting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <SendIcon />
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
                  {submitting ? "Verifying & Submitting..." : "Verify & Submit"}
                </Button>
              </Stack>
            </>
          )}
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
