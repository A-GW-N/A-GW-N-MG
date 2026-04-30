"use client";

import {useMemo, useState, useTransition} from "react";
import {KeyRound, Plus, Save, Shield, Trash2, User2} from "lucide-react";

import {Button} from "@/components/ui/button";
import type {AdminUserAccountRow} from "@/lib/database/user-accounts";
import type {UserInviteCodeRow, UserRegistrationSettingsRow} from "@/lib/types";

interface EditableUser {
  id?: string;
  username: string;
  display_name: string;
  auth_source: "manual" | "linuxdo";
  oauth_provider?: string | null;
  oauth_subject?: string | null;
  oauth_username?: string | null;
  avatar_url?: string | null;
  last_login_at?: string | null;
  role: "user" | "admin";
  is_active: boolean;
}

interface EditableInviteCode {
  id: string;
  code: string;
  note: string;
  is_enabled: boolean;
  expires_at: string;
  used_at?: string | null;
}

interface UserAccountManagerProps {
  initialUsers: AdminUserAccountRow[];
  initialRegistrationSettings: UserRegistrationSettingsRow;
  initialInviteCodes: UserInviteCodeRow[];
}

function createEditableUser(user: AdminUserAccountRow): EditableUser {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    auth_source: user.auth_source === "linuxdo" ? "linuxdo" : "manual",
    oauth_provider: user.oauth_provider ?? null,
    oauth_subject: user.oauth_subject ?? null,
    oauth_username: user.oauth_username ?? null,
    avatar_url: user.avatar_url ?? null,
    last_login_at: user.last_login_at ?? null,
    role: user.role === "admin" ? "admin" : "user",
    is_active: user.is_active,
  };
}

