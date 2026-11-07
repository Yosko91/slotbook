import { Navigate, Route, Routes } from "react-router-dom";
import { homeFor, useAuth } from "./auth";
import Layout from "./components/Layout";
import RoleGuard from "./components/RoleGuard";
import BookingDetail from "./pages/BookingDetail";
import FindSession from "./pages/FindSession";
import Login from "./pages/Login";
import MyBookings from "./pages/MyBookings";
import StaffSchedules from "./pages/StaffSchedules";

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <p className="loading">Loading...</p>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor(user)} /> : <Login />} />
      <Route element={user ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/slots" element={<RoleGuard role="STUDENT"><FindSession /></RoleGuard>} />
        <Route path="/bookings" element={<RoleGuard role="STUDENT"><MyBookings /></RoleGuard>} />
        <Route path="/bookings/:id" element={<BookingDetail />} />
        <Route path="/staff" element={<RoleGuard role="STAFF"><StaffSchedules /></RoleGuard>} />
      </Route>
      <Route path="*" element={<Navigate to={user ? homeFor(user) : "/login"} />} />
    </Routes>
  );
}
