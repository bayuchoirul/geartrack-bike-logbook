// backend/api/backup/sheets.js
// Serverless Backend Endpoint untuk mengekspor & mem-backup seluruh data GearTrack ke Google Sheets Webhook
import { supabaseRest, updateRiderSettings } from '../strava/_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method Not Allowed. Gunakan POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const webhookUrl = (body.webhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL || '').trim();

    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        needsConfig: true,
        error: 'URL Google Apps Script Web App belum diatur. Masukkan URL Web App Google Sheets Anda terlebih dahulu.'
      });
    }

    if (!webhookUrl.startsWith('https://script.google.com/')) {
      return res.status(400).json({
        success: false,
        error: 'Format URL tidak valid. Pastikan menggunakan URL Web App dari Google Apps Script (https://script.google.com/macros/s/.../exec).'
      });
    }

    // Ambil seluruh data terbaru dari Supabase secara paralel di sisi server
    const [bikes, components, activities, maintenanceLogs, settingsRows] = await Promise.all([
      supabaseRest('bikes?select=*&order=is_default.desc,created_at.asc'),
      supabaseRest('components_telemetry_view?select=*&order=status.asc,effective_wear_pct.desc'),
      supabaseRest('activities?select=*,bikes(name)&order=ride_date.desc&limit=1000'),
      supabaseRest('maintenance_logs?select=*,bikes(name),components(name)&order=service_date.desc&limit=1000'),
      supabaseRest('rider_settings?id=eq.1&select=*')
    ]);

    const riderSettings = Array.isArray(settingsRows) && settingsRows.length > 0 ? settingsRows[0] : {};
    const exportedAt = new Date().toISOString();

    const snapshotPayload = {
      app: 'GearTrack Bike Logbook Telemetry',
      version: '3.0.0',
      timestamp: exportedAt,
      summary: {
        total_bikes: (bikes || []).length,
        total_components: (components || []).length,
        total_activities: (activities || []).length,
        total_maintenance_logs: (maintenanceLogs || []).length,
        rider_name: riderSettings.rider_name || 'Rider'
      },
      bikes: bikes || [],
      components: components || [],
      activities: activities || [],
      maintenanceLogs: maintenanceLogs || []
    };

    // Kirim payload ke Google Apps Script Web App
    const gasRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(snapshotPayload),
      redirect: 'follow'
    });

    const gasText = await gasRes.text();
    let gasJson = null;
    try {
      gasJson = JSON.parse(gasText);
    } catch (_) {
      // Apps Script kadang mengembalikan HTML jika permission belum diset ke "Anyone"
    }

    if (!gasRes.ok || (gasJson && gasJson.success === false)) {
      throw new Error(
        gasJson?.error ||
        `Google Sheets merespons status ${gasRes.status}. Pastikan akses Web App di-deploy untuk "Anyone".`
      );
    }

    // Simpan waktu sync terakhir & URL spreadsheet (jika dikirim) ke rider_settings
    const settingsUpdate = { last_sheets_sync: exportedAt };
    if (body.spreadsheetUrl) {
      settingsUpdate.google_sheet_id = body.spreadsheetUrl.trim();
    }
    await updateRiderSettings(settingsUpdate);

    return res.status(200).json({
      success: true,
      exportedAt,
      counts: snapshotPayload.summary,
      spreadsheetUrl: gasJson?.spreadsheetUrl || body.spreadsheetUrl || riderSettings.google_sheet_id || null,
      message: `Backup berhasil! ${snapshotPayload.summary.total_bikes} sepeda, ${snapshotPayload.summary.total_components} komponen, ${snapshotPayload.summary.total_activities} aktivitas, dan ${snapshotPayload.summary.total_maintenance_logs} log servis tersimpan di Google Sheets.`
    });
  } catch (err) {
    console.error('Sheets Backup Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Terjadi kesalahan saat mem-backup data ke Google Sheets.'
    });
  }
}
