import { StyleSheet } from 'react-native';

export const COLORS = {
    primary: '#434AFA',
    white: '#FFFFFF',
    textDark: '#1F2937',
    textGray: '#6B7280',
    border: '#E5E7EB',
    background: '#F9FAFB',
    headerBg: '#434AFA',
    headerText: '#FFFFFF',
    rowEven: '#F9FAFB',
    rowOdd: '#FFFFFF',
    danger: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
};

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: COLORS.headerBg,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
        marginBottom: 8,
        minWidth: 960,
    },
    columnHeader: {
        color: COLORS.headerText,
        fontWeight: 'bold',
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        alignItems: 'center',
        minWidth: 960,
    },
    cell: {
        fontSize: 13,
        color: COLORS.textDark,
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    center: {
        paddingTop: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: COLORS.textGray,
        fontSize: 16,
        width: 960
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
        width: 960
    }
});
