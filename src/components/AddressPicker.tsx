import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Box,
  TextField,
  Paper,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import GoogleMapReact from "google-map-react";

const API_URL = import.meta.env.VITE_API_URL;
const BROWSER_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;

interface Prediction {
  placeId: string;
  description: string;
}

interface LatLng {
  lat: number;
  lng: number;
}

interface AddressPickerProps {
  label: string;
  value: string;
  onChange: (address: string) => void;
  sx?: object;
}

const MapMarker = (_props: { lat?: number; lng?: number }) => (
  <Box
    sx={{
      width: 16,
      height: 16,
      borderRadius: "50%",
      bgcolor: "#e07b2a",
      border: "2px solid #fff",
      boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
      transform: "translate(-50%, -50%)",
    }}
  />
);

export default function AddressPicker({
  label,
  value,
  onChange,
  sx,
}: AddressPickerProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<LatLng | null>({
    lat: 25.2048,
    lng: 55.2708,
  });
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          setPosition({ lat: 25.2048, lng: 55.2708 });
        },
        { enableHighAccuracy: true, timeout: 5000 },
      );
    } else {
      setPosition({ lat: 25.2048, lng: 55.2708 });
    }
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    onChange(text);
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 3) {
      setPredictions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/address/autocomplete?input=${encodeURIComponent(text)}`,
        );
        const data = await res.json();
        setPredictions(data.predictions || []);
      } catch {
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  const handleMapClick = async ({ lat, lng }: { lat: number; lng: number }) => {
    setPosition({ lat, lng });
    try {
      const res = await fetch(
        `${API_URL}/address/reverse-geocode?lat=${lat}&lng=${lng}`,
      );
      const data = await res.json();
      if (data.success) {
        onChange(data.address.formattedAddress);
      }
    } catch {}
  };

  const handleSelect = async (prediction: Prediction) => {
    setOpen(false);
    setPredictions([]);
    onChange(prediction.description);

    try {
      const res = await fetch(
        `${API_URL}/address/geocode?placeId=${encodeURIComponent(prediction.placeId)}`,
      );
      const data = await res.json();
      if (data.success) {
        onChange(data.address.formattedAddress);
        setPosition({ lat: data.address.lat, lng: data.address.lng });
      }
    } catch {}
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <Box sx={{ position: "relative" }}>
      <TextField
        fullWidth
        required
        multiline
        minRows={2}
        label={label}
        value={value}
        onChange={handleInputChange}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        variant="outlined"
        sx={sx}
        InputProps={{
          endAdornment: loading ? <CircularProgress size={16} /> : null,
        }}
      />
      {open && predictions.length > 0 && (
        <Paper
          elevation={3}
          sx={{
            position: "absolute",
            zIndex: 10,
            top: "100%",
            left: 0,
            right: 0,
            mt: 0.5,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {predictions.map((p) => (
            <MenuItem key={p.placeId} onClick={() => handleSelect(p)}>
              {p.description}
            </MenuItem>
          ))}
        </Paper>
      )}
      {position && (
        <Box
          sx={{
            mt: 2,
            width: "100%",
            height: 260,
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid #e2e8f0",
          }}
        >
          <GoogleMapReact
            bootstrapURLKeys={{ key: BROWSER_KEY }}
            center={position}
            defaultZoom={15}
            onClick={handleMapClick}
          >
            <MapMarker lat={position.lat} lng={position.lng} />
          </GoogleMapReact>
        </Box>
      )}
    </Box>
  );
}
