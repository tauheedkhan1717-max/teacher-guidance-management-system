// Route table for the whole app.
//   Public:    /  /login  /register  /teacher-register
//   Protected: /dashboard (role redirect) · /admin-dashboard (ADMIN) ·
//              /teacher-dashboard (TEACHER) · /student-dashboard (STUDENT) ·
//              /notices (any role)
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import TeacherRegister from "./pages/TeacherRegister.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import TeacherDashboard from "./pages/TeacherDashboard.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import NoticeBoard from "./pages/NoticeBoard.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/teacher-register" element={<TeacherRegister />} />
          <Route path="/admin-dashboard" element={<ProtectedRoute roles={["ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/teacher-dashboard" element={<ProtectedRoute roles={["TEACHER"]}><TeacherDashboard /></ProtectedRoute>} />

          {/* Any authenticated user — /dashboard redirects by role */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/student-dashboard" element={<ProtectedRoute roles={["STUDENT"]}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/notices" element={<ProtectedRoute><NoticeBoard /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}