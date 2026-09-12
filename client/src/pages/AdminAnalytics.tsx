import { motion } from 'framer-motion';
import { BarChart3, Building2, CalendarDays, TrendingUp, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

type AnalyticsData = {
    popularVenues: { name: string; count: number }[];
    busiestClubs: { name: string; count: number }[];
    busiestClubsEvents: { name: string; count: number }[];
    bookingsByMonth: { month: string; count: number }[];
};

const AdminAnalytics: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const result = await apiRequest<AnalyticsData>('/api/admin/analytics');
                setData(result);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch analytics');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-error/10 p-4 text-error">
                    <BarChart3 size={32} />
                </div>
                <h2 className="mb-2 text-xl font-bold text-textPrimary">Failed to load analytics</h2>
                <p className="text-textSecondary">{error}</p>
            </div>
        );
    }

    const maxMonthCount = Math.max(...data.bookingsByMonth.map(m => m.count), 1);
    const maxVenueCount = Math.max(...data.popularVenues.map(v => v.count), 1);
    const maxClubCount = Math.max(...data.busiestClubs.map(c => c.count), 1);
    const maxClubEventsCount = Math.max(...data.busiestClubsEvents.map(c => c.count), 1);

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-textPrimary">Analytics Dashboard</h1>
                <p className="text-textSecondary mt-1">Platform usage and engagement metrics</p>
            </div>



            <div className="grid gap-6 lg:grid-cols-3">
                {/* Bookings by Month (Bar Chart representation) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl border border-borderSoft bg-card p-6 shadow-sm lg:col-span-3"
                >
                    <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-textPrimary">
                        <BarChart3 className="text-brand" size={20} />
                        Bookings Trend (Last 6 Months)
                    </h3>
                    
                    {data.bookingsByMonth.length === 0 ? (
                        <p className="text-textSecondary text-center py-8">No data available</p>
                    ) : (
                        <div className="flex h-64 items-end justify-between gap-2 sm:gap-6 pt-10">
                            {data.bookingsByMonth.map((item, i) => (
                                <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-2 h-full">
                                    <div className="relative flex w-full max-w-[4rem] flex-col items-center justify-end h-full">
                                        <div 
                                            className="absolute text-textPrimary text-sm font-bold z-10 pointer-events-none transition-all"
                                            style={{ bottom: `calc(${(item.count / maxMonthCount) * 100}% + 4px)` }}
                                        >
                                            {item.count > 0 ? item.count : ''}
                                        </div>
                                        <div 
                                            className="w-full rounded-t-md bg-brand/80 transition-all group-hover:bg-brand"
                                            style={{ height: `${(item.count / maxMonthCount) * 100}%`, minHeight: item.count > 0 ? '4px' : '0' }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-textSecondary text-center truncate w-full">{item.month.split(' ')[0]}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Popular Venues */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-2xl border border-borderSoft bg-card p-6 shadow-sm"
                >
                    <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-textPrimary">
                        <Building2 className="text-brand" size={20} />
                        Most Booked Venues
                    </h3>
                    
                    <div className="space-y-5 max-h-[300px] overflow-y-auto pr-2">
                        {data.popularVenues.length === 0 ? (
                            <p className="text-textSecondary text-center py-4">No data available</p>
                        ) : (
                            data.popularVenues.map((venue, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-textPrimary">{venue.name}</span>
                                        <span className="font-bold text-textSecondary">{venue.count}</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-borderSoft/50">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(venue.count / maxVenueCount) * 100}%` }}
                                            transition={{ duration: 1, delay: 0.4 + (i * 0.1) }}
                                            className="h-full rounded-full bg-brand"
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Busiest Clubs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-2xl border border-borderSoft bg-card p-6 shadow-sm"
                >
                    <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-textPrimary">
                        <Users className="text-brand" size={20} />
                        Most Bookings
                    </h3>
                    
                    <div className="space-y-5 max-h-[300px] overflow-y-auto pr-2">
                        {data.busiestClubs.length === 0 ? (
                            <p className="text-textSecondary text-center py-4">No data available</p>
                        ) : (
                            data.busiestClubs.map((club, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-textPrimary truncate mr-4">{club.name}</span>
                                        <span className="font-bold text-textSecondary shrink-0">{club.count}</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-borderSoft/50">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(club.count / maxClubCount) * 100}%` }}
                                            transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                                            className="h-full rounded-full bg-emerald-500"
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Busiest Clubs (Events) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="rounded-2xl border border-borderSoft bg-card p-6 shadow-sm"
                >
                    <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-textPrimary">
                        <Users className="text-brand" size={20} />
                        Most Events
                    </h3>
                    
                    <div className="space-y-5 max-h-[300px] overflow-y-auto pr-2">
                        {data.busiestClubsEvents.length === 0 ? (
                            <p className="text-textSecondary text-center py-4">No data available</p>
                        ) : (
                            data.busiestClubsEvents.map((club, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-textPrimary truncate mr-4">{club.name}</span>
                                        <span className="font-bold text-textSecondary shrink-0">{club.count}</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-borderSoft/50">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(club.count / maxClubEventsCount) * 100}%` }}
                                            transition={{ duration: 1, delay: 0.6 + (i * 0.1) }}
                                            className="h-full rounded-full bg-blue-500"
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AdminAnalytics;
