"use client";

import PageHeader from "@/components/common/PageHeader";
import ListControls, { addButtonClass } from "@/components/common/ListControls";
import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { userService } from "@/services/userService";
import { UserData } from "@/services/tokenStorage";
import { TableSkeleton } from "@/components/common/Skeleton";

// "Add User" buttons elsewhere (User Management, an event's system-user tab) link here with ?new=1 so the form is already open,
// instead of landing on this list and needing a second click.
export default function AddUserPage() {
  return (
    <Suspense fallback={null}>
      <AddUserContent />
    </Suspense>
  );
}

function AddUserContent() {
  const router = useRouter();
  const openedByLink = useSearchParams().get("new") === "1";
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(openedByLink);
  // Cancelling a form that was opened from another page goes back to that page rather than stranding the person on this list
  const cancelModal = () => {
    setIsAddUserModalOpen(false);
    if (openedByLink) router.back();
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    userName: "",
    contactNo: "",
    email: "",
    password: "",
  });
  const [addedUserName, setAddedUserName] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [systemUsers, setSystemUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSystemUsers = useCallback(async () => {
    setLoadingUsers(true);
    setLoadError(null);
    const res = await userService.getUsers("SYSTEM_USER");
    if (res.success && Array.isArray(res.data)) {
      setSystemUsers(res.data.filter((u) => u.role === "SYSTEM_USER"));
    } else {
      setSystemUsers([]);
      setLoadError(res.message || "Failed to load system users.");
    }
    setLoadingUsers(false);
  }, []);

  useEffect(() => {
    loadSystemUsers();
  }, [loadSystemUsers]);

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userName.trim()) return;

    setIsSubmitting(true);
    setFormError(null);
    const res = await userService.createUser({
      fullName: formData.userName.trim(),
      email: formData.email.trim(),
      phone: formData.contactNo.trim() || undefined,
      password: formData.password,
      role: "SYSTEM_USER",
    });
    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.message || "Failed to create user.");
      return;
    }

    setAddedUserName(formData.userName.trim());
    setIsAddUserModalOpen(false);
    setFormData({ userName: "", contactNo: "", email: "", password: "" });
    // Opened from another page: go back to it, where the new user now shows in the list
    if (openedByLink) router.back();
    await loadSystemUsers();
  };

  const query = searchQuery.trim().toLowerCase();
  const filteredUsers = systemUsers.filter((u) =>
    !query ||
    (u.fullName || "").toLowerCase().includes(query) ||
    (u.email || "").toLowerCase().includes(query) ||
    (u.phone || "").includes(query)
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <PageHeader title="Add User" />

        {/* Page Content */}
        <main className="px-4 sm:px-6 pt-[30px] pb-8 w-full space-y-8 flex-1 flex flex-col">
          <ListControls label="System Users" searchId="add-user-search" placeholder="Search..." value={searchQuery} onChange={setSearchQuery}>
            <button type="button" onClick={() => setIsAddUserModalOpen(true)} className={`${addButtonClass} cursor-pointer`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add User
            </button>
          </ListControls>

          {/* Success Notification Banner */}
          {addedUserName && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-semibold text-center animate-fadeIn break-words">
              User &quot;{addedUserName}&quot; added successfully!
            </div>
          )}

          {loadingUsers ? (
            <TableSkeleton rows={5} cols={3} label="Loading system users" />
          ) : loadError ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-3">
              <p className="text-sm font-semibold text-rose-600 text-center break-words">{loadError}</p>
              <button
                onClick={() => loadSystemUsers()}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-[#FF5B22] font-semibold text-xs rounded-md transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : systemUsers.length === 0 ? (
            /* Empty State Container (Image 1) */
            <div className="flex-1 flex flex-col items-center justify-center my-auto py-16 space-y-4">
              {/* Figma 450:6449: a grey group-of-people mark, 16px message and a light "Add User" button */}
              <svg className="w-20 h-20 text-[#BDBDBD]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
              <p className="text-base text-[#4B4F52]">
                No users added yet. Add users now.
              </p>
              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="px-6 py-2 bg-[#F6F6F6] hover:bg-gray-200 text-[#FF651D] font-medium text-base rounded-md transition-colors cursor-pointer"
              >
                Add User
              </button>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-md overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="py-3 px-4 font-medium">Name</th>
                    <th className="py-3 px-4 font-medium">Email</th>
                    <th className="py-3 px-4 font-medium">Contact No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-400">No users match your search.</td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u._id}>
                        <td className="py-3 px-4 font-semibold text-gray-900 break-words max-w-[240px]">{u.fullName}</td>
                        <td className="py-3 px-4 text-gray-600 break-all max-w-[280px]">{u.email}</td>
                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{u.phone || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>

      {/* Add User Modal (Image 2) */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-overlay">
          <div className="bg-white rounded-md border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden space-y-6 animate-modal">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Add User</h3>
              <button
                onClick={cancelModal}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddUserSubmit} className="px-6 space-y-5">
              {/* User Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  User Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter User Name"
                  value={formData.userName}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              {/* Contact No */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Contact No<span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Enter Contact No"
                  value={formData.contactNo}
                  onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Email<span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Enter Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              {/* Temporary Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Temporary Password<span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              {formError && (
                <p className="text-xs font-medium text-rose-600 break-words">{formError}</p>
              )}

              {/* Buttons */}
              <div className="pt-2 pb-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={cancelModal}
                  className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-[#FF5B22] hover:bg-[#E04B16] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Adding..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
