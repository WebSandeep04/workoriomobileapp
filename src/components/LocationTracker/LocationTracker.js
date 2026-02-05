import React, { useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { setTrackingState } from '../../store/slices/locationSlice';
import api from '../../api/client';

const { WorkorioLocation } = NativeModules;

// Config - High accuracy for native tracking
const TRACKING_INTERVAL_MS = 5000;
const DISTANCE_FILTER_METERS = 0;

const LocationTracker = () => {
    const dispatch = useDispatch();

    const { isAuthenticated, user, token } = useSelector(state => state.auth);
    const { status, isTrackingEnabled } = useSelector(state => state.attendance);

    const isOfficeActive = status?.office?.can_end;
    const isFieldActive = status?.field?.can_end;
    const isOnBreak = status?.break?.can_end;

    // Use user.is_tracking from Auth as fallback if Attendance state is missing it
    const isTrackingOn = isTrackingEnabled || (user?.is_tracking === 1);

    const shouldTrack = isAuthenticated && user?.employee_id && (isOfficeActive || isFieldActive) && isTrackingOn && !isOnBreak;

    useEffect(() => {
        // Handle Start/Stop of Native Engine
        if (!shouldTrack) {
            console.log('[LocationTracker] Condition False. Calling Native Stop.');
            WorkorioLocation.stop();
            dispatch(setTrackingState(false));
            return;
        }

        const initiateTracking = async () => {
            const hasPermission = await checkAndRequestPermissions();
            if (hasPermission) {
                const config = {
                    apiUrl: api.defaults.baseURL,
                    authToken: token,
                    employeeId: String(user.employee_id),
                    tenantId: String(user.tenant_id),
                    interval: TRACKING_INTERVAL_MS,
                    distance: DISTANCE_FILTER_METERS
                };
                console.log('[LocationTracker] Launching Native Background Engine with config:', config);
                WorkorioLocation.start(config);
                dispatch(setTrackingState(true));
            } else {
                console.warn('[LocationTracker] Permission error. Engine not started.');
            }
        };

        initiateTracking();
    }, [shouldTrack, token, user?.employee_id, user?.tenant_id]);

    const checkAndRequestPermissions = async () => {
        if (Platform.OS !== 'android') return true;

        try {
            // 1. Fine Location
            const fineLocation = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: "Attendance Tracking",
                    message: "Background location is required to automate your attendance tracking.",
                    buttonPositive: "Accept"
                }
            );
            if (fineLocation !== PermissionsAndroid.RESULTS.GRANTED) return false;

            // 2. Background Permission (Crucial for Kill Mode)
            if (Platform.Version >= 29) {
                const backgroundLocation = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
                    {
                        title: "Allow Background Activity",
                        message: "Please select 'Allow all the time' to ensure tracking works when the app is closed.",
                        buttonPositive: "Settings"
                    }
                );
            }

            // 3. Post Notifications (Android 13+)
            if (Platform.Version >= 33) {
                await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
            }

            return true;
        } catch (err) {
            console.warn("[LocationTracker] Permission Error:", err);
            return false;
        }
    };

    return null;
};

export default LocationTracker;
