# Workorio: Background & Kill-Mode GPS Tracking Implementation Guide

This document outlines the architecture, implementation steps, and troubleshooting encountered while building the native background tracking system for the Workorio React Native application.

---

## 1. Overview
Standard React Native geolocation libraries often fail when the app is "Killed" (swiped away) or when the device reboots. To solve this, we implemented a **Native Android Foreground Service** that runs independently of the React Native UI thread.

### Key Features:
- **Foreground Service**: Keeps the app alive in the background with a persistent notification.
- **Killed-Mode Support**: Uses `PendingIntent` and `BroadcastReceiver` to capture locations even if the app process is closed.
- **Offline Persistence**: Saves locations to a local **SQLite** database if the network is down.
- **Boot Persistence**: Automatically resumes tracking after a phone reboot.
- **Native Sync**: A background thread handles syncing data to the API without blocking the UI.

---

## 2. Architecture

| Component | Responsibility |
| :--- | :--- |
| **`LocationService.java`** | Manages the Foreground Service life-cycle and requests GPS updates. |
| **`LocationReceiver.java`** | The "Brain". Receives GPS triggers, saves to SQLite, and initiates API sync. |
| **`LocationDbHelper.java`** | Manages the SQLite database (`workorio_location.db`). |
| **`BootReceiver.java`** | Listens for system boot events to restart tracking. |
| **`LocationModule.java`** | The Bridge. Allows JS code to `start()`, `stop()`, and `getCurrentLocation()`. |
| **`LocationPackage.java`** | Registers the Module for React Native. |
| **`LocationTracker.js`** | React component that manages permissions and starts/stops the native engine. |

---

## 3. Step-by-Step Implementation Guide

### Step 1: Android Manifest Setup
Declared permissions and components in `AndroidManifest.xml`.
```xml
<!-- 1. Required Permissions -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- 2. Application Config: Cleartext for local API testing -->
<application android:usesCleartextTraffic="true" ...>

    <!-- 3. Component Registration -->
    <service android:name=".location.LocationService" android:foregroundServiceType="location" android:exported="false" />
    <receiver android:name=".location.LocationReceiver" android:exported="false" />
    <receiver android:name=".location.BootReceiver" android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.BOOT_COMPLETED" />
        </intent-filter>
    </receiver>
</application>
```

### Step 2: Dependency Configuration
We downgraded to `play-services-location:20.0.0` to avoid Interface conflicts with other libraries.
```gradle
// android/app/build.gradle
implementation("com.google.android.gms:play-services-location:20.0.0")
```

### Step 3: Native Intelligence (The Receiver)
The `LocationReceiver` handles the `PendingIntent`. This is crucial because `BroadcastReceivers` are woken up by the system even if the app is dead. It extracts the location and triggers the `syncBatch` thread.

### Step 4: Native Registration (MainApplication.kt)
The library was manually linked by adding the package to the list in `MainApplication.kt`:
```kotlin
override fun getPackages(): List<ReactPackage> = PackageList(this).packages.apply {
    add(com.workorio.location.LocationPackage()) // Manual Link
}
```

### Step 5: React Native Integration
The `LocationModule` exposes:
- `start(config)`: Saves API URL, Token, and IDs to `SharedPreferences` and starts the Service.
- `stop()`: Clears the sticky flag and kills the Service.
- `getCurrentLocation()`: A high-accuracy one-time fetch used for Punch-In validation.

### Step 6: Component Synchronization
The `AttendanceCard.js` and `AttendanceActionCard.js` were modified to use `WorkorioLocation.getCurrentLocation()` instead of `react-native-geolocation-service`. This ensures the GPS hardware is accessed using the same version-safe native code throughout the app.

---

## 4. Problems Faced & Solutions

### Error 1: `ForegroundServiceDidNotStartInTimeException`
- **Cause**: Android 12+ requires `startForeground()` to be called immediately within 5 seconds of the service starting.
- **Fix**: Moved `NotificationChannel` creation and `startForeground` to the very top of `onStartCommand` and explicitly declared `ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION`.

### Error 2: `IncompatibleClassChangeError`
- **Cause**: Using `play-services-location:21.0.1+` changed `LocationRequest` from a Class to an Interface, causing crashes during internal library casts.
- **Fix**: Reverted to version `20.0.0` and used the `LocationRequest.create()` builder pattern.

### Error 3: App Crash on `tenantId` / `employeeId`
- **Cause**: JavaScript sending numeric IDs while the Native Bridge expected Strings, leading to `ClassCastException`.
- **Fix**: Created a `getSafeString()` helper in Java that handles Number-to-String conversion (e.g., `123.0` -> `"123"`) and added coercion in JS: `String(user.employee_id)`.

### Error 4: Permissions in Android 12+
- **Cause**: `PendingIntent` requires explicit mutability flags in Android S+.
- **Fix**: Added `PendingIntent.FLAG_MUTABLE` to the broadcast intent.

---

## 5. Testing & Debugging

### Live Logs
The native logs do not show in the Metro console. Use `adb logcat`:
```bash
adb logcat -s WorkorioLocReceiver WorkorioLocationService WorkorioLocationModule
```

### Simulating Kill Mode
1. Open the app and Punch In.
2. Verify the "Workorio Tracking" notification is visible in the status bar.
3. Swipe the app away from the "Recent Apps" list.
4. Watch `adb logcat` — you will see updates every 5 seconds (📍) even though the app process is terminated.

### Simulating Reboot
1. Ensure tracking is running.
2. Run `adb reboot`.
3. After the phone starts, wait ~1 minute. The `BootReceiver` will automatically restart the `LocationService`.

---

## 6. Current Configuration
- **Interval**: 5,000ms (5 seconds)
- **Distance Filter**: 0 meters (Force trigger on every interval)
- **Notification Priority**: Low/Min (to minimize sound/vibration disturbance)
- **API Endpoint**: `POST /employee/location`
