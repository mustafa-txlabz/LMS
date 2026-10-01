import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { AutomatedNotification } from '../../types';
import {
  X,
  Bell,
  Mail,
  CheckCheck,
  Award,
  Calendar,
  AlertTriangle,
  Clock,
  Trash2,
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notifications,
    currentUser,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    setSelectedEmailModal,
  } = useLms();

  const [filter, setFilter] = useState<'all' | 'grades' | 'lectures'>('all');

  if (!isOpen || !currentUser) return null;

  // Filter notifications for current user or university-wide announcements
  const userNotifications = notifications.filter(
    (n) =>
      n.recipientId === currentUser.id ||
      n.recipientId === 'all-students' ||
      currentUser.role === 'admin'
  );

  const filtered = userNotifications.filter((n) => {
    if (filter === 'grades') return n.type === 'grade_update';
    if (filter === 'lectures') return n.type === 'lecture_reminder';
    return true;
  });

  const getIcon = (type: AutomatedNotification['type']) => {
    switch (type) {
      case 'grade_update':
        return <Award className="w-4 h-4 text-emerald-600" />;
      case 'lecture_reminder':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'attendance_warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-800" />
              <h3 className="text-sm font-bold text-slate-900">
                Automated Notification Center
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all hover:rotate-90 duration-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Bar & Interactive Filter Buttons (Per Guidelines: clean buttons, zero pills) */}
          <div className="px-5 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all duration-150 active:scale-95 cursor-pointer ${
                  filter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({userNotifications.length})
              </button>
              <button
                onClick={() => setFilter('grades')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all duration-150 active:scale-95 cursor-pointer ${
                  filter === 'grades'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Grades
              </button>
              <button
                onClick={() => setFilter('lectures')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all duration-150 active:scale-95 cursor-pointer ${
                  filter === 'lectures'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lectures
              </button>
            </div>

            <button
              onClick={markAllNotificationsAsRead}
              className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark Read</span>
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6">
                <Bell className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-700">No notifications in this view</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Updates on published grades and upcoming lectures will appear here.
                </p>
              </div>
            ) : (
              filtered.map((item) => {
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      markNotificationAsRead(item.id);
                    }}
                    className={`p-3.5 rounded-xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer relative group ${
                      item.read
                        ? 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        : 'bg-indigo-50/40 border-indigo-200 text-slate-900 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-md bg-white border border-slate-200 shrink-0">
                        {getIcon(item.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold truncate text-slate-900">
                            {item.subject}
                          </h4>
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                          )}
                        </div>

                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                          <span className="font-mono text-[10px]">{item.timestamp}</span>

                          <div className="flex items-center gap-2">
                            {item.emailDispatched && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markNotificationAsRead(item.id);
                                  setSelectedEmailModal(item);
                                }}
                                className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:underline"
                              >
                                <Mail className="w-3 h-3" />
                                <span>View Email</span>
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(item.id);
                              }}
                              className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors"
                              title="Delete notification"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 text-center">
            Automated alerts dispatched directly to recipient student & faculty emails.
          </div>
        </div>
      </div>
    </div>
  );
};
