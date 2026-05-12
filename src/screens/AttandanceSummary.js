import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import Header from '../components/Header';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendanceSummary } from '../store/slices/attendanceSlice';
import { useFocusEffect } from '@react-navigation/native';
import { styles, COLORS } from '../css/AttandanceSummaryStyles';
import Ionicons from 'react-native-vector-icons/Ionicons';



const AttandanceSummary = () => {
    const dispatch = useDispatch();
    const { summary, loadingSummary, currentPage, lastPage } = useSelector(state => state.attendance);
    const [currentDate, setCurrentDate] = useState(new Date());

    const loadData = useCallback((pageNum = 1) => {
        const month = currentDate.getMonth() + 1; // 1-indexed
        const year = currentDate.getFullYear();
        dispatch(fetchAttendanceSummary({ page: pageNum, month, year }));
    }, [currentDate, dispatch]);

    useFocusEffect(
        useCallback(() => {
            loadData(1);
        }, [loadData])
    );

    // React to date changes automatically
    useEffect(() => {
        loadData(1);
    }, [loadData]);

    const onRefresh = () => {
        loadData(1);
    };

    const onLoadMore = () => {
        if (!loadingSummary && currentPage < lastPage) {
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();
            dispatch(fetchAttendanceSummary({ page: currentPage + 1, month, year }));
        }
    };

    const changeMonth = (increment) => {
        const next = new Date(currentDate);
        next.setMonth(next.getMonth() + increment);
        
        // Optional: Don't allow going past current month in future?
        // if (next > new Date()) return;

        setCurrentDate(next);
    };

    const formattedMonthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const renderHeader = () => (
        <View style={styles.tableHeader}>
            <Text style={[styles.columnHeader, { width: 140 }]}>Date</Text>
            <Text style={[styles.columnHeader, { width: 140 }]}>Status</Text>
            <Text style={[styles.columnHeader, { width: 90 }]}>Punch In</Text>
            <Text style={[styles.columnHeader, { width: 90 }]}>Punch Out</Text>
            <Text style={[styles.columnHeader, { width: 90 }]}>Field In</Text>
            <Text style={[styles.columnHeader, { width: 90 }]}>Field Out</Text>
            <Text style={[styles.columnHeader, { width: 100 }]}>Office Total</Text>
            <Text style={[styles.columnHeader, { width: 100 }]}>Field Total</Text>
            <Text style={[styles.columnHeader, { width: 100 }]}>Total Working</Text>
        </View>
    );

    const renderItem = ({ item, index }) => {
        const isEven = index % 2 === 0;
        const rowBg = isEven ? COLORS.rowEven : COLORS.rowOdd;
        const statusColor = getStatusColor(item.status);

        const officeTime = item.formatted_hours?.office || item.formattedHours?.office || item.total_office_time || '-';
        const fieldTime = item.formatted_hours?.field || item.formattedHours?.field || item.total_field_time || '-';
        const totalTime = item.formatted_hours?.total || item.formattedHours?.total || item.total_working_hours || item.total_hours || '-';

        return (
            <View style={[styles.tableRow, { backgroundColor: rowBg }]}>
                <Text style={[styles.cell, { width: 140, fontSize: 12, fontWeight: '600', textAlign: 'left', paddingLeft: 12, color: '#1E293B' }]}>{item.display_date || item.date}</Text>
                <View style={{ width: 140 }}>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15`, width: '90%' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{item.status || 'N/A'}</Text>
                    </View>
                </View>

                <Text style={[styles.cell, { width: 90 }]}>{item.punch_in || '-'}</Text>
                <Text style={[styles.cell, { width: 90 }]}>{item.punch_out || '-'}</Text>

                <Text style={[styles.cell, { width: 90 }]}>{item.field_in || '-'}</Text>
                <Text style={[styles.cell, { width: 90 }]}>{item.field_out || '-'}</Text>

                <Text style={[styles.cell, { width: 100, fontWeight: '600' }]}>{officeTime}</Text>
                <Text style={[styles.cell, { width: 100, fontWeight: '600' }]}>{fieldTime}</Text>
                <Text style={[styles.cell, { width: 100, color: COLORS.primary, fontWeight: '700' }]}>{totalTime}</Text>
            </View>
        );
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'present': return COLORS.success;
            case 'absent': return COLORS.danger;
            case 'leave': return COLORS.warning;
            case 'half day': return COLORS.warning;
            case 'late': return '#F97316'; // Orange
            case 'holiday': return '#8B5CF6'; // Violet
            case 'weekoff': return '#64748B'; // Slate Gray
            default: return '#475569';
        }
    };

    const renderFooter = () => {
        if (!loadingSummary || currentPage === 1) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator color={COLORS.primary} />
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <Header title="Attendance Summary" />

            <View style={styles.container}>
                {/* Period Filter Bar */}
                <View style={styles.filterBar}>
                    <TouchableOpacity style={styles.filterBtn} onPress={() => changeMonth(-1)}>
                        <Ionicons name="chevron-back" size={20} color="#64748B" />
                    </TouchableOpacity>
                    
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                        <Text style={styles.filterLabel}>{formattedMonthYear}</Text>
                        {loadingSummary && <ActivityIndicator size="small" color={COLORS.primary} />}
                    </View>
                    
                    <TouchableOpacity style={styles.filterBtn} onPress={() => changeMonth(1)}>
                        <Ionicons name="chevron-forward" size={20} color="#64748B" />
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View>
                        {renderHeader()}

                        {loadingSummary && currentPage === 1 ? (
                            <View style={[styles.center, { width: 1000 }]}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                                <Text style={{ marginTop: 12, color: '#64748B', fontSize: 14, fontWeight: '500' }}>Fetching records...</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={summary}
                                keyExtractor={(item, index) => index.toString()}
                                renderItem={renderItem}
                                refreshControl={<RefreshControl refreshing={loadingSummary && currentPage === 1} onRefresh={onRefresh} />}
                                onEndReached={onLoadMore}
                                onEndReachedThreshold={0.5}
                                ListFooterComponent={renderFooter}
                                ListEmptyComponent={<Text style={styles.emptyText}>No attendance records found.</Text>}
                                contentContainerStyle={{ paddingBottom: 20 }}
                            />
                        )}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
};



export default AttandanceSummary;
