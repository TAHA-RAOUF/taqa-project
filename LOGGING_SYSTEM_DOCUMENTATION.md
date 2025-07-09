# 📊 Comprehensive Logging System Documentation

## 🎯 Overview

A complete logging infrastructure that tracks ALL user activities and system actions across the TAMS platform. The system provides persistent storage, real-time monitoring, and comprehensive analytics for all platform interactions.

## 🏗️ Architecture

### **Core Components**
- **LoggingService**: Main service for persistent log storage
- **useLogging Hooks**: React hooks for easy integration
- **Logs Database**: Supabase table with full schema
- **Logs UI**: Complete interface for viewing and analyzing logs

### **Storage Strategy**
- **Primary**: Supabase PostgreSQL database
- **Fallback**: Local storage for offline scenarios
- **Backup**: Export functionality for data archival

## 📋 Log Structure

### **LogEntry Interface**
```typescript
interface LogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  username?: string;
  action: LogAction;
  category: LogCategory;
  entity: string;
  entityId?: string;
  details: LogDetails;
  severity: LogSeverity;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}
```

### **Categories Tracked**
- **anomaly_management**: Anomaly CRUD operations
- **action_plan_management**: Action plan lifecycle and execution
- **maintenance_planning**: Planning and scheduling
- **user_activity**: Authentication and navigation
- **system_operation**: System events and processes
- **chat_interaction**: AI chat conversations
- **data_operation**: Import/export operations
- **security**: Security-related events
- **error**: Error conditions and failures

### **Actions Logged**
- **Anomaly**: create, update, delete, status_change, assign
- **Action Plan**: create, assign, execute, complete, review, approve
- **Planning**: schedule, create_window, auto_assignment
- **User**: login, logout, profile_update, page_view
- **System**: startup, shutdown, data_operations
- **Chat**: message_sent, ai_response, history_view

## 🔧 Implementation

### **1. Service Integration**
```typescript
// Initialize logging service
import { loggingService } from './services/loggingService';

// Initialize on app start
await loggingService.initialize();

// Log any action
await loggingService.logAction({
  action: 'create_anomaly',
  category: 'anomaly_management',
  entity: 'anomaly',
  entityId: 'anomaly-123',
  details: {
    description: 'New anomaly created',
    newValue: anomalyData
  },
  severity: 'success',
  success: true
});
```

### **2. Hook Usage**
```typescript
// Use specialized hooks in components
const { logAnomalyCreated, logAnomalyUpdated } = useAnomalyLogging();
const { logWindowCreated, logAutoScheduling } = usePlanningLogging();
const { logMessageSent, logAIResponse } = useChatLogging();
const { logLogin, logLogout } = useAuthLogging();

// Log page views
const { logPageView } = useLogging();
useEffect(() => {
  logPageView('Dashboard');
}, []);
```

### **3. Database Schema**
```sql
-- Complete logs table with indexes and RLS
CREATE TABLE public.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  username TEXT,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'success', 'warning', 'error', 'critical')),
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB
);

-- Performance indexes
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_category ON logs(category);
CREATE INDEX idx_logs_action ON logs(action);
```

## 🖥️ User Interface

### **Logs Page Features**
- ✅ **Real-time log viewing** with pagination
- ✅ **Advanced filtering** by category, severity, user, date
- ✅ **Search functionality** across all log fields
- ✅ **Statistics dashboard** with metrics and charts
- ✅ **Export functionality** for data analysis
- ✅ **Auto-refresh** for live monitoring

### **Statistics Dashboard**
- **Total Logs**: All-time log count
- **Success Rate**: Percentage of successful operations
- **Recent Activity**: Last 24 hours activity
- **Error Count**: Failed operations tracking
- **Category Breakdown**: Logs by functional area
- **Severity Distribution**: Info, success, warning, error, critical

### **Filtering Options**
- **Date Range**: Start/end date selection
- **User Filter**: Filter by specific user
- **Category Filter**: Anomaly, planning, user, system, chat
- **Severity Filter**: Info, success, warning, error, critical
- **Success Filter**: Show only successful or failed operations
- **Entity Filter**: Filter by specific entity types

