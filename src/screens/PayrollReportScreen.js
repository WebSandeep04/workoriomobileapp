import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    FlatList, 
    ActivityIndicator, 
    Modal
} from 'react-native';
import Header from '../components/Header';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';

const PayrollReportScreen = () => {
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [monthModalVisible, setMonthModalVisible] = useState(false);
    const [tempYear, setTempYear] = useState(new Date().getFullYear());

    const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    useEffect(() => {
        const today = new Date();
        const curYear = today.getFullYear();
        const curMonth = String(today.getMonth() + 1).padStart(2, '0');
        setSelectedMonth(`${curYear}-${curMonth}`);
        setTempYear(curYear);
    }, []);

    useEffect(() => {
        if (selectedMonth) {
            fetchReport();
        }
    }, [selectedMonth]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const [y, m] = selectedMonth.split('-');
            const response = await api.get('/payroll/report', { 
                params: { month: parseInt(m), year: parseInt(y) } 
            });
            if (response.data?.success) {
                setReportData(response.data.data);
            } else {
                Toast.show({ type: 'error', text1: 'Load Failed', text2: response.data?.message || 'Unable to load payroll records.' });
            }
        } catch (error) {
            console.error('[PayrollReport] fetch failed:', error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch report data.' });
        } finally {
            setLoading(false);
        }
    };

    const renderMonthYearPicker = () => {
        return (
            <Modal visible={monthModalVisible} transparent={true} animationType="fade" onRequestClose={() => setMonthModalVisible(false)}>
                <View style={styles.centerModalBg}>
                    <View style={styles.monthCard}>
                        <View style={styles.monthHead}>
                            <TouchableOpacity onPress={() => setTempYear(prev => prev - 1)}>
                                <Ionicons name="chevron-back" size={20} color="#1E293B" />
                            </TouchableOpacity>
                            <Text style={styles.monthYearTxt}>{tempYear}</Text>
                            <TouchableOpacity onPress={() => setTempYear(prev => prev + 1)}>
                                <Ionicons name="chevron-forward" size={20} color="#1E293B" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.monthGrid}>
                            {monthsShort.map((mLabel, idx) => {
                                const target = `${tempYear}-${String(idx+1).padStart(2, '0')}`;
                                const act = selectedMonth === target;
                                return (
                                    <TouchableOpacity 
                                        key={idx} 
                                        style={[styles.monthCell, act && styles.monthCellActive]} 
                                        onPress={() => {
                                            setSelectedMonth(target);
                                            setMonthModalVisible(false);
                                        }}
                                    >
                                        <Text style={[styles.monthCellTxt, act && styles.monthCellTxtActive]}>{mLabel}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity style={styles.calClBtn} onPress={() => setMonthModalVisible(false)}>
                            <Text style={styles.calClBtnTxt}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <View style={styles.mainWrapper}>
            <Header title="Payroll Report" />
            
            <View style={styles.filterToolbar}>
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Payroll Period</Text>
                    <TouchableOpacity style={styles.customTrigger} onPress={() => setMonthModalVisible(true)}>
                        <Ionicons name="calendar-outline" size={16} color="#434AFA" />
                        <Text style={styles.triggerTxt}>
                            {selectedMonth ? `${monthsFull[parseInt(selectedMonth.split('-')[1]) - 1]} ${selectedMonth.split('-')[0]}` : 'Choose Month'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.actionBtn} onPress={fetchReport} disabled={loading}>
                    {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.actionBtnTxt}>Reload</Text>}
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color="#434AFA" />
                </View>
            ) : (
                <FlatList
                    data={reportData}
                    keyExtractor={(item) => item.employee_id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20, color: '#94A3B8'}}>No records found for this period.</Text>}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>{item.employee_name}</Text>
                            <View style={styles.row}>
                                <Text style={styles.label}>Salary:</Text>
                                <Text style={styles.value}>₹{item.base_salary}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Working Days:</Text>
                                <Text style={styles.value}>{item.attendance_summary?.total_working_days || 0}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Present:</Text>
                                <Text style={styles.value}>{item.attendance_summary?.total_present_combined || 0}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Absent:</Text>
                                <Text style={styles.value}>{item.attendance_summary?.days_absent || 0}</Text>
                            </View>
                        </View>
                    )}
                />
            )}
            {renderMonthYearPicker()}
        </View>
    );
};

const styles = StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: '#F1F5F9' },
    filterToolbar: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
    fieldGroup: { flex: 1 },
    fieldLabel: { fontSize: 12, color: '#64748B', marginBottom: 6, fontWeight: '500' },
    customTrigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, height: 40, gap: 8 },
    triggerTxt: { flex: 1, fontSize: 13, color: '#1E293B' },
    actionBtn: { backgroundColor: '#434AFA', height: 40, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 },
    actionBtnTxt: { color: '#FFF', fontSize: 13, fontWeight: '600' },
    card: { backgroundColor: '#FFF', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 1 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    label: { fontSize: 14, color: '#64748B' },
    value: { fontSize: 14, color: '#1E293B', fontWeight: '500' },
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    centerModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    monthCard: { backgroundColor: '#FFF', borderRadius: 12, width: 320, padding: 16, elevation: 4 },
    monthHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    monthYearTxt: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    monthCell: { width: '31%', aspectRatio: 2, justifyContent: 'center', alignItems: 'center', borderRadius: 6, marginBottom: 8, backgroundColor: '#F8FAFC' },
    monthCellActive: { backgroundColor: '#434AFA' },
    monthCellTxt: { fontSize: 13, color: '#475569', fontWeight: '500' },
    monthCellTxtActive: { color: '#FFF' },
    calClBtn: { marginTop: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 6 },
    calClBtnTxt: { fontSize: 14, color: '#475569', fontWeight: '600' }
});

export default PayrollReportScreen;
