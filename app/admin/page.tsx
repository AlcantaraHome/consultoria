import { redirect } from 'next/navigation';
import { currentAdmin } from '@/lib/admin-auth';
import Dashboard from './dashboard';
import './admin.css';
export default async function AdminHome() {
  const admin = await currentAdmin();
  if (!admin) redirect('/admin/login');
  return <Dashboard adminEmail={admin.email} />;
}
