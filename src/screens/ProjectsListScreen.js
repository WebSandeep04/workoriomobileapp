import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    ActivityIndicator,
    Modal,
    ScrollView,
    Animated,
    Pressable,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';

import {
    fetchProjects,
    fetchProjectOptions,
    toggleProjectFavourite,
    updateProjectStatus,
    clearProjectMessages,
} from '../store/slices/projectsSlice';
import { styles } from '../css/ProjectsStyles';
import Header from '../components/Header';

export default function ProjectsListScreen({ navigation }) {
    const dispatch = useDispatch();
    const { projects, options, loading, error } = useSelector(state => state.projects);

    // Filtering Local State
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState({ id: '', name: 'All Customers' });
    const [selectedService, setSelectedService] = useState({ id: '', name: 'All Services' });
    const [isStarred, setIsStarred] = useState(false); // All vs Starred Tab

    // Modal Selector Local States (Translating Web Selectors into Mobile-Native Bottom Sheet Picker overlays)
    const [pickerType, setPickerType] = useState(null); // 'customer' | 'service' | 'status' | null
    const [activeStatusPickerProj, setActiveStatusPickerProj] = useState(null); // Current project changing status

    // Initial Load
    useEffect(() => {
        dispatch(fetchProjectOptions());
        loadProjects();
    }, [isStarred, selectedCustomer, selectedService]);

    const loadProjects = useCallback(() => {
        dispatch(fetchProjects({
            page: 1,
            search: search,
            customerId: selectedCustomer.id,
            serviceId: selectedService.id,
            isStarred: isStarred
        }));
    }, [dispatch, search, selectedCustomer, selectedService, isStarred]);

    useFocusEffect(
        useCallback(() => {
            loadProjects();
        }, [loadProjects])
    );

    const handleSearchSubmit = () => {
        loadProjects();
    };

    // Semantic Color Resolvers for Akrati UI
    const getStatusStyle = (status) => {
        const st = status?.toLowerCase();
        if (st === 'completed') return { bg: styles.bgCompleted, text: styles.textCompleted };
        if (st === 'closed') return { bg: styles.bgClosed, text: styles.textClosed };
        return { bg: styles.bgOngoing, text: styles.textOngoing }; // 'Ongoing' Default
    };

    const toggleStarredTab = (tabValue) => {
        setIsStarred(tabValue);
    };

    const handleToggleFav = (projectId) => {
        dispatch(toggleProjectFavourite(projectId));
    };

    const openStatusPicker = (project) => {
        setActiveStatusPickerProj(project);
        setPickerType('status');
    };

    const updateProjStatusAction = (status) => {
        if (activeStatusPickerProj) {
            dispatch(updateProjectStatus({ projectId: activeStatusPickerProj.id, status }));
            setPickerType(null);
            setActiveStatusPickerProj(null);
        }
    };

    // Render Singular Native Card Item
    const renderProjectCard = ({ item }) => {
        const statusStyle = getStatusStyle(item.status);
        const isFav = !!item.is_favourite;
        const progressPercent = Number(item.completed_percentage || 0);

        return (
            <TouchableOpacity
                style={styles.projectCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ProjectDetails', { projectId: item.id, projectName: item.project_name })}
            >
                {/* Interactive Scaled Fav Star Toggle */}
                <TouchableOpacity
                    style={styles.favouriteBtn}
                    onPress={() => handleToggleFav(item.id)}
                >
                    <Ionicons
                        name={isFav ? "star" : "star-outline"}
                        size={20}
                        color={isFav ? "#F59E0B" : "#CBD5E1"}
                    />
                </TouchableOpacity>

                {/* Card Header Block */}
                <View style={styles.cardHeader}>
                    <Text style={styles.projectName} numberOfLines={2}>
                        {item.project_name}
                    </Text>
                </View>

                {/* Customer Info Inline Layout */}
                <View style={styles.customerChip}>
                    <Ionicons name="business-outline" size={14} color="#64748B" />
                    <Text style={styles.customerText} numberOfLines={1}>
                        {item.customer?.company_name || item.customer?.name || 'No Assigned Client'}
                    </Text>
                </View>

                {/* Service Pills Wrapper */}
                {item.service?.name && (
                    <View style={styles.serviceBadge}>
                        <Text style={styles.serviceText}>{item.service.name}</Text>
                    </View>
                )}

                {/* Description Abstract */}
                <Text style={styles.descriptionText} numberOfLines={2}>
                    {item.description || 'No additional project scope outline recorded.'}
                </Text>

                {/* Complex Dynamic Functional Progress Grid */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressLabelRow}>
                        <Text style={styles.metaText}>Project Completeness</Text>
                        <Text style={styles.progressPercent}>{progressPercent}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                    </View>
                </View>

                {/* Bottom Meta Layer with Interactive Status Switch Trigger */}
                <View style={styles.cardMetaRow}>
                    <View style={styles.dateMeta}>
                        <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
                        <Text style={styles.metaText}>
                            {item.start_date ? dayjs(item.start_date).format('DD MMM YYYY') : 'N/A'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.statusPill, statusStyle.bg, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                        onPress={() => openStatusPicker(item)}
                    >
                        <Text style={[styles.statusText, statusStyle.text]}>{item.status || 'ONGOING'}</Text>
                        <Ionicons name="chevron-down" size={10} color={statusStyle.text.color} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    // Bottom Sheet Render Logic
    const renderSelectorModal = () => {
        let title = '';
        let data = [];
        let onSelect = () => { };

        if (pickerType === 'customer') {
            title = 'Filter by Customer';
            data = [{ id: '', name: 'All Customers' }, ...options.customers];
            onSelect = (item) => {
                setSelectedCustomer(item);
                setPickerType(null);
            };
        } else if (pickerType === 'service') {
            title = 'Filter by Service';
            data = [{ id: '', name: 'All Services' }, ...options.services];
            onSelect = (item) => {
                setSelectedService(item);
                setPickerType(null);
            };
        } else if (pickerType === 'status') {
            title = 'Update Project Status';
            data = [{ id: 'Ongoing', name: 'Ongoing' }, { id: 'Completed', name: 'Completed' }, { id: 'Closed', name: 'Closed' }];
            onSelect = (item) => {
                updateProjStatusAction(item.id);
            };
        }

        return (
            <Modal
                visible={!!pickerType}
                transparent
                animationType="slide"
                onRequestClose={() => setPickerType(null)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setPickerType(null)}>
                    <Pressable style={styles.bottomSheet}>
                        <View style={styles.bsDragHandle} />
                        <View style={styles.bsHeader}>
                            <Text style={styles.bsTitle}>{title}</Text>
                            <TouchableOpacity onPress={() => setPickerType(null)}>
                                <Ionicons name="close-circle" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
                            {data.map((item, idx) => (
                                <TouchableOpacity
                                    key={item.id || idx}
                                    style={styles.optionItem}
                                    onPress={() => onSelect(item)}
                                >
                                    <Text style={styles.optionText}>{item.name || item.project_name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        );
    };

    return (
        <View style={styles.mainContainer}>
            <Header title="Project Tracking" />

            {/* Tech Indigo Brand Filter Panel */}
            <View style={styles.filterContainer}>
                <View style={styles.filterHeader}>
                    <Text style={styles.filterTitle}>Quick Slicing Engines</Text>
                    <Ionicons name="filter" size={16} color="#FFF" />
                </View>
                <View style={styles.rowFilters}>
                    {/* Customer Picker Trigger */}
                    <View style={styles.pickerWrapper}>
                        <TouchableOpacity style={styles.pickerTrigger} onPress={() => setPickerType('customer')}>
                            <Text style={styles.pickerText} numberOfLines={1}>{selectedCustomer.name}</Text>
                            <Ionicons name="chevron-down" size={14} color="#434AFA" />
                        </TouchableOpacity>
                    </View>

                    {/* Service Picker Trigger */}
                    <View style={styles.pickerWrapper}>
                        <TouchableOpacity style={styles.pickerTrigger} onPress={() => setPickerType('service')}>
                            <Text style={styles.pickerText} numberOfLines={1}>{selectedService.name}</Text>
                            <Ionicons name="chevron-down" size={14} color="#434AFA" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Multi Tab Actions System + Search Layout */}
            <View style={styles.actionRow}>
                <View style={styles.subTabs}>
                    <TouchableOpacity
                        style={[styles.subTabButton, !isStarred && styles.activeSubTab]}
                        onPress={() => toggleStarredTab(false)}
                    >
                        <Text style={[styles.subTabText, !isStarred && styles.activeSubTabText]}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.subTabButton, isStarred && styles.activeSubTab]}
                        onPress={() => toggleStarredTab(true)}
                    >
                        <Ionicons name="star" size={11} color={isStarred ? "#F59E0B" : "#64748B"} />
                        <Text style={[styles.subTabText, isStarred && styles.activeSubTabText]}>Starred</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={16} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Find projects..."
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={setSearch}
                        onSubmitEditing={handleSearchSubmit}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearch(''); dispatch(fetchProjects({ page: 1, search: '', isStarred })); }}>
                            <Ionicons name="close-circle" size={16} color="#CBD5E1" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Full FlatList Projects Deck */}
            {loading && projects.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#434AFA" />
                </View>
            ) : (
                <FlatList
                    data={projects}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderProjectCard}
                    contentContainerStyle={styles.contentContainer}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={loadProjects} colors={['#434AFA']} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
                            <Text style={styles.emptyText}>No projects match the current active slice filter.</Text>
                        </View>
                    }
                />
            )}

            {/* Unified Sheet Overlay Injection */}
            {renderSelectorModal()}
        </View>
    );
}
