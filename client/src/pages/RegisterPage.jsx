import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    rollNumber: "",
    yearOfAdmission: "",
    phone: "",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const fieldError = (field) =>
    errors[field] ? (
      <p className="mt-1 text-xs text-red-600">{errors[field]}</p>
    ) : null;

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Full name is required.";
    if (!form.email.trim()) errs.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errs.email = "Enter a valid email address.";
    if (!form.password) errs.password = "Password is required.";
    else if (form.password.length < 6)
      errs.password = "Password must be at least 6 characters.";
    if (!form.confirmPassword) errs.confirmPassword = "Confirm your password.";
    else if (form.confirmPassword !== form.password)
      errs.confirmPassword = "Passwords do not match.";
    if (!form.rollNumber.trim())
      errs.rollNumber = "Roll number / student ID is required.";

    if (!form.yearOfAdmission) {
      errs.yearOfAdmission = "Year of admission is required";
    } else if (!/^\d{4}$/.test(String(form.yearOfAdmission).trim())) {
      errs.yearOfAdmission = "Enter a 4-digit year (e.g. 2025).";
    }

    return errs;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setErrors({});

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        rollNumber: form.rollNumber.trim(),
        yearOfAdmission: Number(form.yearOfAdmission),
        phone: form.phone || undefined,
      };

      await api.post("/auth/register", payload);
      navigate("/login", { state: { message: "Registration successful! Please log in." } });
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error?.message;
      if (status === 429) {
        setServerError("Too many attempts. Please wait 15 minutes before trying again.");
      } else if (message) {
        setServerError(message);
      } else {
        setServerError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 animate-fade-in-up">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border-white/20 dark:border-slate-800 p-6 shadow-md">
        <h2 className="text-2xl font-bold text-slate-800">Create your student account</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Your profile becomes visible to teachers as soon as you register.</p>

        {serverError && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="name">Full name</label>
            <input id="name" type="text" value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
            {fieldError("name")}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
            {fieldError("email")}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">Password</label>
              <input id="password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
              {fieldError("password")}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="confirmPassword">Confirm password</label>
              <input id="confirmPassword" type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
              {fieldError("confirmPassword")}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="rollNumber">Roll number / Student ID</label>
              <input id="rollNumber" type="text" value={form.rollNumber} onChange={(e) => set("rollNumber", e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
              {fieldError("rollNumber")}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="yearOfAdmission">Year of admission</label>
              <input id="yearOfAdmission" type="number" value={form.yearOfAdmission || ""} onChange={(e) => set("yearOfAdmission", e.target.value)} placeholder="2025" className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
              {fieldError("yearOfAdmission")}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="phone">Phone (optional)</label>
            <input id="phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-md bg-indigo-600 py-2 text-white font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account? <Link to="/login" className="text-indigo-600 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}