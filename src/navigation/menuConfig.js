export const mobileMenuConfig = [
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
      // { route: 'quotation', title: 'Quotation', icon: 'bi bi-file-text', permission: 'sales.quotation' },
      // { route: 'payment-followup', title: 'Payment Followup', icon: 'bi bi-cash-coin', permission: 'sales.payment_followup' },
      // { route: 'formbuilder.index', title: 'Lead Form', icon: 'bi bi-ui-checks-grid', permission: 'sales.leadform' },
      { route: 'indiamart.index', title: 'External Leads', icon: 'bi bi-bag', permission: 'sales.indiamart' },
      { route: 'indiamart.junk.index', title: 'External Junk Leads', icon: 'bi bi-trash', permission: 'sales.indiamart.junk' },
    ]
  },
  {
    key: 'admin_tele_calling',
    title: 'Tele Calling',
    icon: 'bi bi-telephone-outbound',
    feature_flag: 'is_tally_calling_enabled',
    roles: ['admin'],
    items: [
      { route: 'calling.all', title: 'All Calls', icon: 'bi bi-collection', permission: 'sales.calling.all' },
      { route: 'calling.list.index', title: 'List', icon: 'bi bi-list-task', permission: 'sales.calling.list' },
      { route: 'calling', title: 'Campaign', icon: 'bi bi-megaphone', permission: 'sales.calling' },
      { route: 'calling.lock', title: 'Lock Calling', icon: 'bi bi-lock', permission: 'sales.calling.lock' },
      { route: 'calling.my', title: 'My Calls', icon: 'bi bi-person', permission: 'sales.calling.my' },
      { route: 'calling.team', title: 'Team Calls', icon: 'bi bi-people', condition: 'has_subordinates', permission: 'sales.calling.team' },
      { route: 'calling.assigned', title: 'Assigned Calls', icon: 'bi bi-person-check', condition: 'has_subordinates', permission: 'sales.calling.assigned' },
      { route: 'calling.converted', title: 'Converted Calls', icon: 'bi bi-stars', permission: 'sales.calling.converted' },
      { route: 'calling.todays', title: 'Today\'s Calls', icon: 'bi bi-calendar-date', permission: 'sales.calling.todays' },
      { route: 'calling.junk', title: 'Junk Calls', icon: 'bi bi-trash', permission: 'sales.calling.junk' },
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
    key: 'admin_projects',
    title: 'Projects',
    route: 'projects.index',
    icon: 'bi bi-kanban',
    feature_flag: 'is_projects_enabled',
    roles: ['admin'],
    permission: 'projects.view'
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
    key: 'admin_tracking',
    title: 'Tracking',
    route: 'tracking.index',
    icon: 'bi bi-geo-alt',
    feature_flag: 'is_tracking_enabled',
    roles: ['admin'],
    permission: 'tracking.view'
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
      // { route: 'worklog-missing-summary', title: 'Missing Entries Summary', icon: 'bi bi-exclamation-triangle', permission: 'worklog.missing_summary' },
    ]
  },
  // {
  //   key: 'workflow_critical_path',
  //   title: 'Workflow',
  //   icon: 'bi bi-diagram-3',
  //   feature_flag: 'is_workflow_enabled',
  //   roles: ['admin'],
  //   items: [
  //     { route: 'critical-path.index', title: 'Critical Path', icon: 'bi bi-diagram-2', permission: 'workflow.critical_path' },
  //     { route: 'workflow-templates.index', title: 'Workflow Templates', icon: 'bi bi-journal-text', permission: 'workflow.templates' },
  //     { route: 'workflow-dependencies.index', title: 'Dependencies', icon: 'bi bi-diagram-3-fill', permission: 'workflow.dependencies' },
  //   ]
  // },
  {
    key: 'calendar_section',
    title: 'Social Media Calendar',
    icon: 'bi bi-calendar3',
    feature_flag: 'is_social_media_calendar_enabled',
    roles: ['admin'],
    items: [
      { route: 'calendar.index', title: 'Calendar', icon: 'bi bi-calendar3', permission: 'calendar.view' },
      // { route: 'calendar-client-event.links', title: 'Manage Calendar', icon: 'bi bi-diagram-2', permission: 'calendar.client_event_links' },
    ]
  },
  {
    key: 'master_section',
    title: 'Master',
    icon: 'bi bi-person-badge',
    feature_flag: 'is_setup_enabled',
    roles: ['admin'],
    items: [
      { route: 'employees.index', title: 'Employees', icon: 'bi bi-people', permission: 'master.employees' },
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
    key: 'admin_attendance_operational',
    title: 'Attendance',
    icon: 'bi bi-person-check',
    feature_flag: 'is_attendance_enabled',
    roles: ['admin'],
    items: [
      { route: 'attendance', title: 'Mark Attendance', icon: 'bi bi-person-check', permission: 'attendance.entry' },
      { route: 'attendance.history', title: 'Attendance History', icon: 'bi bi-journal-text', permission: 'attendance.history' },
      { route: 'leave.index', title: 'Leave', icon: 'bi bi-calendar-minus', permission: 'attendance.leave' },
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
      { route: 'reports.worklog', title: 'Timesheet Report', icon: 'bi bi-journals', permission: 'reports.worklog', feature_flag: 'is_worklog_enabled' },
      { route: 'tracking.report', title: 'Tracking Report', icon: 'bi bi-geo-alt', permission: 'tracking.view', feature_flag: 'is_tracking_enabled' },
    ]
  },
  // {
  //   key: 'admin_document_management',
  //   title: 'Document',
  //   icon: 'bi bi-folder2-open',
  //   feature_flag: 'is_document_management_enabled',
  //   roles: ['admin'],
  //   items: [
  //     { route: 'document.index', title: 'Manage Documents', icon: 'bi bi-folder', permission: 'documents.manage' },
  //     { route: 'document.user-access', title: 'My Documents', icon: 'bi bi-person-check', permission: 'documents.my_documents' },
  //   ]
  // },
  {
    key: 'petty_cash_section',
    title: 'Petty Cash',
    route: 'petty-cash.index',
    icon: 'bi bi-cash-stack',
    feature_flag: 'is_petty_cash_enable',
    roles: ['admin'],
    permission: 'petty_cash.view'
  },
  {
    key: 'approvals_section',
    title: 'Approvals',
    icon: 'bi bi-check2-circle',
    feature_flag: 'is_approval_enabled',
    roles: ['admin'],
    items: [
      { route: 'approvals.petty', title: 'Petty Approval', icon: 'bi bi-cash', permission: 'approvals.petty' },
      { route: 'worklog-approvals', title: 'Timesheet Approvals', icon: 'bi bi-check2-square', permission: 'approvals.worklog', feature_flag: 'is_worklog_enabled' },
      { route: 'attendance.approval', title: 'Attendance Approval', icon: 'bi bi-person-check', permission: 'approvals.attendance' },
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
  {
    key: 'asset_management',
    title: 'Asset Management',
    route: 'asset-management.index',
    icon: 'bi bi-box-seam',
    feature_flag: 'is_asset_management_enable',
    roles: ['admin'],
    permission: 'asset_management.access'
  },
  // {
  //   key: 'email_marketing',
  //   title: 'Email Marketing',
  //   route: 'emailmarketing.index',
  //   icon: 'bi bi-envelope',
  //   feature_flag: 'is_email_marketing_enable',
  //   roles: ['admin'],
  //   permission: 'email_marketing.view'
  // },

];

