# React Native Role-Based Access Control (RBAC) & Dynamic Menu Guide

This document provides a comprehensive guide for the React Native team on how to implement the new role-based menus and access control mechanisms, which are fully synced with the updated Laravel backend API.

---

## 1. Updated Login API Response Structure

The `POST /api/login` response has been enriched with the specific `role_name`, `is_manager`, `has_subordinates`, `permissions`, and `feature_flags`. 

The response structure is as follows:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role_id": 1,
    "role_name": "admin",
    "is_manager": 1,
    "has_subordinates": true,
    "permissions": [
      "sales.alldata",
      "sales.myleads",
      "contact_management.access",
      "setup.users"
    ],
    "tenant_id": "tenant_1",
    "token": "1|abc123token...",
    "version": "1.0",
    "employee_id": 1,
    "employee_details": {
      "date_of_birth": "1990-01-01",
      "shift": {
        "id": 1,
        "name": "General Shift",
        "start_time": "09:00:00",
        "end_time": "18:00:00"
      }
    },
    "feature_flags": {
      "is_sales_enabled": 1,
      "is_tally_calling_enabled": 1,
      "is_leadgen_enabled": 1,
      "is_projects_enabled": 1,
      "is_subscription_enabled": 1,
      "is_tracking_enabled": 1,
      "is_worklog_enabled": 1,
      "is_workflow_enabled": 1,
      "is_social_media_calendar_enabled": 1,
      "is_setup_enabled": 1,
      "is_task_reminders_enabled": 1,
      "is_attendance_enabled": 1,
      "is_reports_enabled": 1,
      "is_document_management_enabled": 1,
      "is_petty_cash_enable": 1,
      "is_approval_enabled": 1,
      "is_contact_management": 1,
      "is_asset_management_enable": 1,
      "is_email_marketing_enable": 1,
      "is_core_setup_enabled": 1,
      "is_user_setup_enabled": 1,
      "is_master_setup_enabled": 1,
      "is_sales_setup_enabled": 1,
      "is_tally_calling_setup_enabled": 1,
      "is_petty_cash_setup_enabled": 1,
      "is_projects_setup_enabled": 1,
      "is_work_setup_enabled": 1,
      "is_attendance_setup_enabled": 1,
      "is_task_setup_enabled": 1,
      "is_subscription_setup_enabled": 1,
      "is_calendar_setup_enabled": 1,
      "is_asset_management_setup_enabled": 1
    }
  }
}
```

---

## 2. Setting Up Global State in React Native

The team should save the returned `role_name`, `permissions`, and `feature_flags` from the login response globally within an `AuthContext`, Redux store, or Zustand slice.

### Example Auth Context (`AuthContext.js`)

```jsx
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [featureFlags, setFeatureFlags] = useState({});
  const [loading, setLoading] = useState(true);

  const login = async (apiResponseData) => {
    setUser(apiResponseData);
    setPermissions(apiResponseData.permissions || []);
    setFeatureFlags(apiResponseData.feature_flags || {});
    await AsyncStorage.setItem('user_session', JSON.stringify(apiResponseData));
  };

  const logout = async () => {
    setUser(null);
    setPermissions([]);
    setFeatureFlags({});
    await AsyncStorage.removeItem('user_session');
  };

  return (
    <AuthContext.Provider value={{ user, permissions, featureFlags, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

## 3. Defining Local Routing Configurations

Create a local configuration array that matches the keys and structure from the Laravel backend (`config/menu.php`).

```js
export const mobileMenuConfig = [
  {
    key: 'admin_sales_operational',
    title: 'Sales & CRM',
    feature_flag: 'is_sales_enabled',
    roles: ['admin'],
    items: [
      { name: 'AllData', title: 'All Data', permission: 'sales.alldata' },
      { name: 'MyLeads', title: 'My Leads', permission: 'sales.myleads' },
    ]
  },
  {
    key: 'contact_management',
    title: 'Contact Management',
    name: 'ContactManagement',
    icon: 'person-lines',
    feature_flag: 'is_contact_management',
    roles: ['admin'],
    permission: 'contact_management.access'
  }
];
```

---

## 4. Conditional Navigation and Display in Drawer / Tabs

Build a helper function to decide if the user is authorized to view specific menu links.

```js
export const canViewMenuItem = (item, permissions, featureFlags, role) => {
  // Check feature flag
  if (item.feature_flag && !featureFlags[item.feature_flag]) {
    return false;
  }
  // Check role
  if (item.roles && !item.roles.includes(role)) {
    return false;
  }
  // Check permissions (for single screens)
  if (item.permission && !permissions.includes(item.permission)) {
    return false;
  }
  return true;
};
```

### Rendering dynamically within your navigation drawer:

```jsx
import React, { useContext } from 'react';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { AuthContext } from './AuthContext';
import { mobileMenuConfig } from './menuConfig';
import { canViewMenuItem } from './permissionsHelper';

export function CustomDrawerContent(props) {
  const { permissions, featureFlags, user } = useContext(AuthContext);

  return (
    <DrawerContentScrollView {...props}>
      {mobileMenuConfig.map((section) => {
        if (!canViewMenuItem(section, permissions, featureFlags, user?.role_name)) {
          return null;
        }

        if (section.name && !section.items) {
          return (
            <DrawerItem
              key={section.key}
              label={section.title}
              onPress={() => props.navigation.navigate(section.name)}
            />
          );
        }

        return (
          <React.Fragment key={section.key}>
            <DrawerItem label={section.title} labelStyle={{ fontWeight: 'bold' }} />
            {section.items.map((subItem) => {
              if (permissions.includes(subItem.permission)) {
                return (
                  <DrawerItem
                    key={subItem.name}
                    label={`  └ ${subItem.title}`}
                    onPress={() => props.navigation.navigate(subItem.name)}
                  />
                );
              }
              return null;
            })}
          </React.Fragment>
        );
      })}
    </DrawerContentScrollView>
  );
}
```

---

## 5. Security & Deep Linking

1. **Route Guardians**: If deep linking is supported in your app, use higher-order components or route wrappers that evaluate the user's `permissions` list to actively block restricted screens.
2. **Offline Data**: When caching user profiles offline using SQLite, MMKV, or AsyncStorage, sanitize/clear the sensitive metadata during logout.
