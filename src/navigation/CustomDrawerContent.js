import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from './AuthContext';
import { mobileMenuConfig } from './menuConfig';

export function CustomDrawerContent(props) {
  const { user, permissions = [], featureFlags = {}, logout } = useContext(AuthContext);

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
              const hasDirectPermission = !section.permission || permissions.includes(section.permission);
              const matchesDirectRole = !section.roles || (user?.role_name && section.roles.includes(user.role_name));

              if (!hasDirectPermission || !matchesDirectRole) {
                return null;
              }

              return (
                <DrawerItem
                  key={section.key}
                  label={section.title}
                  labelStyle={styles.drawerLabel}
                  icon={({ color, size }) => (
                    <Ionicons name={section.icon || 'folder-outline'} size={size} color="#475569" />
                  )}
                  onPress={() => props.navigation.navigate(section.route || section.name)}
                />
              );
            }

            // 3. Section has multiple child items: Show section if at least one sub-item matches user permissions and condition
            if (section.items) {
              const visibleSubItems = section.items.filter((subItem) => {
                if (subItem.feature_flag && !featureFlags[subItem.feature_flag]) {
                  return false;
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

              return (
                <View key={section.key} style={styles.sectionContainer}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>{section.title}</Text>
                  </View>
                  {visibleSubItems.map((subItem) => (
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
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
