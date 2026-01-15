import { StyleSheet } from 'react-native';

export const COLORS = {
    primary: '#4F46E5', // Indigo
    background: '#F3F4F6', // Cool Gray
    cardBg: '#FFFFFF',
    textDark: '#1F2937',
    textLight: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    secondary: '#9CA3AF',
    border: '#E5E7EB'
};

export const getBadgeColor = (badgeClass) => {
    if (badgeClass?.includes('success')) return COLORS.success;
    if (badgeClass?.includes('warning')) return COLORS.warning;
    if (badgeClass?.includes('danger')) return COLORS.danger;
    return COLORS.secondary;
};

export const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: COLORS.background,
        flexGrow: 1,
        paddingBottom: 40,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: 20,
    },
    header: {
        marginBottom: 24,
        marginTop: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.textDark,
        letterSpacing: -0.5,
    },
    headerDate: {
        fontSize: 16,
        color: COLORS.textLight,
        marginTop: 4,
        fontWeight: '500',
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 5,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textDark,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    timeText: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 20,
        backgroundColor: '#F9FAFB',
        padding: 8,
        borderRadius: 8,
        overflow: 'hidden',
    },
    timeValue: {
        color: COLORS.textDark,
        fontWeight: '600',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    startBtn: {
        backgroundColor: COLORS.primary,
    },
    endBtn: {
        backgroundColor: COLORS.danger,
    },
    disabledButton: {
        backgroundColor: '#E5E7EB',
        opacity: 0.7,
    },
    btnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.textDark,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 15,
        color: COLORS.textLight,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: COLORS.textDark,
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: '#F3F4F6',
    },
    submitBtn: {
        backgroundColor: COLORS.primary,
    },
    modalBtnText: {
        fontWeight: '600',
        fontSize: 16,
    },
    errorText: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.danger,
    },
    messageText: {
        fontSize: 16,
        color: COLORS.textLight,
        textAlign: 'center',
        lineHeight: 24,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        borderRadius: 16
    }
});
