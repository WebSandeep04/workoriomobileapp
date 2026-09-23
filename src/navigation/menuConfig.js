export const mobileMenuConfig = [
  {
    key: 'admin_dashboard_root',
    title: 'Dashboard',
    icon: 'bi bi-house',
    route: 'Home'
  },
  {
    key: 'admin_attendance_operational',
    title: 'Attendance',
    icon: 'bi bi-person-check',
    feature_flag: 'is_attendance_enabled',
    roles: ['admin'],
    items: [
      { route: 'attendance', title: 'Mark Attendance', icon: 'bi bi-person-check', permission: 'attendance.entry' },
      { route: 'attendance.history', title: 'Attendance History', icon: 'bi bi-journal-text', permission: 'attendance.history' },
      { route: 'leave.index', title: 'Leave', icon: 'bi bi-calendar-minus', permission: 'attendance.leave' },
      // { route: 'attendance.facekiosk', title: 'Face Kiosk Mode', icon: 'bi bi-camera', permission: 'attendance.entry' },
    ]
  },

  {
    key: 'admin_sales_operational',
    title: 'Sales & CRM',
    icon: 'bi bi-cart',
    feature_flag: 'is_sales_enabled',
    roles: ['admin'],
    items: [
      { route: 'alldata', title: 'All Data', icon: 'bi bi-collection', permission: 'sales.alldata' },
      { route: 'myleads', title: 'My Leads', icon: 'bi bi-person', permission: 'sales.myleads' },
      { route: 'teamleads', title: 'Team Leads', icon: 'bi bi-people', condition: 'has_subordinates', permission: 'sales.teamleads' },
      { route: 'assignedleads', title: 'Assigned Leads', icon: 'bi bi-person-check', condition: 'is_manager', permission: 'sales.assignedleads' },
      { route: 'followup', title: 'Follow Up', icon: 'bi bi-bell', permission: 'sales.followup' },
      { route: 'quotation', title: 'Quotation', icon: 'bi bi-file-text', permission: 'sales.quotation' },
    ]
  },
  {
    key: 'admin_lead_generation',
    title: 'Lead Generation',
    icon: 'bi bi-person-plus',
    feature_flag: 'is_leadgen_enabled',
    roles: ['admin'],
    items: [
      { route: 'leadgen.my', title: 'My Gen Leads', icon: 'bi bi-person-workspace', permission: 'leadgen.my' },
    ]
  },
  {
    key: 'admin_subs_renewal',
    title: 'Subs & Renewal',
    route: 'subscriptions.index',
    icon: 'bi bi-arrow-repeat',
    feature_flag: 'is_subscription_enabled',
    roles: ['admin'],
    permission: 'subscription.view'
  },
  {
    key: 'admin_worklog_operational',
    title: 'Timesheet',
    icon: 'bi bi-clock',
    feature_flag: 'is_worklog_enabled',
    roles: ['admin'],
    items: [
      { route: 'worklog', title: 'Timesheet', icon: 'bi bi-clipboard-check', permission: 'worklog.entry' },
      { route: 'worklog-history', title: 'Timesheet History', icon: 'bi bi-clock-history', permission: 'worklog.history' },
      { route: 'worklog-missing-summary', title: 'Missing Entries Summary', icon: 'bi bi-exclamation-triangle', permission: 'worklog.missing_summary' },
    ]
  },
  {
    key: 'admin_tasks',
    title: 'Tasks & Reminders',
    icon: 'bi bi-list-task',
    feature_flag: 'is_task_reminders_enabled',
    roles: ['admin'],
    items: [
      { route: 'all-tasks.index', title: 'All Tasks', icon: 'bi bi-card-list', permission: 'task.view' },
      { route: 'task.index', title: 'Task', tooltip: 'Task assign by me', icon: 'bi bi-list-task', permission: 'task.my_created' },
      { route: 'my-tasks.index', title: 'My Tasks', tooltip: 'Task assign to me', icon: 'bi bi-person-check', permission: 'task.my_tasks' },
    ]
  },
  {
    key: 'admin_reports',
    title: 'Reports',
    icon: 'bi bi-file-earmark-bar-graph',
    feature_flag: 'is_reports_enabled',
    roles: ['admin'],
    items: [
      { route: 'attendance.report', title: 'Attendance Report', icon: 'bi bi-file-earmark-text', permission: 'attendance.report' },
      { route: 'payroll.report', title: 'Salary Report', icon: 'bi bi-cash-stack', permission: 'payroll.report', feature_flag: 'is_payroll_enabled' },
      { route: 'reports.worklog', title: 'Timesheet Report', icon: 'bi bi-journals', permission: 'reports.worklog', feature_flag: 'is_worklog_enabled' },
      { route: 'tracking.report', title: 'Tracking Report', icon: 'bi bi-geo-alt', permission: 'tracking.view', feature_flag: 'is_tracking_enabled' },
      { route: 'whatsapp.report', title: 'WhatsApp Campaigns', icon: 'bi bi-whatsapp', permission: 'sales.alldata' },
    ]
  },
  {
    key: 'approvals_section',
    title: 'Approvals',
    icon: 'bi bi-check2-circle',
    feature_flag: 'is_approval_enabled',
    roles: ['admin'],
    items: [
      { route: 'approvals.petty', title: 'Petty Approval', icon: 'bi bi-cash', permission: 'approvals.petty', feature_flag: 'is_petty_cash_enable' },
      { route: 'worklog-approvals', title: 'Timesheet Approvals', icon: 'bi bi-check2-square', permission: 'approvals.worklog', feature_flag: 'is_worklog_enabled' },
      // { route: 'attendance.approval', title: 'Attendance Approval', icon: 'bi bi-person-check', permission: 'approvals.attendance' },
      { route: 'attendance.unlock', title: 'Unlock Attendance', icon: 'bi bi-unlock', permission: 'approvals.unlock_attendance' },
      { route: 'leave.approvals', title: 'Leave Approval', icon: 'bi bi-calendar-check', permission: 'approvals.leave' },
    ]
  },
  {
    key: 'contact_management',
    title: 'Contact Management',
    route: 'contactmanagement.index',
    icon: 'bi bi-person-lines-fill',
    feature_flag: 'is_contact_management',
    roles: ['admin'],
    permission: 'contact_management.access'
  },
];
