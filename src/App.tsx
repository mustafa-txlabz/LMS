/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LmsProvider, useLms } from './context/LmsContext';
import { Header } from './components/common/Header';
import { LoginPage } from './components/auth/LoginPage';
import { ProfileSettingsModal } from './components/profile/ProfileSettingsModal';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { EmailPreviewModal } from './components/common/EmailPreviewModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { StudentDashboard } from './components/student/StudentDashboard';
import { ShieldCheck } from 'lucide-react';

function LMSMainContent() {
  const { currentUser, selectedEmailModal, setSelectedEmailModal } = useLms();
  const [activeTab, setActiveTab] = useState<string>('default');
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // Synchronize default tab whenever user logs in or changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        setActiveTab('analytics');
      } else if (currentUser.role === 'teacher') {
        setActiveTab('grading');
      } else if (currentUser.role === 'student') {
        setActiveTab('registration');
      }
    }
  }, [currentUser?.id, currentUser?.role]);

  // If user is not authenticated, show attractive University Login Page
  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Universal Top Bar (Responsive, No Overflow, Zero Role Badge on Bar) */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6">
        {currentUser.role === 'admin' && (
          <AdminDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
        {currentUser.role === 'teacher' && (
          <TeacherDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
        {currentUser.role === 'student' && (
          <StudentDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
              U
            </div>
            <span className="font-semibold text-slate-700">
              UniCore University Academic Management System
            </span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">Accredited Academic Portal</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>HEC Compliant Grading Scheme</span>
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>MongoDB Atlas Persistent Storage</span>
          </div>
        </div>
      </footer>

      {/* Profile & Password Settings Modal */}
      <ProfileSettingsModal />

      {/* Automated Email Preview Modal */}
      <EmailPreviewModal
        notification={selectedEmailModal}
        onClose={() => setSelectedEmailModal(null)}
      />

      {/* Slide-over Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <LmsProvider>
      <LMSMainContent />
    </LmsProvider>
  );
}
