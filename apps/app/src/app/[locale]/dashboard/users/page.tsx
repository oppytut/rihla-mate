"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 10;

type UserRole = "owner" | "admin" | "staff";

type FormMode = "closed" | "create" | "edit";

type EditTarget = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function roleBadgeClass(role: string): string {
  switch (role) {
    case "owner":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20";
    case "admin":
      return "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20";
    default:
      return "bg-muted text-muted-foreground ring-1 ring-inset ring-border";
  }
}

export default function UsersPage() {
  const t = useTranslations();
  const trpc = useTRPC();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("staff");

  useEffect(() => {
    document.title = `${t("users.title")} - Rihla Mate`;
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [t]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, DEBOUNCE_MS);
  }, []);

  const usersQuery = useQuery(
    trpc.user.list.queryOptions({
      search: debouncedSearch || undefined,
      role: roleFilter || undefined,
      page,
      limit: PAGE_SIZE,
    }),
  );

  const createMutation = useMutation(
    trpc.user.create.mutationOptions({
      onSuccess: () => {
        toast.success(t("users.createSuccess"));
        closeForm();
        usersQuery.refetch();
      },
      onError: (error) => {
        toast.error(`${t("common.error")}: ${error.message}`);
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.user.update.mutationOptions({
      onSuccess: () => {
        toast.success(t("users.updateSuccess"));
        closeForm();
        usersQuery.refetch();
      },
      onError: (error) => {
        toast.error(`${t("common.error")}: ${error.message}`);
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.user.delete.mutationOptions({
      onSuccess: () => {
        toast.success(t("users.deleteSuccess"));
        usersQuery.refetch();
      },
      onError: (error) => {
        toast.error(`${t("common.error")}: ${error.message}`);
      },
    }),
  );

  const items = usersQuery.data?.items ?? [];
  const total = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = search !== "" || roleFilter !== "";

  function closeForm() {
    setFormMode("closed");
    setEditTarget(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("staff");
  }

  function openCreate() {
    setEditTarget(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("staff");
    setFormMode("create");
  }

  function openEdit(user: EditTarget) {
    setEditTarget(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword("");
    setFormRole((user.role as UserRole) || "staff");
    setFormMode("edit");
  }

  function handleDelete(id: string) {
    if (window.confirm(t("users.deleteConfirm"))) {
      deleteMutation.mutate({ id });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formMode === "create") {
      createMutation.mutate({
        name: formName.trim(),
        email: formEmail.trim(),
        password: formPassword,
        role: formRole,
      });
      return;
    }
    if (formMode === "edit" && editTarget) {
      updateMutation.mutate({
        id: editTarget.id,
        name: formName.trim(),
        role: formRole,
        ...(formPassword.trim().length >= 8 ? { password: formPassword } : {}),
      });
    }
  }

  const formBusy = createMutation.isPending || updateMutation.isPending;

  function roleLabel(role: string): string {
    if (role === "owner" || role === "admin" || role === "staff") {
      return t(`users.roles.${role}`);
    }
    return role;
  }

  function formatDate(value: Date | string): string {
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <>
      <PageHeader
        title={t("users.title")}
        titleTestId="dashboard-heading"
        actions={
          <Button onClick={openCreate} data-testid="users-add">
            {t("users.addUser")}
          </Button>
        }
      />

      <div className="px-4 lg:px-8 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Input
            type="search"
            data-testid="users-search"
            placeholder={t("users.search")}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label={t("users.search")}
            className="flex-1 bg-background"
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            data-testid="users-role-filter"
            aria-label={t("users.columns.role")}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="">{t("users.allRoles")}</option>
            <option value="owner">{t("users.roles.owner")}</option>
            <option value="admin">{t("users.roles.admin")}</option>
            <option value="staff">{t("users.roles.staff")}</option>
          </select>
        </div>

        {formMode !== "closed" && (
          <div
            className="mb-6 rounded-lg border border-border bg-card p-4 sm:p-6"
            data-testid="users-form"
          >
            <h2 className="mb-4 text-base font-semibold text-foreground">
              {formMode === "create" ? t("users.addUser") : t("users.edit")}
            </h2>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="user-name" className="text-sm font-medium text-foreground">
                  {t("users.columns.name")}
                </label>
                <Input
                  id="user-name"
                  data-testid="users-form-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  maxLength={255}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="user-email" className="text-sm font-medium text-foreground">
                  {t("users.columns.email")}
                </label>
                <Input
                  id="user-email"
                  type="email"
                  data-testid="users-form-email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required={formMode === "create"}
                  disabled={formMode === "edit"}
                  maxLength={255}
                  autoComplete="email"
                />
              </div>
              {(formMode === "create" || formMode === "edit") && (
                <div className="space-y-1.5">
                  <label htmlFor="user-password" className="text-sm font-medium text-foreground">
                    {formMode === "edit" ? t("users.newPasswordOptional") : t("users.password")}
                  </label>
                  <Input
                    id="user-password"
                    type="password"
                    data-testid="users-form-password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required={formMode === "create"}
                    minLength={formMode === "create" ? 8 : undefined}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder={formMode === "edit" ? t("users.passwordLeaveBlank") : undefined}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label htmlFor="user-role" className="text-sm font-medium text-foreground">
                  {t("users.columns.role")}
                </label>
                <select
                  id="user-role"
                  data-testid="users-form-role"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="staff">{t("users.roles.staff")}</option>
                  <option value="admin">{t("users.roles.admin")}</option>
                  <option value="owner">{t("users.roles.owner")}</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button type="submit" disabled={formBusy} data-testid="users-form-submit">
                  {formBusy ? t("users.saving") : t("users.save")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeForm}
                  disabled={formBusy}
                  data-testid="users-form-cancel"
                >
                  {t("users.cancel")}
                </Button>
              </div>
            </form>
          </div>
        )}

        {usersQuery.isError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6">
            <p className="text-sm text-destructive">
              {t("common.error")}: {usersQuery.error?.message || "Failed to load users"}
            </p>
          </div>
        )}

        {usersQuery.isLoading && (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {[
                      t("users.columns.name"),
                      t("users.columns.email"),
                      t("users.columns.role"),
                      t("users.columns.created"),
                      t("users.columns.actions"),
                    ].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-4 py-3 text-left font-medium text-muted-foreground"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!usersQuery.isLoading && !usersQuery.isError && items.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-10 text-center sm:p-12">
            <p className="text-base font-medium text-foreground">
              {hasFilters ? t("users.noResults") : t("users.empty")}
            </p>
            {!hasFilters && (
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                {t("users.emptyHint")}
              </p>
            )}
            {!hasFilters && (
              <Button className="mt-6" onClick={openCreate} data-testid="users-empty-add">
                {t("users.addUser")}
              </Button>
            )}
          </div>
        )}

        {!usersQuery.isLoading && !usersQuery.isError && items.length > 0 && (
          <>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="users-table">
                  <thead className="bg-muted/50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left font-medium text-muted-foreground"
                      >
                        {t("users.columns.name")}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left font-medium text-muted-foreground"
                      >
                        {t("users.columns.email")}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left font-medium text-muted-foreground"
                      >
                        {t("users.columns.role")}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left font-medium text-muted-foreground"
                      >
                        {t("users.columns.created")}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left font-medium text-muted-foreground"
                      >
                        {t("users.columns.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((user) => (
                      <tr key={user.id} data-testid={`users-row-${user.id}`}>
                        <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              roleBadgeClass(user.role),
                            )}
                          >
                            {roleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              data-testid={`users-edit-${user.id}`}
                              onClick={() =>
                                openEdit({
                                  id: user.id,
                                  name: user.name,
                                  email: user.email,
                                  role: user.role,
                                })
                              }
                            >
                              {t("users.edit")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              data-testid={`users-delete-${user.id}`}
                              disabled={deleteMutation.isPending}
                              onClick={() => handleDelete(user.id)}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              {t("users.delete")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-sm text-muted-foreground">
                  {t("users.pageInfo", { page, total: totalPages })}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    data-testid="users-page-prev"
                  >
                    {t("common.previous")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    data-testid="users-page-next"
                  >
                    {t("common.next")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
