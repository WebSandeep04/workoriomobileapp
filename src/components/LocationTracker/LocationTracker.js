import React, { useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { useSelector, useDispatch } from 'react-redux';
import { syncLocation, setTrackingState } from '../../store/slices/locationSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TRACKING_INTERVAL_MS = 5000;
const OFFLINE_QUEUE_KEY = 'offline_location_queue';

const LocationTracker = () => {
    const timerRef = useRef(null);
    const dispatch = useDispatch();
    const { isAuthenticated, user } = useSelector(state => state.auth);
    const { status, isTrackingEnabled } = useSelector(state => state.attendance);

    // Track if:
    // 1. User is authenticated
    // 2. Office session is active (can_end means we are currently IN) OR Field session is active
    // 3. Tracking is enabled for this user (isTrackingEnabled)
    // 4. User is NOT on break
    const isOfficeActive = status?.office?.can_end;
    const isFieldActive = status?.field?.can_end;
    const isOnBreak = status?.break?.can_end;

    // Use user.is_tracking from Auth as fallback if Attendance state is missing it
    const isTrackingOn = isTrackingEnabled || (user?.is_tracking === 1);

    const shouldTrack = isAuthenticated && user && user.employee_id && (isOfficeActive || isFieldActive) && isTrackingOn && !isOnBreak;

    // Debug State Changes (Consolidated)
    useEffect(() => {
        if (shouldTrack) {
            console.log(`[LocationTracker] Active. Mode: ${isOfficeActive ? 'Office' : 'Field'}`);
        } else {
            console.log('[LocationTracker] Inactive. Flags:', { isAuthenticated, hasEmployeeId: !!user?.employee_id, isOfficeActive, isFieldActive, isTrackingOn, userIsTracking: user?.is_tracking });
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
            // Check permissions...
            const hasPermission = await checkPermissions();
            if (hasPermission) {
                startTracking();
                dispatch(setTrackingState(true));
            } else {
                console.warn('[LocationTracker] Permission missing.');
                // Try asking again? Or just wait for user.
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

    const processOfflineQueue = async () => {
        try {
            const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
            const queue = queueStr ? JSON.parse(queueStr) : [];

            if (queue.length === 0) return;

            console.log(`[LocationTracker] Draining offline queue (${queue.length} items)...`);

            // Iterate and send. If one fails, we stop draining to preserve order.
            // (Assuming network failure causes subsequent ones to fail too)
            for (let i = 0; i < queue.length; i++) {
                const item = queue[i];
                try {
                    await dispatch(syncLocation(item)).unwrap();
                    // Success, continue to next
                } catch (error) {
                    // Sync failed for this item. Stop here.
                    // Save remaining items back to storage.
                    const remaining = queue.slice(i);
                    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
                    console.log(`[LocationTracker] Drain paused. ${remaining.length} items remaining.`);
                    return;
                }
            }

            // If loop completes, queue is empty.
            await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
            console.log('[LocationTracker] Offline queue drained successfully.');

        } catch (e) {
            console.error('[LocationTracker] Queue processing error:', e);
        }
    };

    const startTracking = () => {
        stopTracking(); // Ensure clean slate
        console.log('[LocationTracker] Loop Started.');

        timerRef.current = setInterval(() => {
            Geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    const payload = {
                        employee_id: user.employee_id,
                        latitude,
                        longitude,
                        captured_at: new Date().toISOString()
                    };

                    // Try to Sync
                    dispatch(syncLocation(payload))
                        .unwrap()
                        .then(() => {
                            // Success: We have network. Process any backlog.
                            processOfflineQueue();
                        })
                        .catch(async (err) => {
                            console.log('[LocationTracker] Network/Sync Error. Saving to offline queue.');
                            // Failure: Save to offline queue
                            try {
                                const currentQueueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
                                const currentQueue = currentQueueStr ? JSON.parse(currentQueueStr) : [];
                                currentQueue.push(payload);
                                await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(currentQueue));
                            } catch (storeError) {
                                console.error('[LocationTracker] Failed to save offline location', storeError);
                            }
                        });
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
