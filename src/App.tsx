import { Routes, Route, BrowserRouter } from "react-router-dom";
import KycRGSL from "./pages/KycForm";
import KycMF from "./pages/KycFormMf";
import KycCAS from "./pages/KycFormCas";
import BookingConfirmationForm from "./pages/BookingConfirmationForm";
import Unauthorized from "./pages/Unauthorized";
import InvoicePaymentForm from "./pages/InvoicePaymentForm";
import DeliveryRequestForm from "./pages/DeliveryRequestPage";
import StoragePurchaseForm from "./pages/StoragePurchaseForm";
import DropOffRequestForm from "./pages/DropOffForm";
import { ToastContainer } from "react-toastify";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="rgsl/:zohoId/:formId" element={<KycRGSL />} />
        <Route path="messiah-freight/:zohoId/:formId" element={<KycMF />} />
        <Route path="cas/:zohoId/:formId" element={<KycCAS />} />
        <Route
          path="booking-confirmation/:formId/:type"
          element={<BookingConfirmationForm />}
        />
        <Route
          path="/invoice-payment/:invoiceId"
          element={<InvoicePaymentForm />}
        />
        <Route
          path="/request-delivery/:itemRef"
          element={<DeliveryRequestForm />}
        />
        <Route
          path="/purchase-storage/:itemRef"
          element={<StoragePurchaseForm />}
        />
        <Route
          path="/drop-off-request/:itemRef"
          element={<DropOffRequestForm />}
        />
        <Route path="unauthorized" element={<Unauthorized />} />
      </Routes>
      <ToastContainer stacked position="bottom-right" theme="dark" />
    </BrowserRouter>
  );
}
