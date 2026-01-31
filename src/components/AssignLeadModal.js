import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    TextInput
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { assignLead, fetchTeamMembers } from '../store/slices/leadSlice';
import Ionicons from 'react-native-vector-icons/Ionicons';

const AssignLeadModal = ({ visible, onClose, lead }) => {
    const dispatch = useDispatch();
    const { teamMembers, actionLoading, successMessage } = useSelector((state) => state.lead);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (visible) {
            dispatch(fetchTeamMembers());
            setSelectedUserId(null); // Reset selection
            setSearchQuery('');
        }
    }, [visible, dispatch]);

    const handleSearch = (text) => {
        setSearchQuery(text);
        dispatch(fetchTeamMembers(text));
    };

    useEffect(() => {
        if (successMessage && visible) {
            onClose();
        }
    }, [successMessage, visible, onClose]);

    const handleAssign = () => {
        if (!selectedUserId) {
            alert('Please select a team member');
            return;
        }
        dispatch(assignLead({ lead_id: lead.id, new_user_id: selectedUserId }));
    };

    const renderMember = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.memberItem,
                selectedUserId === item.id && styles.selectedMember
            ]}
            onPress={() => setSelectedUserId(item.id)}
        >
            <Ionicons
                name={selectedUserId === item.id ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={selectedUserId === item.id ? "#434AFA" : "#666"}
            />
            <Text style={[styles.memberName, selectedUserId === item.id && styles.selectedMemberText]}>
                {item.name}
            </Text>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            Assign Lead: {lead?.leads_name}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>


                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#999" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search team members..."
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                    </View>

                    <FlatList
                        data={teamMembers}
                        renderItem={renderMember}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                    />

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.submitButton, !selectedUserId && styles.disabledButton]}
                            onPress={handleAssign}
                            disabled={actionLoading || !selectedUserId}
                        >
                            {actionLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>Assign</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View >
            </View >
        </Modal >
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '60%',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    subHeader: {
        padding: 16,
        fontSize: 14,
        color: '#666',
        backgroundColor: '#f9f9f9',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#f1f1f1',
        marginHorizontal: 16,
        marginBottom: 8,
        marginTop: 16,
        borderRadius: 8,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#333',
    },
    listContent: {
        padding: 10,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectedMember: {
        backgroundColor: '#F0F2FF',
    },
    memberName: {
        marginLeft: 12,
        fontSize: 16,
        color: '#333',
    },
    selectedMemberText: {
        color: '#434AFA',
        fontWeight: 'bold',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    submitButton: {
        backgroundColor: '#434AFA',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default AssignLeadModal;
