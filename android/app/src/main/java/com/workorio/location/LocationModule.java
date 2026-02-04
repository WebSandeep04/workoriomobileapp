package com.workorio.location;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

public class LocationModule extends ReactContextBaseJavaModule {
    private static final String TAG = "WorkorioLocationModule";

    public LocationModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return "WorkorioLocation";
    }

    @ReactMethod
    public void start(ReadableMap config) {
        try {
            Context context = getReactApplicationContext();
            SharedPreferences prefs = context.getSharedPreferences("LocationPrefs", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            
            if (config.hasKey("apiUrl")) editor.putString("apiUrl", config.getString("apiUrl"));
            if (config.hasKey("authToken")) editor.putString("authToken", config.getString("authToken"));
            
            String empId = getSafeString(config, "employeeId");
            String tntId = getSafeString(config, "tenantId");
            editor.putString("employeeId", empId);
            editor.putString("tenantId", tntId);
            
            if (config.hasKey("interval")) editor.putLong("interval", (long) config.getInt("interval"));
            if (config.hasKey("distance")) editor.putFloat("distance", (float) config.getDouble("distance"));
            
            editor.putBoolean("isTrackingRunning", true);
            editor.apply();

            Log.d(TAG, "Native config saved. URL: " + config.getString("apiUrl") + ", EmpID: " + empId);

            Intent serviceIntent = new Intent(context, LocationService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Start method failed: " + e.getMessage());
        }
    }

    private String getSafeString(ReadableMap map, String key) {
        if (!map.hasKey(key)) return "";
        try {
            return map.getString(key);
        } catch (Exception e) {
            try {
                return String.valueOf((int) map.getDouble(key));
            } catch (Exception e2) {
                return "";
            }
        }
    }

    @ReactMethod
    public void stop() {
        try {
            Context context = getReactApplicationContext();
            SharedPreferences prefs = context.getSharedPreferences("LocationPrefs", Context.MODE_PRIVATE);
            prefs.edit().putBoolean("isTrackingRunning", false).apply();

            Intent serviceIntent = new Intent(context, LocationService.class);
            serviceIntent.setAction("STOP");
            context.startService(serviceIntent);
        } catch (Exception e) {
            Log.e(TAG, "Stop method failed: " + e.getMessage());
        }
    }

    @ReactMethod
    public void getCurrentLocation(com.facebook.react.bridge.Promise promise) {
        try {
            com.google.android.gms.location.FusedLocationProviderClient client = 
                com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(getReactApplicationContext());
            
            client.getLastLocation()
                .addOnSuccessListener(location -> {
                    if (location != null) {
                        com.facebook.react.bridge.WritableMap map = com.facebook.react.bridge.Arguments.createMap();
                        map.putDouble("latitude", location.getLatitude());
                        map.putDouble("longitude", location.getLongitude());
                        map.putDouble("accuracy", location.getAccuracy());
                        map.putDouble("timestamp", location.getTime());
                        promise.resolve(map);
                    } else {
                        promise.reject("LOCATION_NULL", "Location not available. Please ensure GPS is on.");
                    }
                })
                .addOnFailureListener(e -> promise.reject("LOCATION_ERROR", e.getMessage()));
        } catch (SecurityException e) {
            promise.reject("PERMISSION_DENIED", "Location permission not granted");
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}
