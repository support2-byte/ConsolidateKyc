import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export interface InvoiceDetails {
  storageType?: string | null;
  size?: string | null;
  quantity?: number | null;
  requiredFrom?: string | null;
  durationDays?: number | null;
  notes?: string | null;
  deliveryContact?: string | null;
  deliveryAddress?: string | null;
  deliveryOptions?: string[];
  contactNumber?: string | null;
  pickupAddress?: string | null;
  pickupDate?: string | null;
  zone?: string | null;
}

export interface InvoiceRecord {
  invoiceId: string;
  invoiceType: "overstayed" | "storage" | "delivery" | "dropoff";
  amount: number;
  status: string;
  createdAt: string;
  shipmentId: string;
  category: string | null;
  subcategory: string | null;
  overstayDays: number | null;
  baseRate: number | null;
  taxPercent: number | null;
  subtotal: number | null;
  discount: number | null;
  details?: InvoiceDetails | null;
}

export interface OrderRecord {
  bookingRef: string | null;
  formNumber: string | null;
}

export interface ReceiverRecord {
  receiverName: string;
  receiverContact: string;
  receiverEmail: string;
}

export interface CompanyRecord {
  company: string;
  logoUrl: string;
}

interface UseInvoicePaymentResult {
  loading: boolean;
  error: string | null;
  alreadyPaid: boolean;
  invoice: InvoiceRecord | null;
  order: OrderRecord | null;
  receiver: ReceiverRecord | null;
  company: CompanyRecord | null;
}

export function useInvoicePayment(invoiceId?: string): UseInvoicePaymentResult {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadyPaid, setAlreadyPaid] = useState<boolean>(false);
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [receiver, setReceiver] = useState<ReceiverRecord | null>(null);
  const [company, setCompany] = useState<CompanyRecord | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      setError("Invalid or incomplete link.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/invoices/${invoiceId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || "Unable to load invoice.");
        }
        if (cancelled) return;
        setInvoice(data.invoice);
        setOrder(data.order);
        setReceiver(data.receiver);
        setCompany(data.company);
        setAlreadyPaid(data.invoice?.status === "paid");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load invoice.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  return {
    loading,
    error,
    alreadyPaid,
    invoice,
    order,
    receiver,
    company,
  };
}
