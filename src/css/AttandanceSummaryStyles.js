import { StyleSheet } from 'react-native';

export const COLORS = {
    primary: '#4F46E5',
    white: '#FFFFFF',
    textDark: '#1E293B',
    textGray: '#64748B',
    border: '#F1F5F9',
    background: '#FFFFFF',
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
    filterBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    filterBtn: {
        width: 36,
        height: 36,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: COLORS.headerBg,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 12,
        minWidth: 1000,
    },
    columnHeader: {
        color: COLORS.headerText,
        fontWeight: '700',
        fontSize: 11,
        textAlign: 'center',
        paddingHorizontal: 4,
        textTransform: 'capitalize',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'center',
        minWidth: 1000,
        backgroundColor: '#FFF',
    },
    cell: {
        fontSize: 12,
        color: '#334155',
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
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
        width: 1000,
        fontWeight: '500',
    },
    footerLoader: {
        paddingVertical: 24,
        alignItems: 'center',
        width: 1000
    }
});
