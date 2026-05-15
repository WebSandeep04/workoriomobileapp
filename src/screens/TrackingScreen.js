import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Image,
    ScrollView,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import dayjs from 'dayjs';
import api from '../api/client';
import Header from '../components/Header';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- GPS Core Mathematical Filter Functions (Mirroring Web Implementation) ---

// 1. Haversine Distance (meters)
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

// 2. Stationary / Drift Filtration
const filterAndClusterLogs = (locations) => {
    if (!locations || locations.length === 0) return [];

    // Ensure chronological sorting
    const sorted = [...locations].sort((a, b) => new Date(a.tracked_at) - new Date(b.tracked_at));
    
    const filtered = [];
    let prevValid = null;

    sorted.forEach(loc => {
        const lat = parseFloat(loc.latitude);
        const lng = parseFloat(loc.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        if (prevValid) {
            const prevLat = parseFloat(prevValid.latitude);
            const prevLng = parseFloat(prevValid.longitude);
            const dist = getDistanceInMeters(prevLat, prevLng, lat, lng);
            const timeDiff = (new Date(loc.tracked_at) - new Date(prevValid.tracked_at)) / 1000; // secs

            // 1. Minimum Movement Filter: Skip if < 50m, except if 5 minutes stationary have passed
            if (dist < 50 && timeDiff < 300) {
                return;
            }

            // 2. Jitter/Jump Spike Filtration: Speed > 90 km/h (25 m/s) & dist > 150m
            if (timeDiff > 0) {
                const speed = dist / timeDiff;
                if (speed > 25 && dist > 150) {
                    return;
                }
            }
        }

        filtered.push(loc);
        prevValid = loc;
    });

    if (filtered.length <= 2) return filtered;

    // 3. Clustering to Identify Stoppages (same logic as web)
    const clustered = [];
    let i = 0;
    while (i < filtered.length) {
        const startPoint = filtered[i];
        let j = i + 1;
        let clusterSumLat = parseFloat(startPoint.latitude);
        let clusterSumLng = parseFloat(startPoint.longitude);
        let clusterCount = 1;

        while (j < filtered.length) {
            const nextPoint = filtered[j];
            const dist = getDistanceInMeters(
                parseFloat(startPoint.latitude),
                parseFloat(startPoint.longitude),
                parseFloat(nextPoint.latitude),
                parseFloat(nextPoint.longitude)
            );

            if (dist < 50) {
                clusterSumLat += parseFloat(nextPoint.latitude);
                clusterSumLng += parseFloat(nextPoint.longitude);
                clusterCount++;
                j++;
            } else {
                break;
            }
        }

        if (clusterCount > 1) {
            clustered.push({
                ...startPoint,
                latitude: (clusterSumLat / clusterCount).toFixed(8),
                longitude: (clusterSumLng / clusterCount).toFixed(8),
                tracked_at: filtered[j - 1].tracked_at,
                isClusterCentroid: true
            });
        } else {
            clustered.push(startPoint);
        }
        i = j;
    }

    return clustered;
};


export default function TrackingScreen({ navigation }) {
    const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [employees, setEmployees] = useState([]);
    const [allStatusMap, setAllStatusMap] = useState({}); // Tracked global statuses for badges
    
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [loadingList, setLoadingList] = useState(false);

    // Single Employee Detail Scope
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [rawLogs, setRawLogs] = useState([]);

    // --- 1. Data Loaders ---

    // A. Load standard directory with tracking enabled
    const fetchDirectoryList = useCallback(async (showLoading = true) => {
        if (showLoading) setLoadingList(true);
        try {
            const res = await api.get('/employee/tracking/list');
            if (res.data && res.data.success) {
                setEmployees(res.data.data || []);
            }
        } catch (e) {
            console.log('Tracking list error:', e);
        } finally {
            setLoadingList(false);
        }
    }, []);

    // B. Fetch global states to paint Live status colors next to list items
    const fetchGlobalStates = useCallback(async () => {
        try {
            // Fetching all logs for today without employee filter gets us dynamic statuses
            const res = await api.get(`/employee/tracking/logs?date=${selectedDate}`);
            if (res.data && res.data.success) {
                setAllStatusMap(res.data.employee_details || {});
            }
        } catch (e) {
            console.log('Global logs error:', e);
        }
    }, [selectedDate]);

    // C. Fetch single employee log history
    const fetchSingleEmployeeLogs = useCallback(async (empId, showLoading = true) => {
        if (showLoading) setLoadingLogs(true);
        try {
            const res = await api.get(`/employee/tracking/logs?employee_id=${empId}&date=${selectedDate}`);
            if (res.data && res.data.success) {
                setRawLogs(res.data.data || []);
                // Also capture user's current details from this exact trace response
                if (res.data.employee_details && res.data.employee_details[empId]) {
                    setAllStatusMap(prev => ({
                        ...prev,
                        [empId]: res.data.employee_details[empId]
                    }));
                }
            }
        } catch (e) {
            console.log('Single log fetch error:', e);
        } finally {
            setLoadingLogs(false);
        }
    }, [selectedDate]);

    // Bootloaders
    useEffect(() => {
        fetchDirectoryList();
    }, [fetchDirectoryList]);

    useEffect(() => {
        fetchGlobalStates();
        // If viewing a specific employee, reload their traces when date swaps!
        if (selectedEmployee) {
            fetchSingleEmployeeLogs(selectedEmployee.id);
        }
    }, [selectedDate, fetchGlobalStates]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (selectedEmployee) {
            await fetchSingleEmployeeLogs(selectedEmployee.id, false);
        } else {
            await fetchDirectoryList(false);
            await fetchGlobalStates();
        }
        setRefreshing(false);
    }, [selectedEmployee, fetchDirectoryList, fetchGlobalStates, fetchSingleEmployeeLogs]);


    // --- 2. Computation Logic ---

    // Filter client-side employee list
    const filteredEmployees = useMemo(() => {
        if (!searchQuery) return employees;
        const lower = searchQuery.toLowerCase();
        return employees.filter(e => 
            (e.name && e.name.toLowerCase().includes(lower)) ||
            (e.designation && e.designation.toLowerCase().includes(lower))
        );
    }, [employees, searchQuery]);

    // Process Logs for Metrics & Vertical Timeline
    const parsedLogs = useMemo(() => {
        return filterAndClusterLogs(rawLogs);
    }, [rawLogs]);

    const metrics = useMemo(() => {
        let distanceMeters = 0;
        let staysCount = 0;

        for (let idx = 1; idx < parsedLogs.length; idx++) {
            const p1 = parsedLogs[idx - 1];
            const p2 = parsedLogs[idx];
            const dist = getDistanceInMeters(
                parseFloat(p1.latitude), parseFloat(p1.longitude),
                parseFloat(p2.latitude), parseFloat(p2.longitude)
            );
            distanceMeters += dist;
        }

        parsedLogs.forEach(loc => {
            if (loc.isClusterCentroid) staysCount++;
        });

        return {
            distanceKM: (distanceMeters / 1000).toFixed(2),
            stays: staysCount
        };
    }, [parsedLogs]);


    // --- 3. UI Action Handlers ---

    const adjustDate = (days) => {
        const nextDate = dayjs(selectedDate).add(days, 'day').format('YYYY-MM-DD');
        setSelectedDate(nextDate);
    };

    const handleSelectEmployee = (emp) => {
        setSelectedEmployee(emp);
        setRawLogs([]); // Reset instantly to avoid flashing old logs
        fetchSingleEmployeeLogs(emp.id);
    };

    const closeDetails = () => {
        setSelectedEmployee(null);
        setRawLogs([]);
    };


    // --- 4. Inline Render Helpers ---

    const renderStatusBadge = (empId) => {
        const info = allStatusMap[empId];
        const color = info?.color || '#94A3B8';
        const label = info?.current_status || 'Offline';

        let bgColor = '#F1F5F9';
        if (color === '#10B981') bgColor = '#D1FAE5'; // Active Green
        if (color === '#F59E0B') bgColor = '#FEF3C7'; // Break Amber

        return (
            <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
                <View style={[styles.statusDot, { backgroundColor: color }]} />
                <Text style={[styles.statusText, { color: color === '#94A3B8' ? '#64748B' : color }]}>
                    {label.toUpperCase()}
                </Text>
            </View>
        );
    };

    const renderEmployeeCard = ({ item }) => {
        const initials = item.name
            ? item.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
            : 'EM';

        return (
            <TouchableOpacity 
                style={styles.employeeCard}
                activeOpacity={0.75}
                onPress={() => handleSelectEmployee(item)}
            >
                <View style={styles.cardRow}>
                    {item.profile_picture ? (
                        <Image 
                            source={{ uri: `${api.defaults.baseURL.replace('/api', '')}/storage/${item.profile_picture}` }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarTxt}>{initials}</Text>
                        </View>
                    )}

                    <View style={styles.infoBlock}>
                        <Text style={styles.empName}>{item.name}</Text>
                        <Text style={styles.empDesig}>{item.designation || 'Active Tracking Member'}</Text>
                        <View style={{ flexDirection: 'row', marginTop: 5 }}>
                            {renderStatusBadge(item.id)}
                        </View>
                    </View>

                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" style={{ alignSelf: 'center' }} />
                </View>
            </TouchableOpacity>
        );
    };

    // Timeline Renderer
    const renderTimeline = () => {
        if (parsedLogs.length === 0) {
            return (
                <View style={styles.emptyTimeline}>
                    <Ionicons name="analytics-outline" size={48} color="#CBD5E1" />
                    <Text style={styles.emptyTitle}>No History Today</Text>
                    <Text style={styles.emptySub}>No location pings recorded for this employee on {dayjs(selectedDate).format('MMMM D')}.</Text>
                </View>
            );
        }

        return (
            <View style={styles.timelineWrapper}>
                {parsedLogs.map((loc, index) => {
                    const isFirst = index === 0;
                    const isLast = index === parsedLogs.length - 1;
                    const isStop = loc.isClusterCentroid || false;
                    const timeStr = dayjs(loc.tracked_at).format('h:mm A');

                    let nodeColor = '#434AFA'; // Default blue
                    let nodeIcon = 'location';
                    let title = 'Location Node Registered';
                    let sub = `Accuracy ping logged successfully.`;

                    if (isFirst) {
                        nodeColor = '#10B981';
                        nodeIcon = 'play-circle';
                        title = 'Track Sequence Started';
                        sub = `First active movement recorded today.`;
                    } else if (isLast) {
                        nodeColor = '#EF4444';
                        nodeIcon = 'flag';
                        title = 'Latest Node Location';
                        sub = `Current/final reported coordinate.`;
                    } else if (isStop) {
                        nodeColor = '#F59E0B';
                        nodeIcon = 'pause-circle';
                        title = 'Stationary Stoppage / Stay';
                        sub = `Employee clustered in stationary zone.`;
                    }

                    return (
                        <View key={loc.id || index} style={styles.timelineItem}>
                            {/* Vertical Line */}
                            {!isLast && <View style={styles.timelineLine} />}

                            {/* Left Connector Node */}
                            <View style={styles.nodeContainer}>
                                <View style={[styles.nodeCircle, { borderColor: nodeColor, backgroundColor: nodeColor + '15' }]}>
                                    <Ionicons name={nodeIcon} size={14} color={nodeColor} />
                                </View>
                            </View>

                            {/* Right Content Card */}
                            <View style={styles.nodeContent}>
                                <View style={styles.nodeHeaderRow}>
                                    <Text style={styles.nodeTime}>{timeStr}</Text>
                                    {isStop && (
                                        <View style={styles.stopBadge}>
                                            <Text style={styles.stopBadgeTxt}>STAY</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.nodeTitle, { color: isStop ? '#D97706' : '#1E293B' }]}>
                                    {title}
                                </Text>
                                <Text style={styles.nodeCoords}>
                                    Lat: {parseFloat(loc.latitude).toFixed(5)}, Lng: {parseFloat(loc.longitude).toFixed(5)}
                                </Text>
                                <Text style={styles.nodeSub}>{sub}</Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };


    // --- 5. Layout Render Trees ---

    // A. MAIN DIRECTORY VIEW
    const renderDirectoryLayout = () => {
        return (
            <View style={{ flex: 1 }}>
                {/* Date Toggler Sub-Header */}
                <View style={styles.dateBar}>
                    <TouchableOpacity style={styles.dateArrow} onPress={() => adjustDate(-1)}>
                        <Ionicons name="chevron-back" size={20} color="#434AFA" />
                    </TouchableOpacity>
                    <View style={styles.dateLabelBlock}>
                        <Ionicons name="calendar-outline" size={16} color="#64748B" />
                        <Text style={styles.dateLabel}>
                            {dayjs(selectedDate).format('MMM DD, YYYY')}
                            {selectedDate === dayjs().format('YYYY-MM-DD') && " (Today)"}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.dateArrow} onPress={() => adjustDate(1)}>
                        <Ionicons name="chevron-forward" size={20} color="#434AFA" />
                    </TouchableOpacity>
                </View>

                {/* Employee Search Searchbar */}
                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={20} color="#94A3B8" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search active field members..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Active Grid/List */}
                {loadingList ? (
                    <View style={styles.loadingWrapper}>
                        <ActivityIndicator size="large" color="#434AFA" />
                        <Text style={styles.loadingTxt}>Synchronizing Tracking Directory...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredEmployees}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderEmployeeCard}
                        contentContainerStyle={styles.listContainer}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#434AFA']} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyWrapper}>
                                <Ionicons name="people-outline" size={48} color="#CBD5E1" />
                                <Text style={styles.emptyTitle}>No Trackable Staff</Text>
                                <Text style={styles.emptySub}>No active employees have tracking permissions enabled.</Text>
                            </View>
                        }
                    />
                )}
            </View>
        );
    };

    // B. DETAILED TIMELINE LAYOUT
    const renderDetailLayout = () => {
        const initials = selectedEmployee.name
            ? selectedEmployee.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
            : 'EM';
        
        const info = allStatusMap[selectedEmployee.id];
        const color = info?.color || '#94A3B8';
        const label = info?.current_status || 'Offline';

        return (
            <View style={{ flex: 1 }}>
                {/* Breadcrumb Header */}
                <View style={styles.breadcrumbHeader}>
                    <TouchableOpacity style={styles.backLink} onPress={closeDetails}>
                        <Ionicons name="arrow-back" size={20} color="#434AFA" />
                        <Text style={styles.backLinkTxt}>Back to Directory</Text>
                    </TouchableOpacity>
                    <Text style={styles.breadcrumbDate}>
                        {dayjs(selectedDate).format('MMM DD')}
                    </Text>
                </View>

                <ScrollView 
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 60 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#434AFA']} />}
                >
                    {/* Metric Summary Header Card */}
                    <View style={styles.profileHeaderCard}>
                        <View style={styles.profileSummaryRow}>
                            {selectedEmployee.profile_picture ? (
                                <Image 
                                    source={{ uri: `${api.defaults.baseURL.replace('/api', '')}/storage/${selectedEmployee.profile_picture}` }}
                                    style={styles.largeAvatar}
                                />
                            ) : (
                                <View style={styles.largeAvatarPlaceholder}>
                                    <Text style={styles.largeAvatarTxt}>{initials}</Text>
                                </View>
                            )}
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={styles.detailName}>{selectedEmployee.name}</Text>
                                <Text style={styles.detailDesig}>{selectedEmployee.designation || 'Field Executive'}</Text>
                                <View style={{ flexDirection: 'row', marginTop: 6 }}>
                                    {renderStatusBadge(selectedEmployee.id)}
                                </View>
                            </View>
                        </View>

                        {/* Dashboard Metrics Grid */}
                        <View style={styles.metricsGrid}>
                            <View style={styles.metricBox}>
                                <View style={[styles.metricIconWrap, { backgroundColor: '#EEF2FF' }]}>
                                    <Ionicons name="speedometer-outline" size={20} color="#434AFA" />
                                </View>
                                <View style={{ marginLeft: 10 }}>
                                    <Text style={styles.metricLabel}>DISTANCE</Text>
                                    <Text style={styles.metricValue}>{metrics.distanceKM} km</Text>
                                </View>
                            </View>
                            <View style={[styles.dividerLine, { width: 1, height: '60%' }]} />
                            <View style={styles.metricBox}>
                                <View style={[styles.metricIconWrap, { backgroundColor: '#FFFBEB' }]}>
                                    <Ionicons name="pause-circle-outline" size={20} color="#D97706" />
                                </View>
                                <View style={{ marginLeft: 10 }}>
                                    <Text style={styles.metricLabel}>STOPPAGES</Text>
                                    <Text style={styles.metricValue}>{metrics.stays} Stays</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Timeline Logs Container */}
                    <View style={styles.timelineContainerSec}>
                        <View style={styles.secHeader}>
                            <Ionicons name="git-commit-outline" size={18} color="#434AFA" />
                            <Text style={styles.secTitle}>LIVE JOURNEY TIMELINE</Text>
                        </View>

                        {loadingLogs ? (
                            <View style={styles.loadingWrapper}>
                                <ActivityIndicator size="small" color="#434AFA" />
                                <Text style={styles.loadingTxt}>Retrieving Coordinate Traces...</Text>
                            </View>
                        ) : (
                            renderTimeline()
                        )}
                    </View>
                </ScrollView>
            </View>
        );
    };


    return (
        <SafeAreaView edges={['bottom']} style={styles.container}>
            <Header title="Tracking Dashboard" />
            
            {selectedEmployee ? renderDetailLayout() : renderDirectoryLayout()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    
    // Loading & Empty states
    loadingWrapper: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center'
    },
    loadingTxt: {
        marginTop: 12,
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B'
    },
    emptyWrapper: {
        paddingVertical: 100,
        paddingHorizontal: 32,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#475569',
        marginTop: 16
    },
    emptySub: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 18
    },

    // Date Toggler
    dateBar: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    dateArrow: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center'
    },
    dateLabelBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    dateLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        fontFamily: 'System'
    },

    // Search Bar
    searchBox: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 12,
        alignItems: 'center',
        height: 44
    },
    searchIcon: {
        marginRight: 8
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: '#1E293B',
        fontWeight: '600',
        paddingVertical: 0
    },

    // Employee List Cards
    listContainer: {
        padding: 16,
        paddingBottom: 40
    },
    employeeCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F1F5F9'
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#434AFA',
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatarTxt: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800'
    },
    infoBlock: {
        flex: 1,
        marginLeft: 12
    },
    empName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B'
    },
    empDesig: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 2
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 5
    },
    statusText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5
    },

    // Detail Breadcrumb
    breadcrumbHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    backLinkTxt: {
        fontSize: 13,
        fontWeight: '700',
        color: '#434AFA',
        marginLeft: 4
    },
    breadcrumbDate: {
        fontSize: 12,
        fontWeight: '800',
        color: '#94A3B8'
    },

    // Detailed Profile Summary Card
    profileHeaderCard: {
        backgroundColor: '#FFF',
        margin: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 4,
        overflow: 'hidden'
    },
    profileSummaryRow: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center'
    },
    largeAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F1F5F9'
    },
    largeAvatarPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#434AFA',
        alignItems: 'center',
        justifyContent: 'center'
    },
    largeAvatarTxt: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '800'
    },
    detailName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B'
    },
    detailDesig: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 1
    },
    metricsGrid: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#FAFCFF'
    },
    metricBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    dividerLine: {
        backgroundColor: '#E2E8F0'
    },
    metricIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    metricLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 0.5
    },
    metricValue: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E293B',
        marginTop: 1
    },

    // Timeline Sections
    timelineContainerSec: {
        paddingHorizontal: 16,
        marginTop: 8
    },
    secHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16
    },
    secTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#475569',
        letterSpacing: 1,
        marginLeft: 6
    },

    // Timeline Elements
    timelineWrapper: {
        paddingLeft: 8
    },
    timelineItem: {
        flexDirection: 'row',
        paddingBottom: 24,
        position: 'relative'
    },
    timelineLine: {
        position: 'absolute',
        left: 14,
        top: 30,
        bottom: 0,
        width: 2,
        backgroundColor: '#E2E8F0',
        borderStyle: 'dashed',
        // Using borderStyle with borderRadius trick ensures native dashed rendering!
        borderRadius: 1
    },
    nodeContainer: {
        width: 30,
        alignItems: 'center',
        zIndex: 10
    },
    nodeCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2.5,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center'
    },
    nodeContent: {
        flex: 1,
        marginLeft: 16,
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1
    },
    nodeHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    nodeTime: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B'
    },
    stopBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    stopBadgeTxt: {
        fontSize: 8,
        fontWeight: '900',
        color: '#D97706'
    },
    nodeTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginTop: 4
    },
    nodeCoords: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94A3B8',
        marginTop: 2,
        fontFamily: 'System'
    },
    nodeSub: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 4,
        lineHeight: 14
    },

    emptyTimeline: {
        paddingVertical: 40,
        paddingHorizontal: 20,
        alignItems: 'center'
    }
});
