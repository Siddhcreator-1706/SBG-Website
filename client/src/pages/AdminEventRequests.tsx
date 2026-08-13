import { motion } from 'framer-motion';
import { AlertTriangle, Calendar, CheckCircle, Clock, Filter, RefreshCw, Search, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { apiRequest } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { getSocket } from '../lib/socket';
import { toastError, toastSuccess } from '../lib/toast';
import { AppEvent } from '../types';

const AdminEventRequests: React.FC = () => {
  const [events, setEvents] = useState<(AppEvent & { clubName: string })[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const fetchEvents = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const eventsData = await apiRequest<any[]>('/api/admin/events', { auth: true });
      setEvents(eventsData.map(e => ({
        ...e,
        clubName: e.clubs?.name || 'Unknown Club'
      })));
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError(getErrorMessage(err, 'Failed to load events.'));
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Socket.io updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleEventsUpdated = () => {
      fetchEvents();
    };

    socket.on('events:updated', handleEventsUpdated);

    return () => {
      socket.off('events:updated', handleEventsUpdated);
    };
  }, [fetchEvents]);

  const handleEventAction = async (ids: string[], action: 'active' | 'rejected') => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await apiRequest('/api/admin/events/bulk-status', {
        method: 'PATCH',
        auth: true,
        body: { ids, status: action },
      });
      toastSuccess(`Event(s) ${action === 'active' ? 'approved' : 'rejected'} successfully`);
      fetchEvents();
    } catch (err) {
      console.error('Failed to update event(s):', err);
      toastError(err, `Failed to ${action} event(s). Please try again.`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const pendingEvents = events.filter(ev => {
    const matchesSearch = ev.clubName.toLowerCase().includes(searchTerm.toLowerCase()) || ev.name.toLowerCase().includes(searchTerm.toLowerCase());
    return ev.status === 'pending' && matchesSearch;
  });

  const historyEvents = events.filter(ev => {
    const matchesSearch = ev.clubName.toLowerCase().includes(searchTerm.toLowerCase()) || ev.name.toLowerCase().includes(searchTerm.toLowerCase());
    return ev.status !== 'pending' && matchesSearch;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-textPrimary tracking-tight leading-tight">Event Registrations</h1>
          <p className="text-textMuted mt-2 text-sm sm:text-base font-medium">Review and take action on event registrations.</p>
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-2.5 text-textMuted pointer-events-none" size={18} />
          <Input
            type="text"
            placeholder="Search events..."
            className="pl-10 w-full rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertTriangle size={16} />
          <AlertTitle>Could not load events</AlertTitle>
          <AlertDescription className="mt-1">{error}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={fetchEvents}>
            <RefreshCw size={14} />
            Retry
          </Button>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'history')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-hoverSoft border-borderSoft rounded-xl p-1">
          <TabsTrigger value="pending" className="data-[state=active]:bg-background">
            Pending Review ({events.filter(e => e.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-background">
            History ({events.filter(e => e.status !== 'pending').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card className="rounded-xl overflow-hidden">
            {isLoading ? (
              <CardContent className="p-6">
                <Skeleton className="h-12 w-full mb-4" />
                <Skeleton className="h-12 w-full mb-4" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            ) : pendingEvents.length > 0 ? (
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[600px] sm:min-w-0 text-left text-sm">
                  <thead className="bg-hoverSoft border-b border-borderSoft uppercase tracking-wider text-xs font-semibold text-textMuted">
                    <tr>
                      <th className="px-4 sm:px-6 py-4 w-[40%] sm:w-[45%]">Event</th>
                      <th className="px-4 sm:px-6 py-4 hidden sm:table-cell w-[25%]">Date & Time</th>
                      <th className="px-4 sm:px-6 py-4 w-[20%] sm:w-[15%]">Status</th>
                      <th className="px-4 sm:px-6 py-4 text-right w-[40%] sm:w-[15%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {pendingEvents.map((ev, index) => (
                      <AdminEventRow
                        key={ev.id}
                        ev={ev}
                        index={index}
                        handleAction={handleEventAction}
                        isHistoryTab={false}
                        isProcessingAction={isProcessingAction}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <CardContent className="p-8 sm:p-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-hoverSoft text-textMuted mb-4">
                  <Filter size={24} />
                </div>
                <h3 className="text-lg font-medium text-textPrimary">No event registrations found</h3>
                <p className="text-textMuted mt-1">Try adjusting your search or tab filter.</p>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="rounded-xl overflow-hidden">
            {isLoading ? (
              <CardContent className="p-6">
                <Skeleton className="h-12 w-full mb-4" />
                <Skeleton className="h-12 w-full mb-4" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            ) : historyEvents.length > 0 ? (
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[600px] sm:min-w-0 text-left text-sm">
                  <thead className="bg-hoverSoft border-b border-borderSoft uppercase tracking-wider text-xs font-semibold text-textMuted">
                    <tr>
                      <th className="px-4 sm:px-6 py-4 w-[40%] sm:w-[45%]">Event</th>
                      <th className="px-4 sm:px-6 py-4 hidden sm:table-cell w-[25%]">Date & Time</th>
                      <th className="px-4 sm:px-6 py-4 w-[20%] sm:w-[15%]">Status</th>
                      <th className="px-4 sm:px-6 py-4 text-right w-[40%] sm:w-[15%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {historyEvents.map((ev, index) => (
                      <AdminEventRow
                        key={ev.id}
                        ev={ev}
                        index={index}
                        handleAction={handleEventAction}
                        isHistoryTab={true}
                        isProcessingAction={isProcessingAction}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <CardContent className="p-8 sm:p-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-hoverSoft text-textMuted mb-4">
                  <Filter size={24} />
                </div>
                <h3 className="text-lg font-medium text-textPrimary">No history found</h3>
                <p className="text-textMuted mt-1">Try adjusting your search filter.</p>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

interface AdminEventRowProps {
  ev: AppEvent & { clubName: string };
  index: number;
  handleAction: (ids: string[], action: 'active' | 'rejected') => Promise<void>;
  isHistoryTab: boolean;
  isProcessingAction: boolean;
}

const AdminEventRow: React.FC<AdminEventRowProps> = ({ ev, index, handleAction, isHistoryTab, isProcessingAction }) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'rejected': return 'destructive';
      case 'pending': return 'pending';
      default: return 'pending';
    }
  };

  const isStarted = new Date(ev.date) <= new Date();

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="hover:bg-hoverSoft transition-colors"
    >
      <td className="px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2">
          <div>
            <div className="font-semibold text-textPrimary flex items-center gap-2">
              {ev.name}
              {ev.status === 'pending' && (
                <div className="text-warning" title="Short Notice Registration">
                  <AlertTriangle size={14} />
                </div>
              )}
            </div>
            <div className="text-xs text-textMuted mt-0.5">{ev.clubName}</div>
            <div className="text-xs text-textMuted mt-1">
              Type: {ev.event_type ? ev.event_type.replace('_', ' ') : 'N/A'}
            </div>
            <div className="text-xs text-textMuted mt-1 sm:hidden flex flex-col gap-2">
               <div className="flex flex-col gap-0.5">
                 <span className="font-medium text-textPrimary">Start:</span>
                 <div className="flex items-center gap-1"><Calendar size={12} /> {new Date(ev.date).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })} <Clock size={12} className="ml-1" /> {new Date(ev.date).toLocaleTimeString([], { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</div>
               </div>
               <div className="flex flex-col gap-0.5">
                 <span className="font-medium text-textPrimary">End:</span>
                 <div className="flex items-center gap-1"><Calendar size={12} /> {ev.dynamic_end_date ? new Date(ev.dynamic_end_date).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' }) : '?'} <Clock size={12} className="ml-1" /> {ev.dynamic_end_date ? new Date(ev.dynamic_end_date).toLocaleTimeString([], { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '?'}</div>
               </div>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 sm:px-6 py-4 hidden sm:table-cell whitespace-nowrap">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5 text-xs">
            <span className="font-medium text-textPrimary">Start:</span>
            <div className="flex items-center gap-1.5 text-textMuted">
              <Calendar size={14} className="shrink-0" />
              <span>{new Date(ev.date).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric' })}</span>
              <Clock size={14} className="shrink-0 ml-1" />
              <span>{new Date(ev.date).toLocaleTimeString([], { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div className="flex flex-col gap-0.5 text-xs">
            <span className="font-medium text-textPrimary">End:</span>
            <div className="flex items-center gap-1.5 text-textMuted">
              <Calendar size={14} className="shrink-0" />
              <span>{ev.dynamic_end_date ? new Date(ev.dynamic_end_date).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric' }) : '?'}</span>
              <Clock size={14} className="shrink-0 ml-1" />
              <span>{ev.dynamic_end_date ? new Date(ev.dynamic_end_date).toLocaleTimeString([], { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '?'}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 sm:px-6 py-4">
        <Badge variant={getStatusVariant(ev.status || 'pending')}>
          {(ev.status || 'pending').charAt(0).toUpperCase() + (ev.status || 'pending').slice(1)}
        </Badge>
      </td>
      <td className="px-4 sm:px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {!isStarted && (
            <>
              {ev.status !== 'rejected' && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Reject Event"
                  onClick={(e) => { e.stopPropagation(); handleAction([ev.id], 'rejected'); }}
                  className="text-textMuted hover:text-error"
                  title="Reject Event"
                  disabled={isProcessingAction}
                >
                  <XCircle size={18} />
                </Button>
              )}
              {ev.status !== 'active' && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Approve Event"
                  onClick={(e) => { e.stopPropagation(); handleAction([ev.id], 'active'); }}
                  className="text-primary hover:text-primary/80"
                  title="Approve Event"
                  disabled={isProcessingAction}
                >
                  <CheckCircle size={18} />
                </Button>
              )}
            </>
          )}
        </div>
      </td>
    </motion.tr>
  );
};

export default AdminEventRequests;
