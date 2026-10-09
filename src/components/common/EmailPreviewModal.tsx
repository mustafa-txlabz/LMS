import React from 'react';
import { AutomatedNotification } from '../../types';
import { X, Mail, ShieldCheck, Calendar, Clock, ExternalLink } from 'lucide-react';

interface EmailPreviewModalProps {
  notification: AutomatedNotification | null;
  onClose: () => void;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  notification,
  onClose,
}) => {
  if (!notification) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in duration-150"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Automated University Email Gateway
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-all hover:rotate-90 duration-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Email Header Meta */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="text-base font-bold text-slate-900">{notification.subject}</h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <ShieldCheck className="w-3 h-3" />
              Verified Delivery
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
            <div>
              <span className="text-slate-400 font-medium">From:</span>{' '}
              <span className="text-slate-800 font-medium">
                {notification.senderName} &lt;notifications@unicore.edu&gt;
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">To:</span>{' '}
              <span className="text-slate-800 font-medium">
                {notification.recipientName} &lt;{notification.recipientEmail}&gt;
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Date & Time:</span>{' '}
              <span className="text-slate-800 font-mono text-[11px]">{notification.timestamp}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Type:</span>{' '}
              <span className="uppercase text-[10px] font-bold tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                {notification.type.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Email Body Content */}
        <div className="p-6 bg-white space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Institutional Letterhead Banner */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                UNICORE UNIVERSITY OF ADVANCED TECHNOLOGY
              </h4>
              <p className="text-[11px] text-slate-500">
                Academic Administration & Student Affairs Notification Dispatch
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              Ref #{notification.id.slice(-8)}
            </div>
          </div>

          {/* Salutation */}
          <p className="text-xs text-slate-700">
            Dear <strong className="text-slate-900">{notification.recipientName}</strong>,
          </p>

          {/* Core Message */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-sans">
            {notification.message}
          </div>

          {/* Course Metadata Pill Box alternative (Clean unboxed style per guidelines) */}
          {notification.courseCode && (
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100/70 p-3 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-900">{notification.courseCode}</span>
              <span aria-hidden="true">·</span>
              <span>{notification.courseTitle}</span>
              <span aria-hidden="true">·</span>
              <span>UniCore Academic Portal</span>
            </div>
          )}

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <p>
              This is an automated system notification dispatched via the UniCore LMS notification engine.
              For appeals or grading inquiries, please consult your course instructor during office hours.
            </p>
            <p className="text-slate-400 font-mono text-[10px]">
              SMTP Gateway: mailer.unicore.edu · Auth: TLS 1.3 · Message-ID: &lt;{notification.id}@unicore.edu&gt;
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
