import { Navigate, Route, Routes } from "react-router-dom";
import { homeFor, useAuth } from "./auth";
import Layout from "./components/Layout";
import RoleGuard from "./components/RoleGuard";
import Login from "./pages/Login";

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <p className="loading">Loading...</p>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor(user)} /> : <Login />} />
      <Route element={user ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/slots" element={<RoleGuard role="STUDENT"><p>Find a session (F-03)</p></RoleGuard>} />
        <Route path="/staff" element={<RoleGuard role="STAFF"><p>My schedules (F-02)</p></RoleGuard>} />
      </Route>
      <Route path="*" element={<Navigate to={user ? homeFor(user) : "/login"} />} />
    </Routes>
  );
}
