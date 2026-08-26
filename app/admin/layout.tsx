import { AdminNav } from '@/components/admin/admin-shared';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="space-y-8"><AdminNav />{children}</div>;
}
