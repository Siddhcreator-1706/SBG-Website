import { Download, FileSpreadsheet, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { GlassCard } from '../components/glass-card';
import { GradientBackground } from '../components/gradient-background';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { apiRequest } from '../lib/api';
import { toastError } from '../lib/toast';
import { DatePicker } from '../components/ui/date-picker';

export default function AdminEventReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [tab, setTab] = useState<'submitted' | 'tracking' | 'exempt'>('submitted');
  const [loading, setLoading] = useState(true);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncFromDate, setSyncFromDate] = useState<Date | undefined>(undefined);
  const [syncToDate, setSyncToDate] = useState<Date | undefined>(undefined);
  const [settings, setSettings] = useState({
    event_report_format_link: '',
    awards_format_link: '',
    google_sheet_webhook_url: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const s = await apiRequest<any[]>('/api/event-reports', { auth: true });
      const p = await apiRequest<any[]>('/api/event-reports/all-past-events', { auth: true });
      const config = await apiRequest<Record<string, string>>('/api/settings', { auth: true }).catch(() => ({} as Record<string, string>));
      
      setReports(s);
      setPastEvents(p);
      setSettings({
        event_report_format_link: config.event_report_format_link || '',
        awards_format_link: config.awards_format_link || '',
        google_sheet_webhook_url: config.google_sheet_webhook_url || ''
      });
    } catch (e: any) {
      toastError('Failed to fetch admin reports data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
      const apiUrl = `${baseUrl.replace(/\/$/, '')}/api/event-reports/export`;
      const response = await fetch(apiUrl, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Event_Reports.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toastError('Export failed', error);
    }
  };

  const handleSyncSheets = async () => {
    setSyncingSheets(true);
    try {
      const body: any = {};
      if (syncFromDate) {
        const y = syncFromDate.getFullYear();
        const m = String(syncFromDate.getMonth() + 1).padStart(2, '0');
        const d = String(syncFromDate.getDate()).padStart(2, '0');
        body.from_date = `${y}-${m}-${d}`;
      }
      if (syncToDate) {
        const y = syncToDate.getFullYear();
        const m = String(syncToDate.getMonth() + 1).padStart(2, '0');
        const d = String(syncToDate.getDate()).padStart(2, '0');
        body.to_date = `${y}-${m}-${d}`;
      }

      const res = await apiRequest<{ success: boolean; message: string; count?: number }>(
        '/api/event-reports/sync-sheets',
        { method: 'POST', auth: true, body }
      );
      toast.success(res.message || 'Synced to Google Sheet successfully');
      setIsSyncModalOpen(false);
    } catch (error: any) {
      toastError('Google Sheet sync failed', error);
    } finally {
      setSyncingSheets(false);
    }
  };

  const toggleExempt = async (eventId: string, currentExempt: boolean) => {
    try {
      await apiRequest(`/api/event-reports/exempt/${eventId}`, {
        method: 'PATCH',
        auth: true,
        body: { exempt: !currentExempt }
      });
      toast.success(`Event marked as ${!currentExempt ? 'exempt' : 'requires report'}`);
      fetchData();
    } catch (e: any) {
      toastError('Failed to toggle exemption', e);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await apiRequest('/api/settings', {
        method: 'POST',
        auth: true,
        body: settings
      });
      toast.success('Settings saved successfully');
      setIsSettingsOpen(false);
    } catch (error: any) {
      toastError('Failed to save settings', error);
    } finally {
      setSavingSettings(false);
    }
  };


  return (
    <div className="relative min-h-dvh">
      <GradientBackground />
      <div className="relative z-10 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-textPrimary leading-tight">All Event Reports</h1>
            <p className="text-textMuted max-w-3xl mt-1">Manage and export all club event reports.</p>
          </div>
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsSettingsOpen(true)} className="w-full sm:w-auto">
              <Settings className="w-4 h-4 mr-2" />
              Settings & Formats
            </Button>
            <Button 
              onClick={() => setIsSyncModalOpen(true)}
              className="w-full sm:w-auto gap-2 rounded-xl h-10 font-semibold border-[1.5px] border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-sm"
            >
              <FileSpreadsheet size={16} />
              Sync to Google Sheet
            </Button>
            <Button 
              onClick={handleExport}
              className="w-full sm:w-auto gap-2 rounded-xl h-10 font-semibold border-[1.5px] border-slate-300 dark:border-slate-600 bg-card text-textSecondary hover:bg-hoverSoft shadow-sm"
            >
              <Download size={16} />
              Export Reports
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'submitted' | 'tracking' | 'exempt')} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-hoverSoft border-borderSoft rounded-xl p-1">
            <TabsTrigger value="submitted" className="data-[state=active]:bg-background">
              Submitted ({reports.length})
            </TabsTrigger>
            <TabsTrigger value="tracking" className="data-[state=active]:bg-background">
              Tracking ({pastEvents.filter(e => !e.has_report && !e.report_exempt).length})
            </TabsTrigger>
            <TabsTrigger value="exempt" className="data-[state=active]:bg-background">
              Exempt ({pastEvents.filter(e => e.report_exempt).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <GlassCard key={i} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2 w-full max-w-sm">
                  <Skeleton className="h-6 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                  <Skeleton className="h-4 w-1/3 rounded-md" />
                </div>
                <Skeleton className="h-10 w-32 rounded-md shrink-0" />
              </GlassCard>
            ))}
          </div>
        ) : (
          <>
            {tab === 'submitted' && (
          <div className="space-y-4">
            {reports.map(r => (
              <GlassCard key={r.id} className="p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <h3 className="font-semibold text-lg leading-tight">
                    {r.event_name} 
                    <span className="block sm:inline text-sm font-normal text-textMuted sm:ml-2">by {r.club_name}</span>
                  </h3>
                  <span className="text-sm bg-brand/10 text-brand px-2 py-1 rounded-md capitalize self-start shrink-0">{r.level}</span>
                </div>
                <p className="text-sm text-textMuted mt-1">Submitted: {new Date(r.created_at).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })} | Event: {new Date(r.date).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}</p>
                <div className="flex flex-wrap gap-4 text-sm mt-2">
                  <a href={r.report_doc_link} target="_blank" rel="noreferrer" className="text-brand hover:underline">Report Doc</a>
                  <a href={r.photos_drive_link} target="_blank" rel="noreferrer" className="text-brand hover:underline">Photos</a>
                  {r.participants_sheet_link && <a href={r.participants_sheet_link} target="_blank" rel="noreferrer" className="text-brand hover:underline">Participants</a>}
                  {r.awards_doc_link && <a href={r.awards_doc_link} target="_blank" rel="noreferrer" className="text-brand hover:underline">Awards</a>}
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {tab === 'tracking' && (
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[600px] sm:min-w-0 text-sm text-left">
              <thead className="text-xs uppercase bg-card/50 text-textMuted">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Club</th>
                  <th className="px-4 py-3">End Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pastEvents.filter(e => !e.has_report && !e.report_exempt).map(e => (
                  <tr key={e.id} className="border-b border-borderSoft hover:bg-hoverSoft/50">
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3">{e.club_name}</td>
                    <td className="px-4 py-3">{new Date(e.end_date || e.date).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}</td>
                    <td className="px-4 py-3">
                      <span className="text-error font-semibold">Pending</span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => toggleExempt(e.id, e.report_exempt)}>
                        Mark Exempt
                      </Button>
                    </td>
                  </tr>
                ))}
                {pastEvents.filter(e => !e.has_report && !e.report_exempt).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-textMuted">No pending events require a report.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'exempt' && (
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[600px] sm:min-w-0 text-sm text-left">
              <thead className="text-xs uppercase bg-card/50 text-textMuted">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Club</th>
                  <th className="px-4 py-3">End Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pastEvents.filter(e => e.report_exempt).map(e => (
                  <tr key={e.id} className="border-b border-borderSoft hover:bg-hoverSoft/50">
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3">{e.club_name}</td>
                    <td className="px-4 py-3">{new Date(e.end_date || e.date).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400">Exempt</span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => toggleExempt(e.id, e.report_exempt)}>
                        Remove Exemption
                      </Button>
                    </td>
                  </tr>
                ))}
                {pastEvents.filter(e => e.report_exempt).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-textMuted">No exempt events.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
          </>
        )}
      </div>


      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Format Links</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Event Report Format Link</Label>
              <Input 
                type="url" 
                value={settings.event_report_format_link} 
                onChange={e => setSettings({...settings, event_report_format_link: e.target.value})} 
                placeholder="https://docs.google.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Awards Format Link</Label>
              <Input 
                type="url" 
                value={settings.awards_format_link} 
                onChange={e => setSettings({...settings, awards_format_link: e.target.value})} 
                placeholder="https://docs.google.com/..."
              />
            </div>

            <div className="pt-2 border-t border-borderSoft space-y-3">
              <div>
                <Label className="font-semibold text-textPrimary">Google Sheet Webhook URL</Label>
                <p className="text-xs text-textMuted mb-1.5">Auto-updates event reports directly in your Google Sheet.</p>
                <Input 
                  type="url" 
                  value={settings.google_sheet_webhook_url} 
                  onChange={e => setSettings({...settings, google_sheet_webhook_url: e.target.value})} 
                  placeholder="https://script.google.com/macros/s/.../exec"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Date Range Dialog */}
      <Dialog open={isSyncModalOpen} onOpenChange={setIsSyncModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
              Sync Event Reports to Google Sheet
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-3">
            <p className="text-sm text-textMuted">
              Select the date range of events you want to sync. Existing rows in the Google Sheet that were not submitted through the website will remain untouched.
            </p>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold text-textSecondary mb-1.5 block">
                  From Event Date <span className="text-textMuted font-normal text-xs">(Optional)</span>
                </Label>
                <DatePicker 
                  date={syncFromDate} 
                  setDate={setSyncFromDate} 
                  className="h-10 text-sm"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-textSecondary mb-1.5 block">
                  To Event Date <span className="text-textMuted font-normal text-xs">(Optional)</span>
                </Label>
                <DatePicker 
                  date={syncToDate} 
                  setDate={setSyncToDate} 
                  className="h-10 text-sm"
                />
              </div>

              {(syncFromDate || syncToDate) && (
                <div className="flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setSyncFromDate(undefined); setSyncToDate(undefined); }}
                    className="text-xs text-textMuted hover:text-textPrimary h-7 px-2"
                  >
                    Reset to All Dates
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsSyncModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSyncSheets} 
              disabled={syncingSheets}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <FileSpreadsheet size={16} className={syncingSheets ? 'animate-spin' : ''} />
              {syncingSheets ? 'Syncing...' : 'Start Sync'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}