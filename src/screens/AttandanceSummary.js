import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import Header from '../components/Header';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendanceSummary } from '../store/slices/attendanceSlice';
import { useFocusEffect } from '@react-navigation/native';
import { styles, COLORS } from '../css/AttandanceSummaryStyles';



const AttandanceSummary = () => {
    const dispatch = useDispatch();
    const { summary, loadingSummary, currentPage, lastPage } = useSelector(state => state.attendance);

    useFocusEffect(
        useCallback(() => {
            dispatch(fetchAttendanceSummary(1));
        }, [dispatch])
    );

    const onRefresh = () => {
        dispatch(fetchAttendanceSummary(1));
    };

    const onLoadMore = () => {
        if (!loadingSummary && currentPage < lastPage) {
            dispatch(fetchAttendanceSummary(currentPage + 1));
        }
    };

    const renderHeader = () => (
        <View style={styles.tableHeader}>
            <Text style={[styles.columnHeader, { width: 140 }]}>Date</Text>
            <Text style={[styles.columnHeader, { width: 100 }]}>Status</Text>
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
        // Debugging: Log the item to see available fields
        console.log('Attendance Item:', JSON.stringify(item, null, 2));

        const officeTime = item.formatted_hours?.office || item.formattedHours?.office || item.total_office_time || '-';
        const fieldTime = item.formatted_hours?.field || item.formattedHours?.field || item.total_field_time || '-';
        const totalTime = item.formatted_hours?.total || item.formattedHours?.total || item.total_working_hours || item.total_hours || '-';

        return (
            <View style={[styles.tableRow, { backgroundColor: isEven ? COLORS.rowEven : COLORS.rowOdd }]}>
                <Text style={[styles.cell, { width: 140, fontSize: 13, fontWeight: '600' }]}>{item.display_date || item.date}</Text>
                <Text style={[styles.cell, { width: 100, color: getStatusColor(item.status), fontWeight: '600' }]}>{item.status}</Text>

                <Text style={[styles.cell, { width: 90 }]}>{item.punch_in || '-'}</Text>
                <Text style={[styles.cell, { width: 90 }]}>{item.punch_out || '-'}</Text>

                <Text style={[styles.cell, { width: 90 }]}>{item.field_in || '-'}</Text>
                <Text style={[styles.cell, { width: 90 }]}>{item.field_out || '-'}</Text>

                <Text style={[styles.cell, { width: 100 }]}>{officeTime}</Text>
                <Text style={[styles.cell, { width: 100 }]}>{fieldTime}</Text>
                <Text style={[styles.cell, { width: 100, fontWeight: 'bold', color: COLORS.primary }]}>{totalTime}</Text>
            </View>
        );
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'present': return COLORS.success;
            case 'absent': return COLORS.danger;
            case 'leave': return COLORS.warning;
            case 'half day': return COLORS.warning;
            default: return COLORS.textDark;
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
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View>
                        {renderHeader()}

                        {loadingSummary && currentPage === 1 && !summary.length ? (
                            <View style={[styles.center, { width: 960 }]}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
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
