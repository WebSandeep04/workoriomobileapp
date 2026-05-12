import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';

const AttendanceTimeline = () => {
    const { movements } = useSelector(state => state.attendance);

    const flattenedMovements = useMemo(() => {
        if (!movements || typeof movements !== 'object' || Object.keys(movements).length === 0) {
            return [];
        }

        // 1. Collect ALL movements from the object values
        const all = [];
        Object.values(movements).forEach(typeGroup => {
            if (Array.isArray(typeGroup)) {
                typeGroup.forEach(m => all.push(m));
            }
        });

        // 2. Sort by time ASC
        all.sort((a, b) => new Date(a.time) - new Date(b.time));

        // 3. Hydrate cycle numbers logic mirroring exactly the web blade implementation
        return all.map(currentMovement => {
            const type = currentMovement.movement_type;
            const typeMovements = movements[type] || [];
            
            let cycleCount = 0;
            let computedCycle = 1;

            for (let i = 0; i < typeMovements.length; i++) {
                const m = typeMovements[i];
                if (type === 'break') {
                    if (m.movement_action === 'start') {
                        cycleCount++;
                        computedCycle = cycleCount;
                    }
                } else {
                    if (m.movement_action === 'in') {
                        cycleCount++;
                        computedCycle = cycleCount;
                    }
                }

                if (m.id === currentMovement.id) {
                    break;
                }
            }

            // Format simple Time (HH:MM AM/PM)
            let timeStr = '-';
            try {
                const d = new Date(currentMovement.time);
                timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            } catch (e) {
                timeStr = currentMovement.time || '-';
            }

            return {
                ...currentMovement,
                cycleNumber: computedCycle,
                formattedTime: timeStr
            };
        });
    }, [movements]);

    const getActionStyle = (action) => {
        const act = String(action).toLowerCase();
        if (act === 'in' || act === 'start') return { color: '#10B981', fontWeight: '600' }; // Green
        return { color: '#EF4444', fontWeight: '600' }; // Red
    };

    if (flattenedMovements.length === 0) {
        return null; // Hide the component if no activity today yet
    }

    return (
        <View style={styles.wrapper}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            <View style={styles.card}>
                {/* Header Row */}
                <View style={styles.headerRow}>
                    <Text style={[styles.headerCell, { flex: 1.2 }]}>TIME</Text>
                    <Text style={[styles.headerCell, { flex: 1 }]}>TYPE</Text>
                    <Text style={[styles.headerCell, { flex: 1 }]}>ACTION</Text>
                    <Text style={[styles.headerCell, { flex: 0.8, textAlign: 'center' }]}>CYCLE</Text>
                </View>

                {/* Data Rows */}
                {flattenedMovements.map((item, index) => (
                    <View 
                        key={item.id || index} 
                        style={[
                            styles.dataRow, 
                            index === flattenedMovements.length - 1 && { borderBottomWidth: 0 }
                        ]}
                    >
                        <Text style={[styles.cellText, { flex: 1.2 }]}>{item.formattedTime}</Text>
                        <Text style={[styles.cellText, { flex: 1, color: '#64748B', fontWeight: '600' }]}>{(item.movement_type || '').toUpperCase()}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={getActionStyle(item.movement_action)}>
                                {item.movement_action.charAt(0).toUpperCase() + item.movement_action.slice(1)}
                            </Text>
                        </View>
                        <Text style={[styles.cellText, { flex: 0.8, textAlign: 'center', color: '#4F46E5', fontWeight: '700' }]}>
                            {item.cycleNumber}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 16,
        paddingBottom: 30,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 12,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        overflow: 'hidden',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    headerRow: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerCell: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 0.5,
    },
    dataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    cellText: {
        fontSize: 13,
        color: '#1E293B',
    }
});

export default AttendanceTimeline;
