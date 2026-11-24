/**
 * ============================================================================
 * GEARTRACK / BIKE LOGBOOK TELEMETRY v3.0 — GOOGLE APPS SCRIPT BACKUP RECEIVER
 * ============================================================================
 * Cara Pemasangan di Google Spreadsheet Anda:
 * 1. Buka Google Sheets Anda (atau buat spreadsheet baru di sheets.new).
 * 2. Klik menu Extensions -> Apps Script.
 * 3. Hapus semua kode bawaan, lalu tempel (paste) seluruh isi file Code.gs ini.
 * 4. Klik tombol Save (ikon disket).
 * 5. Klik Deploy -> New deployment -> pilih jenis "Web app".
 *    - Description: GearTrack Backup v3.0
 *    - Execute as: Me (email Anda)
 *    - Who has access: Anyone
 * 6. Klik Deploy -> Authorize access -> salin "Web app URL" (berakhiran /exec).
 * 7. Tempelkan Web app URL tersebut di modal "Sheets Backup Settings" pada aplikasi GearTrack
 *    (atau simpan di Vercel Env: GOOGLE_SHEETS_WEBHOOK_URL).
 * ============================================================================
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: 'Payload kosong.' });
    }

    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const syncTime = payload.timestamp || new Date().toISOString();

    // 1. Tab: Summary
    writeSummaryTab(ss, payload, syncTime);

    // 2. Tab: Bikes
    writeTableTab(ss, 'Bikes', [
      'ID', 'Bike Name', 'Subtitle', 'Groupset', 'Drivetrain Ratio',
      'Wheel & Tire', 'Tire Pressure', 'Odometer (KM)', 'Status', 'Is Default', 'Updated At'
    ], (payload.bikes || []).map(function(b) {
      return [
        b.id || '',
        b.name || '',
        b.subtitle || '',
        b.groupset_spec || '',
        b.drivetrain_ratio || '',
        b.wheel_tire_spec || '',
        b.tire_pressure_psi || '',
        Number(b.odometer_km || 0),
        b.status || '',
        b.is_default ? 'YES' : 'NO',
        b.updated_at || ''
      ];
    }));

    // 3. Tab: Components
    writeTableTab(ss, 'Components', [
      'ID', 'Bike Name', 'Component Name', 'Category', 'Status',
      'Installed Date', 'Logged KM', 'Max Lifespan KM', 'Effective Wear (%)',
      'Purchase Cost (IDR)', 'Cost per KM (IDR)', 'Retired Date', 'Notes'
    ], (payload.components || []).map(function(c) {
      return [
        c.id || '',
        c.bike_name || '',
        c.name || '',
        c.category || '',
        c.status || '',
        c.installed_date || '',
        Number(c.logged_km || 0),
        Number(c.max_lifespan_km || 0),
        Number(c.effective_wear_pct || 0),
        Number(c.purchase_cost_idr || 0),
        Number(c.cost_per_km_idr || 0),
        c.retired_date || '',
        c.notes || ''
      ];
    }));

    // 4. Tab: Activities
    writeTableTab(ss, 'Activities', [
      'ID', 'Ride Date', 'Bike Name', 'Title', 'Ride Type',
      'Distance (KM)', 'Elevation Gain (M)', 'Duration (Sec)', 'Avg Speed (km/h)',
      'Avg Power (W)', 'Source', 'Strava ID', 'Notes'
    ], (payload.activities || []).map(function(a) {
      return [
        a.id || '',
        a.ride_date || '',
        (a.bikes && a.bikes.name) ? a.bikes.name : '',
        a.title || '',
        a.ride_type || '',
        Number(a.distance_km || 0),
        Number(a.elevation_gain_m || 0),
        Number(a.elapsed_seconds || 0),
        a.avg_speed_kmh != null ? Number(a.avg_speed_kmh) : '',
        a.avg_power_w != null ? Number(a.avg_power_w) : '',
        a.source || '',
        a.strava_activity_id || '',
        a.notes || ''
      ];
    }));

    // 5. Tab: Maintenance_Logs
    writeTableTab(ss, 'Maintenance_Logs', [
      'ID', 'Service Date', 'Bike Name', 'Component Name', 'Action Type',
      'Title', 'Odometer at Service (KM)', 'Cost (IDR)', 'Expense Category', 'Workshop', 'Notes'
    ], (payload.maintenanceLogs || []).map(function(m) {
      return [
        m.id || '',
        m.service_date || '',
        (m.bikes && m.bikes.name) ? m.bikes.name : '',
        (m.components && m.components.name) ? m.components.name : '',
        m.action_type || '',
        m.title || '',
        Number(m.odometer_at_service || 0),
        Number(m.cost_idr || 0),
        m.expense_category || '',
        m.workshop_name || '',
        m.notes || ''
      ];
    }));

    return jsonResponse({
      success: true,
      timestamp: syncTime,
      spreadsheetUrl: ss.getUrl(),
      spreadsheetName: ss.getName()
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return jsonResponse({
    success: true,
    status: 'GearTrack Google Sheets Backup Webhook is ACTIVE',
    spreadsheetName: ss.getName(),
    spreadsheetUrl: ss.getUrl()
  });
}

function writeSummaryTab(ss, payload, syncTime) {
  let sheet = ss.getSheetByName('Summary');
  if (!sheet) {
    sheet = ss.insertSheet('Summary', 0);
  }
  sheet.clear();

  const summary = payload.summary || {};
  const rows = [
    ['GEARTRACK / BIKE LOGBOOK TELEMETRY — BACKUP SNAPSHOT', ''],
    ['Last Backup Timestamp (UTC)', syncTime],
    ['Rider Name', summary.rider_name || 'Rider'],
    ['Total Registered Bikes', Number(summary.total_bikes || 0)],
    ['Total Tracked Components', Number(summary.total_components || 0)],
    ['Total Logged Rides', Number(summary.total_activities || 0)],
    ['Total Maintenance Records', Number(summary.total_maintenance_logs || 0)]
  ];

  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.getRange(1, 1, 1, 2).setBackground('#0c1324').setFontColor('#c3f400').setFontWeight('bold');
  sheet.getRange(2, 1, rows.length - 1, 1).setFontWeight('bold');
  sheet.autoResizeColumns(1, 2);
}

function writeTableTab(ss, tabName, headers, dataRows) {
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }
  sheet.clear();

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#0f172a')
    .setFontColor('#f8fafc')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);

  if (dataRows.length > 0) {
    sheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);
  }
  sheet.autoResizeColumns(1, headers.length);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
