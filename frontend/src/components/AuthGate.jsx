import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { C } from "../theme";

export default function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: C.pageBg }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `4px solid ${C.line}`, borderTopColor: C.accent, animation: "spin 0.9s linear infinite" }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
