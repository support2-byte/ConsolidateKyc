import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL as string;

type CompanySlug = "RGSL" | "MF" | "CAS";

interface KycCustomer {
  customerName: string;
  emailAddress: string;
  phoneNumber: string;
  address: string;
}

interface UseKycCustomerResult {
  loading: boolean;
  error: string | null;
  customer: KycCustomer | null;
}

export function useKycCustomer(
  zohoId: string | undefined,
  seed: string | undefined,
  company: CompanySlug,
): UseKycCustomerResult {
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<KycCustomer | null>(null);

  useEffect(() => {
    if (!zohoId || !seed || !company) return;

    const fetchCustomer = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${API_URL}/internal/customer/${zohoId}?seed=${encodeURIComponent(seed)}&company=${encodeURIComponent(company)}`,
        );

        if (res.status === 403) {
          navigate("/unauthorized", { replace: true });
          return;
        }

        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "Customer not found."
              : "Failed to load customer details.",
          );
        }

        const data = await res.json();
        const c = data.customer;

        setCustomer({
          customerName: c.contactName ?? "",
          emailAddress: c.email ?? "",
          phoneNumber: c.phoneNumber ?? "",
          address: c.address ?? "",
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load customer details.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [zohoId, seed, company, navigate]);

  return { loading, error, customer };
}
