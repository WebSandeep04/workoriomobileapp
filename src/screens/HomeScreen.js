import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Modal,
    Linking,
    TouchableOpacity,
    TextInput,
    Dimensions,
    StatusBar,
    Pressable
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import dayjs from 'dayjs';

import { fetchAttendanceStatus, fetchBirthdays, fetchHolidays } from '../store/slices/attendanceSlice';
import { AuthContext } from '../navigation/AuthContext';
import { mobileMenuConfig } from '../navigation/menuConfig';

import AttendanceCard from '../components/AttendanceCard';
import WishThem from '../components/WishThem';
import UpcomingHolidays from '../components/UpcomingHolidays';
import Header from '../components/Header';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- Standard Bootstrap Vector Icon Map (Ensured 100% Reliable Universal Android/iOS Glyphs) ---
const BOOTSTRAP_ICON_MAP = {
    'bi bi-house': 'home-outline',
    'bi bi-cart': 'cart-outline',
    'bi bi-collection': 'layers-outline',
    'bi bi-person': 'person-outline',
    'bi bi-people': 'people-outline',
    'bi bi-person-check': 'checkmark-circle-outline',
    'bi bi-bell': 'notifications-outline', // Solid compatibility
    'bi bi-bag': 'briefcase-outline',
    'bi bi-trash': 'trash-outline',
    'bi bi-telephone-outbound': 'call-outline',
    'bi bi-list-task': 'list-outline',
    'bi bi-megaphone': 'megaphone-outline',
    'bi bi-lock': 'lock-closed-outline',
    'bi bi-stars': 'star-outline', // Highly compatible star fallback
    'bi bi-calendar-date': 'calendar-outline',
    'bi bi-person-plus': 'person-add-outline',
    'bi bi-person-workspace': 'briefcase-outline',
    'bi bi-kanban': 'grid-outline',
    'bi bi-arrow-repeat': 'repeat-outline',
    'bi bi-geo-alt': 'location-outline',
    'bi bi-clock': 'time-outline',
    'bi bi-clipboard-check': 'checkbox-outline',
    'bi bi-clock-history': 'time-outline',
    'bi bi-calendar3': 'calendar-outline',
    'bi bi-person-badge': 'card-outline',
    'bi bi-card-list': 'list-outline',
    'bi bi-calendar-minus': 'calendar-outline',
    'bi bi-file-earmark-bar-graph': 'stats-chart-outline',
    'bi bi-cash-stack': 'wallet-outline',
    'bi bi-box-seam': 'cube-outline',
    'bi bi-envelope': 'mail-outline',
    'bi bi-diagram-3': 'git-network-outline',
    'bi bi-check2-circle': 'checkmark-circle-outline',
    'bi bi-check2-square': 'checkbox-outline',
    'bi bi-calendar-check': 'calendar-outline',
    'bi bi-camera': 'camera-outline'
};

// --- Google Pay Inspired Pastel Color Palette (Fallbacks) ---
const GPAY_COLORS = [
    '#3B82F6', // Premium Tech Blue
    '#F59E0B', // Soft Amber
    '#10B981', // Emerald Green
    '#EF4444', // Vibrant Red
    '#8B5CF6', // Deep Violet
    '#EC4899', // Rose Pink
    '#06B6D4', // Deep Cyan
    '#6366F1'  // Classic Indigo
];

