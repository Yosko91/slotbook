import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await signOut();
    navigate("/login");
  }

  return (
    <>
      <header>
        <strong>SlotBook</strong>
        <nav>
          {user?.role === "STUDENT" && (
            <>
              <Link to="/slots">Find a session</Link>
              <Link to="/bookings">My bookings</Link>
            </>
          )}
          {user?.role === "STAFF" && <Link to="/staff">My schedules</Link>}
        </nav>
        <span className="who">
          {user?.name} ({user?.role === "STAFF" ? "Tutor" : "Student"})
        </span>
        <button onClick={onLogout}>Log out</button>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
