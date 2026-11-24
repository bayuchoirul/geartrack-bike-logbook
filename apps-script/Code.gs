// apps-script/Code.gs
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    writeSheetData(ss, "Bikes_Fleet", payload.bikes || [], [
      "id", "name", "subtitle", "groupset_spec", "drivetrain_ratio", "wheel_tire_spec", "odometer_km", "status"
    ]);
    writeSheetData(ss, "Active_Components", payload.components || [], [
      "bike_name", "name", "category", "installed_date", "logged_km", "max_lifespan_km", "max_lifespan_months", "effective_wear_pct", "purchase_cost_idr", "notes"
    ]);
    writeSheetData(ss, "Ride_Activities", payload.activities || [], [
      "ride_date", "title", "ride_type", "distance_km", "elevation_gain_m", "avg_speed_kmh", "source", "strava_activity_id", "notes"
    ]);
    writeSheetData(ss, "Maintenance_Ledger", payload.maintenanceLogs || [], [
      "service_date", "action_type", "title", "odometer_at_service", "cost_idr", "expense_category", "workshop_name", "notes"
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: "ok", synced_at: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function writeSheetData(ss, sheetName, rows, columns) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clear();
  sheet.appendRow(columns);
  if (rows.length > 0) {
    const matrix = rows.map(row => columns.map(col => row[col] !== undefined && row[col] !== null ? row[col] : ""));
    sheet.getRange(2, 1, matrix.length, columns.length).setValues(matrix);
  }
  sheet.getRange(1, 1, 1, columns.length).setFontWeight("bold");
  sheet.setFrozenRows(1);
}
