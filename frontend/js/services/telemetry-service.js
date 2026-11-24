// frontend/js/services/telemetry-service.js
import { getSupabase, formatIDR, formatKm } from '../core/supabase-client.js';

export { getSupabase, formatIDR, formatKm };

export const TelemetryService = {
  async getBikes() {
    const { supabase } = await getSupabase();
    const { data, error } = await supabase
      .from('bikes')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createBike(bikePayload) {
    const { supabase } = await getSupabase();
    if (bikePayload.is_default) {
      await supabase.from('bikes').update({ is_default: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    }
    const { data, error } = await supabase.from('bikes').insert([bikePayload]).select().single();
    if (error) throw error;
    return data;
  },

  async setDefaultBike(bikeId) {
    const { supabase } = await getSupabase();
    await supabase.from('bikes').update({ is_default: false }).neq('id', bikeId);
    const { data, error } = await supabase
      .from('bikes')
      .update({ is_default: true, status: 'in_service' })
      .eq('id', bikeId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteBike(bikeId) {
    const { supabase } = await getSupabase();
    const { data: targetBike, error: fetchErr } = await supabase
      .from('bikes')
      .select('id, name, is_default')
      .eq('id', bikeId)
      .single();
    if (fetchErr) throw fetchErr;

    const { error: delErr } = await supabase
      .from('bikes')
      .delete()
      .eq('id', bikeId);
    if (delErr) throw delErr;

    let nextActiveBike = null;
    if (targetBike?.is_default) {
      const remaining = await this.getBikes();
      if (remaining.length > 0) {
        nextActiveBike = await this.setDefaultBike(remaining[0].id);
      }
    }

    return { deletedId: bikeId, nextActiveBike };
  },

  async getComponents(bikeId, status = 'active') {
    const { supabase } = await getSupabase();
    let query = supabase
      .from('components_telemetry_view')
      .select('*')
      .eq('status', status)
      .order('effective_wear_pct', { ascending: false });

    if (bikeId && bikeId !== 'all') {
      query = query.eq('bike_id', bikeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async addComponent(componentPayload) {
    const { supabase } = await getSupabase();
    const { data, error } = await supabase.from('components').insert([componentPayload]).select().single();
    if (error) throw error;

    if (Number(componentPayload.purchase_cost_idr) > 0) {
      const { data: bike } = await supabase
        .from('bikes')
        .select('odometer_km')
        .eq('id', componentPayload.bike_id)
        .single();

      await supabase.from('maintenance_logs').insert([{
        bike_id: componentPayload.bike_id,
        component_id: data.id,
        action_type: 'service',
        title: `Installed New Part: ${componentPayload.name}`,
        service_date: componentPayload.installed_date || new Date().toISOString(),
        odometer_at_service: bike?.odometer_km || 0,
        cost_idr: componentPayload.purchase_cost_idr,
        expense_category: 'Parts Purchase',
        workshop_name: 'Self-maintained (Home Workshop)',
        notes: componentPayload.notes || 'Initial installation'
      }]);
    }
    return data;
  },

  async resetComponentInterval({ bikeId, componentId, componentName, serviceTitle, serviceDate, odometerKm, costIdr, expenseCategory, workshopName, notes }) {
    const { supabase } = await getSupabase();
    const { error: compErr } = await supabase
      .from('components')
      .update({ interval_km: 0, updated_at: new Date().toISOString() })
      .eq('id', componentId);
    if (compErr) throw compErr;

    const { data, error: logErr } = await supabase
      .from('maintenance_logs')
      .insert([{
        bike_id: bikeId,
        component_id: componentId,
        action_type: 'reset',
        title: serviceTitle || `${componentName} – Interval Service`,
        service_date: serviceDate || new Date().toISOString(),
        odometer_at_service: odometerKm,
        cost_idr: Number(costIdr) || 0,
        expense_category: expenseCategory || 'Lube/Consum.',
        workshop_name: workshopName || 'Self-maintained (Home Workshop)',
        notes
      }])
      .select()
      .single();
    if (logErr) throw logErr;
    return data;
  },

  async archiveAndReplaceComponent(payload) {
    const { supabase } = await getSupabase();
    const { data, error } = await supabase.rpc('archive_and_replace_component', {
      p_old_component_id: payload.oldComponentId,
      p_retirement_reason: payload.retirementReason,
      p_retirement_badge: payload.retirementBadge || 'Normal Wear',
      p_new_component_name: payload.newComponentName,
      p_new_max_lifespan_km: Number(payload.newMaxLifespanKm),
      p_new_max_lifespan_months: Number(payload.newMaxLifespanMonths),
      p_new_cost_idr: Number(payload.newCostIdr) || 0,
      p_service_date: payload.serviceDate || new Date().toISOString(),
      p_workshop_name: payload.workshopName || 'Self-maintained (Home Workshop)',
      p_notes: payload.notes || ''
    });
    if (error) throw error;
    return data;
  },

  async getComponentRules() {
    const { supabase } = await getSupabase();
    const { data, error } = await supabase
      .from('component_rules')
      .select('*')
      .order('default_max_km', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async logRide(ridePayload) {
    const { supabase } = await getSupabase();
    const { data, error } = await supabase.from('activities').insert([ridePayload]).select().single();
    if (error) throw error;
    return data;
  },

  async getActivities(bikeId, limit = 100) {
    const { supabase } = await getSupabase();
    let query = supabase
      .from('activities')
      .select('*, bikes(name)')
      .order('ride_date', { ascending: false })
      .limit(limit);

    if (bikeId && bikeId !== 'all') {
      query = query.eq('bike_id', bikeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getMaintenanceLogs(bikeId, limit = 100) {
    const { supabase } = await getSupabase();
    let query = supabase
      .from('maintenance_logs')
      .select('*, bikes(name), components(name)')
      .order('service_date', { ascending: false })
      .limit(limit);

    if (bikeId && bikeId !== 'all') {
      query = query.eq('bike_id', bikeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getUnifiedLedger(bikeId) {
    const [rides, services] = await Promise.all([
      this.getActivities(bikeId, 100),
      this.getMaintenanceLogs(bikeId, 100)
    ]);

    const normalizedRides = rides.map(r => ({
      id: r.id,
      timestamp: r.ride_date,
      type: 'RIDE',
      title: r.title,
      bikeName: r.bikes?.name || 'Bike',
      subtitle: `${r.ride_type} • ${r.elevation_gain_m || 0}m elev${r.avg_speed_kmh ? ` • Avg ${r.avg_speed_kmh} km/h` : ''}`,
      deltaKm: Number(r.distance_km),
      costIdr: 0,
      source: r.source,
      stravaId: r.strava_activity_id,
      notes: r.notes || 'Logged to odometer'
    }));

    const normalizedServices = services.map(s => ({
      id: s.id,
      timestamp: s.service_date,
      type: s.action_type === 'replace' ? 'REPLACEMENT' : 'RESET / SERVICE',
      title: s.title,
      bikeName: s.bikes?.name || 'Bike',
      subtitle: `${s.expense_category} • ${s.workshop_name}`,
      deltaKm: 0,
      odometerAt: Number(s.odometer_at_service),
      costIdr: Number(s.cost_idr),
      source: 'workshop',
      notes: s.notes || ''
    }));

    return [...normalizedRides, ...normalizedServices].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  },

  async getRiderSettings() {
    const { supabase } = await getSupabase();
    const { data, error } = await supabase.from('rider_settings').select('*').eq('id', 1).single();
    if (error) throw error;
    return data;
  },

  async updateRiderSettings(updates) {
    const { supabase } = await getSupabase();
    const { data, error } = await supabase
      .from('rider_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getDashboardMetrics(bike) {
    const [activeComps, activities, maintenanceLogs] = await Promise.all([
      this.getComponents(bike.id, 'active'),
      this.getActivities(bike.id, 500),
      this.getMaintenanceLogs(bike.id, 500)
    ]);

    const attentionComps = activeComps.filter(c => Number(c.effective_wear_pct) >= 65);
    const currentYear = new Date().getFullYear();
    const ytdLogs = maintenanceLogs.filter(l => new Date(l.service_date).getFullYear() === currentYear);
    const totalSpendIdr = ytdLogs.reduce((sum, l) => sum + Number(l.cost_idr || 0), 0);
    const partsSpendIdr = ytdLogs
      .filter(l => l.expense_category === 'Parts Purchase')
      .reduce((sum, l) => sum + Number(l.cost_idr || 0), 0);
    const serviceSpendIdr = totalSpendIdr - partsSpendIdr;

    const now = new Date();
    const monthKm = activities
      .filter(a => {
        const d = new Date(a.ride_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === currentYear;
      })
      .reduce((sum, a) => sum + Number(a.distance_km || 0), 0);

    const odo = Number(bike.odometer_km) || 0;
    const costPer100Km = odo > 0 ? Math.round((totalSpendIdr / odo) * 100) : 0;

    return {
      activeComps,
      attentionComps,
      totalRidesCount: activities.length,
      monthKm,
      totalSpendIdr,
      partsSpendIdr,
      serviceSpendIdr,
      costPer100Km
    };
  },

  async triggerStravaSync(bikeId = null) {
    const response = await fetch('/api/strava/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bikeId })
    });
    const data = await response.json();
    if (!response.ok || (!data.success && !data.needsAuth)) {
      throw new Error(data.error || 'Gagal melakukan sinkronisasi Strava');
    }
    return data;
  },

  getSavedSheetsConfig() {
    try {
      return {
        webhookUrl: localStorage.getItem('geartrack_sheets_webhook_url') || '',
        spreadsheetUrl: localStorage.getItem('geartrack_sheets_spreadsheet_url') || ''
      };
    } catch (_) {
      return { webhookUrl: '', spreadsheetUrl: '' };
    }
  },

  saveSheetsConfig({ webhookUrl, spreadsheetUrl }) {
    try {
      if (webhookUrl !== undefined) {
        localStorage.setItem('geartrack_sheets_webhook_url', (webhookUrl || '').trim());
      }
      if (spreadsheetUrl !== undefined) {
        localStorage.setItem('geartrack_sheets_spreadsheet_url', (spreadsheetUrl || '').trim());
      }
    } catch (_) {}
  },

  async pushBackupToGoogleSheets({ webhookUrl = '', spreadsheetUrl = '' } = {}) {
    const saved = this.getSavedSheetsConfig();
    const effectiveWebhook = (webhookUrl || saved.webhookUrl || '').trim();
    const effectiveSheetUrl = (spreadsheetUrl || saved.spreadsheetUrl || '').trim();

    const response = await fetch('/api/backup/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: effectiveWebhook,
        spreadsheetUrl: effectiveSheetUrl
      })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      const err = new Error(data.error || 'Gagal mengirim snapshot ke Google Sheets');
      err.needsConfig = Boolean(data.needsConfig);
      throw err;
    }

    if (effectiveWebhook || data.spreadsheetUrl) {
      this.saveSheetsConfig({
        webhookUrl: effectiveWebhook || undefined,
        spreadsheetUrl: data.spreadsheetUrl || effectiveSheetUrl || undefined
      });
    }

    return data;
  }
};
