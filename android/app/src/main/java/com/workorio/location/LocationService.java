package com.workorio.location;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;

public class LocationService extends Service {
    private static final String TAG = "WorkorioLocationService";
    private static final String CHANNEL_ID = "location_tracking_channel";
    private static final int NOTIFICATION_ID = 12345;

    private FusedLocationProviderClient fusedLocationClient;
    private PendingIntent locationPendingIntent;

    @Override
    public void onCreate() {
        super.onCreate();
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) {
            stopTracking();
            return START_NOT_STICKY;
        }

        try {
            createNotificationChannel();
            Notification notification = getNotification();
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
            
            startTracking();
        } catch (Exception e) {
            Log.e(TAG, "Failed to start service: " + e.getMessage());
        }

        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Attendance Tracking Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private Notification getNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Workorio Tracking")
                .setContentText("Active background tracking is enabled.")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void startTracking() {
        SharedPreferences prefs = getSharedPreferences("LocationPrefs", Context.MODE_PRIVATE);
        long interval = prefs.getLong("interval", 30000);
        float distance = prefs.getFloat("distance", 10.0f);

        LocationRequest locationRequest = LocationRequest.create()
                .setInterval(interval)
                .setFastestInterval(interval / 2)
                .setSmallestDisplacement(distance)
                .setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY);

        Intent intent = new Intent(this, LocationReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }

        locationPendingIntent = PendingIntent.getBroadcast(this, 0, intent, flags);

        try {
            fusedLocationClient.requestLocationUpdates(locationRequest, locationPendingIntent);
            Log.d(TAG, "Native Updates Started");
        } catch (SecurityException e) {
            Log.e(TAG, "Permissions missing: " + e.getMessage());
        }
    }

    private void stopTracking() {
        try {
            if (fusedLocationClient != null && locationPendingIntent != null) {
                fusedLocationClient.removeLocationUpdates(locationPendingIntent);
            }
            stopForeground(true);
            stopSelf();
        } catch (Exception e) {
            Log.e(TAG, "Stop error: " + e.getMessage());
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