function createEditableInviteCode(code: UserInviteCodeRow): EditableInviteCode {
  return {
    id: code.id,
    code: code.code,
    note: code.note ?? "",
    is_enabled: code.is_enabled,
    expires_at: code.expires_at ?? "",
    used_at: code.used_at ?? null,
  };
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "暂无";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function UserAccountManager({
  initialUsers,
  initialRegistrationSettings,
  initialInviteCodes,
}: UserAccountManagerProps) {
  const [users, setUsers] = useState<EditableUser[]>(
    initialUsers.map((user) => createEditableUser(user))
  );
  const [registrationMode, setRegistrationMode] = useState<
    UserRegistrationSettingsRow["registration_mode"]
  >(initialRegistrationSettings.registration_mode);
  const [inviteCodeHint, setInviteCodeHint] = useState(initialRegistrationSettings.invite_code_hint ?? "");
  const [inviteCodes, setInviteCodes] = useState<EditableInviteCode[]>(
    initialInviteCodes.map((item) => createEditableInviteCode(item))
  );
  const [newInviteNote, setNewInviteNote] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const summary = useMemo(
    () => ({
      total: users.length,
      active: users.filter((item) => item.is_active).length,
      oauth: users.filter((item) => item.auth_source === "linuxdo").length,
      inviteCodes: inviteCodes.length,
    }),
    [inviteCodes.length, users]
  );

  function saveUsers() {
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/users", {
          method: "PUT",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            users: users.map((user) => ({
              id: user.id,
              username: user.username,
              display_name: user.display_name,
              role: user.role,
              is_active: user.is_active,
            })),
          }),
        });

        const result = (await response.json()) as {
          message?: string;
          users?: AdminUserAccountRow[];
        };

        if (!response.ok || !result.users) {
          throw new Error(result.message ?? "保存用户账户失败");
        }

        setUsers(result.users.map((user) => createEditableUser(user)));
        setStatusMessage("用户状态已保存");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "保存用户账户失败");
      }
    });
  }

  function deleteUser(id: string) {
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/users", {
          method: "DELETE",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({id}),
        });

        const result = (await response.json()) as {
          message?: string;
          users?: AdminUserAccountRow[];
        };

        if (!response.ok || !result.users) {
          throw new Error(result.message ?? "删除用户失败");
        }

        setUsers(result.users.map((user) => createEditableUser(user)));
        setStatusMessage("用户已删除");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "删除用户失败");
      }
    });
  }

  function saveRegistrationSettings() {
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/user-access", {
          method: "PUT",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            registration_mode: registrationMode,
            invite_code_hint: inviteCodeHint,
          }),
        });

        const result = (await response.json()) as {
          message?: string;
          settings?: UserRegistrationSettingsRow;
        };

        if (!response.ok || !result.settings) {
          throw new Error(result.message ?? "保存注册设置失败");
        }

        setRegistrationMode(result.settings.registration_mode);
        setInviteCodeHint(result.settings.invite_code_hint ?? "");
        setStatusMessage("注册入口设置已保存");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "保存注册设置失败");
      }
    });
  }

  function createInviteCode() {
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/user-access", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({note: newInviteNote}),
        });

        const result = (await response.json()) as {
          message?: string;
          inviteCodes?: UserInviteCodeRow[];
        };

        if (!response.ok || !result.inviteCodes) {
          throw new Error(result.message ?? "创建邀请码失败");
        }

        setInviteCodes(result.inviteCodes.map((item) => createEditableInviteCode(item)));
        setNewInviteNote("");
        setStatusMessage("邀请码已创建");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "创建邀请码失败");
      }
    });
  }

  function deleteInviteCode(id: string) {
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/user-access", {
          method: "DELETE",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({id}),
        });

        const result = (await response.json()) as {
          message?: string;
          inviteCodes?: UserInviteCodeRow[];
        };

        if (!response.ok || !result.inviteCodes) {
          throw new Error(result.message ?? "删除邀请码失败");
        }

        setInviteCodes(result.inviteCodes.map((item) => createEditableInviteCode(item)));
        setStatusMessage("邀请码已删除");
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "删除邀请码失败");
      }
    });
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.9rem] border border-border/50 bg-background/72 p-4 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            User Accounts
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            这里负责用户启停、角色、删除、注册入口控制和邀请码管理。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={saveRegistrationSettings} disabled={isPending} className="rounded-full">
            <Shield className="mr-2 h-4 w-4" />
            保存注册设置
          </Button>
          <Button type="button" onClick={saveUsers} disabled={isPending} className="rounded-full">
            <Save className="mr-2 h-4 w-4" />
            {isPending ? "Saving..." : "Save Users"}
          </Button>
        </div>
      </div>

      {statusMessage ? (
        <div className="rounded-2xl border border-border/50 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4">
        <article className="rounded-[1.8rem] border border-border/50 bg-background/72 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
          <User2 className="h-5 w-5" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Users</p>
          <p className="mt-3 text-3xl font-black tracking-tight">{String(summary.total).padStart(2, "0")}</p>
        </article>
        <article className="rounded-[1.8rem] border border-border/50 bg-background/72 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
          <Shield className="h-5 w-5" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">OAuth</p>
          <p className="mt-3 text-3xl font-black tracking-tight">{String(summary.oauth).padStart(2, "0")}</p>
        </article>
        <article className="rounded-[1.8rem] border border-border/50 bg-background/72 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
          <KeyRound className="h-5 w-5" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Active</p>
          <p className="mt-3 text-3xl font-black tracking-tight">{String(summary.active).padStart(2, "0")}</p>
        </article>
        <article className="rounded-[1.8rem] border border-border/50 bg-background/72 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
          <Plus className="h-5 w-5" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Invites</p>
          <p className="mt-3 text-3xl font-black tracking-tight">{String(summary.inviteCodes).padStart(2, "0")}</p>
        </article>
      </div>

      <section className="rounded-[1.9rem] border border-border/50 bg-background/72 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Registration Access</p>
          <h3 className="mt-2 text-xl font-semibold">注册入口控制</h3>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]">
          <div className="grid gap-3">
            <select
              value={registrationMode}
              onChange={(event) =>
                setRegistrationMode(event.target.value as UserRegistrationSettingsRow["registration_mode"])
              }
              className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none"
            >
              <option value="closed">closed - 未开启注册</option>
              <option value="open">open - 开放注册</option>
              <option value="invite_only">invite_only - 仅邀请码</option>
            </select>
            <textarea
              value={inviteCodeHint}
              onChange={(event) => setInviteCodeHint(event.target.value)}
              className="min-h-28 rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none"
              placeholder="未开启注册时或邀请码模式下给用户展示的提示"
            />
          </div>

          <div className="rounded-[1.5rem] border border-border/45 bg-background/60 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={newInviteNote}
                onChange={(event) => setNewInviteNote(event.target.value)}
                className="min-w-[220px] flex-1 rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none"
                placeholder="邀请码备注，例如：首批测试用户"
              />
              <Button type="button" variant="outline" onClick={createInviteCode} disabled={isPending} className="rounded-full">
                <Plus className="mr-2 h-4 w-4" />
                生成邀请码
              </Button>
            </div>

            <div className="mt-4 grid gap-3">
              {inviteCodes.length > 0 ? inviteCodes.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-border/45 bg-background/70 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold">{invite.code}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {invite.note || "无备注"} · {invite.used_at ? `已使用 ${formatDate(invite.used_at)}` : "未使用"}
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => deleteInviteCode(invite.id)} disabled={isPending} className="rounded-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              )) : (
                <div className="rounded-[1.2rem] border border-border/45 bg-background/70 px-4 py-4 text-sm text-muted-foreground">
                  暂无邀请码
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-border/50 bg-background/72 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.08)] backdrop-blur-sm">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">User Matrix</p>
          <h3 className="mt-2 text-xl font-semibold">用户维护</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user, index) => (
            <div
              key={`${user.id ?? "user"}-${user.username}-${index}`}
              className="rounded-[1.5rem] border border-border/45 bg-background/60 p-4"
            >
              <div className="flex items-start gap-3">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt={user.display_name}
                    className="h-12 w-12 rounded-2xl border border-border/40 object-cover"
                  />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border/40 bg-background/70 text-sm font-bold">
                    {user.username.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{user.username}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {user.auth_source}
                    {user.oauth_provider ? ` · ${user.oauth_provider}` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <input
                  value={user.display_name}
                  onChange={(event) =>
                    setUsers((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? {...item, display_name: event.target.value} : item
                      )
                    )
                  }
                  className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none"
                  placeholder="display_name"
                />
                <select
                  value={user.role}
                  onChange={(event) =>
                    setUsers((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? {...item, role: event.target.value as EditableUser["role"]} : item
                      )
                    )
                  }
                  className="rounded-2xl border border-border/45 bg-background/70 px-4 py-3 text-sm outline-none"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div className="mt-4 rounded-[1.2rem] border border-border/45 bg-background/70 px-4 py-3 text-xs leading-6 text-muted-foreground">
                <div>OAuth 用户名：{user.oauth_username || "暂无"}</div>
                <div className="break-all">Subject：{user.oauth_subject || "暂无"}</div>
                <div>最近登录：{formatDate(user.last_login_at)}</div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={user.is_active}
                    onChange={(event) =>
                      setUsers((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? {...item, is_active: event.target.checked} : item
                        )
                      )
                    }
                  />
                  Enabled
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{user.role}</span>
                  <Button type="button" variant="outline" onClick={() => user.id && deleteUser(user.id)} disabled={isPending || !user.id} className="rounded-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
