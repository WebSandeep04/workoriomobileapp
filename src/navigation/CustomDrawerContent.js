import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from './AuthContext';
import { mobileMenuConfig } from './menuConfig';

const BOOTSTRAP_ICON_MAP = {
  // Standalone Items
  'bi bi-kanban': 'apps-outline',
  'bi bi-arrow-repeat': 'repeat-outline',
  'bi bi-geo-alt': 'location-outline',
  'bi bi-cash-stack': 'cash-outline',
  'bi bi-person-lines-fill': 'people-outline',
  'bi bi-box-seam': 'cube-outline',
  'bi bi-envelope': 'mail-outline',
  
  // Group Headings
  'bi bi-cart': 'cart-outline',
  'bi bi-telephone-outbound': 'call-outline',
  'bi bi-person-plus': 'person-add-outline',
  'bi bi-clock': 'time-outline',
  'bi bi-diagram-3': 'git-network-outline',
  'bi bi-calendar3': 'calendar-outline',
  'bi bi-person-badge': 'person-circle-outline',
  'bi bi-list-task': 'list-outline',
  'bi bi-person-check': 'checkmark-circle-outline',
  'bi bi-file-earmark-bar-graph': 'stats-chart-outline',
  'bi bi-folder2-open': 'folder-open-outline',
  'bi bi-check2-circle': 'checkmark-done-outline',
};

const getIconName = (rawIcon) => {
  if (!rawIcon) return 'folder-outline';
  return BOOTSTRAP_ICON_MAP[rawIcon] || 'folder-outline';
};

export function CustomDrawerContent(props) {
  const { user, permissions = [], featureFlags = {}, logout } = useContext(AuthContext);
  const isAdmin = (user?.role_name?.toLowerCase() === 'admin') || (Number(user?.role_id) === 1);

  // Accordion State: Tracks visibility of dropdown sections
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (key) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleLogout = async () => {
    if (logout) {
      await logout();
    }
    props.navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <View style={styles.container}>
      {/* Fixed Profile Header outside ScrollView */}
      <View style={styles.profileSection}>
        <View style={styles.avatarWrapper}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name.substring(0, 1).toUpperCase() : 'U'}
          </Text>
        </View>
        <View style={styles.profileDetails}>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userRole}>
            {user?.role_name ? user.role_name.toUpperCase() : 'EMPLOYEE'}
          </Text>
          {user?.email ? <Text style={styles.userEmail}>{user.email}</Text> : null}
        </View>
        <TouchableOpacity style={styles.topLogoutButton} onPress={handleLogout}>
          <Ionicons name="power" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Main Drawer Content Scrolls underneath */}
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={true}>
        {/* Dynamic RBAC Menu Items */}
        <View style={styles.menuItemsContainer}>
          {mobileMenuConfig.map((section) => {
            // 1. Check feature flag for the whole section
            if (section.feature_flag && !featureFlags[section.feature_flag]) {
              return null;
            }

            // 2. If it is a direct single screen (no items array)
            if ((section.route || section.name) && !section.items) {
              const hasDirectPermission = isAdmin || !section.permission || permissions.includes(section.permission);
              const matchesDirectRole = isAdmin || !section.roles || (user?.role_name && section.roles.includes(user.role_name));

              if (!hasDirectPermission || !matchesDirectRole) {
                return null;
              }

              return (
                <View key={section.key} style={styles.sectionContainer}>
                  <TouchableOpacity 
                    style={styles.sectionHeader} 
                    onPress={() => props.navigation.navigate(section.route || section.name)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={getIconName(section.icon)} size={15} color="#475569" style={{ marginRight: 10 }} />
                    <Text style={[styles.sectionHeaderText, { flex: 1 }]}>{section.title}</Text>
                  </TouchableOpacity>
                </View>
              );
            }

            // 3. Section has multiple child items: Show section if at least one sub-item matches user permissions and condition
            if (section.items) {
              const visibleSubItems = section.items.filter((subItem) => {
                if (subItem.feature_flag && !featureFlags[subItem.feature_flag]) {
                  return false;
                }
                // Admin can access everything enabled by feature flags
                if (isAdmin) {
                  return true;
                }
                if (subItem.condition && !user?.[subItem.condition]) {
                  return false;
                }
                if (subItem.roles && (!user?.role_name || !subItem.roles.includes(user.role_name))) {
                  return false;
                }
                if (subItem.permission && !permissions.includes(subItem.permission)) {
                  return false;
                }
                return true;
              });

              if (visibleSubItems.length === 0) {
                return null;
              }

              const isExpanded = !!expandedSections[section.key];

              return (
                <View key={section.key} style={styles.sectionContainer}>
                  <TouchableOpacity 
                    style={styles.sectionHeader} 
                    onPress={() => toggleSection(section.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={getIconName(section.icon)} size={15} color="#475569" style={{ marginRight: 10 }} />
                    <Text style={[styles.sectionHeaderText, { flex: 1 }]}>{section.title}</Text>
                    <Ionicons 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={14} 
                      color="#94a3b8" 
                    />
                  </TouchableOpacity>
                  
                  {isExpanded && visibleSubItems.map((subItem) => (
                    <DrawerItem
                      key={subItem.route || subItem.name || subItem.title}
                      label={subItem.title}
                      labelStyle={styles.subDrawerLabel}
                      icon={({ color, size }) => (
                        <Ionicons name="chevron-forward" size={14} color="#64748b" />
                      )}
                      onPress={() => props.navigation.navigate(subItem.route || subItem.name)}
                    />
                  ))}
                </View>
              );
            }

            return null;
          })}
        </View>
      </DrawerContentScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  scrollContainer: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  profileSection: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 18,
    paddingTop: 54,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  topLogoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  userRole: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  menuItemsContainer: {
    paddingHorizontal: 8,
  },
  sectionContainer: {
    marginVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 4,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  drawerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  subDrawerLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
});
