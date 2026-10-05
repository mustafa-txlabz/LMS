import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import {
  ShieldAlert,
  Search,
  Clock,
  ArrowRight,
  UserCheck,
  Filter,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const ProgressionAuditTrail: React.FC = () => {
  const { auditLogs, users } = useLms();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'manual' | 'batch'>('all');

  const filteredLogs = auditLogs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      log.studentName.toLowerCase().includes(q) ||
      (log.studentRollNumber ? log.studentRollNumber.toLowerCase().includes(q) : false) ||
      log.adminName.toLowerCase().includes(q) ||
      log.reason.toLowerCase().includes(q);

    const isBatch = log.reason.startsWith('[Batch Promotion') || log.id.startsWith('audit-batch');
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'batch' && isBatch) ||
      (typeFilter === 'manual' && !isBatch);

    return matchesSearch && matchesType;
  });

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden animate-fade-in-up">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <span>Student Semester Progression & Override Audit Trail</span>
            </h3>
            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-mono">
              {auditLogs.length} Official Audit Events Logged
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log tracking all Super Admin manual semester overrides, batch promotion executions, mandatory justifications, and status synchronizations.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Logs
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('manual')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                typeFilter === 'manual' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Manual Overrides
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('batch')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                typeFilter === 'batch' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Batch Promotions
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student, admin, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 w-48 sm:w-60 font-sans"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-2.5 px-3">Timestamp (UTC)</th>
              <th className="py-2.5 px-3">Target Student</th>
              <th className="py-2.5 px-3 text-center">Semester Transition</th>
              <th className="py-2.5 px-3 text-center">Status Synchronization</th>
              <th className="py-2.5 px-4">Mandatory Audit Reason / Justification</th>
              <th className="py-2.5 px-3">Performing Administrator</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
                  <FileText className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  <div>No progression audit entries found matching criteria.</div>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isBatch = log.reason.startsWith('[Batch Promotion') || log.id.startsWith('audit-batch');
                const wasDetainedReset =
                  (log.previousStatus === 'detained' || log.previousStatus === 'repeat') &&
                  log.newStatus === 'active';

                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        ID: <span className="font-mono">{log.id.slice(0, 14)}...</span>
                      </div>
                    </td>

                    {/* Target Student */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{log.studentName}</div>
                      <div className="text-[10px] text-indigo-700 font-mono font-medium">
                        {log.studentRollNumber || log.studentId}
                      </div>
                    </td>

                    {/* Semester Transition */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] font-bold text-slate-800">
                        <span>Sem {log.previousSemester}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="text-indigo-700">Sem {log.newSemester}</span>
                      </div>
                    </td>

                    {/* Status Synchronization */}
                    <td className="py-3 px-3 text-center">
                      {wasDetainedReset ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Reset to Active</span>
                        </span>
                      ) : log.newStatus === 'detained' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                          Detained
                        </span>
                      ) : log.newStatus === 'graduated' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                          Graduated
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {log.newStatus || 'Active'}
                        </span>
                      )}
                    </td>

                    {/* Mandatory Reason */}
                    <td className="py-3 px-4">
                      <div className="text-xs text-slate-800 font-medium">
                        {log.reason}
                      </div>
                      {isBatch && (
                        <span className="inline-block mt-1 text-[9px] font-mono uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-semibold">
                          Batch Engine Event
                        </span>
                      )}
                    </td>

                    {/* Performing Admin */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{log.adminName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {log.adminId}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
