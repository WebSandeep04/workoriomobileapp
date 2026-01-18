import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const COLORS = {
    primary: '#434AFA', // Indigo
    white: '#FFFFFF',
    textDark: '#1F2937',
    textGray: '#6B7280',
    border: '#E5E7EB',
    background: '#F9FAFB',
    danger: '#EF4444',
};

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    // Header is now handled by component, this is likely unused but keeping if needed for other specifics
    header: {
        padding: 16,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textDark,
    },
    // Tabs - Matched to ApplyLeaveStyles
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: 0, // Resetting paddingBottom from previous style
    },
    tabButton: { // Renamed from tab to match Task.js but styling like ApplyLeave
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
        borderRadius: 0, // Reset radius
        marginRight: 0, // Reset margin
        backgroundColor: 'transparent', // Reset bg
    },
    activeTabButton: {
        backgroundColor: 'transparent',
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textGray,
    },
    activeTabText: {
        color: COLORS.primary,
    },
    listContainer: {
        padding: 16,
    },
    taskCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textDark,
        flex: 1,
        marginRight: 8,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#FEF2F2',
    },
    priorityText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.danger,
    },
    taskDescription: {
        fontSize: 14,
        color: COLORS.textGray,
        marginBottom: 12,
    },
    taskFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.white,
    },
    dateText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '90%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textDark,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: COLORS.textDark,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    pickerButton: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    submitButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
    disabledButton: {
        opacity: 0.7,
    },
    errorText: {
        color: COLORS.danger,
        textAlign: 'center',
        marginVertical: 10,
    },
    // Details Modal
    detailRow: {
        marginBottom: 16,
    },
    detailLabel: {
        fontSize: 12,
        color: COLORS.textGray,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 16,
        color: COLORS.textDark,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 12,
        color: COLORS.textDark,
    },
    remarkCard: {
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    remarkText: {
        fontSize: 14,
        color: '#374151',
    },
    remarkMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    remarkUser: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#4B5563',
    },
    remarkDate: {
        fontSize: 12,
        color: '#9CA3AF',
    },
});