// --- Intelligent SaaS Color Semantic Engine ---
const getItemColor = (title, route, index) => {
    const lowerTitle = title?.toLowerCase() || '';
    const lowerRoute = route?.toLowerCase() || '';

    // Danger/Junk Filter
    if (lowerRoute.includes('junk') || lowerTitle.includes('junk') || lowerRoute.includes('trash')) return '#EF4444';

    // Sales, Leads & CRM (Violet/Pink Suite)
    if (lowerTitle.includes('lead') || lowerRoute.includes('lead') || lowerTitle.includes('sales') || lowerRoute.includes('indiamart')) return '#8B5CF6';

    // Communications & Calling (Teal/Cyan Suite)
    if (lowerRoute.includes('calling') || lowerTitle.includes('call') || lowerTitle.includes('campaign')) return '#06B6D4';

    // Task, Logs & Organization (Amber/Orange Suite)
    if (lowerRoute.includes('task') || lowerTitle.includes('task') || lowerTitle.includes('timesheet') || lowerRoute.includes('worklog')) return '#F59E0B';

    // Presence & Performance Tracking (Indigo/Blue Suite)
    if (lowerRoute.includes('track') || lowerRoute.includes('geo') || lowerTitle.includes('gps')) return '#3B82F6';
    if (lowerTitle.includes('calendar') || lowerRoute.includes('calendar')) return '#6366F1';
    if (lowerRoute.includes('employee') || lowerTitle.includes('employee') || lowerRoute.includes('master')) return '#4F46E5';

    // Cash, Approvals & Financials (Emerald Green Suite)
    if (lowerRoute.includes('cash') || lowerRoute.includes('pay') || lowerTitle.includes('money')) return '#059669';
    if (lowerRoute.includes('approve') || lowerTitle.includes('approve') || lowerRoute.includes('renewal') || lowerTitle.includes('subs')) return '#10B981';
    if (lowerRoute.includes('attendance') || lowerTitle.includes('attendance')) return '#0D9488';

    // Default Cyclic Fallback
    return GPAY_COLORS[index % GPAY_COLORS.length];
};

const getIcon = (raw) => {
    if (!raw) return 'cube-outline';
    return BOOTSTRAP_ICON_MAP[raw] || 'cube-outline';
};

// --- Dynamic Showcase Metadata for Dashboard Sections ---
const SECTION_SPOTLIGHT_METADATA = {
    'admin_sales_operational': {
        tag: 'Sales Workbench',
        desc: 'Track conversions, lead pipelines, and manage outreach channels.',
        icon: 'trending-up-outline',
        color: '#8B5CF6'
    },
    'admin_tele_calling': {
        tag: 'Active Campaigns',
        desc: 'Execute outbound calls, verify outcomes, and track conversions.',
        icon: 'call-outline',
        color: '#06B6D4'
    },
    'admin_worklog_operational': {
        tag: 'Timesheet Console',
        desc: 'Maintain transparent worklogs and review weekly productivity records.',
        icon: 'time-outline',
        color: '#F59E0B'
    },
    'admin_tasks': {
        tag: 'Priority Hub',
        desc: 'Manage assigned assignments, timelines, and urgent notifications.',
        icon: 'checkmark-done-circle-outline',
        color: '#EF4444'
    },
    'admin_attendance_operational': {
        tag: 'Attendance Log',
        desc: 'Monitor clock-in states, track shift metrics, and manage leave balances.',
        icon: 'calendar-outline',
        color: '#10B981'
    },
    'admin_reports': {
        tag: 'Business Analytics',
        desc: 'Generate insightful data visualisations and team report cards.',
        icon: 'stats-chart-outline',
        color: '#3B82F6'
    },
    'approvals_section': {
        tag: 'Authority Desk',
        desc: 'Approve vouchers, attendance overrides, and critical request queues.',
        icon: 'shield-checkmark-outline',
        color: '#059669'
    }
};

const DEFAULT_SPOTLIGHT = {
    tag: 'Operations Console',
    desc: 'Access all underlying modules, tools and operations controls.',
    icon: 'cube-outline',
    color: '#6366F1'
};


