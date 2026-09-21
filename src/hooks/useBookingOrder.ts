import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL as string;

export interface BookingOrderItem {
  qty: string;
  weight: string;
  category: string;
  subcategory: string;
  type: string;
  portOfLoading: string;
  portOfDestination: string;
}

export interface BookingCompany {
  company: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface BookingOrder {
  mode: string;
  senderName: string;
  senderAddress: string;
  senderContact: string;
  senderEmail: string;
  receiverName: string;
  receiverAddress: string;
  receiverContact: string;
  receiverEmail: string;
  receiverCompany: string;
  items: BookingOrderItem[];
}

export type ParticipantRole = "sender" | "receiver";

interface UseBookingOrderResult {
  loading: boolean;
  error: string | null;
  alreadySubmitted: boolean;
  participantRole: ParticipantRole | null;
  participantName: string | null;
  company: BookingCompany | null;
  order: BookingOrder | null;
}

export function useBookingOrder(
  formId: string | undefined,
  type: string | undefined,
): UseBookingOrderResult {
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState<boolean>(false);
  const [participantRole, setParticipantRole] =
    useState<ParticipantRole | null>(null);
  const [participantName, setParticipantName] = useState<string | null>(null);
  const [company, setCompany] = useState<BookingCompany | null>(null);
  const [order, setOrder] = useState<BookingOrder | null>(null);

  useEffect(() => {
    if (!formId || !type) return;

    const fetchOrder = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_URL}/booking/${formId}/${type}`);

        if (res.status === 403) {
          navigate("/unauthorized", { replace: true });
          return;
        }

        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "Booking order not found."
              : "Failed to load booking order details.",
          );
        }

        const data = await res.json();

        setAlreadySubmitted(Boolean(data.alreadySubmitted));
        setParticipantRole(data.participantRole ?? null);
        setParticipantName(data.participantName ?? null);
        setCompany(data.company ?? null);
        setOrder(data.order ?? null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load booking order details.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [formId, type, navigate]);

  return {
    loading,
    error,
    alreadySubmitted,
    participantRole,
    participantName,
    company,
    order,
  };
}
