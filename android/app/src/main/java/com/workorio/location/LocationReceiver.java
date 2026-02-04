package com.workorio.location;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.location.Location;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.util.Log;

import com.google.android.gms.location.LocationResult;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class LocationReceiver extends BroadcastReceiver {
    private static final String TAG = "WorkorioLocReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        LocationResult result = LocationResult.extractResult(intent);
        if (result != null) {
            Location location = result.getLastLocation();
            if (location != null) {
                handleLocation(context, location);
            }
        }
    }

    private void handleLocation(Context context, Location location) {
        LocationDbHelper db = new LocationDbHelper(context);
        long id = db.insertLocation(
                location.getLatitude(),
                location.getLongitude(),
                location.getAccuracy(),
                location.getTime()
        );

        Log.d(TAG, "📍 Location captured: " + location.getLatitude() + "," + location.getLongitude() + " (ID: " + id + ")");

        if (isNetworkAvailable(context)) {
            syncBatch(context);
        }
    }

    private void syncBatch(Context context) {
        new Thread(() -> {
            LocationDbHelper db = new LocationDbHelper(context);
            Cursor cursor = db.getUnsyncedLocations();
            int count = cursor.getCount();
            
            if (count == 0) {
                cursor.close();
                return;
            }

            SharedPreferences prefs = context.getSharedPreferences("LocationPrefs", Context.MODE_PRIVATE);
            String apiUrl = prefs.getString("apiUrl", null);
            String authToken = prefs.getString("authToken", null);
            String employeeId = prefs.getString("employeeId", null);
            String tenantId = prefs.getString("tenantId", null);

            if (apiUrl == null || authToken == null || employeeId == null) {
                cursor.close();
                return;
            }

            try {
                while (cursor.moveToNext()) {
                    long id = cursor.getLong(cursor.getColumnIndexOrThrow(LocationDbHelper.COLUMN_ID));
                    double lat = cursor.getDouble(cursor.getColumnIndexOrThrow(LocationDbHelper.COLUMN_LAT));
                    double lng = cursor.getDouble(cursor.getColumnIndexOrThrow(LocationDbHelper.COLUMN_LNG));
                    long time = cursor.getLong(cursor.getColumnIndexOrThrow(LocationDbHelper.COLUMN_TIME));

                    if (sendToApi(apiUrl, authToken, employeeId, tenantId, lat, lng, time)) {
                        db.markSynced(id);
                        Log.d(TAG, "✅ Sync success for ID: " + id);
                    } else {
                        break; 
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Sync error", e);
            } finally {
                cursor.close();
            }
        }).start();
    }

    private boolean sendToApi(String baseUrl, String token, String empId, String tenantId, double lat, double lng, long time) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(baseUrl + "/employee/location");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            if (tenantId != null && !tenantId.isEmpty()) {
                conn.setRequestProperty("X-Tenant-ID", tenantId);
            }
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            JSONObject json = new JSONObject();
            json.put("employee_id", empId);
            json.put("latitude", lat);
            json.put("longitude", lng);

            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
            json.put("captured_at", sdf.format(new Date(time)));

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = json.toString().getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            int code = conn.getResponseCode();
            return code >= 200 && code < 300;
        } catch (Exception e) {
            return false;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private boolean isNetworkAvailable(Context context) {
        ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo info = cm.getActiveNetworkInfo();
        return info != null && info.isConnected();
    }
}
