import React, { useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { useSelector, useDispatch } from 'react-redux';
import { syncLocation, setTrackingState } from '../../store/slices/locationSlice';

const TRACKING_INTERVAL_MS = 5000; // 5 Seconds

const LocationTracker = () => {
    const timerRef = useRef(null);
    const dispatch = useDispatch();
    const { isAuthenticated, user } = useSelector(state => state.auth);
    const { status } = useSelector(state => state.attendance);

    // Track if:
    // 1. User is authenticated
    // 2. Office session is active (can_end means we are currently IN) OR Field session is active
    const isOfficeActive = status?.office?.can_end;
    const isFieldActive = status?.field?.can_end;
    const shouldTrack = isAuthenticated && user && user.employee_id && (isOfficeActive || isFieldActive);

    // Debug State Changes (Consolidated)
    useEffect(() => {
        if (shouldTrack) {
            console.log(`[LocationTracker] Active. Mode: ${isOfficeActive ? 'Office' : 'Field'}`);
        }
    }, [shouldTrack, isOfficeActive]);

    useEffect(() => {
        if (!shouldTrack) {
            if (timerRef.current) {
                console.log('[LocationTracker] Stopping...');
                dispatch(setTrackingState(false));
                stopTracking();
            }
            return;
        }

        const run = async () => {
            const hasPermission = await checkPermissions();
            if (hasPermission) {
                startTracking();
                dispatch(setTrackingState(true));
            } else {
                console.warn('[LocationTracker] Permission missing.');
            }
        };
        run();

        return () => stopTracking();
    }, [shouldTrack]);

    const checkPermissions = async () => {
        if (Platform.OS === 'ios') {
            const auth = await Geolocation.requestAuthorization('whenInUse');
            return auth === 'granted';
        }

        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: "Location Tracking",
                    message: "Required for active attendance tracking.",
                    buttonPositive: "OK"
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    };

    const startTracking = () => {
        stopTracking(); // Ensure clean slate
        console.log('[LocationTracker] Loop Started.');

        timerRef.current = setInterval(() => {
            Geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    // Dispatch Thunk
                    dispatch(syncLocation({
                        employee_id: user.employee_id,
                        latitude,
                        longitude
                    }));
                },
                (error) => {
                    console.error("[LocationTracker] GPS Error:", error.code);
                },
                { enableHighAccuracy: true, timeout: 4000, maximumAge: 2000 }
            );
        }, TRACKING_INTERVAL_MS);
    };

    const stopTracking = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    return null;
};

export default LocationTracker;
