'use client';

import { useRouter } from 'next/navigation';
import MyOrdersPage from '@/components/orders/MyOrdersPage';

export default function OrdersRoute() {
    const router = useRouter();
    return (
        <div className="min-h-screen bg-gray-50">
            <MyOrdersPage onViewOrder={(id) => router.push(`/orders/${id}`)} />
        </div>
    );
}
