import { OrdersList } from './OrderDraftButton';
import GovDashboard from './GovDashboard';

export const dynamic = 'force-static';
export const revalidate = false;

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <section className="briefing-card">
        <div className="flex items-start gap-4">
          <span className="seal seal-lg" aria-hidden><span style={{ fontSize: 28 }}>⚖️</span></span>
          <div className="flex-1">
            <h2 className="font-display text-2xl text-ink">行政命令 · Executive Orders</h2>
            <p className="text-ink/80 mt-2 leading-relaxed">
              在此管理草案、发布生效、撤回命令。发布后效果立即应用到政府状态。
            </p>
          </div>
        </div>
      </section>
      <GovDashboard />
      <OrdersList />
    </div>
  );
}
