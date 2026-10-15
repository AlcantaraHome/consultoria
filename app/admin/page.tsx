
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/admin-auth";
import Dashboard from "./dashboard";
import "./admin.css";

async function AdminContent() {
  const admin = await currentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return <Dashboard adminEmail={admin.email} />;
}

export default function AdminHome() {
  return (
    <Suspense
      fallback={
        <main className="admin-login-shell">
          <p>Verificando acesso ao painel...</p>
        </main>
      }
    >
      <AdminContent />
    </Suspense>
  );
}
