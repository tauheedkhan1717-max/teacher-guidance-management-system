// Route table for the whole app.
//   Public:    /  /login  /register  /teacher-register
//   Protected: /dashboard (role redirect) · /admin-dashboard (ADMIN) ·
//              /teacher-dashboard (TEACHER) · /student-dashboard (STUDENT) ·
//              /notices (any role) · /groups (TEACHER, ADMIN)
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
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
import BulkActionsPage from "./pages/BulkActionsPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import TasksPage from "./pages/TasksPage.jsx";
import StudentGroupsPage from "./pages/StudentGroupsPage.jsx";
import GroupsPage from "./pages/GroupsPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <Toaster position="bottom-right" toastOptions={{ className: 'glass-toast' }} />
      <ErrorBoundary>
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
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
            <Route path="/student-dashboard" element={<ProtectedRoute roles={["STUDENT"]}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student-groups" element={<ProtectedRoute roles={["STUDENT"]}><StudentGroupsPage /></ProtectedRoute>} />
            <Route path="/notices" element={<ProtectedRoute><NoticeBoard /></ProtectedRoute>} />
            <Route path="/bulk" element={<ProtectedRoute roles={["TEACHER", "ADMIN"]}><BulkActionsPage /></ProtectedRoute>} />
            <Route path="/groups" element={<ProtectedRoute roles={["TEACHER", "ADMIN"]}><GroupsPage /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </AuthProvider>
    </ThemeProvider>
  );
}