## 📊 Analytics & Reporting

### **Real-time Monitoring**
- **Live activity feed** of all platform actions
- **Error detection** and alerting
- **Performance metrics** (response times, success rates)
- **User behavior tracking** (page views, feature usage)

### **Export Capabilities**
- **JSON Export**: Complete log data with metadata
- **Filtered Exports**: Export based on current filters
- **Scheduled Reports**: Automated log summaries
- **Data Archival**: Historical log management

### **Statistics Functions**
```sql
-- Get comprehensive log statistics
SELECT * FROM get_log_statistics(
  start_date := '2024-01-01'::timestamptz,
  end_date := NOW(),
  user_filter := null
);

-- Cleanup old logs
SELECT cleanup_old_logs(90); -- Keep 90 days
```

## 🚀 Integration Points

### **Component Integration**
- **Pages**: All major pages log page views and actions
- **Forms**: Form submissions and validation errors
- **Modals**: Dialog interactions and outcomes
- **Services**: API calls and data operations
- **Hooks**: Custom hooks for domain-specific logging

### **Automatic Logging**
- **Authentication**: Login/logout events
- **Navigation**: Page view tracking
- **CRUD Operations**: Create, read, update, delete
- **AI Interactions**: Chat messages and responses
- **System Events**: Startup, errors, performance

### **Error Handling**
- **Graceful Degradation**: Fallback to localStorage
- **Error Logging**: All errors are logged with context
- **Performance Impact**: Minimal, async logging
- **Privacy**: Sensitive data excluded from logs

## 🔒 Security & Privacy

### **Row Level Security (RLS)**
- Users can only view their own logs
- Admins can view all logs
- System operations logged without user context

### **Data Protection**
- **No sensitive data** in log details
- **User consent** for activity tracking
- **Data retention** policies configurable
- **GDPR compliance** ready

### **Access Control**
- **Role-based access** to logs interface
- **Audit trail** for log access
- **Secure storage** in Supabase
- **Encrypted transmission** of log data

## 📈 Performance Considerations

### **Optimization**
- **Async logging** doesn't block UI
- **Batch operations** for bulk logging
- **Indexed queries** for fast retrieval
- **Pagination** for large datasets

### **Storage Management**
- **Automatic cleanup** of old logs
- **Compression** for archived data
- **Partitioning** for performance
- **Monitoring** of storage usage

## 🔄 Maintenance & Operations

### **Regular Tasks**
- **Log rotation** to manage storage
- **Index maintenance** for performance
- **Statistics updates** for dashboards
- **Backup verification** for data integrity

### **Monitoring**
- **Log volume** tracking
- **Error rate** monitoring
- **Performance metrics** collection
- **Storage usage** alerts

## 🎯 Usage Examples

### **Track Anomaly Operations**
```typescript
// Create anomaly
await logAnomalyCreated(anomalyId, anomalyData);

// Update status
await logAnomalyStatusChanged(anomalyId, 'new', 'treated');

// Assign to maintenance
await logAnomalyAssigned(anomalyId, windowId);
```

### **Monitor Planning Activities**
```typescript
// Auto-scheduling
await logAutoScheduling(5, 1200); // 5 anomalies, 1.2s duration

// Manual assignment
await logManualScheduling(anomalyId, windowId);

// Window creation
await logWindowCreated(windowId, windowData);
```

