'use client';

import React, { useState } from 'react';
import { HealthLog } from '@/types';
import { db } from '@/lib/firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Utensils, Activity, Stethoscope, Trash2, Edit2, Check, X, Calendar } from 'lucide-react';

interface HealthLogManagerProps {
  logs: HealthLog[];
  onRefresh: () => void;
}

export default function HealthLogManager({ logs, onRefresh }: HealthLogManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  const handleDelete = async (id?: string) => {
    if (!id || !confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) return;
    try {
      await deleteDoc(doc(db, 'health_logs', id));
      onRefresh();
    } catch (error) {
      console.error('Lỗi khi xóa:', error);
      alert('Không thể xóa bản ghi.');
    }
  };

  const startEdit = (log: HealthLog) => {
    setEditingId(log.id || null);
    setEditData({ ...log.data });
  };

  const handleSaveEdit = async (log: HealthLog) => {
    if (!log.id) return;
    try {
      await updateDoc(doc(db, 'health_logs', log.id), {
        data: editData
      });
      setEditingId(null);
      onRefresh();
    } catch (error) {
      console.error('Lỗi khi sửa:', error);
      alert('Không thể cập nhật bản ghi.');
    }
  };

  const renderLogIcon = (type: string) => {
    switch (type) {
      case 'FOOD':
        return <Utensils className="w-4 h-4 text-emerald-600" />;
      case 'ACTIVITY':
        return <Activity className="w-4 h-4 text-blue-600" />;
      case 'SYMPTOM':
        return <Stethoscope className="w-4 h-4 text-rose-600" />;
      default:
        return null;
    }
  };

  const renderContent = (log: HealthLog) => {
    const isEditing = editingId === log.id;

    if (log.type === 'FOOD') {
      const data = log.data as any;
      return isEditing ? (
        <div className="flex gap-2 items-center w-full">
          <input
            type="text"
            value={editData.foodName || ''}
            onChange={(e) => setEditData({ ...editData, foodName: e.target.value })}
            className="px-2 py-1 text-slate-900 bg-white border rounded text-xs w-1/2"
            placeholder="Tên món"
          />
          <input
            type="text"
            value={editData.amount || ''}
            onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
            className="px-2 py-1 text-slate-900 bg-white border rounded text-xs w-1/4"
            placeholder="Khẩu phần"
          />
          <input
            type="time"
            value={editData.consumedAt || ''}
            onChange={(e) => setEditData({ ...editData, consumedAt: e.target.value })}
            className="px-2 py-1 text-slate-900 bg-white border rounded text-xs w-1/4"
          />
        </div>
      ) : (
        <span className="text-slate-700 text-xs font-medium">
          <strong className="text-slate-900">{data.foodName}</strong> ({data.amount}) lúc {data.consumedAt}
        </span>
      );
    }

    if (log.type === 'ACTIVITY') {
      const data = log.data as any;
      return isEditing ? (
        <div className="flex gap-2 items-center w-full">
          <input
            type="text"
            value={editData.activityName || ''}
            onChange={(e) => setEditData({ ...editData, activityName: e.target.value })}
            className="px-2 py-1 text-slate-900 bg-white border rounded text-xs w-1/2"
            placeholder="Tên hoạt động"
          />
          <input
            type="time"
            value={editData.startTime || ''}
            onChange={(e) => setEditData({ ...editData, startTime: e.target.value })}
            className="px-2 py-1 text-slate-900 bg-white border rounded text-xs w-1/4"
          />
          <input
            type="time"
            value={editData.endTime || ''}
            onChange={(e) => setEditData({ ...editData, endTime: e.target.value })}
            className="px-2 py-1 text-slate-900 bg-white border rounded text-xs w-1/4"
          />
        </div>
      ) : (
        <span className="text-slate-700 text-xs font-medium">
          <strong className="text-slate-900">{data.activityName}</strong> từ {data.startTime} đến {data.endTime}
        </span>
      );
    }

    if (log.type === 'SYMPTOM') {
      const data = log.data as any;
      return isEditing ? (
        <div className="flex gap-2 items-center w-full">
          <input
            type="text"
            value={editData.description || ''}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            className="px-2 py-1 text-slate-900 bg-white border rounded text-xs flex-1"
            placeholder="Mô tả triệu chứng"
          />
          <input
            type="time"
            value={editData.onsetTime || ''}
            onChange={(e) => setEditData({ ...editData, onsetTime: e.target.value })}
            className="px-2 py-1 text-slate-900 bg-whiteborder rounded text-xs w-1/4"
          />
        </div>
      ) : (
        <span className="text-slate-700 text-xs font-medium">
          <strong className="text-slate-900">{data.description}</strong> khởi phát lúc {data.onsetTime}
        </span>
      );
    }

    return null;
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          Lịch Sử Nhật Ký Sức Khỏe ({logs.length})
        </h3>
      </div>

      {logs.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-4">Chưa có bản ghi nhật ký nào.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {logs.map((log) => {
            const isEditing = editingId === log.id;
            return (
              <div
                key={log.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition gap-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="p-1.5 bg-white rounded-lg shadow-2xs">
                    {renderLogIcon(log.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 font-medium">{log.date}</p>
                    {renderContent(log)}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(log)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        title="Lưu"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                        title="Hủy"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(log)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
