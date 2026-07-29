import { Routes, Route } from "react-router-dom";
import KycSubmissionPage from "./pages/KycForm";

export default function App() {
  return (
    <Routes>
      <Route path="/:zohoId/:seed" element={<KycSubmissionPage />} />
    </Routes>
  );
}
