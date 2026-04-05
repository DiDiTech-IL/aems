import { AppLayout } from '@/components/layout/app-layout';

export default function DashboardGroupTemplate({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
