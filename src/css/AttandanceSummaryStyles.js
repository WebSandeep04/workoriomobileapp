import { StyleSheet } from 'react-native';

export const COLORS = {
    primary: '#4F46E5',
    white: '#FFFFFF',
    textDark: '#1E293B',
    textGray: '#64748B',
    border: '#F1F5F9',
    background: '#F8FAFC',
    headerBg: '#F1F5F9',
    headerText: '#475569',
    rowEven: '#FFFFFF',
    rowOdd: '#F8FAFC',
    danger: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
};

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 12,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: COLORS.headerBg,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 12,
        minWidth: 960,
    },
    columnHeader: {
        color: COLORS.headerText,
        fontWeight: '700',
        fontSize: 12,
        textAlign: 'center',
        paddingHorizontal: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'center',
        minWidth: 960,
        backgroundColor: '#FFF',
    },
    cell: {
        fontSize: 13,
        color: '#334155',
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    statusBadge: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    center: {
        paddingTop: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 60,
        color: '#94A3B8',
        fontSize: 15,
        width: 960,
        fontWeight: '500',
    },
    footerLoader: {
        paddingVertical: 24,
        alignItems: 'center',
        width: 960
    }
});
