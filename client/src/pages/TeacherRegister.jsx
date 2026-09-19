// Teacher register — invite-only, secure. Inline validation, server error display, loading state, then redirect.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import api from "../api/axios";

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = "Name is required.";
  if (!values.email) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Enter a valid email address.";
  if (!values.department.trim()) errors.department = "Department is required.";
  if (!values.inviteCode.trim()) errors.inviteCode = "Invite code is required.";
  if (!values.password) errors.password = "Password is required.";
  else if (values.password.length < 8) errors.password = "Password must be at least 8 characters.";
  return errors;
}

export default function TeacherRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", department: "", inviteCode: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setServerError("");
    try {
      await api.post("/auth/register-teacher", {
        name: form.name.trim(),
        email: form.email.trim(),
        department: form.department.trim(),
        inviteCode: form.inviteCode.trim(),
        password: form.password,
      });
      navigate("/login", {
        state: { registrationSuccess: "Teacher account created. Please log in." },
      });
    } catch (err) {
      setServerError(err?.response?.data?.error?.message || "Registration failed. Please verify your invite code and details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950 px-4 animate-fade-in-up">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 border-white/20 dark:border-slate-800 p-8 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
          <GraduationCap className="h-7 w-7 text-indigo-600" />
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold text-slate-900 dark:text-white">Teacher Registration</h1>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
          Invite-only. Contact the Administrator if you do not have an invite code.
        </p>

        {serverError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Dr. Jane Doe"
              disabled={loading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60 transition-all duration-200"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@college.edu"
              disabled={loading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60 transition-all duration-200"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="department" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Department
            </label>
            <input
              id="department"
              type="text"
              name="department"
              value={form.department}
              onChange={handleChange}
              placeholder="Electronics Engineering"
              disabled={loading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60 transition-all duration-200"
            />
            {errors.department && <p className="mt-1 text-xs text-red-600">{errors.department}</p>}
          </div>

          <div>
            <label htmlFor="inviteCode" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Invite Code
            </label>
            <input
              id="inviteCode"
              type="text"
              name="inviteCode"
              value={form.inviteCode}
              onChange={handleChange}
              placeholder="e.g. ABC-DEF-123"
              disabled={loading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60 transition-all duration-200"
            />
            {errors.inviteCode && <p className="mt-1 text-xs text-red-600">{errors.inviteCode}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={loading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60 transition-all duration-200"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Registering…" : "Register as Teacher"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Back to{" "}
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}