import { Routes, Route } from "react-router-dom";
import KycRGSL from "./pages/KycForm";
import KycMF from "./pages/KycFormMf";
import KycCAS from "./pages/KycFormCas";
import Unauthorized from "./pages/Unauthorized";

export default function App() {
  return (
    <Routes>
      <Route path="rgsl/:zohoId/:formId" element={<KycRGSL />} />
      <Route path="messiah-freight/:zohoId/:formId" element={<KycMF />} />
      <Route path="cas/:zohoId/:formId" element={<KycCAS />} />
      <Route path="unauthorized" element={<Unauthorized />} />
    </Routes>
  );
}