export default function HomeScreen({ navigation }) {
    const dispatch = useDispatch();
    const { loading, birthdays, holidays } = useSelector(state => state.attendance);
    const { versionMismatch } = useSelector(state => state.auth);

    // Consume Unified RBAC AuthContext
    const { user, permissions = [], featureFlags = {} } = useContext(AuthContext);
    const isAdmin = (user?.role_name?.toLowerCase() === 'admin') || (Number(user?.role_id) === 1);

    // Interactive Searching
    const [searchQuery, setSearchQuery] = useState('');

    // Toggle Slide-up Unified Special Events Hub Modal (Wishes + Holidays)
    // const [showEventsHub, setShowEventsHub] = useState(false);

    // Dynamic Greetings
    const greeting = useMemo(() => {
        const hrs = new Date().getHours();
        if (hrs < 12) return 'Good Morning';
        if (hrs < 17) return 'Good Afternoon';
        return 'Good Evening';
    }, []);

    const loadData = useCallback(() => {
        dispatch(fetchAttendanceStatus());
        dispatch(fetchBirthdays());
        dispatch(fetchHolidays());
    }, [dispatch]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const handleUpdate = () => {
        Linking.openURL('https://app.workorio.com/download');
    };

    // --- COMPUTE DYNAMIC ACCESSIBLE MODULE GRIDS ---
    const dynamicDashboard = useMemo(() => {
        const standaloneItems = [];
        const resolvedSections = [];
        const searchLower = searchQuery.toLowerCase().trim();

        mobileMenuConfig.forEach(section => {
            // Skip dashboard root pointing back to home on the actual home screen
            if (section.key === 'admin_dashboard_root') return;

            // 1. Feature flag check
            if (section.feature_flag && !featureFlags[section.feature_flag]) return;

            // 2. Direct Single Screen Item (Dropdown-Free) -> COLLECT IN FLAT STANDALONES ARRAY
            if ((section.route || section.name) && !section.items) {
                const hasDirectPermission = isAdmin || !section.permission || permissions.includes(section.permission);
                const matchesDirectRole = isAdmin || !section.roles || (user?.role_name && section.roles.includes(user.role_name));

                if (hasDirectPermission && matchesDirectRole) {
                    const matchesSearch = !searchLower || section.title.toLowerCase().includes(searchLower);
                    if (matchesSearch) {
                        standaloneItems.push({
                            key: section.key,
                            title: section.title,
                            route: section.route || section.name,
                            icon: section.icon
                        });
                    }
                }
                return;
            }

            // 3. Nested Submenu Block
            if (section.items) {
                const permittedSubItems = section.items.filter(subItem => {
                    if (subItem.feature_flag && !featureFlags[subItem.feature_flag]) return false;
                    if (isAdmin) return true;
                    if (subItem.condition && !user?.[subItem.condition]) return false;
                    if (subItem.roles && (!user?.role_name || !subItem.roles.includes(user.role_name))) return false;
                    if (subItem.permission && !permissions.includes(subItem.permission)) return false;
                    return true;
                });

                if (permittedSubItems.length === 0) return;

                const filteredSubItems = searchLower
                    ? permittedSubItems.filter(sub => sub.title.toLowerCase().includes(searchLower))
                    : permittedSubItems;

                const showSection = !searchLower ||
                    section.title.toLowerCase().includes(searchLower) ||
                    filteredSubItems.length > 0;

                if (showSection) {
                    resolvedSections.push({
                        key: section.key,
                        isStandalone: false,
                        title: section.title,
                        icon: section.icon,
                        items: section.title.toLowerCase().includes(searchLower) ? permittedSubItems : filteredSubItems
                    });
                }
            }
        });

        return { standaloneItems, resolvedSections };
    }, [permissions, featureFlags, isAdmin, user, searchQuery]);

    // Map birthday widgets
    const wishes = useMemo(() => {
        return (birthdays || []).map((b, index) => ({
            id: b.id || index,
            name: b.name,
            type: "B'DAY",
            dob: b.dob,
            image: b.image,
        }));
    }, [birthdays]);

    const totalShortcutsCount = useMemo(() => {
        const { standaloneItems, resolvedSections } = dynamicDashboard;
        let count = standaloneItems.length;
        resolvedSections.forEach(sec => {
            count += (sec.items?.length || 0);
        });
        return count;
    }, [dynamicDashboard]);


    // --- PREMIUM MODERN SPOTLIGHT CARDS INJECTOR ---
    const renderSectionBanner = (section) => {
        const meta = SECTION_SPOTLIGHT_METADATA[section.key] || DEFAULT_SPOTLIGHT;
        
        return (
            <View style={[
                styles.spotlightCard, 
                { backgroundColor: `${meta.color}0A`, borderLeftColor: meta.color }
            ]}>
                <View style={styles.spotlightContent}>
                    <View style={[styles.spotlightTag, { backgroundColor: `${meta.color}1A` }]}>
                        <Text style={[styles.spotlightTagText, { color: meta.color }]}>{meta.tag}</Text>
                    </View>
                    <Text style={styles.spotlightDesc} numberOfLines={2}>
                        {meta.desc}
                    </Text>
                </View>
                
                {/* Faded oversized icon abstract bg accent */}
                <View style={styles.spotlightGraphic}>
                    <Ionicons name={meta.icon} size={54} color={`${meta.color}20`} />
                </View>
            </View>
        );
    };

    // --- GOOGLE PAY STYLE CONCENTRIC CIRCLE SHORTCUT RENDERER ---
    const renderModuleCircle = (title, route, iconRaw, index) => {
        const color = getItemColor(title, route, index);

        return (
            <TouchableOpacity
                key={`${route}_${title}`}
                style={styles.gpayCircleCard}
                activeOpacity={0.75}
                onPress={() => navigation.navigate(route)}
            >
                {/* Solid Static Bright Colored Circle Icon Block */}
                <View style={[
                    styles.gpayOuterRing,
                    { backgroundColor: color }
                ]}>
                    <Ionicons name={getIcon(iconRaw)} size={22} color="#FFFFFF" />
                </View>

                {/* Fixed-Height Label Wrapper to ensure perfect row-baseline grids */}
                <View style={styles.labelWrapper}>
                    <Text style={styles.gpayCircleLabel} numberOfLines={2}>{title}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
            <Header title="Dashboard" subtitle={dayjs().format('dddd, MMMM D')} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 60 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={['#434AFA']} />}
            >
                {/* 1. Searchbox */}
                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={20} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search apps and features..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* 3. Primary Action Widget */}
                <View style={styles.attendanceWidgetWrap}>
                    <AttendanceCard />
                </View>

                {/* 4. Google Pay Themed Dynamic Circle Grid */}
                <View style={styles.shortcutsWrap}>
                    {dynamicDashboard.standaloneItems.length === 0 && dynamicDashboard.resolvedSections.length === 0 ? (
                        <View style={styles.emptyDashboard}>
                            <Ionicons name="apps-outline" size={44} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>No Apps Matched</Text>
                            <Text style={styles.emptySub}>No active permissions or modules matching "{searchQuery}" were found.</Text>
                        </View>
                    ) : (
                        <>
                            {/* A. Multiple Non-Dropdown Standalone Apps grouped in same Row */}
                            {dynamicDashboard.standaloneItems.length > 0 && (
                                <View style={styles.gpaySectionBlock}>
                                    {/* Faint Background Vector Watermark */}
                                    <View style={styles.sectionWatermarkBox} pointerEvents="none">
                                        <Ionicons 
                                            name="apps-outline" 
                                            size={140} 
                                            color="#434AFA" 
                                            style={{ opacity: 0.04, transform: [{ rotate: '-12deg' }] }} 
                                        />
                                    </View>

                                    <Text style={styles.gpaySectionHeading}>Core Actions</Text>
                                    <View style={styles.gpayCirclesGrid}>
                                        {dynamicDashboard.standaloneItems.map((item, index) =>
                                            renderModuleCircle(item.title, item.route, item.icon, index)
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* B. Dropdown Groups */}
                            {dynamicDashboard.resolvedSections.map((sec) => {
                                const sectionColor = SECTION_SPOTLIGHT_METADATA[sec.key]?.color || '#6366F1';
                                const sectionIcon = SECTION_SPOTLIGHT_METADATA[sec.key]?.icon || getIcon(sec.icon);

                                return (
                                    <View key={sec.key} style={styles.gpaySectionBlock}>
                                        
                                        {/* Soft Category Watermark Accent */}
                                        <View style={styles.sectionWatermarkBox} pointerEvents="none">
                                            <Ionicons 
                                                name={sectionIcon} 
                                                size={140} 
                                                color={sectionColor} 
                                                style={{ opacity: 0.04, transform: [{ rotate: '-12deg' }] }} 
                                            />
                                        </View>

                                        <Text style={styles.gpaySectionHeading}>{sec.title}</Text>
                                        {renderSectionBanner(sec)}
                                        <View style={styles.gpayCirclesGrid}>
                                            {(sec.items || []).map((child, childIdx) =>
                                                renderModuleCircle(child.title, child.route, child.icon, childIdx)
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </>
                    )}
                </View>

                <View style={styles.eventsContent}>

    {wishes.length > 0 && (
        <>
            <Text style={styles.eventsSubHeading}>
                Birthdays
            </Text>

            <View style={styles.eventsInnerCard}>
                <WishThem
                    wishes={wishes}
                    title=""
                />
            </View>
        </>
    )}

    {holidays?.length > 0 && (
        <>
            <Text
                style={[
                    styles.eventsSubHeading,
                    { marginTop: 12 }
                ]}
            >
                Upcoming Holidays
            </Text>

            <View style={styles.eventsInnerCard}>
                <UpcomingHolidays
                    holidays={holidays}
                />
            </View>
        </>
    )}

</View>

            </ScrollView>
                    
            

            {/* Application Version Lock Overlay */}
            <Modal
                transparent={true}
                animationType="fade"
                visible={!!versionMismatch}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.updateModal}>
                        <Ionicons name="cloud-download-outline" size={48} color="#4f46e5" />
                        <Text style={styles.updateTitle}>Upgrade Recommended</Text>
                        <Text style={styles.updateMsg}>
                            A vital system performance patch is available. Please update to the latest client revision.
                        </Text>
                        <TouchableOpacity
                            style={styles.updateBtn}
                            activeOpacity={0.85}
                            onPress={handleUpdate}
                        >
                            <Text style={styles.updateBtnTxt}>Download Revision</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Single Unified Floating Special Events Hub Pill (Left-Edge) */}
            {/* Placed AT THE ABSOLUTE END of JSX tree to guarantee physical topmost stacking layer in native renderers */}
            {/* {(wishes.length > 0 || (holidays && holidays.length > 0)) && (
                <TouchableOpacity
                    style={styles.floatingHubBtn}
                    activeOpacity={0.75}
                    hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }} // Enhances hit box dramatically
                    onPress={() => {
                        console.log("[EventsHub] Activator pill clicked!");
                        setShowEventsHub(true);
                    }}
                >
                    <Ionicons name="sparkles-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
            )} */}
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#FFFFFF' },

    eventsSection: {
    marginTop: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
},

eventsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
},

eventsCard: {
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: -20,
    padding: 0,
},

eventsContent: {
    marginTop: 4,
},

eventsSubHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 1,
    textTransform: 'capitalize',
    marginBottom: 10,
    marginLeft: 16,
},

eventsInnerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 12,
    marginBottom: 4,
},

    // Hero Header
    heroSection: {
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    greeting: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600'
    },
    userName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1E293B',
        marginTop: 1
    },
    userRole: {
        fontSize: 9,
        fontWeight: '800',
        color: '#434AFA',
        letterSpacing: 1,
        marginTop: 4,
        textTransform: 'capitalize'
    },
    statBubble: {
        backgroundColor: '#EEF2FF',
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E7FF'
    },
    statNum: {
        fontSize: 18,
        fontWeight: '800',
        color: '#434AFA'
    },
    statLbl: {
        fontSize: 8,
        fontWeight: '700',
        color: '#6366F1',
        textTransform: 'capitalize'
    },

    // Search Block
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 12,
        height: 44
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#1E293B',
        marginLeft: 8,
        paddingVertical: 0
    },

    // Attendance widget padding adjustment
    attendanceWidgetWrap: {
        marginTop: 16
    },

    // Dynamic Shortcuts wrap
    shortcutsWrap: {
        marginTop: 20,
        paddingHorizontal: 16
    },
    // --- Google Pay UI Style Section ---
    gpaySectionBlock: {
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
    },
    sectionWatermarkBox: {
        position: 'absolute',
        bottom: -25,
        right: -25,
        zIndex: 0,
    },
    gpaySectionHeading: {
        fontSize: 12,
        fontWeight: '800',
        color: '#000000',
        letterSpacing: 1,
        marginBottom: 16,
        textTransform: 'capitalize'
    },
    gpayCirclesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap'
    },
    gpayCircleCard: {
        width: (SCREEN_WIDTH - 32) / 4, // Gorgeous 4-column responsive distribution
        alignItems: 'center',
        marginBottom: 20
    },
    gpayOuterRing: {
        width: 58,
        height: 58,
        borderRadius: 29,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    labelWrapper: {
        width: '100%',
        minHeight: 28, // Guarantees multi-line titles align across rows perfectly
        justifyContent: 'flex-start',
        alignItems: 'center'
    },
    gpayCircleLabel: {
        fontSize: 10, // Tightly tuned size for Google Pay grid spacing
        fontWeight: '700',
        color: '#1E293B',
        textAlign: 'center',
        lineHeight: 12,
        paddingHorizontal: 4
    },

    // Empty state
    emptyDashboard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed'
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#475569',
        marginTop: 12
    },
    emptySub: {
        fontSize: 12,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 16
    },

    // Extra social padding
    socialWidget: {
        marginTop: 12,
        paddingHorizontal: 16
    },

    // Modal update UI
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    updateModal: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10
    },
    updateTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginTop: 16,
        color: '#1e293b'
    },
    updateMsg: {
        fontSize: 13,
        color: '#64748b',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
        lineHeight: 18,
        fontWeight: '500'
    },
    updateBtn: {
        backgroundColor: '#434AFA',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center'
    },
    updateBtnTxt: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14
    },

    // Premium Consolidated Events Hub Pill
    floatingHubBtn: {
        position: 'absolute',
        left: 0,
        top: SCREEN_HEIGHT * 0.48, // Bulletproof hard-mathematical vertical coordinates
        backgroundColor: '#6366F1', // High-End Royal Indigo
        width: 40, // Enhanced touch zone size for elite ergonomics
        height: 50,
        borderTopRightRadius: 25,
        borderBottomRightRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 12, // Elevated peak stacking priority
        shadowColor: '#6366F1',
        shadowOffset: { width: 3, height: 2 },
        shadowOpacity: 0.45,
        shadowRadius: 6,
        zIndex: 99999 // Maximum top level stacking index
    },

    // Super Stable Custom Drawer Overlay UI
    absoluteBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.45)', // Crisp dimmed glass
        zIndex: 999998 // Placed behind the active drawer body
    },
    absoluteDrawerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        backgroundColor: '#FFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 12,
        paddingBottom: 16, // Safe padding from bottom screen edge
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 12,
        zIndex: 999999 // Highest active visual stack layer
    },
    dragHandle: {
        alignSelf: 'center',
        width: 48,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#E2E8F0',
        marginTop: 2,
        marginBottom: 14
    },
    hubHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginBottom: 8,
        paddingTop: 2
    },
    hubMainTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.4
    },
    hubSubtitle: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 1
    },
    hubCloseCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center'
    },
    hubBodyWrap: {
        marginTop: 10,
        paddingBottom: 24
    },
    hubSectionBox: {
        marginVertical: 4
    },
    hubDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginHorizontal: 24,
        marginVertical: 14
    },
    // --- Spotlight Section Spotlight Cards ---
    spotlightCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 14,
        borderLeftWidth: 4,
        padding: 14,
        marginBottom: 18,
        overflow: 'hidden',
        position: 'relative',
    },
    spotlightContent: {
        flex: 1,
        paddingRight: 24, // Safe buffer from oversized absolute graphic
        zIndex: 2,
    },
    spotlightTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 6,
    },
    spotlightTagText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'capitalize',
        letterSpacing: 0.5,
    },
    spotlightDesc: {
        fontSize: 11,
        color: '#475569',
        fontWeight: '600',
        lineHeight: 16,
    },
    spotlightGraphic: {
        position: 'absolute',
        right: -6,
        bottom: -12,
        zIndex: 1,
    }
});