import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 18,
        marginBottom: 20,
        color: '#6B7280',
    },
    logoutButton: {
        backgroundColor: '#FEE2E2',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    logoutText: {
        color: '#DC2626',
        fontSize: 16,
        fontWeight: '600',
    },
});
