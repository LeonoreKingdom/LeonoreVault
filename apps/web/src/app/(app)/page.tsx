'use client';

import { useAuthStore } from '@/stores/auth';
import { Package, MapPin, Tag, ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, membership } = useAuthStore();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">
          Welcome back,{' '}
          <span className="from-primary to-accent bg-gradient-to-r bg-clip-text text-transparent">
            {user?.displayName || 'there'}
          </span>{' '}
          👋
        </h1>
        <p className="text-muted mt-1">
          {membership
            ? "Here's an overview of your household inventory."
            : 'Get started by creating or joining a household.'}
        </p>
      </div>

      {/* Quick Actions */}
      {membership ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={<Package size={22} />} label="Total Items" value="—" color="primary" />
            <StatCard icon={<Tag size={22} />} label="Categories" value="—" color="accent" />
            <StatCard icon={<MapPin size={22} />} label="Locations" value="—" color="success" />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/items"
              className="border-border bg-surface hover:border-primary/30 group flex items-center justify-between rounded-2xl border p-5 transition-all duration-300 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110">
                  <Package size={22} />
                </div>
                <div>
                  <p className="font-semibold">Browse Items</p>
                  <p className="text-muted text-sm">View and search your inventory</p>
                </div>
              </div>
              <ArrowRight
                size={18}
                className="text-muted group-hover:text-primary transition-all group-hover:translate-x-1"
              />
            </Link>

            <Link
              href="/items/new"
              className="border-border hover:border-accent/50 bg-surface group flex items-center justify-between rounded-2xl border border-dashed p-5 transition-all duration-300 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="bg-accent/10 text-accent flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110">
                  <Plus size={22} />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Add New Item</p>
                  <p className="text-muted text-sm">Track a new belonging</p>
                </div>
              </div>
              <ArrowRight
                size={18}
                className="text-muted group-hover:text-accent transition-all group-hover:translate-x-1"
              />
            </Link>
          </div>
        </>
      ) : (
        /* No Household CTA */
        <div className="border-border bg-surface flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center">
          <div className="from-primary/20 to-accent/20 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br">
            <Package size={32} className="text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-bold">No Household Yet</h2>
          <p className="text-muted mb-6 max-w-md">
            Create a new household to start tracking your belongings, or join an existing one with
            an invite code.
          </p>
          <div className="flex gap-3">
            <button className="from-primary to-accent rounded-xl bg-gradient-to-r px-5 py-2.5 font-medium text-white shadow-md transition-opacity hover:opacity-90">
              Create Household
            </button>
            <button className="border-border text-foreground hover:bg-hover rounded-xl border px-5 py-2.5 font-medium transition-colors">
              Join with Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'primary' | 'accent' | 'success';
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
  };

  return (
    <div className="border-border bg-surface flex items-center gap-4 rounded-2xl border p-5 transition-shadow hover:shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-muted text-sm">{label}</p>
      </div>
    </div>
  );
}
