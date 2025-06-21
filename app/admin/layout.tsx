// app/admin/layout.tsx - Admin Layout ที่ใช้ DashboardLayout
import DashboardLayout from '@/components/DashboardLayout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}