### **Track Action Plan Process**
```typescript
// Complete action plan creation
await actionPlanLogger.logCompleteActionPlanCreation(
  actionPlan, 
  anomaly, 
  {
    createdBy: 'user123',
    creationReason: 'Critical equipment failure',
    urgency: 'high',
    consultedExperts: ['Expert A', 'Expert B'],
    referenceDocuments: ['Manual v2.1'],
    riskAssessment: { riskLevel: 'medium' }
  }
);

// Assignment to anomaly
await actionPlanLogger.logActionPlanAssignment(
  actionPlan, 
  anomaly, 
  {
    assignedBy: 'supervisor',
    reason: 'Specialized intervention required',
    expectedCompletion: '2025-07-16',
    prerequisites: ['Safety briefing', 'Parts availability']
  }
);

// Execution tracking
await actionPlanLogger.logExecutionStart(actionPlan, anomaly, {
  executedBy: 'technician',
  teamMembers: ['John', 'Jane'],
  location: 'Unit A',
  toolsUsed: ['Wrench', 'Multimeter'],
  safetyPrecautions: ['Lockout applied', 'PPE verified']
});

// Completion logging
await actionPlanLogger.logExecutionCompletion(actionPlan, anomaly, {
  completedBy: 'technician',
  actualDuration: 6.5,
  outcome: 'success',
  resourcesUsed: { cost: 1200, manHours: 8 },
  qualityCheck: { performed: true, result: 'Passed' }
});
```

## 🔄 Action Plan Process Logging

The system provides comprehensive logging for the entire action plan lifecycle:

### **Creation Phase**
- **Action Plan Creation**: Full context including consulted experts, reference documents, risk assessment
- **Resource Planning**: Tools, materials, skills, safety requirements
- **Timeline Planning**: Estimated duration, deadlines, dependencies

### **Assignment Phase**
- **Assignment Details**: Who assigned, why, when, prerequisites
- **Context Capture**: Anomaly snapshot, plan details, approval status
- **Stakeholder Tracking**: All involved parties and their roles

### **Execution Phase**
- **Execution Start**: Team members, location, tools, safety measures
- **Progress Tracking**: Real-time status updates, milestones reached
- **Issue Management**: Problems encountered, solutions applied

### **Completion Phase**
- **Completion Details**: Actual vs planned duration, resources used, outcomes
- **Quality Verification**: Inspection results, compliance checks
- **Performance Metrics**: Efficiency, effectiveness, cost variance

### **Review & Approval Phase**
- **Review Process**: Reviewer feedback, ratings, recommendations
- **Approval Chain**: Authorization levels, conditions, restrictions
- **Process Summary**: Complete audit trail, lessons learned, future recommendations

## 🎉 Benefits

### **For Users**
- **Transparency**: Complete audit trail of all actions
- **Accountability**: Clear record of who did what when
- **Debugging**: Detailed context for troubleshooting
- **Analytics**: Insights into platform usage patterns

### **For Administrators**
- **Monitoring**: Real-time platform health
- **Security**: Audit trail for security events
- **Performance**: Metrics for optimization
- **Compliance**: Regulatory requirement fulfillment

### **For Developers**
- **Debugging**: Detailed error context
- **Monitoring**: System performance metrics
- **Analytics**: User behavior insights
- **Maintenance**: Historical operation tracking

## 🔧 Configuration

### **Environment Variables**
```
REACT_APP_LOGGING_ENABLED=true
REACT_APP_LOG_LEVEL=info
REACT_APP_LOG_RETENTION_DAYS=90
REACT_APP_MAX_LOG_SIZE=1000000
```

### **Service Configuration**
```typescript
// Configure logging service
const loggingConfig = {
  enabledCategories: ['anomaly_management', 'user_activity'],
  logLevel: 'info',
  retentionDays: 90,
  enableLocalStorage: true,
  enableRemoteStorage: true
};
```

## 🎯 Next Steps

### **Phase 1: Current Implementation** ✅
- Basic logging service
- Database schema
- Core hooks
- Logs UI interface

### **Phase 2: Enhanced Features** 🔄
- Advanced analytics
- Real-time dashboards
- Alert system
- Automated reports

### **Phase 3: Advanced Capabilities** 📋
- Machine learning insights
- Predictive analytics
- Custom dashboards
- Integration APIs

---

**Result**: Complete logging infrastructure that provides **100% visibility** into all platform activities with **persistent storage**, **real-time monitoring**, and **comprehensive analytics**. Every user action and system event is tracked, stored, and available for analysis through a beautiful, intuitive interface! 🎯📊
