import React from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, FlatList, StyleSheet, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const FormPickerModal = ({ 
    visible, 
    title, 
    data, 
    searchQuery, 
    onSearchChange, 
    onClose, 
    onSelect,
    keyExtractor = (item) => item.id.toString(),
    labelExtractor = (item) => item.name || item.title
}) => {
    const cleanData = data || [];
    const filteredOptions = cleanData.filter(i => 
        labelExtractor(i)?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.sheetContainer, { height: SCREEN_HEIGHT * 0.6 }]}>
                    <View style={styles.sheetGrabber} />
                    <View style={styles.sheetHeader}>
                        <Text style={styles.modalHeaderTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
                            <Ionicons name="close" size={20} color="#1E293B" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.searchWrap}>
                        <Ionicons name="search" size={18} color="#94A3B8" />
                        <TextInput
                            style={styles.searchBox}
                            placeholder="Type to filter..."
                            placeholderTextColor="#94A3B8"
                            value={searchQuery}
                            onChangeText={onSearchChange}
                        />
                    </View>
                    <FlatList
                        data={filteredOptions}
                        keyExtractor={keyExtractor}
                        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={styles.pickerListItem}
                                onPress={() => onSelect(item)}
                            >
                                <Text style={styles.pickerListItemTxt}>{labelExtractor(item)}</Text>
                                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={() => (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: '#94A3B8' }}>No options found matching "{searchQuery}"</Text>
                            </View>
                        )}
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    sheetGrabber: {
        width: 40,
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalHeaderTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    sheetCloseBtn: {
        padding: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
    },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchBox: {
        flex: 1,
        height: 44,
        marginLeft: 8,
        color: '#1E293B',
        fontSize: 15,
    },
    pickerListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    pickerListItemTxt: {
        fontSize: 15,
        color: '#334155',
        fontWeight: '500',
    },
});

export default FormPickerModal;
